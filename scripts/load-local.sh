#!/usr/bin/env bash
#
# Load a production dump into the LOCAL development database (fz_mart_local).
#
# Usage: bash scripts/load-local.sh backups/fzmart-prod-<timestamp>.sql
#
# REFUSES to target fz_mart_test. That database belongs to the E2E suite, which
# is destructive by design — it creates an admin user, rewrites the payments
# settings group to MOCK, creates coupons and decrements stock. Loading real
# customer data there would mean the next `npm run test:e2e` runs against real
# orders, and the guard in tests/e2e/helpers/guard.ts cannot catch it: that
# guard checks the HOST is local, which fz_mart_test always is. The only defence
# is keeping production rows out of that database in the first place, which is
# what the check below enforces.

set -euo pipefail

cd "$(dirname "$0")/.."

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <dump-file.sql>" >&2
  exit 1
fi

DUMP_FILE="$1"

DB_NAME="${DB_NAME:-fz_mart_local}"
DB_USER="${DB_USER:-fzmart_local}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"

# Non-negotiable, and checked before anything else touches the server.
if [[ "$DB_NAME" == "fz_mart_test" ]]; then
  cat >&2 <<'MSG'

  ✖ REFUSING to load into fz_mart_test.

    That database is the E2E suite's target and the suite DELETES and REWRITES
    data. Real customer rows must never live there — the host-based guard in
    tests/e2e/helpers/guard.ts cannot tell production rows from fixtures.

    Use fz_mart_local (the default), or set DB_NAME to another database.

MSG
  exit 1
fi

# Only now that the target is known safe, validate the input file. Ordering
# matters: the refusal above must fire even for a bad path, so that a typo in
# the filename can never hide the fact that the TARGET was wrong.
if [[ ! -f "$DUMP_FILE" ]]; then
  echo "Dump file not found: $DUMP_FILE" >&2
  exit 1
fi

MYSQL="${MYSQL_CLIENT:-/c/Program Files/MySQL/MySQL Server 8.4/bin/mysql.exe}"
if [[ ! -x "$MYSQL" ]]; then
  if command -v mysql >/dev/null 2>&1; then
    MYSQL="$(command -v mysql)"
  else
    echo "mysql client not found. Set MYSQL_CLIENT=/path/to/mysql and retry." >&2
    exit 1
  fi
fi

if [[ -z "${DB_PASSWORD:-}" ]]; then
  read -r -s -p "Password for ${DB_USER}@${DB_HOST}/${DB_NAME}: " DB_PASSWORD
  echo
fi

echo "This OVERWRITES everything currently in '${DB_NAME}'."
read -r -p "Type the database name to confirm: " CONFIRM
if [[ "$CONFIRM" != "$DB_NAME" ]]; then
  echo "Aborted." >&2
  exit 1
fi

echo "Loading ${DUMP_FILE} -> ${DB_NAME} ..."
MYSQL_PWD="$DB_PASSWORD" "$MYSQL" \
  --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USER" \
  --default-character-set=utf8mb4 \
  "$DB_NAME" < "$DUMP_FILE"

echo
echo "Loaded. Point the app at it by setting this in .env:"
echo
echo "  DATABASE_URL=\"mysql://${DB_USER}:<password>@127.0.0.1:3306/${DB_NAME}\""
echo
echo "Then check the schema matches the current migrations:"
echo "  npx prisma migrate status"
echo
echo "Note: .env.test keeps its own DATABASE_URL (fz_mart_test) and is unaffected."
