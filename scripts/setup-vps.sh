#!/bin/bash
# setup-vps.sh — Configuração inicial da VPS para Attivo SaaS
# Testado em: Ubuntu 22.04 LTS
#
# Execute UMA VEZ como root na VPS recém-criada.
# Interativo — lê entradas do terminal mesmo quando chamado via pipe.
#
# Uso direto:
#   bash setup-vps.sh
#
# Via curl (baixa e executa):
#   bash <(curl -fsSL https://raw.githubusercontent.com/SEU_USUARIO/attivo-saas/main/scripts/setup-vps.sh)

set -euo pipefail

# ─── EDITE ESTAS VARIÁVEIS ANTES DE RODAR ────────────────────────────────────
REPO_URL="https://github.com/SEU_USUARIO/attivo-saas.git"
DOMAIN="attivocorretora.com.br"
API_DOMAIN="api.attivocorretora.com.br"
CERTBOT_EMAIL="seu@email.com"
APP_DIR="/opt/attivo"
UPLOADS_DIR="/opt/attivo-uploads"
LOG_DIR="/var/log/attivo"
# ─────────────────────────────────────────────────────────────────────────────

# Garante leitura interativa mesmo via pipe (curl | bash)
TTY=/dev/tty

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()   { echo -e "${GREEN}[setup]${NC} $1"; }
warn()  { echo -e "${YELLOW}[warn]${NC}  $1"; }
error() { echo -e "${RED}[erro]${NC}  $1"; exit 1; }

# Valida que está rodando como root
[ "$(id -u)" -eq 0 ] || error "Execute como root: sudo bash $0"

# Valida que as variáveis foram editadas
[[ "$REPO_URL"       == *"SEU_USUARIO"*    ]] && error "Edite REPO_URL no início do script."
[[ "$CERTBOT_EMAIL"  == *"seu@email.com"*  ]] && error "Edite CERTBOT_EMAIL no início do script."

echo ""
echo "╔═══════════════════════════════════════════════╗"
echo "║   Attivo SaaS — Setup VPS                    ║"
echo "║   $(date '+%Y-%m-%d %H:%M:%S')                        ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""

# ─── 1. Atualizar sistema ─────────────────────────────────────────────────────
log "Atualizando sistema..."
# DEBIAN_FRONTEND evita prompts interativos do apt (ex: "keep/replace config?")
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"
apt-get install -y -qq \
    curl git unzip nginx certbot python3-certbot-nginx ufw fail2ban \
    build-essential ca-certificates gnupg lsb-release

# ─── 2. Instalar Node.js 20 ───────────────────────────────────────────────────
log "Instalando Node.js 20..."
if ! command -v node &>/dev/null || [[ "$(node -e 'process.stdout.write(process.version.split(".")[0].slice(1))')" -lt 20 ]]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - &>/dev/null
    apt-get install -y -qq nodejs
fi
log "Node $(node -v) / npm $(npm -v)"

# ─── 3. Instalar PM2 ─────────────────────────────────────────────────────────
log "Instalando PM2..."
npm install -g pm2 --quiet
log "PM2 $(pm2 -v)"

# ─── 4. Instalar Docker ──────────────────────────────────────────────────────
log "Instalando Docker..."
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | sh &>/dev/null
    systemctl enable --now docker
fi
log "Docker $(docker -v)"

# ─── 5. Criar diretórios ─────────────────────────────────────────────────────
log "Criando estrutura de diretórios..."
mkdir -p "$APP_DIR" "$UPLOADS_DIR" "$LOG_DIR"
chmod 750 "$UPLOADS_DIR"

# ─── 6. Clonar ou atualizar repositório ──────────────────────────────────────
log "Clonando repositório..."
if [ -d "$APP_DIR/.git" ]; then
    warn "Repositório já existe — fazendo pull..."
    git -C "$APP_DIR" pull origin main
else
    git clone "$REPO_URL" "$APP_DIR"
fi

