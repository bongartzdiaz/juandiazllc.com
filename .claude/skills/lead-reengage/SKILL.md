---
name: lead-reengage
description: Re-engagement WhatsApp messaging voor stuck leads volgens NEXUS BOS bot regels (3x-nee, geen AI onthullen, geen prijzen, alleen call verkopen). Output is messages voor DM Champ — Juan triggert de send. Gebruik bij batch stuck leads of na audit-leads.
trigger: /lead-reengage
---

# /lead-reengage

WhatsApp re-engagement voor leads die zijn vastgelopen in de funnel.

## Usage

```
/lead-reengage <stage>
# vb: /lead-reengage bot-stil-48u
# vb: /lead-reengage terugbellen-overdue
# vb: /lead-reengage no-reply-na-opener
# vb: /lead-reengage gekwalificeerd-geen-call
```

## Bot regels (CLAUDE.md §5 — NIET schenden)

- Bot verkoopt ALLEEN het telefoongesprek als volgende stap
- Bot onthult nooit AI-natuur
- 3x-nee regel: bij 3 afwijzingen gesprek beëindigen
- Geen exacte prijzen
- Geen concurrent-bashing
- Geen afkortingen (feedback_chatbot_geen_afkortingen)
- B1 niveau

## Re-engagement scenario's

### A. Bot stil >48u (geen reply na opener of mid-conversation)
Strategie: zachte ping, niet pushy. Erken silence.

```
Hey [naam], ik snap dat je het druk hebt. Wil je dat ik later
nog eens contact opneem of komt het nu beter uit?
```

Variaties (rotatie om template-fatigue te voorkomen):
1. "Hoi [naam], nog steeds interesse om een batterij door te rekenen? Ik kan kort bellen wanneer het uitkomt."
2. "Hey [naam], ik laat het rusten. Stuur gerust een bericht als het weer relevant wordt."
3. "[naam] — vraag voor je: zou een gesprek deze week nuttig zijn of liever volgende?"

### B. Terugbellen-overdue (status Terugbellen, geen follow-up >7d)
Strategie: erken eerdere afspraak om terug te bellen.

```
Hoi [naam], we hadden afgesproken dat ik later contact zou opnemen.
Schikt het om deze week kort te bellen?
```

### C. Buitendienst <24u zonder confirm
Strategie: confirm-vraag, low-friction.

```
Hoi [naam], morgen om [tijd] staat onze adviseur bij je voor de
batterij-doorrekening. Schikt dit nog?
```

### D. Gekwalificeerd geen call binnen 24u
Strategie: tijdslot voorstellen, max 2 opties.

```
Hoi [naam], op basis van je situatie kan ik kort bellen om het door
te rekenen. Komt morgen 10:00 of 16:00 jou beter uit?
```

### E. No-reply na opener (binnen 4u)
NIET re-engagen onder 24u — geeft pushy gevoel.

### F. Na 1 nee, geen 3x-nee
Strategie: respect tonen, deur op kier.

```
Helemaal goed [naam]. Mocht je later toch willen weten wat het zou
opleveren, stuur dan gerust een bericht.
```

### G. 3x nee bereikt
GEEN re-engagement. Status: Afgewezen, gesprek beëindigen.

## Flow

### 1. Lijst stuck leads ophalen
- Roep `/audit-leads --stage stuck` of geef specifieke leadlijst
- Per lead: phone, naam, last bot message, last reply timestamp, source campaign

### 2. Per lead bepaal scenario
A/B/C/D/E/F/G volgens regels hierboven.

### 3. Genereer messaging
- Geen template hergebruik in zelfde batch (vermijd Meta spam-detection)
- Personaliseer met naam (geen "beste klant")
- Houd onder 200 chars (WA voorkeursformaat — feedback_whatsapp_format)
- Geen emojis (CLAUDE.md verbod)
- Geen afkortingen

### 4. Compliance check per message
- [ ] Geen prijs
- [ ] Geen concurrent
- [ ] Geen direct buitendienst-aanbod (tenzij scenario C/D)
- [ ] Geen AI-disclosure
- [ ] B1, geen jargon
- [ ] <200 chars

### 5. Timing advies
- Outreach window: 09:00-21:00 (project_outbound_canary)
- Per lead: check timezone
- Niet weekend tenzij user eerder geantwoord op weekend

### 6. Output naar Juan
Genummerde lijst klaar voor copy → DM Champ campaign of GHL workflow.
NOOIT auto-send.

### 7. Suggest workflow update
Als pattern terugkomt: stel voor in welke GHL workflow deze logica permanent moet (zie /ghl-workflow).

## Output format

```
═══ LEAD RE-ENGAGE — scenario <X> ═══

LEADS GEVONDEN: N
Bron: <audit / list>

PER LEAD MESSAGES

1. Naam: <X> | Tel: <X>
   Stuck sinds: <tijd>
   Last bot: "<excerpt>"
   Scenario: <A-G>
   
   Suggested message:
   "<message>"
   
   Compliance: [ ] x6 ✓
   Send window: vandaag 14:00-18:00
   
2. ...

═ SAMENVATTING ═
- Total: N
- Per scenario: A=N, B=N, ...
- Te skippen (3x-nee): N

═ NEXT ═
[ ] Juan reviewt lijst
[ ] Send via DM Champ campagne <id> of GHL workflow
[ ] Update GHL stage na send (zodat next /audit-leads schoner is)

═ PATTERN ═
Als <scenario> >5x voorkomt: stel voor om GHL workflow te bouwen
(zie /ghl-workflow re-engage-X)
```

## Hard rules
- NOOIT auto-send, ALTIJD Juan in de loop
- Bij 3x-nee: STOP, geen creatieve work-around
- Compliance violations = blocker, message niet versturen
- Bij twijfel scenario: vraag Juan
- Memory: bij nieuwe pattern → project_reengage_pattern_<topic>.md

## Memory check
Lees: project_outbound_canary, feedback_whatsapp_format, feedback_chatbot_geen_afkortingen, project_chatbot_v3_insights
