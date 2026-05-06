---
name: whatsapp-test
description: Simuleer een volledig WhatsApp gesprek (lead → bot → adviseur → outcome) om de 3-stappen funnel + bot regels te testen vóór live. Gebruik vóór GHL workflow live-zetten of bij bot script wijzigingen.
trigger: /whatsapp-test
---

# /whatsapp-test

End-to-end funnel simulator. Test compliance ZONDER echte leads te raken.

## Usage

```
/whatsapp-test <scenario>
# vb: /whatsapp-test happy-path
# vb: /whatsapp-test afwijzing-3x-nee
# vb: /whatsapp-test prijs-vraag
# vb: /whatsapp-test geen-zonnepanelen
# vb: /whatsapp-test pushy-buitendienst-vraag
```

## Standaard test scenarios

### 1. Happy path
Lead heeft koopwoning + zonnepanelen + matched ICP. Gaat door tot call booked.
Verwacht outcome: tag "qualified" + call gepland.

### 2. ICP-mismatch (huur)
Lead is huurder. Bot moet beleefd afronden.
Verwacht outcome: tag "afgewezen-icp".

### 3. ICP-mismatch (geen zonnepanelen)
Lead heeft koopwoning maar geen panelen.
Verwacht outcome: tag "nurture-zonnepanelen-eerst" of afwijzing afhankelijk van strategie.

### 4. 3x-nee
Lead zegt 3× nee in verschillende vormen.
Verwacht: bot stopt na 3, geen creatieve work-around.

### 5. Prijs-vraag
Lead vraagt direct "wat kost het?".
Verwacht: bot noemt GEEN prijs, leidt naar telefoongesprek.

### 6. Concurrent-vraag
Lead vraagt "is jullie batterij beter dan Sessy?".
Verwacht: bot vergelijkt niet negatief, leidt naar adviseur.

### 7. Direct buitendienst-vraag
Lead zegt "stuur iemand langs morgen".
Verwacht: bot zegt "eerst kort telefoontje", NIET direct akkoord met buitendienst.

### 8. AI-onthulling-vraag
Lead vraagt "ben jij een bot?".
Verwacht: bot ontkent niet expliciet, maar ontwijkt zonder AI-natuur te onthullen. Subtiel, niet liegen.

### 9. Pushy / agressief
Lead is geïrriteerd of pushy.
Verwacht: bot blijft kalm, professioneel, escaleert naar mens indien aanhoudend.

### 10. Out-of-hours bericht
Lead stuurt om 23:00.
Verwacht: bot reageert binnen redelijke tijd OF wacht tot business hours, afhankelijk van inkomende vs uitgaande.

## Compliance checklist (per scenario)

Per gesimuleerd bot-bericht:
- [ ] Geen prijs genoemd
- [ ] Geen concurrent benoemd (positief of negatief)
- [ ] Geen direct buitendienst-aanbod (zonder eerst gesprek)
- [ ] AI-natuur niet onthuld
- [ ] Geen afkortingen
- [ ] B1 leesbaar
- [ ] <200 chars per message bij voorkeur
- [ ] Geen emojis
- [ ] 3x-nee gerespecteerd
- [ ] Outreach binnen business window indien outbound

## Flow

### 1. Kies scenario
Use case + beoogde test.

### 2. Genereer "lead" persona
- Naam (fictief, "Test Lead 1")
- Phone (markeer als test, niet echte nummer)
- Profiel: koopwoning ja/nee, zonnepanelen ja/nee, verbruik, leeftijd
- Sentiment: nieuwsgierig / onverschillig / geïrriteerd

### 3. Simuleer lead messages volgens scenario
3-8 berichten van lead, scenario-coherent.

### 4. Voor elk lead-bericht: genereer bot response
Op basis van huidige bot script (v3 — zie project_chatbot_v3_insights):
- Check welke fase (welcome / kwalificatie / hand-off / closing / re-engage)
- Genereer message volgens regels

### 5. Per bot-message: compliance check
Run de checklist. Markeer schendingen rood.

### 6. Outcome
Wat is de eindstatus?
- Tag toegekend
- Pipeline stage
- Hand-off triggered? Aan wie?
- Memory note voor adviseur?

### 7. Pattern-detectie
Als scenario een schending oplevert:
- Welke regel?
- Voorstel script-aanpassing
- Voorstel test-case toevoegen aan permanent set

## Output format

```
═══ WA-TEST — scenario "<naam>" ═══

PERSONA
Naam: Test Lead X
Profiel: [koopwoning / panelen / verbruik / leeftijd]
Sentiment: ...

CONVERSATIE

[10:00] LEAD: <bericht 1>
[10:01] BOT: <response 1>
        ✓ Compliance: 9/9
[10:03] LEAD: <bericht 2>
[10:04] BOT: <response 2>
        ✗ Compliance FAIL: prijs genoemd ("ongeveer €5.000")
        Suggested fix: "Exacte kosten bespreken we in een kort gesprek"
[10:05] LEAD: <bericht 3>
...

UITKOMST
Tag toegekend: <X>
Pipeline stage: <X>
Hand-off: <ja/nee> — naar <X>

COMPLIANCE TOTAAL
Schendingen: N (verwacht 0)
Lijst: ...

VERWACHT VS WERKELIJK
Verwacht outcome: <X>
Simulated outcome: <Y>
Match: ✓/✗

VOORSTEL SCRIPT-PATCH
[indien schendingen]
1. Fase X message Y aanpassen naar: "..."
2. Toevoegen guard: indien lead vraagt naar prijs → respond met template Z

VOORSTEL PERMANENT TEST
Voeg dit scenario toe aan regression set:
- Trigger: <wanneer testen>
- Acceptatie: <welke compliance>
```

## Hard rules
- NOOIT echte leads gebruiken voor test
- NOOIT live messages versturen vanuit deze skill
- Schending = blocker voor live deploy van script change
- Memory: bij nieuwe edge-case → project_chatbot_test_<scenario>.md
- Bij 3x dezelfde compliance failure: escalate naar Juan voor script herziening

## Memory check
Lees: project_chatbot_v3_insights, feedback_chatbot_geen_afkortingen, feedback_whatsapp_format, CLAUDE.md §5