# ─── 7. Configurar variáveis de ambiente ─────────────────────────────────────
log "Configurando variáveis de ambiente..."
ENV_FILE="$APP_DIR/backend/.env"

if [ ! -f "$ENV_FILE" ]; then
    cp "$APP_DIR/infra/.env.production" "$ENV_FILE"
    echo ""
    warn "╔══════════════════════════════════════════════════════╗"
    warn "║  AÇÃO NECESSÁRIA: edite o arquivo de configuração   ║"
    warn "╚══════════════════════════════════════════════════════╝"
    warn "Arquivo: $ENV_FILE"
    warn ""
    warn "Preencha obrigatoriamente:"
    warn "  DATABASE_URL    — senha do banco"
    warn "  JWT_SECRET      — gere com: openssl rand -hex 64"
    warn "  MASTER_ADMIN_*  — email/senha/CPF do administrador"
    warn ""
    warn "Abrindo editor em 3 segundos... (Ctrl+X para sair do nano)"
    sleep 3
    # Abre editor — funciona mesmo com curl | bash via /dev/tty
    nano "$ENV_FILE" < "$TTY" > /dev/tty 2>&1 || vi "$ENV_FILE" < "$TTY" > /dev/tty 2>&1 || true
    echo ""
    warn "Pressione ENTER para continuar após salvar o arquivo..."
    read -r CONFIRM < "$TTY"
fi

# ─── 8. Extrair POSTGRES_PASSWORD e preparar .env do Docker ─────────────────
# Tenta ler POSTGRES_PASSWORD diretamente do .env (linha explícita)
POSTGRES_PASSWORD=$(grep '^POSTGRES_PASSWORD=' "$ENV_FILE" | cut -d'=' -f2- | tr -d '"'"'"' ')

# Fallback: extrai da DATABASE_URL se não tiver linha dedicada
if [ -z "$POSTGRES_PASSWORD" ]; then
    POSTGRES_PASSWORD=$(grep '^DATABASE_URL' "$ENV_FILE" \
        | python3 -c "import sys,urllib.parse; u=sys.stdin.read().strip().split('=',1)[1]; print(urllib.parse.urlparse(u).password or '')" 2>/dev/null || true)
fi

[ -z "$POSTGRES_PASSWORD" ] && error "Não encontrei POSTGRES_PASSWORD no .env. Defina a linha: POSTGRES_PASSWORD=sua_senha"
export POSTGRES_PASSWORD

# Cria .env para o docker-compose na raiz do projeto
cat > "$APP_DIR/.env" <<EOF
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
REDIS_PASSWORD=
EOF
log "Arquivo .env do docker-compose criado em $APP_DIR/.env"

# ─── 9. Subir infraestrutura Docker (PostgreSQL + Redis) ─────────────────────
log "Iniciando PostgreSQL e Redis via Docker..."
cd "$APP_DIR"
docker compose -f docker-compose.prod.yml up -d --remove-orphans

# Aguarda PostgreSQL ficar pronto (até 60s)
log "Aguardando PostgreSQL ficar pronto..."
MAX_WAIT=60; WAITED=0
until docker exec attivo_postgres pg_isready -U attivo -d attivo_saas &>/dev/null; do
    [ "$WAITED" -ge "$MAX_WAIT" ] && error "PostgreSQL não ficou pronto em ${MAX_WAIT}s. Verifique: docker logs attivo_postgres"
    printf "."
    sleep 2; WAITED=$((WAITED + 2))
done
echo " OK"

# ─── 10. Backend: instalar dependências ──────────────────────────────────────
# ATENÇÃO: usar npm ci (com devDependencies) pois 'prisma' CLI está em devDeps
log "Instalando dependências do backend (incluindo prisma CLI)..."
cd "$APP_DIR/backend"
npm ci --prefer-offline 2>&1 | tail -3

# ─── 11. Prisma: gerar client e migrar banco ──────────────────────────────────
log "Gerando Prisma Client..."
npx prisma generate

