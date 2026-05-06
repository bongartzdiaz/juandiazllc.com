---
name: copy-check
description: Review bestaande copy tegen HMB brand-stijl, AVG/telemarketing-2026 compliance, conversion-elementen en leesbaarheid. Output is gestructureerd issue-rapport met severity + concrete fix per item. Gebruik wanneer Juan een bestaand stuk copy (landing, ad, email, post, WA-script) wil laten reviewen vóór live, of wanneer hij twijfelt of iets compliant is. Niet voor SEO on-page audit (zie /seo-audit-page).
trigger: /copy-check
---

# /copy-check

Audit-skill voor bestaande copy. Checkt 4 dimensies tegelijk: **brand**, **compliance**, **conversion**, **leesbaarheid**.

## Usage

```
/copy-check <pad-naar-tekst-of-url>
/copy-check --inline                   # paste tekst direct
/copy-check --scope <brand|compliance|conversion|leesbaarheid|all>
/copy-check --type <landing|ad|email|wa|post|funnel-stap>
```

## De 4 checks

### 1. Brand check (NEXUS BOS sectie 2)

| Issue | Severity |
|---|---|
| Emoji in body | HIGH |
| Prijsgarantie of exacte installatiekosten genoemd | CRITICAL |
| Concurrent negatief benoemd (Zonneplan / 1KOMMA5° / Sessy / Sigenergy) | CRITICAL |
| Niet-onderbouwde claim ("altijd goedkoper", "100% besparing") | HIGH |
| Marketing-hype woorden ("revolutionair", "game-changer", "ultiem") | MEDIUM |
| Niet B1-niveau (vakjargon zonder uitleg, lange zinnen >25 woorden) | MEDIUM |
| Engels jargon waar NL-equivalent bestaat | LOW |
| Tone-mismatch (te zakelijk waar warm-direct verwacht of vice versa) | LOW |

### 2. Compliance check (juli-2026 + AVG)

**Telemarketing 2026 — bij elk form dat naar telefoon-contact leidt:**

| Issue | Severity |
|---|---|
| Marketing-checkbox pre-checked | CRITICAL — illegaal per 1 juli 2026 |
| Geen expliciete opt-in tekst voor telefonisch contact | CRITICAL |
| Soft-opt-in formulering ("omdat je klant bent kunnen we je bellen") | CRITICAL |
| Specifiek doel ontbreekt ("voor onze diensten" ipv "voor offerte thuisbatterij") | HIGH |
| Geen optie tot intrekken consent benoemd | HIGH |
| Privacy-link ontbreekt bij form | HIGH |
| OTP-tekst noemt geen ongelding-procedure ("niet aangevraagd? negeer") | MEDIUM |

**AVG-bredere check (sectie 4 vault Compliance-index):**

| Issue | Severity |
|---|---|
| BSN/medische data gevraagd zonder lawful basis | CRITICAL |
| Cookie-banner mist 'weigeren' even prominent als 'accepteren' | HIGH |
| Bewaartermijn niet benoemd in privacy-tekst | MEDIUM |
| Geen bevestigings-mail flow (dubbel opt-in) bij email-list | MEDIUM |
| Verwerker (GHL/Meta/etc.) niet vermeld in transparency-blok | LOW |

### 3. Conversion check (Hormozi-elements + funnel basics)

| Element | Check |
|---|---|
| Hook in eerste regel | Stop-scroll moment? Probleem-pijn-oplossing-belofte direct? |
| Headline ≤10 woorden, ≤60 tekens | Lengte ok? Concrete uitkomst? |
| Subhead voegt mechanism + tijd toe | "Hoe?" en "Wanneer?" beantwoord? |
| Primary CTA actie-werkwoord | "Bereken", "Krijg", niet "Lees meer" / "Klik hier" |
| Value stack zichtbaar | Wat krijg je + waarde-cijfer (geloofwaardig) |
| Social proof met cijfer + bron | "Klant uit Utrecht — 23% lager" beter dan "tevreden klanten" |
| Risk reversal benoemd | Geen aankoopplicht / gratis advies / no-strings |
| Urgency eerlijk | Saldering 2027 OK, fake-timer NIET OK |
| Pattern interrupts elke 3-4 alinea's | Subhead/bullet/quote/cijfer afwisseling |
| FAQ adresseert top-3 bezwaren | Prijs / urgentie / vertrouwen / proces |
| CTA herhaald minimaal 3× op landing | Boven-fold, midden, einde |

### 4. Leesbaarheid check (B1 + scanbaarheid)

| Issue | Severity |
|---|---|
| Zin >25 woorden | MEDIUM — split |
| Paragraaf >5 zinnen | MEDIUM — pattern interrupt invoegen |
| Passieve stem (ratio >20% van zinnen) | MEDIUM |
| Filler-woorden ("eigenlijk", "best wel", "een soort van", "in feite") | LOW |
| Vage termen zonder cijfer ("veel", "snel", "binnenkort") | LOW |
| Walls of text zonder subheads | MEDIUM |
| Geen bullets bij opsommingen >3 items | LOW |

## Output format

```markdown
# Copy-check: <bestand of titel>

## Score (1-10 per dimensie)
- Brand: 8/10
- Compliance: 5/10  ← actie nodig
- Conversion: 7/10
- Leesbaarheid: 9/10

## Critical issues (eerst fixen)
1. **<file>:<regel>** — pre-checked marketing-checkbox  
   → Vervang door: opt-out default + expliciete tekst (zie /funnel-copy consent-otp)

2. ...

## High issues
- ...

## Medium issues
- ...

## Low issues
- ...

## Wat is goed
- ...

## Aanbevolen volgende stap
1. <concrete actie 1>
2. <concrete actie 2>
```

## Hard rules — wat copy-check NOOIT doet

- Niet vaag "tone is off" zeggen — altijd concrete regel + voorgestelde herziening
- Niet alle issues op gelijke voet — altijd severity
- Niet de copy zelf herschrijven — dat is /writing of /funnel-copy
- Niet googlen/raden naar bron-claims — als claim verdacht, markeer als HIGH ("verifieer bron")

## Bron-checks (extern)

Bij `--scope compliance` ook checken:
- Worden specifieke wetstermen correct gebruikt? (saldering ≠ terugleververgoeding)
- Worden subsidies/regelingen correct benoemd? (SDE++ ≠ ISDE)
- Cijfers/percentages in copy: trace naar bron

## Combineer met

- `/funnel-copy` — om gevonden issues te repareren met conversie-gerichte herziening
- `/writing rewrite` — voor algemene tekst-fixes
- `/seo-audit-page` — voor on-page SEO-elementen (meta, H1, schema) die buiten scope vallen
- `/audit-site` — voor technische site-audit (perf, security, accessibility)

## Snel commando

`/copy-check <pad>` zonder flags = volledige check op alle 4 dimensies + scope `all`.
