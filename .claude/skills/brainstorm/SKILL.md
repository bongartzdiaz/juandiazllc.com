---
name: brainstorm
description: Gestructureerde brainstorm-sessie over een topic — divergent (veel ideeën) → convergent (top 3 met tradeoffs). Gebruik wanneer de gebruiker vraagt om "brainstorm", "ideeën", "wat zouden we kunnen", opties verkennen, of vastloopt op een keuze.
trigger: /brainstorm
---

# /brainstorm

Gestructureerde brainstorm volgens divergent → convergent methode.

## Usage

```
/brainstorm <topic>
/brainstorm <topic> --depth deep        # 15-20 ideeën i.p.v. 8-10
/brainstorm <topic> --constraints "..."  # specificeer randvoorwaarden
/brainstorm <topic> --lens "..."         # bekijk vanuit specifieke hoek (gebruiker, tech, kosten, etc.)
```

## Methode

### Fase 1 — Frame
Stel jezelf de vraag, schrijf op:
- Wat is precies het probleem/de kans?
- Wie heeft hier baat bij?
- Wat zijn de harde constraints? (budget, tijd, tech, regelgeving)
- Wat is de definition of success?

Als één van de bovenste antwoorden onduidelijk is: STOP en vraag de gebruiker om verduidelijking.

### Fase 2 — Diverge (kwantiteit > kwaliteit)
Genereer 8-15 ideeën zonder oordeel. Mix van:
- Obvious / safe ideeën (3-4)
- Edge / contrarian ideeën (3-4)
- Cross-domain analogieën (2-3) — "hoe lost branche X dit op?"
- Combinaties van bovenstaande (2-3)

Format: korte titel + 1 zin uitleg. Geen pros/cons nog.

### Fase 3 — Cluster
Groepeer de ideeën in 3-5 thema's. Geef elk thema een naam.

### Fase 4 — Converge (top 3)
Kies 3 sterkste ideeën. Per idee:
- **Wat:** concrete actie (1 zin)
- **Waarom sterk:** belangrijkste voordeel
- **Risico/tradeoff:** wat kan misgaan
- **Effort:** S/M/L
- **Impact:** S/M/L
- **Eerste stap:** wat doe je vandaag

### Fase 5 — Aanbeveling
Eén concrete aanbeveling: "Ik zou met X starten omdat ..."
Houd het kort. De gebruiker kiest.

## Anti-patronen
- Niet meteen naar oplossing springen — eerst frame
- Geen pros/cons in diverge fase (dood ideeën te snel)
- Geen "het hangt ervan af" als aanbeveling — neem stelling
- Geen 10-puntenlijst zonder cluster of prioritering

## Output format
```
BRAINSTORM: <topic>

═══ FRAME ═══
Probleem: ...
Constraints: ...
Success: ...

═══ IDEEËN ═══
1. <titel> — <1 zin>
2. ...

═══ THEMA'S ═══
A. <naam>: 1, 3, 5
B. <naam>: 2, 4
C. <naam>: 6, 7, 8

═══ TOP 3 ═══
1. <idee>
   Wat: ...
   Waarom: ...
   Risico: ...
   Effort/Impact: M/L
   Eerste stap: ...

═══ AANBEVELING ═══
<keuze + 1 zin reden>
```
