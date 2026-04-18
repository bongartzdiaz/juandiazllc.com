# Philly Dashboard — Production Deployment Runbook

Complete step-by-step guide to push the app live on a VPS behind a domain with HTTPS, auto-restart, and rolling deploys.

**Two paths** — pick one:

- **Path A: Bare-metal (PM2 + Nginx + MariaDB)** — recommended. Fastest to debug, smallest resource footprint, cheapest on small VPS.
- **Path B: Docker (docker compose)** — recommended if you already run other dockerised services.

Both use the same `.env` variables. Switch later without losing data.

---

## 0. Before you start

You need:
- A VPS running Ubuntu 22.04 or 24.04 (any cloud is fine — Hetzner, Digital Ocean, AWS Lightsail, etc.)
- A domain name you control (e.g. `dashboard.your-company.com`)
- SSH access as `root` or a sudo-able user
- ~30 minutes

---

# Path A — Bare metal (PM2 + Nginx + MariaDB)

## A1. Point DNS at the server

In your DNS provider:

```
Type:  A
Name:  dashboard              (or @ for apex)
Value: <YOUR.SERVER.IP.ADDRESS>
TTL:   Auto (or 300)
```

Wait 5–30 min, then verify from your laptop:

```bash
dig +short dashboard.your-company.com   # should return your server IP
```

## A2. Install system packages

SSH in, then:

```bash
sudo apt update && sudo apt upgrade -y

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# MariaDB
sudo apt install -y mariadb-server
sudo systemctl enable --now mariadb
sudo mysql_secure_installation    # answer yes to everything except anonymous users/root remote

# Nginx + Certbot + PM2 + git
sudo apt install -y nginx certbot python3-certbot-nginx git
sudo npm install -g pm2

# Sanity
node -v && npm -v && pm2 -v && nginx -v && mariadb --version
```

## A3. Create the database

```bash
sudo mariadb
```

```sql
CREATE DATABASE phily CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'phily'@'localhost' IDENTIFIED BY 'A_STRONG_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON phily.* TO 'phily'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Test:

```bash
mariadb -u phily -p phily   # enter the password; should drop into prompt
EXIT;
```

## A4. Clone and configure

```bash
sudo mkdir -p /var/www && sudo chown "$USER":"$USER" /var/www
cd /var/www
git clone <YOUR_REPO_URL> philly-dashboard
cd philly-dashboard

cp .env.example .env.local
nano .env.local
```

Minimum required values:

```env
DATABASE_URL="mysql://phily:A_STRONG_PASSWORD_HERE@localhost:3306/phily"
NEXTAUTH_SECRET="<paste output of: openssl rand -base64 32>"
NEXTAUTH_URL="https://dashboard.your-company.com"
SEED_ADMIN_EMAIL="you@your-company.com"
SEED_ADMIN_PASSWORD="<your admin password>"
NODE_ENV="production"
```

> **Important:** `NEXTAUTH_URL` MUST start with `https://` in production — the preflight will fail otherwise. Use `http://localhost:3100` only for local dev.

## A5. First-time setup (one command)

```bash
npm run setup
```

This runs: `npm install` → `db:generate` → `db:push` → `seed` → `preflight`.

If preflight prints `✗ Preflight FAILED`, read the reason and fix it. Common issues:

- `NEXTAUTH_SECRET placeholder value` — you kept the example secret. Regenerate with `openssl rand -base64 32`.
- `db:connect timed out` — MariaDB isn't running or credentials are wrong. Try `mariadb -u phily -p phily`.
- `NEXTAUTH_URL must be https`  — change the URL in `.env.local`.

## A6. Build

```bash
npm run build
```

This produces a self-contained runtime in `.next/standalone/`.

## A7. Start with PM2

```bash
mkdir -p logs
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
# Copy-paste and run the command PM2 prints (it enables auto-start on reboot)

pm2 status
```

