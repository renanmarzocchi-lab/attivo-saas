#!/bin/bash
# restore.sh — Restaurar banco a partir de backup
#
# Uso:
#   bash /opt/attivo/scripts/restore.sh                   (restaura o mais recente)
#   bash /opt/attivo/scripts/restore.sh attivo_2026-03-30_030000.sql.gz

set -euo pipefail

BACKUP_DIR="/opt/attivo-backups"
CONTAINER="attivo_postgres"
DB_USER="attivo"
DB_NAME="attivo_saas"

RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'; NC='\033[0m'

echo ""
echo "╔═══════════════════════════════════════╗"
echo "║   Attivo SaaS — Restore de Backup    ║"
echo "╚═══════════════════════════════════════╝"
echo ""

# Seleciona o arquivo
if [ -n "${1:-}" ]; then
    FILE="$BACKUP_DIR/$1"
else
    FILE=$(ls -t "$BACKUP_DIR"/attivo_*.sql.gz 2>/dev/null | head -1)
fi

[ -z "$FILE" ] && { echo -e "${RED}[ERRO]${NC} Nenhum backup encontrado em $BACKUP_DIR"; exit 1; }
[ ! -f "$FILE" ] && { echo -e "${RED}[ERRO]${NC} Arquivo não encontrado: $FILE"; exit 1; }

echo -e "${YELLOW}Arquivo selecionado:${NC} $FILE ($(du -sh "$FILE" | cut -f1))"
echo ""
echo -e "${RED}ATENÇÃO: Esta operação vai SUBSTITUIR o banco $DB_NAME atual!${NC}"
echo -n "Confirme digitando 'RESTAURAR': "
read -r CONFIRM
[ "$CONFIRM" != "RESTAURAR" ] && { echo "Cancelado."; exit 0; }

echo ""
echo "Iniciando restore: $(date '+%Y-%m-%d %H:%M:%S')"

# Para PM2 para evitar gravações durante restore
echo "Parando aplicação..."
pm2 stop all 2>/dev/null || true

# Recria banco vazio
echo "Recriando banco de dados..."
docker exec "$CONTAINER" \
    psql -U "$DB_USER" -d postgres \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$DB_NAME' AND pid <> pg_backend_pid();" \
    -c "DROP DATABASE IF EXISTS $DB_NAME;" \
    -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

# Restaura
echo "Restaurando dados..."
gunzip -c "$FILE" | docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -q

# Reinicia PM2
echo "Reiniciando aplicação..."
pm2 start all

echo ""
echo -e "${GREEN}Restore concluído: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo "Verifique: curl http://localhost:3333/ready"
