---
name: weekrapport-hmb
description: Genereer HMB Meta Ads weekrapport in vast format (account 932039344875575 + DM Champ pipeline + KPI tabel). Gebruik op donderdag/vrijdag of wanneer Juan een weekly recap, ads rapport, of pipeline overzicht vraagt.
trigger: /weekrapport-hmb
---

# /weekrapport-hmb

Weekrapport HMB volgens CLAUDE.md §6 + §13.

## Usage

```
/weekrapport-hmb                    # huidige week
/weekrapport-hmb --week 18          # specifieke week
/weekrapport-hmb --range "2026-04-21 to 2026-04-27"
```

## Data bronnen
1. Meta Ads — account `932039344875575` (HMB Meta Ads)
2. DM Champ — WhatsApp pipeline (campaign "Thuisbatterijen plus")
3. GoHighLevel — pipeline statussen
4. Supabase — leads tabel

## Format (NOOIT afwijken)

```
WEEKRAPPORT WEEK [N] — HMB META ADS
Account: 932039344875575
Periode: [start] tot [eind]

═══ SPEND ═══
Totaal: €X,XX
Per dag gemiddeld: €X,XX
Per campagne:
- Thuisbatterijen plus: €X,XX
- [andere]: €X,XX

═══ LEADS ═══
Totaal: N
CPL: €X,XX
Conversie ad → lead: X%

═══ DM CHAMP PIPELINE ═══
Leads gecontacteerd via WhatsApp: N (100%)
Replies: N (X%)
Calls geboekt: N (X%)
Buitendienst afspraken: N (X%)
Geen reactie: N (X%)

═══ KPI TABEL ═══
| Metric | Deze week | Vorige week | Δ |
|---|---|---|---|
| Spend | €X | €X | ±X% |
| Leads | N | N | ±X% |
| CPL | €X | €X | ±X% |
| Reply rate | X% | X% | ±X% |
| Call rate | X% | X% | ±X% |
| Buitendienst rate | X% | X% | ±X% |

═══ ACTIEPUNTEN VOLGENDE WEEK ═══
1. [actiepunt]
2. [actiepunt]
3. [actiepunt]
```

## Hard rules
- EXACTE cijfers, geen schattingen
- Percentages op 1 decimaal
- Δ kolom: + groen, − rood, 0 grijs (in copy aangeven)
- Geen interpretatie in cijferblok — alleen bij ACTIEPUNTEN
- Levering per WhatsApp: 1 enkel bericht, niet per regel (zie feedback_whatsapp_format)

## Memory check
Lees: feedback_whatsapp_format, project_whatsapp_bot