Verify the process is listening:

```bash
curl http://127.0.0.1:3100/api/health
# → {"status":"ok", ... "checks":[{"name":"database","ok":true,...}]}
```

## A8. Put Nginx in front

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/philly-dashboard
sudo nano /etc/nginx/sites-available/philly-dashboard
# Replace DOMAIN.EXAMPLE.COM with your real domain (3 places)

sudo ln -sf /etc/nginx/sites-available/philly-dashboard /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t    # must say "syntax is ok"
sudo systemctl reload nginx
```

You can now reach the app on plain HTTP: `curl -I http://dashboard.your-company.com`.

## A9. Enable HTTPS (Let's Encrypt)

```bash
sudo certbot --nginx -d dashboard.your-company.com
```

Follow the prompts:
- Enter your email (used for expiry warnings)
- Agree to ToS
- Choose whether to share your email with EFF (optional)
- When asked about the redirect, pick **option 2: redirect all HTTP to HTTPS**

Certbot rewrites your Nginx config, opens a cert from Let's Encrypt, and schedules auto-renewal.

Verify:

```bash
curl -I https://dashboard.your-company.com            # should say "200 OK"
curl -I http://dashboard.your-company.com             # should say "301 Moved Permanently"
sudo certbot renew --dry-run                          # must say "success"
```

Uncomment the HSTS header in `/etc/nginx/sites-enabled/philly-dashboard` once you're sure HTTPS is rock-solid:

```nginx
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
```

Then reload: `sudo nginx -t && sudo systemctl reload nginx`.

## A10. Log in

Open <https://dashboard.your-company.com> and log in with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

**Change your password immediately** from `/settings`.

## A11. Rolling re-deploys

From anywhere you can SSH in:

```bash
cd /var/www/philly-dashboard
./deploy/deploy.sh
```

The script:
1. Pulls latest git
2. `npm ci` with exact lockfile versions
3. Regenerates Prisma client
4. Syncs schema (`db:push`)
5. Runs preflight (fails fast if env/DB broken)
6. Builds
7. `pm2 reload` (zero-downtime)
8. Smoke-tests `/api/health`

Set environment overrides as needed:

```bash
BRANCH=staging ./deploy/deploy.sh
SKIP_MIGRATE=1 ./deploy/deploy.sh       # hot-swap code only, no db change
```

---

# Path B — Docker Compose

Everything ships in two containers: `mariadb` and the app. Nginx + Certbot live outside, terminating TLS before forwarding to `127.0.0.1:3100`.

## B1. DNS + system packages (same as A1, A2 — skip MariaDB + Node, keep Nginx + Certbot)

```bash
sudo apt install -y nginx certbot python3-certbot-nginx docker.io docker-compose-plugin git
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
# log out + back in so the group change takes effect
```

## B2. Clone + configure

```bash
sudo mkdir -p /var/www && sudo chown "$USER":"$USER" /var/www
cd /var/www
git clone <YOUR_REPO_URL> philly-dashboard
cd philly-dashboard

# Create a .env file for docker-compose (NOT .env.local)
cat > .env << 'EOF'
DB_PASSWORD=A_STRONG_DB_PASSWORD
DB_ROOT_PASSWORD=A_STRONG_ROOT_PASSWORD
NEXTAUTH_SECRET=PASTE_OPENSSL_RAND_BASE64_32_OUTPUT
NEXTAUTH_URL=https://dashboard.your-company.com
EOF

chmod 600 .env
```

## B3. First-time setup

```bash
docker compose up -d db                             # start DB first
docker compose run --rm app npm run db:generate
docker compose run --rm app npm run db:push
docker compose run --rm app npm run seed
docker compose up -d app
docker compose ps                                   # both healthy
```

Check logs if anything looks wrong:

```bash
docker compose logs -f app
```

## B4. Nginx + HTTPS (same as A8, A9)

