# PhilanthropyAI — Changelog

## 2026-03-22

### Advanced Charts & Visualizations
- KPI cards with sparkline mini-charts (7-point trends) across all industries
- Donut charts: Revenue by Type (RE), SDG Distribution (CSR)
- Revenue/Impact forecast charts with actual vs projected lines
- Hospitality: occupancy gauge (semi-circle) + guest review breakdown bars
- Deal progress timeline in kanban modal (horizontal stage tracker with checkmarks)

### Sales & Rental Pipeline (from Word doc specs)
- Kanban/Deals: 9-stage Sales Pipeline (Enquiry > Viewing > Reservation > Searches > Results > Sales Agreement > Bill of Sale > Transfer > Commission)
- Kanban/Deals: 5-stage Rental Pipeline (Enquiry > Viewing > Rental Agreement > Payment > Active Lease)
- Tab toggle to switch between Sales and Rental pipelines
- Deal cards show EUR values and document count badges
- Click card opens document checklist modal with upload status
- Dashboard: Sales/Rentals toggle on pipeline widget
- Dashboard: 6th KPI "Active Rentals"
- Contacts: landlord type added with 2 demo contacts
- Impact: Sales vs Rentals comparison card + Commission KPI

### Content & Polish
- Filled all empty kanban columns (Results, Bill of Sale)
- Added more calendar events across RE and CSR modes
- Added 2 more report templates + 3 more recent reports
- Sidebar: renamed Kanban to Board (CSR), Deals (RE), Reservations (HOS)

### Multi-Industry Platform
- 3 industry modes: Philanthropy/CSR, Real Estate, Hospitality
- Industry switcher in sidebar with mode-specific labels
- All pages adapt content, KPIs, and data per industry
- EUR currency throughout

### Core Features
- 9 pages: Dashboard, Projects/Properties, Contacts, Impact/Market, Kanban/Deals, Reports, Calendar, Settings
- Editable KPIs with goal progress bars
- Toast notifications, modals, forms (Contact + Project)
- Command palette (Ctrl+K)
- Light/dark theme toggle
- EN/NL language toggle
- API Keys management in settings
- Goals editor (daily/weekly/monthly/yearly/custom periods)
- CSV data export

### Tech Stack
- Next.js 16, TypeScript, Recharts, Lucide React
- CSS custom properties dual-theme system
- Standalone Docker build ready
- Deployment guide (DEPLOYMENT.md)
