# HMB Energy Ops Dashboard

Marketing operations dashboard voor HMB Energy. Toont real-time data van Meta Ads, Google Ads, GoHighLevel (CRM) en DM Champ (chatbot).

**Live:** [skalo-ai.com/hmb-dashboard](http://skalo-ai.com/hmb-dashboard)

## Quick start

```bash
# 1. Clone
git clone https://github.com/bongartzdiaz/hmb-dashboard.git
cd hmb-dashboard

# 2. Installeer dependencies
npm install

# 3. Kopieer env en vul je API keys in
cp .env.example .env.local

# 4. Start dev server
npm run dev
```

Open [http://localhost:3100/hmb-dashboard](http://localhost:3100/hmb-dashboard)

## Pagina's

| Route | Beschrijving |
|-------|-------------|
| `/` | Command Center — KPI's, journey, signalen, charts |
| `/meta` | Meta Ads — campagnes, spend, CPL, budgetverdeling |
| `/google` | Google Ads — zoekwoorden, conversies, CPA |
| `/chatbot` | Chatbot — gesprekken, kwalificatie, reactietijd |
| `/sales` | Sales (GHL) — pipeline, deals, omzet |
| `/conversie` | Funnel — volledige journey, knelpunten, bronvergelijking |
| `/agenda` | Agenda — weekoverzicht buitendienstafspraken |

## Tech stack

- **Next.js 16** (App Router, TypeScript)
- **Recharts** voor grafieken
- **Lucide React** voor iconen
- CSS custom properties voor light/dark theme
- Plus Jakarta Sans + JetBrains Mono fonts

## API integraties

| Service | Env variabelen | Docs |
|---------|---------------|------|
| Meta Marketing API | `META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID` | [Meta API](https://developers.facebook.com/docs/marketing-apis/) |
| Google Ads API | `GOOGLE_ADS_*` | [Google Ads API](https://developers.google.com/google-ads/api/) |
| GoHighLevel | `GHL_API_KEY`, `GHL_LOCATION_ID` | [GHL API](https://highlevel.stoplight.io/) |
| DM Champ | `DMCHAMP_API_KEY` | Interne API |

## Deployment (Digital Ocean)

De app draait op een Digital Ocean droplet met PM2 + nginx.

```bash
# Build
npm run build

# Upload naar server
scp -r .next package.json package-lock.json next.config.ts root@skalo-ai.com:/var/www/hmb-nextjs/

# Op de server
cd /var/www/hmb-nextjs
npm install --production
pm2 restart hmb-dashboard
```

Nginx proxied `/hmb-dashboard` naar `localhost:3100`.

## Structuur

```
src/
├── app/                  # Next.js pagina's en API routes
│   ├── api/              # Backend API endpoints (meta, sales, chatbot, google)
│   ├── meta/             # Meta Ads pagina
│   ├── google/           # Google Ads pagina
│   ├── chatbot/          # Chatbot pagina
│   ├── sales/            # Sales pagina
│   ├── conversie/        # Funnel pagina
│   ├── agenda/           # Agenda pagina
│   └── page.tsx          # Dashboard homepage
├── components/
│   ├── dashboard/        # Dashboard-specifieke componenten
│   ├── layout/           # Sidebar, Topbar
│   └── ui/               # Herbruikbare UI componenten (KpiCard, etc.)
├── hooks/                # React hooks (useMetaAds, useSales, etc.)
└── lib/
    ├── api/              # API client functies
    ├── types.ts          # TypeScript types
    └── utils.ts          # Utility functies
```