log "Executando migrations..."
npx prisma migrate deploy

log "Rodando seed inicial..."
# || true: não falha se admin já existir (idempotente)
node prisma/seed.js || warn "Seed retornou erro (admin já pode existir — ignorado)"

# Remover devDependencies após migrations (otimização de espaço)
log "Removendo devDependencies do backend (não necessárias em runtime)..."
npm prune --omit=dev 2>&1 | tail -2

# ─── 12. Frontend: instalar e buildar ────────────────────────────────────────
log "Instalando dependências do frontend..."
cd "$APP_DIR/frontend"
npm ci --prefer-offline 2>&1 | tail -3

log "Buildando frontend Next.js (pode demorar 2-5 min)..."
NEXT_PUBLIC_API_URL="https://${API_DOMAIN}/api/v1" npm run build

# ─── 13. PM2: log rotation + iniciar processos ───────────────────────────────
log "Instalando pm2-logrotate (evita disco cheio)..."
pm2 install pm2-logrotate
# Rotate diário, mantém 30 arquivos, máximo 20MB por arquivo
pm2 set pm2-logrotate:max_size 20M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'

log "Iniciando processos com PM2..."
cd "$APP_DIR"

# Para processos existentes (idempotente)
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.cjs

# Salva lista de processos
pm2 save --force

# Configura PM2 para iniciar automaticamente no boot
log "Configurando PM2 para iniciar no boot do sistema..."
PM2_STARTUP=$(pm2 startup systemd -u root --hp /root 2>&1 | grep -E "^sudo|^env PATH")
if [ -n "$PM2_STARTUP" ]; then
    eval "$PM2_STARTUP"
    log "PM2 startup configurado"
else
    warn "pm2 startup não retornou comando — pode já estar configurado"
fi

# ─── 14. Configurar Nginx ─────────────────────────────────────────────────────
log "Configurando Nginx..."
cp "$APP_DIR/infra/nginx/nginx.conf" /etc/nginx/sites-available/attivo

# Ativa o site e desativa o default
ln -sf /etc/nginx/sites-available/attivo /etc/nginx/sites-enabled/attivo
rm -f /etc/nginx/sites-enabled/default

# Testa configuração antes de aplicar
nginx -t || error "nginx.conf inválido. Verifique: /etc/nginx/sites-available/attivo"
systemctl reload nginx
log "Nginx configurado e recarregado"

# ─── 15. SSL com Let's Encrypt ───────────────────────────────────────────────
log "Emitindo certificado SSL (Let's Encrypt)..."
certbot --nginx \
    --non-interactive \
    --agree-tos \
    --redirect \
    --email  "$CERTBOT_EMAIL" \
    -d "$DOMAIN" \
    -d "www.$DOMAIN" \
    -d "$API_DOMAIN" \
    || error "Certbot falhou. Verifique se o DNS do domínio aponta para este IP."

# Garante timer de renovação automática (certbot via apt já cria)
systemctl is-active certbot.timer &>/dev/null || systemctl enable --now certbot.timer 2>/dev/null || true
log "Renovação automática de SSL: ativa"

# ─── 16. Firewall ────────────────────────────────────────────────────────────
log "Configurando firewall (ufw)..."
ufw allow OpenSSH          # SSH porta 22
ufw allow 'Nginx Full'     # HTTP (80) + HTTPS (443)
ufw deny  5432/tcp         # PostgreSQL: bloqueia acesso externo
ufw deny  6379/tcp         # Redis: bloqueia acesso externo
ufw --force enable
log "Firewall ativo: SSH + HTTP + HTTPS | DB e Redis bloqueados externamente"

# ─── 17. Fail2ban (proteção SSH contra brute force) ───────────────────────────
log "Configurando fail2ban..."
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime  = 3600
findtime = 600
maxretry = 5
ignoreip = 127.0.0.1/8

[sshd]
enabled  = true
port     = ssh
logpath  = %(sshd_log)s
maxretry = 3
bantime  = 86400

