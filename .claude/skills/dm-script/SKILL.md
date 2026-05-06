---
name: dm-script
description: Genereer DM Champ / WhatsApp bot messaging volgens NEXUS BOS sales funnel regels (3 stappen, nooit AI onthullen, 3x-nee, geen prijzen, alleen telefoongesprek verkopen). Gebruik wanneer Juan WhatsApp scripts, bot replies, of outreach copy wil.
trigger: /dm-script
---

# /dm-script

WhatsApp / DM Champ messaging volgens CLAUDE.md §5 + memory project_chatbot_v3_insights + feedback_chatbot_geen_afkortingen.

## Usage

```
/dm-script <fase>
/dm-script <fase> --persona <thuisbatterij-oriëntatie|salderings-zorgen|prijs-shopper>
/dm-script <fase> --tone <warm|zakelijk|adviserend>
```

`<fase>`:
- `opener` — eerste contact bericht
- `qualify` — kwalificatie (koopwoning? zonnepanelen? verbruik?)
- `urgentie` — saldering 2027 / terugleverkosten urgentie creëren
- `cta-call` — sluit telefoongesprek (NIET buitendienst)
- `objection-prijs` — antwoord op "wat kost het?"
- `objection-buitendienst` — antwoord op "kan iemand langskomen?"
- `objection-tijd` — antwoord op "geen tijd"
- `nee-1` / `nee-2` / `nee-3` — escalatie afwijzing
- `terugbel` — re-engagement na geen reactie
- `kwalificatie-positief` — overdracht naar adviseur

## Hard rules (NOOIT overtreden)

1. Bot verkoopt ALLEEN het telefoongesprek als volgende stap
2. NOOIT direct buitendienst aanbieden — altijd "eerst kort telefoontje"
3. Bot onthult NOOIT dat hij AI is
4. Bij 3 afwijzingen: gesprek beëindigen
5. NOOIT exacte prijzen of prijsgaranties
6. NOOIT negatief over concurrenten (Zonneplan, 1KOMMA5°, Sessy)
7. GEEN afkortingen (bijv. niet "tbv", "ivm", "evt")
8. EERST kwalificeren en urgentie, DAN pas CTA
9. GEEN emojis
10. B1-niveau Nederlands, korte zinnen

## Format per bericht

```
FASE: <fase>
INTENT: <wat dit bericht moet bereiken>
BERICHT:
<copy>

VARIANTEN:
A) <variant 1>
B) <variant 2>

TRIGGER VOOR VOLGENDE FASE: <wanneer naar volgende stap>
GHL TAG ACTIE: <tag toevoegen na verzending>
```

## Standaard antwoord op "kan iemand langskomen?"
> "De eerste stap is een kort telefoontje. Pas als dat goed bevalt komt er eventueel iemand langs."

## Memory check
Lees: project_chatbot_v3_insights, feedback_chatbot_geen_afkortingen, project_whatsapp_bot, logboek_2026_04_16