Copy the Nginx template, fill in the domain, reload, run certbot. Nginx proxies to `127.0.0.1:3100` where the app container is listening.

## B5. Re-deploys (Docker)

```bash
cd /var/www/philly-dashboard
git pull
docker compose up -d --build app
docker compose exec app npm run db:push   # only if schema changed
```

---

# Verifying the deployment

All paths should return these:

```bash
# App is alive
curl -i https://dashboard.your-company.com                   # 200 OK, HTML
curl -i https://dashboard.your-company.com/api/health        # 200 OK, {"status":"ok",...}

# HTTP redirects to HTTPS
curl -I http://dashboard.your-company.com                    # 301

# Login page renders
curl -s https://dashboard.your-company.com/login | head -20

# DB is reachable
curl -s https://dashboard.your-company.com/api/health | grep '"ok":true'
```

---

# Monitoring

Point any uptime monitor (UptimeRobot, BetterUptime, Pingdom) at:

```
https://dashboard.your-company.com/api/health
```

Health response is `200` when DB is reachable, `503` when it's not. Scrape interval: 60s is plenty.

PM2 built-in metrics:

```bash
pm2 monit                     # live CPU/memory dashboard
pm2 logs philly-dashboard     # tail logs
pm2 status                    # snapshot
```

---

# Troubleshooting

**App 502s through Nginx**
```bash
pm2 logs philly-dashboard --lines 100
curl http://127.0.0.1:3100/api/health    # local check — if this fails, app is down
sudo nginx -t && sudo systemctl reload nginx
```

**Login returns 500 / redirect loop**
- `NEXTAUTH_URL` must exactly match the public URL, including `https://` and no trailing slash.
- `NEXTAUTH_SECRET` must be set and ≥32 chars.
- Nginx must forward `X-Forwarded-Proto: $scheme` (the provided template does).

**Database connection refused**
```bash
systemctl status mariadb
mariadb -u phily -p phily      # can you log in?
grep DATABASE_URL .env.local
```

**Preflight fails on a working-looking setup**
Run it manually to see the exact failure:
```bash
NODE_ENV=production npm run preflight
```

**Port 3100 already in use**
```bash
sudo lsof -i :3100
pm2 delete all
pm2 start ecosystem.config.js --env production
```

**Certbot won't issue — "challenge failed"**
- DNS may not have propagated — check `dig +short your-domain.com`.
- Nginx must be running on port 80 AND accessible from the internet.
- Firewall: `sudo ufw allow 80 && sudo ufw allow 443`

---

# Quick command reference

| Command | What it does |
|---|---|
| `npm run setup` | First-time: install + db + seed + preflight |
| `npm run preflight` | Verify env + DB readiness (exit 0/1) |
| `npm run build` | Build the production bundle |
| `npm run start:prod` | Preflight then start on `PORT` |
| `./deploy/deploy.sh` | Full rolling deploy from latest git |
| `pm2 status` | Is the process running? |
| `pm2 reload philly-dashboard` | Zero-downtime reload |
| `pm2 logs philly-dashboard` | Tail logs |
| `sudo nginx -t && sudo systemctl reload nginx` | Reload nginx config |
| `npm run db:push` | Sync Prisma schema to DB |
| `npm run seed` | Re-run seed (idempotent) |
| `curl localhost:3100/api/health` | Liveness probe |

---

# Going further

- **Automated backups** — put `mysqldump` in a nightly cron, ship to S3 or Backblaze.
- **CI/CD** — trigger `./deploy/deploy.sh` from GitHub Actions on push-to-main.
- **Error reporting** — set `SENTRY_DSN` in `.env.local`.
- **CDN / asset optimization** — front Nginx with Cloudflare for free CDN + DDoS protection.
- **Multi-server** — if you scale beyond one VPS, move MariaDB to a managed service (DigitalOcean Managed DB, AWS RDS, PlanetScale, etc.) and point `DATABASE_URL` at it.