[nginx-http-auth]
enabled  = true
port     = http,https
logpath  = /var/log/nginx/*.error.log
maxretry = 5
EOF

systemctl enable --now fail2ban
log "Fail2ban ativo: SSH (max 3 tentativas/24h ban) + Nginx auth"

# ─── 18. Backup automático (cron diário às 03:00) ────────────────────────────
log "Configurando backup automático do banco de dados..."
mkdir -p /opt/attivo-backups
chmod 700 /opt/attivo-backups
chmod +x "$APP_DIR/scripts/backup.sh"
chmod +x "$APP_DIR/scripts/restore.sh"

# Adiciona cron sem duplicar (remove entrada antiga se existir, adiciona nova)
CRON_JOB="0 3 * * * /opt/attivo/scripts/backup.sh >> /var/log/attivo/backup.log 2>&1"
( crontab -l 2>/dev/null | grep -v "backup.sh"; echo "$CRON_JOB" ) | crontab -
log "Cron de backup configurado: diário às 03:00 → /opt/attivo-backups/"
log "Retenção: 14 dias. Logs em: /var/log/attivo/backup.log"

# Roda um backup imediato para validar
log "Rodando backup inicial para validação..."
bash "$APP_DIR/scripts/backup.sh" >> "$LOG_DIR/backup.log" 2>&1 \
    && log "Backup inicial OK — verifique: ls -lh /opt/attivo-backups/" \
    || warn "Backup inicial falhou — verifique /var/log/attivo/backup.log"

# ─── 19. Verificação final ────────────────────────────────────────────────────
log "Verificando sistema (aguardando 8s para estabilizar)..."
sleep 8

HEALTH_CODE=$(curl -sk -o /dev/null -w "%{http_code}" "https://${API_DOMAIN}/health" 2>/dev/null || echo "000")
READY_RESP=$(curl -sk "https://${API_DOMAIN}/ready" 2>/dev/null || echo "{}")

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Attivo SaaS — Setup Concluído"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "  Processos PM2:"
pm2 list
echo ""
echo "  Segurança:"
echo "    Firewall:   $(ufw status | head -1)"
echo "    Fail2ban:   $(systemctl is-active fail2ban)"
echo "    SSL:        $(certbot certificates 2>/dev/null | grep 'Expiry Date' | head -1 | xargs || echo 'verificar')"
echo ""
echo "  Backup:"
echo "    Cron:       0 3 * * * (diário às 03:00)"
echo "    Diretório:  /opt/attivo-backups/"
echo "    Últimos:    $(ls /opt/attivo-backups/*.sql.gz 2>/dev/null | wc -l) arquivo(s)"
echo ""
echo "  Acesso:"
echo "    Site:       https://${DOMAIN}"
echo "    API:        https://${API_DOMAIN}/api/v1"
echo "    Ready:      https://${API_DOMAIN}/ready → $READY_RESP"
echo ""
echo "  Comandos úteis:"
echo "    pm2 logs          — logs em tempo real"
echo "    pm2 monit         — monitor CPU/RAM"
echo "    attivo-deploy     — novo deploy (alias)"
echo "    fail2ban-client status sshd  — IPs banidos"
echo "    cat /var/log/attivo/backup.log  — log de backup"
echo "═══════════════════════════════════════════════════════"
echo ""

if [ "$HEALTH_CODE" != "200" ]; then
    warn "API retornou HTTP $HEALTH_CODE — verifique: pm2 logs attivo-backend"
fi

# Alias conveniente para deploy
echo 'alias attivo-deploy="bash /opt/attivo/scripts/deploy.sh"' >> /root/.bashrc
echo 'alias attivo-logs="pm2 logs"' >> /root/.bashrc
echo 'alias attivo-status="pm2 list && curl -s http://localhost:3333/ready | python3 -m json.tool"' >> /root/.bashrc
log "Aliases criados: attivo-deploy, attivo-logs, attivo-status (reabra o terminal)"
