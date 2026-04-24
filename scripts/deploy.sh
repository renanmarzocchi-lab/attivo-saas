#!/bin/bash
# deploy.sh — Attivo SaaS
# Executa na VPS após o setup inicial (setup-vps.sh).
# Faz pull do código, instala dependências, migra banco e reinicia processos.
#
# Uso:
#   bash /opt/attivo/scripts/deploy.sh
#
# Ou com alias após setup:
#   attivo-deploy

set -e  # Para em qualquer erro

APP_DIR="/opt/attivo"
LOG_FILE="/var/log/attivo/deploy.log"

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()   { echo -e "${GREEN}[deploy]${NC} $1" | tee -a "$LOG_FILE"; }
warn()  { echo -e "${YELLOW}[warn]${NC}   $1" | tee -a "$LOG_FILE"; }
error() { echo -e "${RED}[erro]${NC}   $1" | tee -a "$LOG_FILE"; exit 1; }

mkdir -p /var/log/attivo

echo ""
echo "================================================"
echo " Attivo SaaS — Deploy $(date '+%Y-%m-%d %H:%M:%S')"
echo "================================================"
echo ""

# ─── 1. Atualizar código ──────────────────────────────────
log "Atualizando código do repositório..."
cd "$APP_DIR"
git pull origin main || error "Falha no git pull"

# ─── 2. Backend: instalar dependências ───────────────────
log "Instalando dependências do backend..."
cd "$APP_DIR/backend"
npm ci --omit=dev || error "Falha no npm ci (backend)"

# ─── 3. Gerar Prisma Client ───────────────────────────────
log "Gerando Prisma Client..."
npx prisma generate || error "Falha no prisma generate"

# ─── 4. Migrar banco de dados ─────────────────────────────
log "Executando migrations do banco..."
npx prisma migrate deploy || error "Falha nas migrations"

# ─── 5. Frontend: instalar e buildar ─────────────────────
log "Instalando dependências do frontend..."
cd "$APP_DIR/frontend"
npm ci || error "Falha no npm ci (frontend)"

log "Buildando frontend Next.js..."
npm run build || error "Falha no build do frontend"

# ─── 6. Reiniciar processos PM2 ───────────────────────────
log "Reiniciando processos PM2..."
cd "$APP_DIR"

# Se PM2 já tem os processos, faz reload (zero-downtime)
if pm2 list | grep -q "attivo-backend"; then
    pm2 reload ecosystem.config.cjs --only attivo-backend
    log "Backend recarregado (zero-downtime)"
else
    pm2 start ecosystem.config.cjs
    log "Processos PM2 iniciados"
fi

if pm2 list | grep -q "attivo-frontend"; then
    pm2 reload ecosystem.config.cjs --only attivo-frontend
    log "Frontend recarregado"
fi

# Salva configuração PM2 para sobreviver reboot
pm2 save

# ─── 7. Verificar saúde ───────────────────────────────────
log "Verificando saúde do sistema..."
sleep 4

HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3333/health 2>/dev/null)
READY=$(curl -s http://localhost:3333/ready 2>/dev/null)

if [ "$HEALTH" = "200" ]; then
    log "Backend OK (HTTP 200)"
    echo "  $READY"
else
    warn "Backend não respondeu como esperado (HTTP $HEALTH)"
    warn "Verifique: pm2 logs attivo-backend"
fi

echo ""
echo "================================================"
log "Deploy concluído!"
echo "  Frontend: https://attivocorretora.com.br"
echo "  API:      https://api.attivocorretora.com.br"
echo "  Health:   https://api.attivocorretora.com.br/ready"
echo "================================================"
echo ""
