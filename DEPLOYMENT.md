# fz-mart — Deployment Guide

Production runbook for deploying fz-mart on a single Ubuntu 22.04 VPS with
Nginx (reverse proxy + TLS), PM2 (app + worker as separate processes), MySQL 8,
and Redis. Covers first-time setup, zero-downtime deploys, backups, monitoring,
and restore.

> Architecture recap: the Next.js app and the BullMQ worker are **two separate
> Node processes** against the same MySQL + Redis. The worker sends all
> email/SMS and runs the payment-expiry jobs. Both must run.

---

## 1. Server prerequisites

```bash
# Node 20 LTS (via nodesource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# MySQL 8, Redis, Nginx, tooling
sudo apt-get install -y mysql-server redis-server nginx git rclone

# PM2 process manager
sudo npm install -g pm2
```

Create the database and a least-privilege user:

```sql
CREATE DATABASE fz_mart CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'fzmart'@'127.0.0.1' IDENTIFIED BY 'a-strong-password';
GRANT ALL PRIVILEGES ON fz_mart.* TO 'fzmart'@'127.0.0.1';
FLUSH PRIVILEGES;
```

---

## 2. First deploy

```bash
sudo mkdir -p /var/www/fz-mart && sudo chown $USER /var/www/fz-mart
git clone <repo-url> /var/www/fz-mart
cd /var/www/fz-mart

cp .env.example .env
# Fill in .env — see the env var list below. Generate the secrets:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

npm ci
npx prisma migrate deploy      # apply all migrations
npm run db:seed                # first time only — seeds admin + demo data
npm run build
```

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | MySQL connection string (`mysql://fzmart:pw@127.0.0.1:3306/fz_mart`) |
| `REDIS_URL` | yes | Redis (cache, sessions, IP-block set, BullMQ) |
| `ENCRYPTION_KEY` | yes | 64 hex chars — AES-256-GCM for encrypted Settings & 2FA secrets. **Losing it makes every encrypted secret unreadable.** |
| `SESSION_SECRET` | yes | Admin session signing secret |
| `NEXT_PUBLIC_APP_URL` | yes | Public origin — absolute links, webhooks, feeds, canonical/OG, invite links |
| `NEXT_PUBLIC_BASE_URL` | yes | Same value as above (used by reset/invite flows) |
| `SENTRY_DSN` | no | Server + worker error reporting (opt-in) |
| `NEXT_PUBLIC_SENTRY_DSN` | no | Browser error reporting (opt-in) |
| `SENTRY_TRACES_SAMPLE_RATE` | no | Trace sampling (default 0.1) |

Integration credentials (SMTP, SMS, courier, fraud, payment gateways) are **not**
env vars — they're entered in Admin → Settings and stored encrypted in the DB.

### PM2 — run app + worker

`ecosystem.config.js` (create at repo root):

