---
name: funnel-copy
description: Hormozi-stijl conversiecopy voor sales funnels — value stack, hook, mechanism, urgency, social proof, risk-reversal, CTA. Gespecialiseerd voor HMB energie-niche (thuisbatterij, saldering, zonnepanelen). Gebruik wanneer Juan landingpagina-copy, ad-creative-copy, email-funnel of OTP-consent-tekst nodig heeft. Niet voor SEO-artikelen (zie /seo-publish) en niet voor algemene tekst (zie /writing).
trigger: /funnel-copy
---

# /funnel-copy

Conversiecopy voor sales funnels volgens Hormozi $100M Offers framework, afgestemd op HMB brand + AVG/telemarketing-2026 compliance.

## Usage

```
/funnel-copy <unit> <onderwerp>
/funnel-copy <unit> --variant <a|b|c>           # genereer A/B variant
/funnel-copy <unit> --doel <site|page|ad|sms|wa>
/funnel-copy <unit> --doelgroep <intent>        # cold | warm | hot
```

`<unit>`:
- `landing` — volledige landingpagina (hero → CTA, alle secties)
- `hero` — alleen hero-sectie (headline + subhead + CTA)
- `value-stack` — Hormozi-value-stack tabel (offer + bonussen)
- `objection` — bezwaar-handling sectie (FAQ-stijl)
- `social-proof` — testimonial/case-block met bron-attributie
- `urgency` — schaarste/deadline-block (zonder fake-scarcity)
- `cta-strip` — herhalende CTA-banner
- `email-funnel` — 3-7 mails (welkomst → nurture → close)
- `wa-script` — WhatsApp bot opener + 3-stap funnel
- `ad-copy` — Meta Ads primary text + headline + description (3 variants)
- `consent-otp` — opt-in tekst voor OTP-flow (juli-2026 compliant)
- `risk-reversal` — garantie/voorwaarden-block
- `bedankt` — thank-you/post-submit pagina

## Hormozi value-equation (volg altijd)

```
Value = (Dream Outcome × Perceived Likelihood) / (Time Delay × Effort & Sacrifice)
```

Concreet voor HMB thuisbatterij funnel:
- **Dream outcome**: zelfvoorzienend, lagere energierekening, futureproof
- **Perceived likelihood**: bewijs (cases, cijfers, certificeringen)
- **Time delay**: hoe snel resultaat zichtbaar (offerte in 24u, installatie in X weken)
- **Effort**: hoe weinig moeite (1 klik calculator, geen opdringerige sales)

→ Schrijven richt zich op: **uitkomst groter, geloofwaardigheid hoger, tijd korter, moeite kleiner.**

## Hard rules — NOOIT overtreden

### Brand (NEXUS BOS sectie 2)
- Geen emojis
- B1-niveau Nederlands
- Geen prijsgaranties of exacte installatiekosten ("vanaf €X")
- Concurrenten nooit negatief noemen (Zonneplan, 1KOMMA5°, Sessy, Sigenergy)
- Geen niet-onderbouwde claims ("100% besparing", "altijd goedkoper")

### Compliance (juli-2026 telemarketing)
- Bij elke telefoon-form: expliciete opt-in tekst, niet pre-checked
- Tekst moet duidelijk zeggen: "telefonisch benaderd voor [doel]"
- Mogelijkheid tot intrekken benoemen
- Privacy-link in footer van form
- Géén soft-opt-in formulering ("we kunnen je bellen omdat je klant bent")

### Sales funnel (NEXUS BOS sectie 5)
- Bot/funnel verkoopt het **telefoongesprek**, NOOIT direct buitendienst
- Bot onthult niet dat hij AI is
- Geen prijzen in WhatsApp/funnel
- 3x-nee = stoppen

## Output structure per unit

### `landing`
1. **Hero** — headline (≤10 woorden), subhead (1 zin), primary CTA
2. **Probleem** — 3 pijnpunten doelgroep (terugleverkosten, saldering 2027, dure energie)
3. **Mechanism** — eigen methode-naam (bv. "BatteryFit-Methode™") + 3 stappen
4. **Value stack** — wat krijg je: bullets met "waarde €X" totaal
5. **Social proof** — 2-3 cases met cijfers + naam regio (geen volledige naam zonder permission)
6. **Risk reversal** — geen-risico framing (geen aankoopplicht, gratis advies, etc.)
7. **Urgency** — saldering-deadline 2027 of capaciteits-schaarste (eerlijk, niet nep)
8. **FAQ** — 5-7 bezwaar-vragen
9. **Final CTA** — herhaling met OTP-consent

