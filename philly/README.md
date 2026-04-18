# Philly Dashboard

CRM and operations platform for impact-driven organisations. Track projects, contacts, impact metrics, and run a kanban pipeline — all multi-tenant, all real DB-backed.

## Quick Start

```bash
git clone https://github.com/bongartzdiaz/philly-dashboard.git
cd philly-dashboard
npm install
cp .env.example .env.local
# Edit .env.local: set DATABASE_URL + NEXTAUTH_SECRET
npm run db:generate
npm run db:push
npm run seed
npm run dev
```

Open http://localhost:3100 and log in with the credentials printed by `npm run seed`
(default: `admin@philly.local` / `changeme123` — change these before any non-local deploy).

## Tech Stack

- **Framework:** Next.js 16.1 (App Router, TypeScript, Turbopack)
- **Database:** MariaDB 8.4 / MySQL via Prisma 7 + `@prisma/adapter-mariadb`
- **Auth:** NextAuth v4 (Credentials provider, JWT sessions, PrismaAdapter)
- **Charts:** Recharts
- **Icons:** Lucide React
- **Styling:** CSS custom properties (dual-theme light/dark)
- **Fonts:** Plus Jakarta Sans + JetBrains Mono
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
| `/calendar` | Calendar view of milestones and bookings |
| `/reports` | Report generation — templates and recent reports |
| `/settings` | Platform settings — profile, organization, preferences |
| `/login` | Sign-in page (NextAuth Credentials) |

## API Surface

All routes are org-scoped via the JWT session and enforce RBAC.

| Method | Path | Roles |
|--------|------|-------|
| `GET` | `/api/me` | any authenticated user |
| `GET / POST` | `/api/projects` | GET: any · POST: admin/manager |
| `GET / PATCH / DELETE` | `/api/projects/[id]` | GET: any · PATCH: admin/manager · DELETE: admin |
| `GET / POST` | `/api/contacts` | GET: any · POST: admin/manager |
| `GET / PATCH / DELETE` | `/api/contacts/[id]` | GET: any · PATCH: admin/manager · DELETE: admin |
| `GET` | `/api/kanban/boards` | any authenticated user |
| `POST` | `/api/kanban/cards` | admin/manager |
| `PATCH / DELETE` | `/api/kanban/cards/[id]` | admin/manager |
| `GET / POST` | `/api/impact` | GET: any · POST: admin/manager |
| `GET / POST` | `/api/auth/[...nextauth]` | public (NextAuth) |

## Deployment

### Option A: Docker Compose (recommended)

```bash
cp .env.example .env
# Edit .env with production values
docker-compose up -d
```

The compose file ships MariaDB + the Next.js app together.

### Option B: Manual

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Set DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL

# 3. Generate Prisma client + push schema
npm run db:generate
npm run db:push        # or: npm run db:migrate (if you have migrations)

# 4. Seed first admin user + sample data
npm run seed

# 5. Build and start
npm run build
npm start              # listens on port 3100 (override with PORT)
```

### Option C: PM2

```bash
npm run build
pm2 start npm --name "philly-dashboard" -- start
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | MariaDB / MySQL connection string (`mysql://user:pw@host:3306/db`) | yes |
| `NEXTAUTH_SECRET` | Random secret (`openssl rand -base64 32`) | yes (prod) |
| `NEXTAUTH_URL` | Public URL of the app (e.g. `https://dashboard.example.com`) | yes (prod) |
| `SEED_ADMIN_EMAIL` | Email of the admin user created by `npm run seed` | no |
| `SEED_ADMIN_PASSWORD` | Password for the seeded admin | no |

## Multi-tenancy & Auth

- Every record is scoped to an `Organization`. Users belong to exactly one org.
- API routes resolve the caller's org from the JWT and reject cross-org reads.
- Roles: `admin`, `manager`, `viewer`. Enforced via `requireRole()` in `src/lib/auth-helpers.ts`.
- Server-side route protection runs in `src/middleware.ts` (page routes only — API routes return their own 401 JSON).

## Design System

- Light and dark theme via `data-theme` attribute on `<html>`
- All colors via CSS variables — never hardcoded
- Teal/emerald primary palette
- Theme preference stored in localStorage

## License

Private repository.