```js
module.exports = {
  apps: [
    {
      name: "fz-mart-web",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: "/var/www/fz-mart",
      env: { NODE_ENV: "production" },
      instances: 1,
      max_memory_restart: "500M",
    },
    {
      name: "fz-mart-worker",
      script: "npm",
      args: "run worker:start",
      cwd: "/var/www/fz-mart",
      env: { NODE_ENV: "production" },
      max_memory_restart: "300M",
    },
  ],
};
```

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup    # follow the printed command so PM2 restarts on reboot
```

---

## 3. Nginx reverse proxy + TLS

`/etc/nginx/sites-available/fz-mart`:

```nginx
server {
    server_name your-domain.com;

    client_max_body_size 6M;   # matches the 5MB upload cap

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

`X-Forwarded-For` matters: `lib/client-ip` reads it for rate limiting and
IP-blocking. Then enable + get a certificate:

```bash
sudo ln -s /etc/nginx/sites-available/fz-mart /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com   # provisions TLS + auto-renew
```

> Security headers (CSP, HSTS, X-Frame-Options, …) are emitted by the Next app
> itself (see `next.config.ts`), so you don't need to duplicate them in Nginx.

---

## 4. Zero-downtime deploys

`pm2 reload` restarts processes one at a time, so the app stays up.

```bash
cd /var/www/fz-mart
git pull
npm ci
npx prisma migrate deploy      # additive migrations only; see note
npm run build
pm2 reload ecosystem.config.js # graceful, zero-downtime
```

Put this in `scripts/deploy.sh` (already runnable) and trigger it from CI or by
hand. **Migration note:** `migrate deploy` is safe for additive changes. For a
destructive/renaming migration, take a backup first (§5) and expect a brief
incompatibility window between the old build and the new schema — schedule it.

---

## 5. Backups (Backblaze B2 via rclone)

One-time rclone setup:

```bash
rclone config   # new remote named "b2", type "Backblaze B2", keyID + appKey
# create a bucket, e.g. fz-mart-backups
```

`scripts/backup.sh` dumps → gzips → uploads → prunes to 30 daily copies. It
reads DB/backup settings from the environment (see `.env.example`). Cron it:

```bash
sudo cp /var/www/fz-mart/scripts/backup.sh /usr/local/bin/fz-mart-backup
sudo chmod +x /usr/local/bin/fz-mart-backup

# /etc/cron.d/fz-mart-backup — runs 03:15 daily, env from /etc/fz-mart.env
15 3 * * * fzmart . /etc/fz-mart.env; /usr/local/bin/fz-mart-backup >> /var/log/fz-mart-backup.log 2>&1
```

Verify a backup lands in B2 and in `$BACKUP_DIR` after the first run.

### Restore from backup

```bash
# Pull the desired dump from B2 (or use a local copy in $BACKUP_DIR):
rclone copy b2:fz-mart-backups/fz-mart-fz_mart-YYYYmmdd-HHMMSS.sql.gz /tmp

# Restore (prompts for confirmation, OVERWRITES the target DB):
cd /var/www/fz-mart
DB_NAME=fz_mart DB_USER=fzmart DB_PASSWORD=... ./scripts/restore.sh \
  /tmp/fz-mart-fz_mart-YYYYmmdd-HHMMSS.sql.gz

npx prisma migrate deploy      # if the dump predates the current schema
pm2 reload ecosystem.config.js
```

---

## 6. Health checks & monitoring

- **Endpoint:** `GET /api/health` returns `200` with
  `{"status":"ok","checks":{"database":"up","redis":"up"}}` when both
  dependencies answer, else `503`.
- **UptimeRobot:** add an HTTP(s) monitor for `https://your-domain.com/api/health`,
  interval 5 min, "keyword" type matching `"status":"ok"` (so a `503` degraded
  response also alerts). Add your email/SMS as alert contacts.
- **Sentry:** set `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` in `.env` and reload.
  Errors from the web app (server + client) and the worker then flow to Sentry;
  leave the vars blank to keep it fully disabled.
- **Logs:** `pm2 logs fz-mart-web` / `pm2 logs fz-mart-worker`.

---

## 7. Security checklist (Phase 3)

- Security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options,
  Referrer-Policy, Permissions-Policy) — emitted from `next.config.ts`.
- Admin session cookie is `httpOnly`, `secure` (prod), `sameSite=lax`, `path=/`.
- CSRF: Next Server Actions are POST-only and validate the `Origin`/`Host` match.
  Because we sit behind Nginx, ensure `proxy_set_header Host $host;` is set (above)
  so the origin check compares against the real domain. If you serve multiple
  hostnames, set `experimental.serverActions.allowedOrigins` in `next.config.ts`.
- RBAC: every admin page (via per-area layouts) and every admin server action
  calls `requirePermission()` / `requireOwner()` — authority is re-read from the
  DB each request, so deactivation/role changes take effect immediately.
- Rate limiting (Redis) on login, admin password reset, checkout, order
  tracking, and search suggestions.
- Run `npm audit` after dependency changes.
