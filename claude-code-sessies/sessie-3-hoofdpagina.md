# Sessie 3 — Dashboard Hoofdpagina

## Context
Lees eerst CLAUDE.md. Sessies 1 + 2 zijn compleet.
Referentie: `hmb-dashboard-wow.html` — dit is de exacte look die we nabouwen.

## Investigate
```bash
cat CLAUDE.md
cat src/app/page.tsx
ls src/components/dashboard/ 2>/dev/null
ls src/hooks/
```

---

## Phase 1 — Topbar Component

`src/components/layout/Topbar.tsx`:
- Height: 60px, sticky top, z-index 10
- Achtergrond: rgba(8,11,13,0.80) + backdrop-blur-md
- Border-bottom: 1px solid var(--rim)
- Links: paginatitel "Command Center" + subtitle met monospace tekst
- Rechts: LIVE chip (groene pulserende dot + "LIVE · Xm"), Sync knop, + Lead knop
- LIVE chip: var(--g-glow2) achtergrond + neon border + dot animeert met blink
- Animatie: fadeDown 300ms 100ms delay
- Props: title, subtitle, actions?

---

## Phase 2 — KPI Strip

`src/components/dashboard/KpiStrip.tsx`:

5 KPI cards, CSS grid 5 kolommen, gap 12px, staggered riseIn.

Data van useDashboardData():
```
Card 1: Leads vandaag      | value | delta vs gisteren
Card 2: CPL Meta           | €XX   | delta vs vorige week | goal < €20
Card 3: Bot conversie      | X%    | delta | goal > 10%
Card 4: Afspraken week     | XX/40 | progress
Card 5: Deals maand        | XX/15 | GLOW als >= 90% van doel
```

Animatie: elk card heeft `animationDelay: i * 80ms`

Kaart 5 (deals): glow wanneer current/target >= 0.9

---

## Phase 3 — Funnel Journey

`src/components/dashboard/FunnelJourney.tsx`:

### 3a. Flow visualisatie (horizontaal)
5 boxen verbonden met pijlen:
```
[Meta klik] → 32% → [WhatsApp] → 45% → [Gekwalif.] → 40% → [Afspraak] → 50% → [Deal]
```

Kleuren per box:
- Meta klik + WhatsApp: var(--b) blauw
- Gekwalificeerd + Afspraak: var(--y) amber
- Deal: var(--g) neon groen + glow op getal

Pijl bevat conversie% — kleur:
- >= benchmark: var(--g)
- 10% onder benchmark: var(--y)
- > 10% onder benchmark: var(--r) + pulse animatie

### 3b. Progress bars per stap
```
Meta → WhatsApp   ████░░ 32%   [benchmark lijn 25%]
WA → Gekwalif.    ██████ 45%
Gekwalif. → Afspr ████░░ 40%
Afspraak → Deal   ██████ 50%
```

Bar breedte animeert van 0 naar waarde via useEffect + CSS transition 1s.
Kleur: goed=neon groen, matig=amber, slecht=rood.

### 3c. 7 Funnel Chips
Kleine cards per funnel:
```
[F1 · Batterij  €12  goed] [F2 · Solar €15  goed] [F3 · Combi €22  test] ...
```

Chips zijn klikbaar → navigeert naar /meta-ads?funnel=F1

---

## Phase 4 — Alerts Panel

`src/components/dashboard/AlertsPanel.tsx`:

Data van useAlerts().

3 alert types:
- `crit`: rode left-border + rgba(255,59,78,0.06) bg + glow-pulse-red animatie
- `warn`: oranje left-border + rgba(255,109,45,0.06) bg
- `ok`:   groene left-border + rgba(0,255,136,0.05) bg

Per alert: icon (emoji of Lucide) + titel + subtitel + CTA knop.

Max 5 alerts zichtbaar, rest inklapbaar.

---

## Phase 5 — Goals Panel

`src/components/dashboard/GoalsPanel.tsx`:

4 maanddoelen met GoalProgress component:
```
Leads:      current/target → progress bar
Afspraken:  current/target → progress bar (als < 60% + waarschuwing)
Deals:      current/target → progress bar (neon groen als >= 85%)
Omzet (€):  current/target → progress bar
```

Resterende dagen badge (JetBrains Mono, muted kleur).

---

## Phase 6 — Charts

### CPL Trend Chart (`src/components/charts/CplTrendChart.tsx`)
- Recharts LineChart, 14 dagen, data van `ads` tabel geaggregeerd per dag
- Line kleur: var(--o) solar oranje
- Area fill: gradient oranje → transparant
- Grid: rgba(255,255,255,0.04)
- Ticks: JetBrains Mono 10px muted kleur
- Y-as: €XX format
- Tooltip: HmbTooltip (zie CLAUDE.md Recharts config)
- Referentielijn op €20 (CPL doel) gestippeld, muted kleur
- Tabs: Meta | Google

### Leads Bar Chart (`src/components/charts/LeadsBarChart.tsx`)
- Recharts BarChart, 14 dagen
- Bars: neon groen (laatste bar lichter glow)
- borderRadius: 4 op elke bar
- Animatie: elke bar 40ms later dan vorige
- Tooltip: HmbTooltip

---

## Phase 7 — Hoofdpagina samenvoegen

`src/app/page.tsx`:

```tsx
'use client'
import { Topbar } from '@/components/layout/Topbar'
import { KpiStrip } from '@/components/dashboard/KpiStrip'
import { FunnelJourney } from '@/components/dashboard/FunnelJourney'
import { AlertsPanel } from '@/components/dashboard/AlertsPanel'
import { GoalsPanel } from '@/components/dashboard/GoalsPanel'
import { CplTrendChart } from '@/components/charts/CplTrendChart'
import { LeadsBarChart } from '@/components/charts/LeadsBarChart'
import { useDashboardData } from '@/hooks/useDashboardData'

export default function Dashboard() {
  const { data, loading } = useDashboardData()

  return (
    <>
      <Topbar title="Command Center" subtitle="Ad → Lead → Afspraak → Deal // Alle funnels" />
      <div className="p-6 space-y-5">
        <KpiStrip data={data} loading={loading} />

        <div className="grid grid-cols-[1fr_340px] gap-4">
          <FunnelJourney data={data} loading={loading} />
          <div className="flex flex-col gap-4">
            <AlertsPanel />
            <GoalsPanel data={data} loading={loading} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <CplTrendChart />
          <LeadsBarChart />
        </div>
      </div>
    </>
  )
}
```

Layout: main grid 2 kolommen (funnel 1fr + rechterkolom 340px).

---

## Validation Checklist
- [ ] Pagina laadt zonder errors
- [ ] KPI strip toont 5 kaarten met staggered animatie
- [ ] Kaart 5 gloeit als deals >= 90% doel
- [ ] Funnel flow toont alle 5 stappen + pijlen met %
- [ ] Progress bars animeren van 0 naar waarde
- [ ] 7 funnel chips zichtbaar met juiste CPL kleur
- [ ] Alerts panel toont kritieke alert (crit) met pulse
- [ ] Goals panel toont 4 doelen met juiste kleur
- [ ] CPL chart laadt met oranje lijn + referentielijn €20
- [ ] Leads chart laadt met groene bars
- [ ] Loading skeletons zichtbaar tijdens data fetch
- [ ] useDashboardData() refresh elke 5 minuten
