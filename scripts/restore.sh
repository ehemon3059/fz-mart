#!/usr/bin/env bash
#
# Restore a fz-mart database backup produced by scripts/backup.sh.
#
# Usage:
#   ./scripts/restore.sh /var/backups/fz-mart/fz-mart-fz_mart-YYYYmmdd-HHMMSS.sql.gz
#   # or pull the latest from B2 first:
#   rclone copy b2:fz-mart-backups/<file>.sql.gz /tmp && ./scripts/restore.sh /tmp/<file>.sql.gz
#
# WARNING: this OVERWRITES the target database. Take a fresh dump first if the
# current data matters. See DEPLOYMENT.md for the full procedure.

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <backup-file.sql.gz>" >&2
  exit 1
fi

BACKUP_FILE="$1"
DB_NAME="${DB_NAME:-fz_mart}"
DB_USER="${DB_USER:-root}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_PASSWORD="${DB_PASSWORD:-}"

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

read -r -p "This will OVERWRITE database '${DB_NAME}'. Type the db name to confirm: " CONFIRM
if [[ "$CONFIRM" != "$DB_NAME" ]]; then
  echo "Aborted." >&2
  exit 1
fi

echo "[$(date -Is)] Restoring ${BACKUP_FILE} -> ${DB_NAME}"
gunzip -c "$BACKUP_FILE" | MYSQL_PWD="$DB_PASSWORD" mysql \
  --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USER" "$DB_NAME"

echo "[$(date -Is)] Restore complete. Run 'npx prisma migrate deploy' if the"
echo "backup predates the current schema, then restart the app + worker."
