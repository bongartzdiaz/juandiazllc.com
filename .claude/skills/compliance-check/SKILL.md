---
name: compliance-check
description: AVG/GDPR audit van een specifieke feature, form, app of integratie tegen de vault Compliance baseline. Gebruik bij nieuwe lead-form, nieuwe vendor, nieuwe tracker, jaarlijkse refresh, of vóór release naar EU-markt. Output is een afgevinkte checklist met fixes per gefaald item.
trigger: /compliance-check
---

# /compliance-check

Audit een feature/app/site tegen de [Compliance baseline](C:/business/Mr Diaz/20-Kennis/Compliance/_Compliance-index.md) (AVG/GDPR — NL/EU).

## Usage

```
/compliance-check                              # full audit van huidige project
/compliance-check <pad/url/feature-naam>       # gerichte audit
/compliance-check --scope forms                # alleen lead-forms
/compliance-check --scope cookies              # alleen cookies/tracking
/compliance-check --scope retentie             # alleen retentie/AVG-verzoek-flow
/compliance-check --scope verwerkers           # alleen verwerkersregister
/compliance-check --quick                      # top-10 risks
```

## Hard rules (uit baseline)

- Geen lead-form, analytics, pixel, of webhook live zonder consent + lawful basis
- Marketing-checkbox altijd opt-in (uit-default)
- Cookie banner laadt geen tracker vóór toestemming; "Weigeren" net zo prominent als "Accepteren"
- Geen pre-checked vinkjes (NL AP-handhaving 2023)
- Vergetelheid-verzoek = delete in ALLE systemen (Supabase + GHL + DM Champ + Baileys)
- Server logs strippen PII

## Audit flow

### 1. Scope detecteren
- Geen argument → analyseer current working dir + git-status om scope te bepalen
- Pad meegegeven → grep dat pad
- URL meegegeven → fetch + parse + scan voor cookies/forms/tracker-snippets

### 2. Lead-form check (per gevonden form)
- [ ] Privacy-link in form (niet alleen pagina-footer)
- [ ] Doel benoemd specifiek (niet vaag "voor onze diensten")
- [ ] Marketing-opt-in checkbox aanwezig + uit-default
- [ ] Velden minimaal — geen overbodige velden
- [ ] Server-side validatie + rate-limit + honeypot
- [ ] Confirm-page met uitleg + afmeld-info
- [ ] Backend stores `consent_timestamp`, `consent_text_version`, `lawful_basis`, `source_url`

### 3. Cookies & tracking check
- [ ] CookieBanner-component aanwezig + granular (functional/analytics/marketing)
- [ ] Trackers (Pixel/GA4/PostHog/Clarity) achter consent-gate
- [ ] CAPI server-side ook achter consent
- [ ] Voorkeur opslaan + opnieuw vragen binnen 12mnd
- [ ] Geen cookie-wall (toegang weigeren bij weigeren = niet ok)

### 4. Verwerkers check
- [ ] Alle nieuwe vendors in `70-Referentie/Verwerkersregister.md`
- [ ] Per vendor: doel, lawful basis, retentie, sub-verwerkers, locatie, DPA-link
- [ ] EU of SCC/DPF-compliant voor non-EU

### 5. Retentie + AVG-verzoek
- [ ] Retentie per data-type vastgelegd in code (cron / pg_cron job)
- [ ] Vergetelheid-flow getest: lead → DELETE in Supabase + GHL + DM Champ + Baileys + email-suppression
- [ ] Inzage-flow: SQL export + GHL contact-export route bekend
- [ ] Email voor AVG-verzoeken bekend in privacy-policy

### 6. Privacy-policy check
- Privacy-policy aanwezig + bevat 10 verplichte secties (zie baseline)
- Versie + datum recent (< 12mnd)
- Bumped bij elke vendor/scope-wijziging

### 7. Software-specifieke regels
- [ ] Supabase RLS aan op tabellen met persoonsgegevens
- [ ] Edge fn logs strippen request-body bij PII
- [ ] GHL webhooks signed
- [ ] WhatsApp: geen broadcast >9mnd inactief

## Output format

```markdown
# Compliance check — <scope/feature>
Datum: <YYYY-MM-DD> · Project: <naam> · Severity: <green/yellow/red>

## Samenvatting
<1-3 zinnen: stand van zaken, grootste risico, totaal items>

## Gefaalde items (priority order)

### 🔴 BLOCKER — <item>
- Waar: <file:line of URL>
- Wat: <wat is er fout>
- Risico: <welke data, welke gebruiker, welke wet>
- Fix: <concrete actie>
- Skill om te helpen: <indien van toepassing>

### 🟡 WARNING — <item>
...

### 🟢 OK
<lijst met afgevinkte items voor zekerheid>

## Vervolgactie
- [ ] <concrete TODO 1>
- [ ] <concrete TODO 2>
```

## Memory + vault hooks

- Lees vooraf: `feedback_baselines_consult` + `reference_baselines` uit memory
- Update bij nieuwe pattern: vault `_Compliance-index.md`
- Bij ernstige bevinding: `/incident` flow triggeren, NIET via Slack secrets sturen
