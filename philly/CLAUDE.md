# PhilanthropyAI — Project Context for Claude Code

## Project
PhilanthropyAI Business Platform — CRM and operations dashboard.
Target: CSR companies, real estate, hospitality (extensible to logistics).
Live: TBD (will be deployed to server)

## Tech Stack
- Next.js 16 (App Router, TypeScript)
- Recharts for charts
- Lucide React icons
- CSS custom properties (dual-theme light/dark)
- Plus Jakarta Sans + JetBrains Mono (Google Fonts via next/font)
- Prisma ORM + PostgreSQL (schema ready, not yet connected)
- NextAuth v5 (configured, not yet activated)
- next-intl (EN/NL translations ready)
- @dnd-kit (installed, drag-and-drop ready for implementation)

## Pages
- `/` — Dashboard (KPIs, impact chart, projects, SDG coverage, activity feed)
- `/projects` — Project list with grid/list view, search, filters, SDG dots
- `/contacts` — Contact cards with type badges (partner/donor/stakeholder/beneficiary)
- `/impact` — Impact metrics, SDG alignment grid, per-project breakdown, trend chart
- `/kanban` — 4-column kanban board with priority badges and assignees
- `/reports` — Report templates + recent reports table
- `/settings` — Profile, organization, preferences, integrations

## Style Conventions
- Inline styles with CSS variables (no CSS modules)
- CSS vars: `--bg`, `--panel`, `--txt`, `--txt2`, `--txt3`, `--border`, `--accent`
- Color system: `--g` (green), `--o` (orange), `--y` (yellow), `--r` (red), `--b` (teal), `--p` (purple)
- Each color has `-bg`, `-border`, `-txt` variants
- borderRadius: 12 for cards, 8 for small elements
- `.mono` class for numeric values (JetBrains Mono)
- Theme stored in localStorage key `pai-theme`

## Database (Prisma — not yet connected)
Schema at `prisma/schema.prisma` with models:
Organization, User, Project, ProjectMilestone, Contact, ContactProject,
ImpactMetric, KanbanBoard, KanbanColumn, KanbanCard, DashboardLayout,
CustomPage, PageBlock

## Deployment
- `npm run build` — production build
- `npm start` — production server (default port 3000)
- `npm run dev` — dev server on port 3100
- Configure `DATABASE_URL` and `NEXTAUTH_SECRET` in `.env.local`
- Run `npx prisma generate && npx prisma db push` after DB setup

## GitHub
- Repo: https://github.com/bongartzdiaz/Phily (private)
- Branch: master
