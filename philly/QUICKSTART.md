# Philly Dashboard — Quickstart

Get running locally in 5 minutes.

## Prerequisites

- **Node.js 20+** — `node -v`
- **MariaDB 10.11+** or **MySQL 8** — running locally or reachable
- **npm** — bundled with Node

## 1. Install

```bash
git clone <your-repo-url> philly-dashboard
cd philly-dashboard
npm install
```

## 2. Create the database

```bash
mariadb -u root -p
```

```sql
CREATE DATABASE phily CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'phily'@'localhost' IDENTIFIED BY 'changeme';
GRANT ALL PRIVILEGES ON phily.* TO 'phily'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## 3. Configure

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
DATABASE_URL="mysql://phily:changeme@localhost:3306/phily"
NEXTAUTH_SECRET="<paste output of: openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3100"
SEED_ADMIN_EMAIL="you@example.com"
SEED_ADMIN_PASSWORD="pick-a-strong-one"
```

On Windows (PowerShell) you can generate the secret with:

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

## 4. One-command setup

```bash
npm run setup
```

This does:
1. `db:generate` — generate Prisma client
2. `db:push` — sync schema to MariaDB
3. `seed` — create admin user, default pipeline with 6 stages, SOI categories, sample deals, contacts, projects
4. `preflight` — verify the app can boot

If preflight fails, it tells you exactly what's missing.

## 5. Run

```bash
npm run dev
```

Open <http://localhost:3100>, log in with your `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

## 6. First-day tour

Once logged in:

- **`/dashboard`** — KPIs at a glance
- **`/contacts`** — 4 seeded contacts; click Add to invite your first real one
- **`/deals`** — 2 seeded deals on the Sales Pipeline
- **`/projects`** — 3 seeded projects with impact metrics
- **`/settings/pipelines`** — edit the default pipeline, rename stages, add colors
- **`/settings/api-keys`** — issue an API key for programmatic access to `/api/v1/*`
- **`/settings/webhooks`** — add webhooks to get events on external URLs
- **`/ai`** — rule-based insights work now; set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` for LLM narratives
- **`/ai/ask`** — natural language queries over your data
- **Cmd/Ctrl + K** — command palette; type to jump to any page

## Common issues

**`Preflight FAILED: NEXTAUTH_SECRET placeholder value`**
You left the `.env.example` placeholder. Generate a real secret:
```bash
openssl rand -base64 32
```

**`db:Contact — table missing`**
Schema wasn't synced. Run:
```bash
npm run db:push
```

**`db:admin — no admin user`**
Schema is synced but seed didn't run. Run:
```bash
npm run seed
```

**`Port 3100 already in use`**
Change the port:
```bash
PORT=3200 npm run dev
```

Or kill what's on 3100:
```bash
# macOS/Linux
lsof -ti:3100 | xargs kill -9
# Windows (PowerShell)
Get-NetTCPConnection -LocalPort 3100 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

**`Invalid DATABASE_URL format`**
Must be `mysql://USER:PASS@HOST:PORT/DB` (MariaDB works via the MySQL protocol).

## Production deploy

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full VPS setup with Nginx + PM2 + Certbot.

## Re-running with a clean slate

```bash
mariadb -u root -p -e "DROP DATABASE phily; CREATE DATABASE phily CHARACTER SET utf8mb4;"
npm run setup
```
