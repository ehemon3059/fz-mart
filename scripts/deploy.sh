#!/usr/bin/env bash
#
# Zero-downtime deploy: pull, install, migrate, build, graceful reload.
# Run from the repo root on the server. See DEPLOYMENT.md §4.

set -euo pipefail
cd "$(dirname "$0")/.."

echo "[deploy] git pull"
git pull --ff-only

echo "[deploy] npm ci"
npm ci

echo "[deploy] prisma migrate deploy"
npx prisma migrate deploy

echo "[deploy] build"
npm run build

echo "[deploy] pm2 reload (graceful)"
pm2 reload ecosystem.config.js

echo "[deploy] done"
