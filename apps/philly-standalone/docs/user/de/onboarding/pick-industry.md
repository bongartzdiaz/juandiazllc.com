---
slug: onboarding/pick-industry
lang: de
title: Wähle deine Branche
summary: Wie die Brancheneinstellung (Philanthropie / Immobilien / Hospitality) das Dashboard umgestaltet und welche Kontakt- / Dealtypen verfügbar sind.
tags: [onboarding, settings, industry]
related: [onboarding/welcome, onboarding/first-contact, onboarding/first-deal]
updated: 2026-04-25
---

# Wähle deine Branche

Philly ist ein CRM mit drei Branchen-"Skins". Dieselbe Datenbank
unterstützt alle; was sich ändert, sind die Sektionen in der
Sidebar, die Kontakt- und Dealtypen in den Formular-Pickern und
einige branchenspezifische KPIs.

## Die drei Branchen

- **Philanthropie** — der Standard. Optimiert für
  Non-Profit-Operationen: Partner, Spender, Begünstigte,
  Stakeholder; Projekte mit SDG-Zielen, Wirkungsmetriken,
  Fördermitteln.
- **Immobilien** — Käufer, Verkäufer, Investoren, Mieter,
  Vermieter; Objekte, Inserate, Besichtigungen, Angebote,
  Transaktionen, Provisionen, CMA-Berichte.
- **Hospitality** — Gäste, Lieferanten, Partner, Personal;
  Reservierungen, Zimmer, Housekeeping, Open Houses,
  Drip-Kampagnen.

Du kannst jederzeit über `/settings` → industry wechseln. Deine
bestehenden Daten sind unberührt — nur die UI ordnet sich neu an.

## Was sich tatsächlich ändert

| Einstellung | Philanthropie | Immobilien | Hospitality |
| --- | --- | --- | --- |
| Standard-Kontakttypen | Partner / Spender / Stakeholder / Begünstigter | Käufer / Verkäufer / Mieter / Vermieter / Investor | Gast / Lieferant / Partner / Personal |
| Standard-Pipeline | Prospect → Engaged → Cultivated → Solicited → Stewarded | Lead → Showing → Offer → Under contract → Closed | Inquiry → Hold → Confirmed → Checked-in → Checked-out |
| KPI-Karten auf `/projects` | Active / Total Budget / Budget Used | Active Listings / Portfolio Value / Avg Price | Available / Avg Nightly Rate / Occupancy |
| Sidebar-Ergänzungen | Impact, Donors, Grants | Properties, Showings, Offers, Open Houses, Commissions, Transactions, CMA | Rooms, Open Houses, Drip Campaigns |
| `/projects` wird zu | Projekte | Properties | Venues |

Das geteilte Datenmodell ist branchenunabhängig. Ein `Contact` ist
ein `Contact`, unabhängig von der Branche; der Type-Picker ist eine
Display-Layer-Sache.

## Die richtige wählen

Wenn du eine Non-Profit, Wohltätigkeitsorganisation, Stiftung
oder andere mission-driven Organisation bist: **Philanthropie**.

Wenn du Immobilien listest, verkaufst oder vermietest: **Immobilien**.

Wenn du ein Hotel, B&B, eine Eventlocation oder Kurzzeitvermietung
betreibst: **Hospitality**.

Wenn du keines davon bist, wähle standardmäßig **Philanthropie** —
die Type-Labels sind am generischsten und du kannst sie später
umbenennen oder erweitern.

## Später wechseln

Von einer Branche in eine andere wechseln:

1. **Löscht keine Daten.** Jeder bestehende Kontakt, Deal,
   Projekt bleibt in der Datenbank.
2. **Benennt keine bestehenden Zeilen um.** Ein Kontakt, den du
   als `donor` gespeichert hast, hat nach dem Wechsel zu Immobilien
   immer noch `type: "donor"` — er erscheint nur nicht in den
   neuen Type-Filter-Pillen. Bearbeite den Type von der
   Kontakt-Detailseite, wenn du willst, dass er unter den Labels
   der neuen Branche wieder erscheint.
3. **Mischt KPIs neu.** Dashboard-Karten rendern beim nächsten
   Laden gegen die Metriken der neuen Vertikalen.

## Multi-Branchen-Organisationen

Heute hat eine Organisation genau eine Branche zur Zeit. Wenn du
wirklich zwei Vertikalen betreibst (z.B. eine Stiftung, die auch
eine Hospitality-Location betreibt), ist das sauberste Setup
zwei Organisationen — eine pro Branche — unter demselben Admin.
Cross-Org-Reporting ist ein separates Feature auf der Roadmap.

## Wo es weitergeht

- **[Füge deinen ersten Kontakt hinzu](onboarding/first-contact)** —
  sieh den Type-Picker in Aktion.
- **[Füge deinen ersten Deal hinzu](onboarding/first-deal)** — sieh
  die Standard-Pipeline für deine Branche.
- **[Settings overview](features/settings)** — vollständige
  Referenz für den Settings-Tree.
