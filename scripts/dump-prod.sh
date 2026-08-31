#!/usr/bin/env bash
#
# Dump the production TiDB database to a local .sql file.
#
# Unlike scripts/backup.sh (which runs ON a deployed server and ships the dump
# to Backblaze), this is for pulling a copy DOWN to a development machine.
#
# Usage:  bash scripts/dump-prod.sh
# Output: backups/fzmart-prod-<timestamp>.sql
#
# READ THIS BEFORE RUNNING
#
#   1. The dump contains REAL CUSTOMER PII — names, phone numbers, delivery
#      addresses, full order history — unencrypted, on your laptop. backups/ is
#      gitignored, but that only stops an accidental commit; it does not make
#      the file safe to keep forever, copy to a shared drive, or paste into a
#      bug report. Delete it when you are done with it.
#
#   2. It must NEVER be loaded into fz_mart_test. That database is the E2E
#      suite's target, and the suite is destructive by design — it creates an
#      admin user, flips payments to MOCK, creates coupons and decrements
#      stock. The guard in tests/e2e/helpers/guard.ts checks that the HOST is
#      local; it cannot see that the ROWS are production. Load into
#      fz_mart_local instead.
#
#   3. Encrypted settings (gateway credentials, SMTP passwords) come across as
#      AES-GCM ciphertext. They decrypt locally ONLY if your ENCRYPTION_KEY
#      matches production's. If it does not, admin settings pages that read
#      them will throw — that is expected, not a broken restore.
#
# WHY THESE mysqldump FLAGS
#
#   --single-transaction  consistent snapshot without locking. Note TiDB's
#                         guarantees here differ from InnoDB's; TiDB's own
#                         recommended export tool is Dumpling. For a low-traffic
#                         store this is fine, but if the dump is ever used as a
#                         real disaster-recovery artifact, prefer Dumpling or
#                         TiDB Cloud's built-in Export.
#   --set-gtid-purged=OFF TiDB does not use MySQL GTIDs; without this the dump
#                         carries a GTID_PURGED statement that fails on import.
#   --no-tablespaces      avoids needing the PROCESS privilege, which the TiDB
#                         Cloud user does not have.
#   --skip-lock-tables    TiDB does not support LOCK TABLES the way MySQL does.
#   --ssl-mode=REQUIRED   TiDB Cloud refuses plaintext connections.

set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "No .env found — nothing to read the production URL from." >&2
  exit 1
fi

RAW_URL="$(grep -E '^DATABASE_URL' .env | head -1 | sed -E 's/^DATABASE_URL=//; s/^"//; s/"$//')"
if [[ -z "$RAW_URL" ]]; then
  echo "DATABASE_URL is not set in .env" >&2
  exit 1
fi

# Parse with node rather than a regex: the password is percent-encoded and may
# contain '@' or ':', which naive splitting mangles.
eval "$(node -e '
const u = new URL(process.argv[1]);
const q = (s) => "\x27" + String(s).replace(/\x27/g, "\x27\\\\\x27\x27") + "\x27";
console.log("DB_HOST=" + q(u.hostname));
console.log("DB_PORT=" + q(u.port || "4000"));
console.log("DB_USER=" + q(decodeURIComponent(u.username)));
console.log("DB_NAME=" + q(u.pathname.slice(1).split("?")[0]));
' "$RAW_URL")"

DB_PASSWORD="$(node -e 'process.stdout.write(decodeURIComponent(new URL(process.argv[1]).password))' "$RAW_URL")"

case "$DB_HOST" in
  localhost|127.0.0.1|::1)
    echo "DATABASE_URL points at localhost — this script is for pulling from a REMOTE database." >&2
    exit 1
    ;;
esac

MYSQLDUMP="${MYSQLDUMP:-/c/Program Files/MySQL/MySQL Server 8.4/bin/mysqldump.exe}"
if [[ ! -x "$MYSQLDUMP" ]]; then
  if command -v mysqldump >/dev/null 2>&1; then
    MYSQLDUMP="$(command -v mysqldump)"
  else
    echo "mysqldump not found. Set MYSQLDUMP=/path/to/mysqldump and retry." >&2
    exit 1
  fi
fi

mkdir -p backups
OUT="backups/fzmart-prod-$(date +%Y%m%d-%H%M%S).sql"

echo "Dumping ${DB_NAME} from ${DB_HOST} -> ${OUT}"
echo "(this reads the whole database; it may take a few minutes)"

# MYSQL_PWD keeps the password out of the process list / shell history.
MYSQL_PWD="$DB_PASSWORD" "$MYSQLDUMP" \
  --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USER" \
  --ssl-mode=REQUIRED \
  --single-transaction --quick \
  --set-gtid-purged=OFF --no-tablespaces --skip-lock-tables \
  --default-character-set=utf8mb4 \
  "$DB_NAME" > "$OUT"

echo
echo "Done: $OUT ($(du -h "$OUT" | cut -f1))"
echo
echo "Load it into the LOCAL dev database (never fz_mart_test):"
echo "  bash scripts/load-local.sh \"$OUT\""
