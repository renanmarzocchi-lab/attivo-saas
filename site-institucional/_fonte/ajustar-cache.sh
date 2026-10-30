#!/bin/bash
set -uo pipefail
ROOT=/var/www/attivo-site
BK=/root/attivo-site-backups
TS=$(date +%Y%m%d-%H%M%S)
mkdir -p "$BK"
echo "== 5. Ajustando o cache do nginx (HTML sempre atualizado)"
CONF=$(grep -RlE "root[[:space:]]+${ROOT};" /etc/nginx/sites-enabled /etc/nginx/conf.d /etc/nginx/nginx.conf 2>/dev/null | head -1 || true)
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

echo "Cache da página inicial: $(curl -sI https://attivocorretora.com.br/ | grep -i '^\(cache-control\|expires\)' | tr -d '\r' | tr '\n' ' ')"
