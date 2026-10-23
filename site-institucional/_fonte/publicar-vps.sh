#!/bin/bash
# Publica o site institucional da ATTIVO na VPS.
# Uso (na VPS, como root):
#   bash publicar-vps.sh            -> só mostra o que vai fazer
#   bash publicar-vps.sh --aplicar  -> faz backup e publica
set -euo pipefail

REPO=https://github.com/renanmarzocchi-lab/attivo-saas
BRANCH=site-institucional
APLICAR=${1:-}
case "$APLICAR" in --aplicar*) APLICAR=--aplicar;; esac

for bin in git curl; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "Instalando $bin..."
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "$bin" >/dev/null || { apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "$bin" >/dev/null; }
  fi
done

echo "== 1. Localizando a pasta do site atual"
CANDS=$( (grep -rls --include=index.html -e 'data-preserve-affiliate' -e 'SUSEP 262177403' \
          /var/www /srv /opt /home /root /usr/share/nginx 2>/dev/null || true) \
         | grep -v '/attivo-site-novo/' | xargs -r -n1 dirname | sort -u )
OK=()
for d in $CANDS; do
  if [ -f "$d/index.html" ] && [ -d "$d/sobre" ] && [ -d "$d/contato" ] && [ -d "$d/assets" ]; then OK+=("$d"); fi
done
echo "Candidatos: ${OK[*]:-nenhum}"
echo "Configuração do nginx (server_name / root):"
nginx -T 2>/dev/null | grep -E '^\s*(server_name|root)\s' | sed 's/^/   /' || true
# fica só com a pasta que o nginx realmente serve
NGX_ROOTS=$(nginx -T 2>/dev/null | awk '$1=="root"{gsub(/;/,"",$2); print $2}' | sort -u)
SERVIDOS=()
for d in "${OK[@]}"; do
  if printf '%s\n' $NGX_ROOTS | grep -qx "$d"; then SERVIDOS+=("$d"); fi
done
if [ "${#SERVIDOS[@]}" -ge 1 ]; then OK=("${SERVIDOS[@]}"); fi
echo "Servida pelo nginx: ${SERVIDOS[*]:-nenhuma}"
if [ "${#OK[@]}" -ne 1 ]; then
  echo "PARADO: esperava encontrar exatamente 1 pasta do site e encontrei ${#OK[@]}. Nada foi alterado."
  exit 3
fi
ROOT="${OK[0]}"
case "$ROOT" in /|/root|/home|/var|/var/www|/opt|/srv) echo "PARADO: pasta perigosa ($ROOT)"; exit 4;; esac
echo "Pasta do site: $ROOT"

echo "== 2. Baixando a versão nova (branch $BRANCH)"
NOVO=/tmp/attivo-site-novo
rm -rf "$NOVO"
git clone -q --depth 1 -b "$BRANCH" "$REPO" "$NOVO"
SRC="$NOVO/site-institucional"
test -f "$SRC/index.html" && test -f "$SRC/assets/site.css"
grep -q 'SUSEP 262177403' "$SRC/index.html"
echo "Arquivos novos: $(find "$SRC" -type f -not -path '*/_fonte/*' | wc -l)"

if [ "$APLICAR" != "--aplicar" ]; then
  echo
  echo "Simulação concluída. Para publicar de verdade rode: bash $0 --aplicar"
  exit 0
fi

echo "== 3. Backup do site atual"
BK=/root/attivo-site-backups
mkdir -p "$BK"
TS=$(date +%Y%m%d-%H%M%S)
OWNER=$(stat -c '%U:%G' "$ROOT")
tar -C "$ROOT" -czf "$BK/site-$TS.tar.gz" .
echo "Backup salvo em $BK/site-$TS.tar.gz ($(du -h "$BK/site-$TS.tar.gz" | cut -f1))"

echo "== 4. Publicando"
find "$ROOT" -mindepth 1 -delete
cp -a "$SRC/." "$ROOT/"
rm -rf "$ROOT/_fonte" "$ROOT/README.md" "$ROOT/vercel.json" "$ROOT/.vercelignore"
chown -R "$OWNER" "$ROOT"
find "$ROOT" -type d -exec chmod 755 {} +
find "$ROOT" -type f -exec chmod 644 {} +
rm -rf "$NOVO"

echo "== 5. Ajustando o cache do nginx (HTML sempre atualizado)"
CONF=$(grep -rlE "root[[:space:]]+${ROOT};" /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null | head -1 || true)
if [ -z "$CONF" ]; then
  echo "Arquivo do nginx não encontrado, cache não alterado."
else
  REAL=$(readlink -f "$CONF")
  if grep -q 'attivo_expires' "$REAL"; then
    echo "Cache já estava ajustado em $REAL"
  else
    NBK="$BK/nginx-$(basename "$REAL")-$TS.bak"
    cp "$REAL" "$NBK"
    TMP=$(mktemp)
    { printf '# ATTIVO: HTML sem cache, arquivos estáticos por 7 dias\nmap $sent_http_content_type $attivo_expires {\n    default 7d;\n    ~text/html epoch;\n    ~xml epoch;\n}\n\n'; cat "$REAL"; } > "$TMP"
    sed -i -E "s#^([[:space:]]*root[[:space:]]+${ROOT};)#\1\n    expires \$attivo_expires;#" "$TMP"
    cp "$TMP" "$REAL"; rm -f "$TMP"
    if nginx -t >/dev/null 2>&1; then
      systemctl reload nginx && echo "Cache ajustado (backup da configuração: $NBK)"
    else
      cp "$NBK" "$REAL"
      echo "Ajuste de cache recusado pelo nginx; configuração original restaurada."
      nginx -t 2>&1 | tail -3
    fi
  fi
fi

echo "== 6. Conferindo no ar"
sleep 1
for u in / /seguros/ /sobre/ /contato/ /seguro-auto/ /plano-de-saude/ /afiliados/ /sitemap.xml /assets/attivo.css /favicon.svg; do
  printf '%s %s\n' "$(curl -s -o /dev/null -w '%{http_code}' "https://attivocorretora.com.br$u")" "$u"
done
echo "Cache da página inicial: $(curl -sI https://attivocorretora.com.br/ | grep -i '^cache-control' | tr -d '\r' || echo 'sem cabeçalho')"
if curl -s https://attivocorretora.com.br/ | grep -q 'attivo.css'; then
  echo "SITE NOVO NO AR"
else
  echo "ATENCAO: a home ainda não mostra a versão nova"
fi
echo "Para voltar ao site anterior: find $ROOT -mindepth 1 -delete && tar -xzf $BK/site-$TS.tar.gz -C $ROOT"
