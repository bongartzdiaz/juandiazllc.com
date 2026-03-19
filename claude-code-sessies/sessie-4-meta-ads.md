# Sessie 4 — Meta Ads Pagina

## Context
Lees eerst CLAUDE.md. Sessies 1-3 zijn compleet.

## Investigate
```bash
cat CLAUDE.md
cat src/app/meta-ads/page.tsx 2>/dev/null || echo "nog aanmaken"
ls src/components/meta-ads/ 2>/dev/null
```

---

## Phase 1 — Pagina structuur

`src/app/meta-ads/page.tsx`:

```
Topbar: "Meta Ads" | "7 funnels · NL markt"
Tabs: [Campagnes] [Advertenties] [Funnels] [Archief (BE)]

Boven de tabel: 4 summary KPIs (compact, niet groot)
  Total spend | Gem. CPL | Total leads | Actieve funnels
```

---

## Phase 2 — Summary KPI bar

Compact bar (geen grote kaarten) boven de tab content:
```
[€4.892 spend] [€16 gem. CPL] [342 leads] [5 funnels actief]
```

Spend altijd in solar oranje var(--o).
CPL kleur via getCplStatus() op gemiddelde.

---

## Phase 3 — Tab: Campagnes

`src/components/meta-ads/CampagneTable.tsx`:

Kolommen:
| Campagne | Funnel | Status | Spend | CTR | CPL | Leads | Trend (7d) |
|---|---|---|---|---|---|---|---|

Regels:
- Spend: altijd solar oranje, JetBrains Mono
- CTR: kleur via getCtrColor()
- CPL: kleur via getCplStatus()
- Status: StatusBadge component
- Trend: SparkBar component (7 kleine bars)
- Rij hover: background var(--raised)
- Klik op rij: slide-over met campagne details

Sortering: standaard op spend DESC, klikbaar op kolommen.

Filterbar boven tabel:
- Zoek op campagnenaam
- Filter: Alle | Goed | Testfase | Slecht

---

## Phase 4 — Tab: Funnels

Kaarten per funnel (F1 t/m F7), 3 per rij:

```
┌─────────────────────────┐
│ F1 · Thuisbatterij      │
│ Status: [goed]          │
│ CPL: €12   Leads: 107   │
│ Spend: €1.284           │
│ ████████░░░░ 73% budget │
└─────────────────────────┘
```

Kaart border kleur = getCplStatus() kleur.
Kaart met status 'slecht' heeft rode glow-pulse animatie.

---

## Phase 5 — Tab: Archief (BE)

Zelfde tabel als Campagnes maar:
- Gefilterd op country_code = 'BE'
- Grijze banner bovenaan: "Belgische campagnes — archief weergave"
- Alle CPL/CTR kleur badges grijs (geen kleur oordeel op BE)
- Standaard verborgen achter tab, NIET in default laadvolgorde

---

## Phase 6 — Campagne detail slide-over

Rechts inschuivend panel (niet modal, blijft op scherm):
- Campagnenaam als titel
- Alle velden: headline, description, primary_text
- Performance grafiek (kleine inline chart, 7 dagen CPL trend)
- Status wijzigen dropdown (goed/testfase/slecht/gepauzeerd)
- Knop: "Bekijk in Meta Ads Manager" (extern link)
- Sluitknop of klik buiten panel

Animatie: translateX(100%) → translateX(0), 300ms ease.

---

## Phase 7 — SparkBar component

`src/components/ui/SparkBar.tsx`:

```tsx
type SparkBarProps = {
  data: number[]   // 7 waarden
  color?: string   // default neon groen
  height?: number  // default 24px
}
```

Laatste bar is altijd het felst (100% opacity).
Vorige bars: 45% opacity van de kleur.
Dalende trend: bars worden roder.

---

## Validation Checklist
- [ ] Tab navigatie werkt (Campagnes/Advertenties/Funnels/Archief)
- [ ] Summary KPIs tonen correcte totalen
- [ ] Tabel sorteert op spend DESC standaard
- [ ] StatusBadge toont juiste kleur
- [ ] CPL kolom: groen < €15, oranje €15-25, rood > €25
- [ ] SparkBar zichtbaar per rij (7 mini bars)
- [ ] Filter op status werkt
- [ ] Archief tab toont BE campagnes, zonder kleur oordeel
- [ ] Slide-over opent bij klik op rij
- [ ] Funnel kaarten tonen met juiste border kleur
- [ ] Slecht funnel kaarten hebben rode pulse animatie
