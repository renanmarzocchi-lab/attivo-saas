#!/usr/bin/env bash
# =============================================================================
# ATTIVO — Deploy do Site Institucional na VPS
# Uso: bash deploy-site.sh
# Requer: git pull já feito, rodando como root ou usuário com sudo
# =============================================================================

set -euo pipefail

REPO_DIR="/opt/attivo/attivo-saas"
SITE_SRC="${REPO_DIR}/site"
SITE_DST="/var/www/attivo-site"
NGINX_CONF_SRC="${REPO_DIR}/deploy/nginx/attivo-site.conf"
NGINX_CONF_DST="/etc/nginx/sites-available/attivo-site"
NGINX_ENABLED="/etc/nginx/sites-enabled/attivo-site"
DOMAIN="attivocorretora.com.br"
CERTBOT_EMAIL="contato@attivocorretora.com.br"

echo ""
echo "========================================================"
echo " ATTIVO — Deploy Site Institucional"
echo "========================================================"
echo ""

# ── 1. Verificar dependências ─────────────────────────────────────────────────
echo "[1/8] Verificando dependências..."
command -v nginx    >/dev/null 2>&1 || { echo "ERRO: nginx não encontrado"; exit 1; }
command -v certbot  >/dev/null 2>&1 || { echo "ERRO: certbot não encontrado. Instale: apt install certbot python3-certbot-nginx"; exit 1; }
echo "      OK — nginx e certbot encontrados."

# ── 2. Atualizar código do repositório ───────────────────────────────────────
echo "[2/8] Atualizando repositório..."
cd "${REPO_DIR}"
git pull origin release/attivo-integrado
echo "      OK — repositório atualizado."

# ── 3. Backup da config Nginx atual (se existir) ─────────────────────────────
echo "[3/8] Backup de configurações Nginx..."
if [ -f "${NGINX_CONF_DST}" ]; then
    BACKUP="${NGINX_CONF_DST}.bak.$(date +%Y%m%d_%H%M%S)"
    cp "${NGINX_CONF_DST}" "${BACKUP}"
    echo "      Backup criado: ${BACKUP}"
else
    echo "      Nenhuma config anterior encontrada — pulando backup."
fi

# ── 4. Criar diretório e copiar arquivos do site ─────────────────────────────
echo "[4/8] Copiando arquivos do site para ${SITE_DST}..."
mkdir -p "${SITE_DST}"
rsync -av --delete \
    --exclude='.git' \
    --exclude='netlify.toml' \
    --exclude='_redirects' \
    --exclude='_headers' \
    "${SITE_SRC}/" "${SITE_DST}/"

# Permissões corretas para Nginx
chown -R www-data:www-data "${SITE_DST}"
chmod -R 755 "${SITE_DST}"
echo "      OK — ${SITE_DST} atualizado."

# ── 5. Instalar config Nginx ──────────────────────────────────────────────────
echo "[5/8] Instalando configuração Nginx..."
cp "${NGINX_CONF_SRC}" "${NGINX_CONF_DST}"

# Habilitar site se ainda não estiver
if [ ! -L "${NGINX_ENABLED}" ]; then
    ln -s "${NGINX_CONF_DST}" "${NGINX_ENABLED}"
    echo "      Site habilitado (symlink criado)."
else
    echo "      Site já habilitado."
fi

# ── 6. Testar configuração Nginx antes de recarregar ─────────────────────────
echo "[6/8] Testando configuração Nginx..."
nginx -t
echo "      OK — configuração Nginx válida."

# ── 7. SSL com Certbot ────────────────────────────────────────────────────────
echo "[7/8] Verificando certificado SSL..."

CERT_PATH="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"

if [ -f "${CERT_PATH}" ]; then
    echo "      Certificado já existe — verificando validade..."
    EXPIRY=$(openssl x509 -enddate -noout -in "${CERT_PATH}" | cut -d= -f2)
    echo "      Expira em: ${EXPIRY}"
    echo "      Para renovar manualmente: certbot renew --nginx -d ${DOMAIN} -d www.${DOMAIN}"
else
    echo "      Certificado não encontrado — obtendo novo certificado..."
    # Temporariamente usar HTTP para Certbot (config sem SSL)
    certbot --nginx \
        -d "${DOMAIN}" \
        -d "www.${DOMAIN}" \
        --email "${CERTBOT_EMAIL}" \
        --agree-tos \
        --non-interactive \
        --redirect
    echo "      OK — certificado SSL obtido."
fi

# ── 8. Recarregar Nginx ───────────────────────────────────────────────────────
echo "[8/8] Recarregando Nginx..."
systemctl reload nginx
echo "      OK — Nginx recarregado."

echo ""
echo "========================================================"
echo " Deploy concluído com sucesso!"
echo "========================================================"
echo ""
echo "  Site institucional: https://${DOMAIN}"
echo "  www redirect:       https://www.${DOMAIN} → https://${DOMAIN}"
echo "  Arquivos em:        ${SITE_DST}"
echo "  Config Nginx:       ${NGINX_CONF_DST}"
echo "  Logs acesso:        /var/log/nginx/attivo-site.access.log"
echo "  Logs erro:          /var/log/nginx/attivo-site.error.log"
echo ""
echo "  Para verificar: curl -I https://${DOMAIN}"
echo ""
