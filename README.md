# PhilanthropyAI — Business Platform

CRM and operations platform for impact-driven businesses. Track projects, contacts, impact metrics, and manage workflows with a modern dashboard.

## Quick Start

```bash
git clone https://github.com/bongartzdiaz/Phily.git
cd Phily
npm install
cp .env.example .env.local
# Edit .env.local with your database credentials
npm run dev
```

Open http://localhost:3100

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Charts:** Recharts
- **Icons:** Lucide React
- **Styling:** CSS custom properties (dual-theme light/dark)
- **Fonts:** Plus Jakarta Sans + JetBrains Mono
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** NextAuth v5
- **i18n:** next-intl (English + Dutch)
- **Drag & Drop:** @dnd-kit

## Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard — KPIs, impact chart, projects overview, SDG coverage |
| `/projects` | Project management — grid/list view, search, filters |
| `/contacts` | CRM contacts — partners, donors, stakeholders, beneficiaries |
| `/impact` | Impact metrics — SDG alignment, trends, per-project breakdown |
| `/kanban` | Kanban board — drag-and-drop project management |
| `/reports` | Report generation — templates and recent reports |
| `/settings` | Platform settings — profile, organization, preferences |

## Deployment

### Option A: Docker (recommended)

```bash
docker-compose up -d
```

### Option B: Manual

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Set DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL

# 3. Setup database
npx prisma generate
npx prisma db push
npx prisma db seed  # optional: loads demo data

# 4. Build and start
npm run build
npm start
```

### Option C: PM2 (production server)

```bash
npm run build
pm2 start npm --name "philanthropyai" -- start
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Random secret for auth sessions |
| `NEXTAUTH_URL` | Public URL of the app |

## Design System

- Light and dark theme via `data-theme` attribute on `<html>`
- All colors via CSS variables — never hardcoded
- Teal/emerald primary palette for sustainability branding
- Theme preference stored in localStorage

## License

Private repository.
