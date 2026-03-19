# Sessie 5 — Sales Kanban + Agenda Buitendienst

## Context
Lees eerst CLAUDE.md. Sessies 1-4 zijn compleet.

## Investigate
```bash
cat CLAUDE.md
ls src/components/sales/ 2>/dev/null
ls src/components/agenda/ 2>/dev/null
```

---

## Phase 1 — Sales pagina structuur

`src/app/sales/page.tsx`:

```
Topbar: "Sales Pipeline" | "GHL · Juan filter"

Boven: 4 summary stats (JetBrains Mono)
  Open leads | Totale waarde | Gem. deal grootte | Win rate

Toggle rechts: [Kanban] [Lijst]

Sync knop: "↺ Sync GHL" → triggert ghl-sync edge function
```

---

## Phase 2 — Kanban Board

`src/components/sales/KanbanBoard.tsx`:

Data van useGhlPipeline() + useGhlLeadsByStage()

Kolom per stage (ghl_pipeline_stages gesorteerd op volgorde):
```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Nieuwe leads     │  │ Gekwalificeerd   │  │ Offerte verstuurd│
│ 23 · €18.400     │  │ 12 · €9.600      │  │ 8 · €6.400       │
├──────────────────┤  ├──────────────────┤  ├──────────────────┤
│ [Lead Card]      │  │ [Lead Card]      │  │ [Lead Card]      │
│ [Lead Card]      │  │ [Lead Card]      │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

Kolom header: stage_naam + count + total_value in solar oranje.
Kolom breedte: 280px, horizontaal scrollbaar.

Lead Card (`src/components/sales/LeadCard.tsx`):
```
┌───────────────────────────┐
│ Jan de Vries       2d     │
│ €3.200                    │
│ 📱 06-12345678            │
│ Bron: Meta F1             │
│ [Tijdlijn] [Bel]          │
└───────────────────────────┘
```

- Naam + leeftijd in de pipeline (ghl_created_at → "Xd")
- Waarde in solar oranje
- "2d" kleur: < 3d groen, 3-7d amber, > 7d rood
- Klik "Tijdlijn" → ContactTimeline slide-over

---

## Phase 3 — ContactTimeline

`src/components/sales/ContactTimeline.tsx`:

Slide-over rechts, koppelt `phone_number` aan `dmchamp_events`:

```
── JAN DE VRIES ─────────────
  Pipeline: Offerte verstuurd
  Waarde: €3.200

── TIJDLIJN ─────────────────
  [WhatsApp] 2d geleden
  Bot: "Goedemiddag, bent u..."
  Lead: "Ja, zonnepanelen intere..."

  [WhatsApp] 1d geleden
  Bot: "Perfect! Wanneer schikt..."

  [Afspraak] morgen 14:00
  Jan Pieters · Utrecht
```

Tijdlijn icoon: blauw voor WhatsApp, groen voor afspraak, oranje voor bel.
Events: chronologisch, meest recent bovenaan.

---

## Phase 4 — Lijst weergave

`src/components/sales/LeadTable.tsx`:

Tabel ipv kanban:
| Naam | Stage | Waarde | Leeftijd | Bron | WhatsApp | Actie |
|---|---|---|---|---|---|---|

Stage als badge met kleur (elke stage krijgt auto-kleur via hash).
Leeftijd: kleur rood als > 7 dagen.
WhatsApp kolom: link naar DM Champ of telefoon.

---

## Phase 5 — Agenda pagina

`src/app/agenda/page.tsx`:

```
Topbar: "Agenda Buitendienst" | "Alle medewerkers"

Rechts: medewerker filter checkboxes (met avatar + kleur)

Views: [Week] [Maand] [Dag] toggle
```

### Week View (`src/components/agenda/WeekView.tsx`)

7 kolommen (ma-zo), tijdraster 08:00-20:00:

```
       Ma 10/3  Di 11/3  Wo 12/3  Do 13/3  Vr 14/3  Za 15/3
08:00  ░░░░░░░  ░░░░░░░  ░░░░░░░
09:00  [J.Pieters]       [M.de Boer]
10:00  Thuisbatt. NL     Zonnepan.
```

Afspraak blok:
- Breedte: 100% van kolom (of gedeeld bij overlap)
- Kleur: medewerker-specifieke kleur via hash van naam
- Klik → detail panel

Status kleur indicatie:
- `gepland`: medewerker kleur, normaal
- `afgerond`: 70% opacity
- `no_show`: rode outline
- `deal`: groene border + kleine glow

### Agenda Sidebar (`src/components/agenda/AgendaSidebar.tsx`)

Rechts naast de kalender:

```
WEEK STATISTIEKEN
Afspraken:  24
Afgerond:   18 (75%)
No-show:    3
Deals:      9
Conv. rate: 50%
Omzet:     €28.800

VANDAAG
[14:00] Jan Pieters → Jan de Vries
[15:30] Marieke de Boer → ...
```

---

## Phase 6 — Afspraak detail

Klik op afspraak blok → side panel:

```
THUISBATTERIJ INSTALLATIE
Gepland · do 13 mrt 14:00

Medewerker: Jan Pieters
Contact: Jan de Vries (06-12345678)
Locatie: Eindhoven, Noord-Brabant
Waarde: €3.200

Status wijzigen:
[Gepland] [Afgerond] [No-show] [Deal] [Geannuleerd]

Notities:
[tekstveld]

[Sla op]  [Bel contact]
```

Status wijziging schrijft direct terug naar `agenda_events` via supabase.update().

---

## Validation Checklist
- [ ] Kanban toont alle stages als kolommen
- [ ] Lead cards tonen naam, waarde, leeftijd (juiste kleur)
- [ ] Leeftijd badge: groen/amber/rood correct
- [ ] ContactTimeline opent met dmchamp_events voor dat nummer
- [ ] Toggle kanban ↔ lijst werkt
- [ ] Lijst tabel sorteert op leeftijd (oudste bovenaan)
- [ ] Agenda week view toont tijdraster 08:00-20:00
- [ ] Afspraken zichtbaar op juiste dag + tijd
- [ ] Medewerker kleuren consistent (hash-based)
- [ ] Week statistieken tonen correcte totalen
- [ ] Status wijzigen werkt en slaat op in Supabase
- [ ] GHL sync knop triggert edge function
