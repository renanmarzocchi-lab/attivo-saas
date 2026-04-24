#!/bin/bash
# backup.sh — Backup automático do banco PostgreSQL
#
# Instalado pelo setup-vps.sh no crontab do root.
# Executa diariamente às 03:00 (horário da VPS).
#
# O que faz:
#   1. pg_dump dentro do container Docker
#   2. Comprime com gzip
#   3. Mantém os últimos 14 dias (apaga backups antigos)
#   4. Loga resultado em /var/log/attivo/backup.log
#
# Crontab configurado pelo setup-vps.sh:
#   0 3 * * * /opt/attivo/scripts/backup.sh >> /var/log/attivo/backup.log 2>&1

set -euo pipefail

BACKUP_DIR="/opt/attivo-backups"
CONTAINER="attivo_postgres"
DB_USER="attivo"
DB_NAME="attivo_saas"
KEEP_DAYS=14
TIMESTAMP=$(date '+%Y-%m-%d_%H%M%S')
FILENAME="attivo_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "--- Backup iniciado: $(date '+%Y-%m-%d %H:%M:%S') ---"

# ─── 1. Verificar se container está rodando ───────────────────────────────────
if ! docker inspect -f '{{.State.Running}}' "$CONTAINER" 2>/dev/null | grep -q true; then
    echo "[ERRO] Container $CONTAINER não está rodando. Backup cancelado."
    exit 1
fi

# ─── 2. Dump + compressão ────────────────────────────────────────────────────
echo "Criando dump: $FILENAME"
docker exec "$CONTAINER" \
    pg_dump -U "$DB_USER" -d "$DB_NAME" \
    --no-password \
    --format=plain \
    --no-owner \
    --no-privileges \
    | gzip -9 > "$BACKUP_DIR/$FILENAME"

# ─── 3. Verificar integridade ─────────────────────────────────────────────────
SIZE=$(du -sh "$BACKUP_DIR/$FILENAME" | cut -f1)
# Testa se o gzip está íntegro (sem descompactar)
if gzip -t "$BACKUP_DIR/$FILENAME" 2>/dev/null; then
    echo "OK — Arquivo: $BACKUP_DIR/$FILENAME ($SIZE)"
else
    echo "[ERRO] Arquivo corrompido: $BACKUP_DIR/$FILENAME"
    rm -f "$BACKUP_DIR/$FILENAME"
    exit 1
fi

# ─── 4. Remover backups antigos (> KEEP_DAYS dias) ────────────────────────────
echo "Limpando backups com mais de ${KEEP_DAYS} dias..."
DELETED=$(find "$BACKUP_DIR" -name "attivo_*.sql.gz" -mtime "+${KEEP_DAYS}" -print -delete | wc -l)
echo "Removidos: $DELETED arquivo(s)"

# ─── 5. Listar backups disponíveis ────────────────────────────────────────────
echo "Backups disponíveis:"
ls -lh "$BACKUP_DIR"/attivo_*.sql.gz 2>/dev/null || echo "(nenhum)"

echo "--- Backup concluído: $(date '+%Y-%m-%d %H:%M:%S') ---"
echo ""
