#!/usr/bin/env bash
#
# fz-mart database backup: mysqldump -> gzip -> upload to Backblaze B2 via
# rclone, keeping 30 daily copies both locally and remotely.
#
# Prerequisites (one-time):
#   - mysqldump, gzip, rclone installed on the host.
#   - rclone configured with a remote named "b2" pointing at a Backblaze B2
#     bucket:  rclone config   (type: Backblaze B2; give it your keyID + appKey)
#   - This script's env vars set (see below), e.g. sourced from /etc/fz-mart.env.
#
# Cron (daily at 03:15, log to a file):
#   15 3 * * *  /var/www/fz-mart/scripts/backup.sh >> /var/log/fz-mart-backup.log 2>&1
#
# Restore: see DEPLOYMENT.md → "Restore from backup".

set -euo pipefail

# ── Config (override via environment) ─────────────────────────────
DB_NAME="${DB_NAME:-fz_mart}"
DB_USER="${DB_USER:-root}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
# DB_PASSWORD may be empty (local dev) — passed via MYSQL_PWD to avoid it
# showing in the process list.
DB_PASSWORD="${DB_PASSWORD:-}"

BACKUP_DIR="${BACKUP_DIR:-/var/backups/fz-mart}"
RCLONE_REMOTE="${RCLONE_REMOTE:-b2:fz-mart-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
FILENAME="fz-mart-${DB_NAME}-${TIMESTAMP}.sql.gz"
LOCAL_PATH="${BACKUP_DIR}/${FILENAME}"

mkdir -p "$BACKUP_DIR"

echo "[$(date -Is)] Dumping ${DB_NAME} -> ${LOCAL_PATH}"
# --single-transaction: consistent snapshot without locking (InnoDB).
# --quick: stream rows rather than buffering a huge table in memory.
MYSQL_PWD="$DB_PASSWORD" mysqldump \
  --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USER" \
  --single-transaction --quick --routines --triggers \
  "$DB_NAME" | gzip -9 > "$LOCAL_PATH"

echo "[$(date -Is)] Uploading to ${RCLONE_REMOTE}"
rclone copy "$LOCAL_PATH" "$RCLONE_REMOTE" --b2-hard-delete

# ── Prune old local copies ────────────────────────────────────────
echo "[$(date -Is)] Pruning local backups older than ${RETENTION_DAYS} days"
find "$BACKUP_DIR" -name 'fz-mart-*.sql.gz' -type f -mtime "+${RETENTION_DAYS}" -delete

# ── Prune old remote copies ───────────────────────────────────────
echo "[$(date -Is)] Pruning remote backups older than ${RETENTION_DAYS} days"
rclone delete "$RCLONE_REMOTE" --min-age "${RETENTION_DAYS}d" --b2-hard-delete || true

echo "[$(date -Is)] Backup complete: ${FILENAME}"
