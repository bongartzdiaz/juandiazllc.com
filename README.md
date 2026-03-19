# HMB Energy Ops Dashboard

> Complete marketing operations dashboard — Meta Ads → WhatsApp Bot → GHL Sales Pipeline → Deals.

## 📦 What's in this repo

### 🖥 Standalone Dashboards (open direct in browser)

| File | Description |
|------|-------------|
| `hmb-dashboard-pro.html` | ⭐ **Main dashboard** — responsive, drag & drop, dual-theme, demo data |
| `hmb-dashboard-v3.html` | Dual-theme preview (light/dark toggle) |
| `hmb-dashboard-wow.html` | Original dark neon version |
| `energie-website-agent-workflow.html` | Full agent workflow overview (energy website) |

### ⚡ Next.js App (`src/`)

Full Next.js 14 App Router project with:
- Dashboard, Meta Ads, Google Ads, Chatbot, Sales, Agenda pages
- Supabase integration, GHL API hooks, Meta/Google API connectors
- Dual-theme design system (DM Sans + DM Mono)
- TypeScript + Tailwind CSS

### 🤖 Claude Code Sessies (`claude-code-sessies/`)

6 ready-to-paste Claude Code prompts to build the full Next.js dashboard:

| Sessie | Onderwerp |
|--------|-----------|
| Sessie 1 | Design systeem + CSS tokens + Sidebar + KPI componenten |
| Sessie 2 | GHL Edge Functions + Supabase hooks |
| Sessie 3 | Dashboard hoofdpagina volledig |
| Sessie 4 | Meta Ads pagina |
| Sessie 5 | Sales Kanban + Agenda buitendienst |
| Sessie 6 | Animaties + performance + dual-theme audit |

### 🛠 Agents & Skills (`agents-en-skills/`)

| File | For |
|------|-----|
| `AGENT-NL.md` | Claude Code subagent — NL versie |
| `AGENT-EN.md` | Claude Code subagent — EN version |
| `SKILL-NL.md` | Claude.ai custom skill — NL |
| `SKILL-EN.md` | Claude.ai custom skill — EN |

### 📋 Claude Code Context

| File | Description |
|------|-------------|
| `CLAUDE.md` | Master context — credentials, design tokens, DB schema, business logic |
| `START-HIER.md` | Step-by-step guide to start building in Claude Code |

## 🚀 Quick Start

### Option A — Open standalone HTML
```bash
open hmb-dashboard-pro.html
# Press E to enter edit mode, drag widgets, click titles to rename
```

### Option B — Run Next.js app
```bash
npm install
cp .env.example .env.local
# Fill in your Supabase + API keys in .env.local
npm run dev
```

## 🎨 Design System

- **Light/Dark** dual-theme via `data-theme` attribute
- **Fonts:** DM Sans (UI) + DM Mono (all numbers)
- **Accents:** Green (success) · Orange (spend) · Amber (warning) · Red (error) · Blue (info)
- All colors via CSS variables — never hardcoded

## 🔑 Tech Stack

- **Frontend:** Next.js 14 App Router · TypeScript · Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **CRM:** GoHighLevel (GHL)
- **WhatsApp Bot:** DM Champ
- **Ads:** Meta Ads API · Google Ads API
- **Hosting:** Digital Ocean App Platform
- **Charts:** Recharts (Next.js) / Chart.js (standalone HTML)

## 📊 Connected Systems

- GHL pipeline sync (leads, stages, agenda)
- DM Champ WhatsApp webhook (conversations, analyses)
- Meta Ads performance sync
- Supabase SEO agents (articles, agent logs)
- Daily Slack updates

---

*Private repo — HMB Energy Ops · 2026*
