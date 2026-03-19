# HMB Dashboard — Start Hier

## Wat zit er in dit pakket?

```
hmb-starter-kit/
├── START-HIER.md                          ← dit bestand
├── CLAUDE.md                              ← master context (open in Claude Code)
└── claude-code-sessies/
    ├── sessie-1-design-systeem.md         ← Sessie 1: CSS + Sidebar + UI components
    ├── sessie-2-ghl-koppeling.md          ← Sessie 2: GHL API + Edge Functions + hooks
    ├── sessie-3-hoofdpagina.md            ← Sessie 3: Dashboard hoofdpagina
    ├── sessie-4-meta-ads.md               ← Sessie 4: Meta Ads pagina
    ├── sessie-5-sales-agenda.md           ← Sessie 5: Sales kanban + Agenda
    └── sessie-6-ui-polish.md              ← Sessie 6: Animaties + performance
```

## Hoe starten?

### Stap 1 — Project aanmaken
```bash
mkdir hmb-dashboard && cd hmb-dashboard
# Kopieer CLAUDE.md naar de project root
cp /pad/naar/hmb-starter-kit/CLAUDE.md ./CLAUDE.md
```

### Stap 2 — Claude Code openen
```bash
claude
```

### Stap 3 — Eerste sessie starten
Plak in Claude Code:
```
Lees CLAUDE.md volledig. Daarna voer sessie 1 uit:
[plak inhoud sessie-1-design-systeem.md]
```

### Stap 4 — Per sessie verder
Na elke sessie:
1. Test de build: `npm run dev`
2. Check de validation checklist onderaan de sessie
3. Start de volgende sessie

## Volgorde is belangrijk!
Sessie 1 → 2 → 3 → 4 → 5 → 6
Elke sessie bouwt voort op de vorige.

## Referentie design
Open `hmb-dashboard-wow.html` in je browser voor de exacte look die we nabouwen.

## Supabase setup checklist
- [ ] ANON KEY kopiëren uit Supabase dashboard → .env.local
- [ ] SERVICE ROLE KEY kopiëren → .env.local
- [ ] GHL secrets zetten: `supabase secrets set GHL_API_KEY=... GHL_LOCATION_ID=...`
- [ ] Edge Functions deployen (sessie 2)

## Snelle referentie credentials
Supabase project: zenhndvoqrbjbdilhysp
GHL account: ozS18XeeiEdjYK4xpoWJ
GHL API key: pit-1772d0a9-7a7d-4eaa-b6df-33859260b197
GHL filter: custom_field_juan = 'juan'
