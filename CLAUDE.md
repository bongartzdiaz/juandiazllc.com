# CLAUDE.md — Project context voor Claude Code

## Project
HMB Energy Ops Dashboard — marketing operations platform voor HMB Energy.
Live: http://skalo-ai.com/hmb-dashboard

## Tech stack
- Next.js 16 (App Router, TypeScript)
- Recharts voor grafieken
- Lucide React iconen
- CSS custom properties (geen Tailwind classes, alleen `@import "tailwindcss"` in globals.css)
- Plus Jakarta Sans + JetBrains Mono (Google Fonts via next/font)
- Light/dark theme via `data-theme` attribuut op `<html>`

## Deployment
- Server: Digital Ocean droplet `root@skalo-ai.com` (Ubuntu, nginx/1.24.0)
- App draait op poort 3100 via PM2 (process naam: `hmb-dashboard`)
- Nginx config: `/etc/nginx/sites-enabled/skalo` — proxied `/hmb-dashboard` naar `localhost:3100`
- `next.config.ts` heeft `basePath: '/hmb-dashboard'`
- Deploy workflow:
  1. `npm run build` lokaal
  2. `tar czf` (exclude node_modules, .git, .env.local, .next/cache)
  3. `scp` naar `/var/www/hmb-nextjs/`
  4. `ssh root@skalo-ai.com "cd /var/www/hmb-nextjs && npm install --production && pm2 restart hmb-dashboard"`

## API integraties
- **Meta Marketing API v21.0**: live campagne data, spend, CPL, leads
- **GoHighLevel v2**: pipeline, contacts, deals, omzet (env: GHL_API_KEY, GHL_LOCATION_ID)
- **DM Champ**: chatbot gesprekken, kwalificatie stats (env: DMCHAMP_API_KEY)
- **Google Ads**: campagnes, zoekwoorden, conversies (env: GOOGLE_ADS_*)
- Alle API calls gaan via `/api/*` routes (server-side, credentials in .env.local)

## Architectuur
- Pagina's in `src/app/` — elke pagina is een standalone component met inline styles
- API routes in `src/app/api/` — proxyen naar externe APIs
- Hooks in `src/hooks/` — `useMetaAds`, `useSales`, `useChatbot`, `useGoogleAds`
- API clients in `src/lib/api/` — gescheiden per service
- Shared types in `src/lib/types.ts`
- UI components: `KpiCard`, `GoalProgress`, `StatusBadge`
- Layout: `Sidebar` (vast 230px links) + `Topbar` per pagina

## Stijl conventies
- Inline styles (geen CSS modules of Tailwind classes)
- CSS vars: `--bg`, `--panel`, `--txt`, `--txt2`, `--txt3`, `--border`, `--g` (groen), `--r` (rood), `--b` (blauw), `--o` (oranje), `--y` (geel)
- Elke kleur heeft `-bg`, `-border`, `-txt` varianten (bijv. `--g-bg`, `--g-txt`)
- borderRadius: 12 voor cards, 8 voor kleine elementen
- Font sizes: 10-10.5 voor labels, 13 voor body, 26 voor KPI values
- `.mono` class voor numerieke waarden (JetBrains Mono)

## Commands
- `npm run dev` — dev server op poort 3100
- `npm run build` — productie build
- `npm start` — productie server

## GitHub
- Repo: https://github.com/bongartzdiaz/hmb-dashboard (private)
- Collaborators: bongartzdiaz (owner), mistersocial99 (write)