### `hero`
- Headline pattern: "[Resultaat] zonder [pijnpunt]" of "[Vraag wakker doelgroep]"
- Subhead: 1 zin met mechanism + cijfer + tijd
- CTA: actie-werkwoord ("Bereken besparing", "Krijg je BatteryFit-rapport"), géén "Lees meer"

### `value-stack`
Tabel met:
| Bonus | Wat | Waarde |
|---|---|---|
| Persoonlijk BatteryFit-rapport | ... | €197 |
| ... | ... | €... |
| **Totale waarde** | | **€X** |
| **Vandaag** | | **Gratis** |

Waarde-getal moet geloofwaardig zijn — geen "€10.000 voor email-template".

### `consent-otp` (kritiek voor juli-2026)
Output altijd inclusief:
1. Opt-in tekst (verplicht aanvinken):
   > "Ja, ik wil dat een energieadviseur van [merk] mij telefonisch benadert om mijn aanvraag voor [specifiek doel] te bespreken. Ik begrijp dat ik deze toestemming altijd kan intrekken via [link/email]."
2. SMS/WA template voor OTP:
   > "[Merk]: je verificatiecode is 123456. Geldig 10 min. Niet aangevraagd? Negeer dit bericht."
3. Bedankt-tekst na verify
4. Privacy-policy link verplicht zichtbaar

### `wa-script`
- Stap 1 (kwalificatie): koopwoning? zonnepanelen? globaal verbruik?
- Stap 2 (aanbod): "Ik plan een kort telefoongesprek in met onze energieadviseur"
- Stap 3 (afspraak): tijdslot voorstellen
- 3x-nee fallback: "Begrepen, ik wens je een fijne dag"
- Bot-regel: NOOIT prijs noemen, NOOIT buitendienst direct verkopen

### `ad-copy` (Meta Ads)
3 variants per call, per variant:
- Primary text (max 125 tekens visible, max 700 totaal)
- Headline (max 27 tekens)
- Description (max 27 tekens)
- Hook-as: probleem / nieuwsgierigheid / sociale bewijs / urgentie

## Schrijfprincipes (van /writing geërfd + extra)

- Lead met de bullseye (= belangrijkste belofte in zin 1)
- Actieve stem altijd
- Concrete cijfers > vage termen ("23% lager" niet "veel lager")
- Korte zinnen (≤20 woorden)
- Eén idee per paragraaf
- Pattern interrupts elke 3-4 alinea's (subhead, bullet, quote, cijfer)

## Output flow

1. **Brief** — bevestig: doelgroep, intent-fase, primaire CTA, lengte-budget
2. **Concept** — eerste versie
3. **Audit zelf** — score op Hormozi-equation (1-10) + 3 zwaktes
4. **Final** — herziene versie
5. **Variants** (indien gevraagd) — A/B met andere hook-as

## Bij doel `--doel ad`
- Houd je aan Meta-policies: geen "claims you'll save €X" zonder bron
- Geen voor/na-afbeeldingen suggereren in copy
- Geen "tap here" / "click here" (Meta penaliseert)

## Bij doel `--doel sms` / `--doel wa`
- Max 160 tekens (SMS) / max 1024 tekens (WA)
- Eén CTA, één tijdslot-vraag
- Sender-naam in eerste 10 tekens

## Referenties

- HMB brand: zie [[reference_hmb_brand]] in vault
- Compliance baseline: `C:\business\Mr Diaz\20-Kennis\Compliance\_Compliance-index.md`
- Hormozi value stack: `CAMPAGNE-OFFERTE-CHECK/00-MASTER-OFFER.md`
- DM Champ regels: `/root/nexus-bos/CLAUDE.md` sectie 5

## Combineer met

- `/copy-check` — review je output tegen brand + compliance + conversion
- `/writing` — voor algemeen niet-funnel werk
- `/design-ad-creative` — voor de visual bij ad-copy
- `/ab-test` — om variants daadwerkelijk te testen
