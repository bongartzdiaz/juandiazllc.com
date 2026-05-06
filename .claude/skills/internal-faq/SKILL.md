---
name: internal-faq
description: Internal FAQ / playbook voor adviseurs en team — hoe handle je vraag X in telefoongesprek, wat zeg je bij bezwaar Y, escalatie-protocol, hand-off scripts. NIET voor leads (zie /seo-publish FAQ-pagina). Voor compliance + consistentie als team groeit.
trigger: /internal-faq
---

# /internal-faq

Interne kennisbank voor adviseurs / Roy / freelancers.

## Usage

```
/internal-faq new <topic>           # add nieuwe FAQ entry
/internal-faq update <topic>        # bestaande
/internal-faq export                # full PDF / Notion export
/internal-faq search <query>        # find existing
```

## Locatie

Vault: `C:\business\Mr Diaz\Areas\team\internal-faq\`
Plus optionele Notion mirror voor team-toegang.

## Categorieën

### A. Telefoongesprek scripts
Voor adviseurs die call doen post-WhatsApp-kwalificatie.

#### A1. Opening
- Hoe stel je je voor
- Hoe verifieer je context van WA-kwalificatie
- Wat eerst valideren (koopwoning, panelen, verbruik)

#### A2. Pijnpunten ophalen
- Vragen om te leren wat lead echt nodig heeft
- Non-leading questions
- Doorvragen techniques

#### A3. Bezwaar handling
Per common bezwaar:
- "Te duur" → niet over prijs maar over waarde + range
- "Wil eerst meer onderzoek" → voorstel materiaal sturen + 2e gesprek
- "Heb al een offerte" → respect + onze unieke waarde
- "Wacht op betere techniek" → indicatieve trends, geen pressure
- "Geen geld" → financieringsopties (zonder garantie te geven)

#### A4. Naar buitendienst
Wanneer wel/niet voorstellen:
- Kwalificatie-criteria checklist
- Hoe afspraak inplannen
- Wat klant meekrijgt vooraf

### B. WhatsApp / DM Champ
Wanneer adviseur handmatig overneemt van bot.

#### B1. Wanneer ingrijpen
- Bot stuck >24u
- Lead vraagt expliciet om mens
- Compliance issue (bot zou prijs noemen)

#### B2. Take-over script
- Hoe de overgang aankondigen zonder AI te onthullen
- Wat behouden uit context
- Wanneer terug naar bot

### C. Escalatie-protocol

#### C1. Naar Juan
Wanneer ESCALATE:
- Boze klant
- Klacht over installatie
- Lead vraagt naar Juan persoonlijk
- Compliance breach (concurrent benoemd, prijs gegeven)

Hoe escalate: Slack DM met context-snippet, NIET klant-naam in shared channel.

#### C2. Naar techniek (Roy)
- Form werkt niet
- Edge function timeout
- GHL workflow fired niet
- Pixel meet niet

Hoe: ticket in dashboard met repro stappen.

### D. Compliance regels (VERPLICHT lezen)

#### D1. Wat MAG niet
- Exacte prijzen noemen (CLAUDE.md §2)
- Concurrent-bedrijven negatief benoemen
- Prijsgaranties of besparing-belofte
- Hard-sell in WhatsApp
- AI-natuur onthullen (bot-context)
- 3x-nee passeren

#### D2. Wat MOET
- 3-stappen funnel respecteren (CLAUDE.md §5)
- GHL stage update na elk gesprek
- Notes in CRM binnen 1u na call
- Permission vragen voor testimonial-gebruik
- AVG: gegevens alleen voor doel waarvoor verzameld

### E. Hand-off documentation

#### E1. Bot → adviseur
Wat moet de adviseur weten:
- Lead profile (verbruik, panelen, koopwoning)
- Wat al besproken in WA
- Pain point indicaties
- Sentiment

#### E2. Adviseur → buitendienst
Wat moet installateur meenemen:
- Dakopname-foto's indien aanwezig
- Verbruik specs
- Voorkeuren product / capaciteit
- Budget-indicatie (range, geen exact)

### F. Tooling-instructies

#### F1. GoHighLevel
- Hoe lead opzoeken
- Stage updaten
- Tags lezen + corrigeren
- Workflow membership zien

#### F2. DM Champ
- Conversatie opzoeken
- Conversation history exporteren
- Manuele override

#### F3. Supabase
- Read-only acces voor adviseurs
- Welke views toe te zien (geen secrets)

#### F4. Slack
- Welk channel voor wat
- Threading-conventies
- Bot-commands beschikbaar

### G. Crisis-scenarios

#### G1. Klant boos
1. De-escalate, listen first
2. Geen toezeggingen die je niet kan nakomen
3. Naar Juan binnen 1u indien serieus

#### G2. Negative review online
1. Niet defensief reageren publiek
2. Naar Juan eerst
3. Volg pre-approved response template

#### G3. Data breach / privacy issue
1. STOP huidige gebruik betroffen data
2. Direct Juan + Roy
3. Documenteer wat er gebeurde
4. AVG: 72u meldplicht aan AP indien materieel

## Format per FAQ entry

```markdown
---
title: <vraag of scenario>
category: <A-G>
last-updated: <ISO datum>
owner: <Juan/Roy>
review-due: <ISO datum, +6 mnd>
---

# {VRAAG}

## Korte antwoord
[1-2 zinnen direct bruikbaar]

## Context
[Waarom dit zo is, achtergrond]

## Stappen / script
1. ...
2. ...

## Wat NIET doen
- ...

## Voorbeelden
[concrete voorbeelden]

## Gerelateerd
- [link naar andere FAQ]
- [link naar CLAUDE.md sectie]

## Wijzigingsgeschiedenis
- 2026-05-02: ...
```

## Toegang & verspreiding

### Wie heeft toegang
- Juan: alles
- Roy: alles minus Juan-persoonlijke
- Adviseurs: A, B, D, E, F, G
- Freelancers: alleen relevant subset (per case)

### Onboarding nieuwe adviseur
- Verplicht lezen: D (compliance) + A (telefoon)
- Quiz na lezen om commitment vast te leggen
- Buddy-check eerste 2 weken

### Update cadans
- Quarterly review per categorie
- Ad-hoc bij regelgeving-wijziging (saldering, BTW)
- Auto-flag stale entries (>6 mnd)

## Hard rules
- Compliance categorie D = verplicht lezen voor iedereen klantcontact
- NOOIT klant-data (naam/tel) in voorbeelden
- ALTIJD owner + review-due
- ALTIJD changelog onderaan (transparency)
- Bij regulatie-update: roep alle relevante entries op + check

## Memory check
Lees: CLAUDE.md §2 (verboden) + §5 (sales funnel), feedback_chatbot_geen_afkortingen, project_chatbot_v3_insights
