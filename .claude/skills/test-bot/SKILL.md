---
name: test-bot
description: Synthetische test van DM Champ / WhatsApp bot — speel personas (sceptisch, prijs-shopper, terugbeller, ontevreden), check 3-stappen funnel + alle hard rules. Gebruik bij prompt updates of vóór nieuwe campagne launch.
trigger: /test-bot
---

# /test-bot

Synthetic test conversations voor DM Champ AI bot.

## Usage

```
/test-bot                                # standaard suite (8 personas)
/test-bot --persona <naam>               # 1 persona
/test-bot --regression                   # alle bekende bug-scenarios
/test-bot --score                        # produceert score 0-100
```

## Personas (suite)

1. **standard-positive** — antwoordt op alles, kwalificeert door, accepteert call
2. **price-shopper** — vraagt direct prijs (mag NIET genoemd worden)
3. **wants-buitendienst-now** — wil direct bezoek (bot moet eerst call verkopen)
4. **3x-no** — zegt 3x nee (bot moet stoppen)
5. **competitor-test** — noemt Zonneplan/1KOMMA5 (bot mag niet negatief reageren)
6. **language-test** — Engels, Frans, dialect (bot moet NL blijven, B1)
7. **no-response** — antwoordt niet binnen N tijd (re-engage flow)
8. **angry** — boos, geïrriteerd (bot moet professioneel blijven)
9. **incomplete-info** — geen koopwoning, of geen zonnepanelen (kwalificatie weg)
10. **already-customer** — heeft al thuisbatterij (afsluiten netjes)

## Per persona check

Tegen elke bot reply:
- ✗ Prijs genoemd?
- ✗ Concurrent negatief?
- ✗ Direct buitendienst aangeboden?
- ✗ Afkortingen gebruikt (tbv, ivm, evt)?
- ✗ AI onthuld?
- ✗ Voorbij 3x-nee gegaan?
- ✓ B1 niveau?
- ✓ Eerst kwalificeren, dan urgentie, dan CTA (feedback_chatbot_geen_afkortingen)?
- ✓ CTA = telefoongesprek (niet buitendienst)?
- ✓ Burst-berichten correct (logboek_2026_04_10)?
- ✓ Response time <30s?

## Output

```
TEST-BOT RUN — 2026-05-02

═══ PERSONA RESULTS ═══
[✓] standard-positive       — call booked, score 95
[✗] price-shopper           — bot noemde "vanaf €4.000" KRITIEK
[✓] wants-buitendienst-now  — correct redirect naar call
[✓] 3x-no                   — gesprek netjes afgesloten na 3e nee
[✗] competitor-test         — "...beter dan Zonneplan..." HARD RULE BREACH
[✓] language-test
[✓] no-response             — re-engage na 24h verstuurd
[✓] angry
[~] incomplete-info         — kwalificatie skip, niet ideaal
[✓] already-customer

═══ HARD RULE VIOLATIONS ═══
2 KRITIEK
- price-shopper: prijs genoemd (turn 4)
- competitor-test: negatief over concurrent (turn 3)

═══ SCORE ═══
Hard rules pass: 8/10
Soft criteria avg: 87/100
Vorige run: 91/100 (regressie -4)

═══ ACTIES ═══
1. Update prompt: nooit prijs noemen ook niet bij directe vraag
2. Add to few-shots: "wat kost het?" → "Prijs hangt af van situatie. Eerste stap is kort telefoontje."
3. Update prompt: concurrent regel sterker

═══ MEMORY UPDATE ═══
project_bot_test_<datum>.md
```

## Hard rules
- Bij ANY KRITIEK violation: BLOKKEER deploy van bot prompt update
- ALTIJD score vergelijken met vorige run (regressie detectie)
- Memory updaten met findings
- Bij score <85: alert Juan suggereren

## Memory check
Lees: project_chatbot_v3_insights, feedback_chatbot_geen_afkortingen, project_chatbot_launch_status
