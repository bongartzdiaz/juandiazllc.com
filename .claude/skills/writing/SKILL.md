---
name: writing
description: Schrijf of herschrijf tekst (email, post, artikel, slide, post-mortem) volgens helderheid-eerst principe — actieve stem, korte zinnen, lead met de bullseye. Gebruik wanneer de gebruiker vraagt om "schrijf", "verbeter deze tekst", "herschrijf", of een document/email/post nodig heeft.
trigger: /writing
---

# /writing

Schrijfwerk volgens helderheid-eerst principe.

## Usage

```
/writing <type> <onderwerp>
/writing rewrite <pad-naar-tekst>      # bestaand stuk verbeteren
/writing <type> --tone <warm|zakelijk|adviserend|direct>
/writing <type> --lengte <kort|middel|lang>
/writing <type> --taal <nl|en|de>
```

`<type>`:
- `email` — zakelijke mail
- `post` — LinkedIn / social post
- `artikel` — long-form (gebruik /seo-publish voor HMB content)
- `pitch` — sales/business pitch
- `update` — status update / changelog
- `post-mortem` — incident/retro
- `bio` — persoonlijke bio
- `samenvatting` — TL;DR van langere tekst

## Schrijfprincipes (volg ALTIJD)

### 1. Lead met de bullseye
Eerste zin = belangrijkste punt. NOOIT: "Ik wilde even laten weten dat..." → WEL: "De deploy is mislukt door een DNS issue."

### 2. Actieve stem
"Het rapport is verstuurd door het team" → "Het team stuurde het rapport."

### 3. Verwijder ballast
Schrap: "eigenlijk", "best wel", "een soort van", "in feite", "even", "gewoon"
Schrap: filler-zinnen die niets toevoegen ("Hopelijk gaat het goed met je.")

### 4. Korte zinnen
Max 20 woorden per zin. Bij twijfel: split.

### 5. Concrete cijfers > vage termen
"veel" → "23%". "snel" → "binnen 5 min". "binnenkort" → "vrijdag".

### 6. Eén idee per paragraaf
Nieuwe paragraaf = nieuwe gedachte. Geen muur van tekst.

### 7. Geen marketing-hype
Skip: "game-changing", "revolutionary", "best-in-class", "unleash", "unlock", emojis (tenzij expliciet gevraagd).

### 8. CTA aan het eind (waar van toepassing)
Eén concrete vraag/actie. Niet drie.

## Type-specifieke regels

### Email
- Subject ≤ 50 tekens, beschrijvend
- Eerste zin = waarom je mailt
- Bullets > paragrafen voor opsommingen
- Sluiten met concrete next step + verantwoordelijke

### LinkedIn post
- Hook in regel 1 (de "stop scrollen" zin)
- 3-5 korte paragrafen met witregels
- Eindigen met vraag of statement
- Geen hashtag-spam (max 3 relevant)
- Geen emoji-bullets

### Post-mortem
Format:
```
## Wat gebeurde
## Impact (cijfers)
## Tijdlijn (HH:MM events)
## Root cause
## Wat we doen om herhaling te voorkomen
## Wat goed ging
```

### Pitch
Hormozi-stijl: probleem → kost van niks-doen → oplossing → bewijs → garantie → CTA.

### Update / changelog
Bullets per change, gegroepeerd: Added / Changed / Fixed / Removed.

## Output flow

1. **Concept** — eerste versie volgens principes
2. **Audit** — toon zelfkritiek: 3 dingen die nog beter kunnen
3. **Final** — herschreven versie

## Bij `rewrite`
Toon side-by-side: voor → na. Per wijziging korte reden ("verwijderd: ballast", "actief gemaakt", "concrete cijfer toegevoegd").

## Tone defaults
- email zakelijk: warm-direct, geen "Ik hoop dat deze mail je goed bereikt"
- post NL: geen Engels jargon tenzij vakterm, B1-niveau
- artikel HMB: zie /seo-publish voor specifieke regels (geen prijzen, geen concurrent-bashing)
