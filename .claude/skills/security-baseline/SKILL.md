---
name: security-baseline
description: Universele security review van een feature, app, edge function, repo of deploy tegen de vault Security baseline. Anders dan /pt-review (specifiek Performance Tracker) — deze werkt voor élke stack. Gebruik vóór release, na grote refactor, bij nieuwe externe vendor, of na een incident.
trigger: /security-baseline
---

# /security-baseline

Security review tegen de [Security baseline](C:/business/Mr Diaz/20-Kennis/Security/_Security-index.md). Universeel inzetbaar (HMB, Voltafy, PT, NEXUS, Marketing, klant-projecten).

## Usage

```
/security-baseline                              # full sweep huidige project
/security-baseline <pad/repo>                   # gerichte audit
/security-baseline --scope rls                  # Supabase RLS policies + advisors
/security-baseline --scope auth                 # auth patterns (Type A/B/PinGate)
/security-baseline --scope secrets              # hardcoded keys / .env in git
/security-baseline --scope headers              # security headers (HSTS/CSP/X-Frame)
/security-baseline --scope deps                 # dep audit + outdated
/security-baseline --scope webhooks             # signed inbound webhooks
/security-baseline --quick                      # top-10 risks
/security-baseline --pre-release                # pre-deploy checklist
```

## Hard rules (uit baseline)

- Geen `USING(true)` in RLS policies
- Geen secret in code, comment, README, of git-history
- Geen open inbound webhook (HMAC-verify verplicht)
- Geen `*` CORS op endpoints met persoonsgegevens
- Geen `console.log(req.body)` op routes met PII
- Geen deploy zonder rollback-tag + recente backup

## Audit flow

### 1. Scope detecteren
- Geen argument → analyseer current working dir
- `--scope` of pad → focus daar

### 2. RLS audit (Supabase projecten)
```sql
-- Open policies
SELECT schemaname, tablename, policyname, qual
FROM pg_policies
WHERE qual = 'true' OR qual ILIKE '%true%';

-- Tabellen zonder RLS
SELECT relname FROM pg_class
WHERE relkind = 'r' AND NOT relrowsecurity AND relnamespace =
  (SELECT oid FROM pg_namespace WHERE nspname = 'public');
```
Per gevonden issue: tabel, risico, fix-suggestie met USING-expressie.

### 3. Secret-scan
```bash
# Hardcoded keys
grep -rE "sk-[a-zA-Z0-9]{20,}|pit-[a-zA-Z0-9]{20,}|eyJ[a-zA-Z0-9-_]{20,}" src/ apps/ packages/
# .env in git
git ls-files | grep -E "^\.env($|\.)"
# Recent .env writes in history
git log --all -p -- ".env*" | head -100
```
Voor elk: file:line, type secret, fix (verwijder + roteer).

### 4. Auth pattern check (edge fns / API routes)
- Per route: gebruikt het Type A (verify_jwt) of Type B (x-api-key)?
- Public routes: heeft het rate-limit?
- PinGate routes: hash-vergelijking + expiry + rate-limit aanwezig?
- `_shared/auth.ts` module gebruikt waar van toepassing? (DRY)

### 5. Input validatie
- Zod / Valibot / Yup schema's op alle externe inputs?
- Email/phone/postcode genormaliseerd?
- File-upload: max-size + MIME-allowlist?
- Honeypot / rate-limit op forms?

### 6. Webhook signing (inbound)
- GHL webhooks: HMAC-verify aanwezig?
- Meta CAPI: bearer-token check?
- Stripe (indien): `Stripe-Signature` verify?
- Per niet-gesigned endpoint: BLOCKER.

### 7. Security headers (sites)
```bash
curl -sI https://<domain> | grep -iE "strict-transport|content-type-options|x-frame|referrer-policy|permissions-policy|content-security"
```
Test ook op subroutes (Nginx erfregels — zie HMB 2026-04-28).

### 8. Dependency audit
```bash
npm audit --audit-level=high
# of
bun audit
```
High/critical = BLOCKER. Medium = sprint-planning.

### 9. CORS check
- Per app: ALLEEN eigen domeinen?
- PT specifiek: NIET `app.voltafy.nl` (zie feedback_cors_domein)
- Geen `*` op PII-endpoints

### 10. Logging hygiene
```bash
grep -rE "console\.(log|info)\(.*(req\.body|user|email|phone)" src/
```
PII in logs = BLOCKER.

### 11. Pre-release (alleen bij `--pre-release`)
- [ ] CI groen op deploy-commit
- [ ] `npm audit` clean
- [ ] DB-migraties dry-run gedaan
- [ ] `/backup-verify` recent (max 24u)
- [ ] Rollback-pad bekend
- [ ] Smoke-test plan klaar

## Output format

```markdown
# Security baseline review — <scope>
Datum: <YYYY-MM-DD> · Project: <naam> · Severity: <green/yellow/red>

## Samenvatting
<1-3 zinnen: stand, grootste risico, totaal items>

## 🔴 BLOCKERS (fix vóór merge/deploy)
### <item>
- Waar: <file:line of URL>
- Wat: <wat is er fout>
- Risico: <welke aanvalsvector, welke data>
- Fix: <concrete code/config aanpassing>

## 🟡 WARNINGS (fix in deze sprint)
...

## 🟢 OK
<afgevinkte items>

## Vervolgactie
- [ ] <TODO 1>
- [ ] <TODO 2>
```

## Memory + vault hooks

- Lees vooraf: `feedback_baselines_consult` + `reference_baselines` uit memory
- Bij nieuwe pattern → update vault `_Security-index.md` (niet memory dupliceren)
- Bij compromise: trigger `/incident` skill, NIET secrets in chat zetten

## Onderscheid van andere skills

- `/pt-review` — alleen Performance Tracker, gebruikt PT-specifieke backlog
- `/audit-db` — alleen Supabase database (advisors, slow queries, indices)
- `/audit-server` — VPS hardening (fail2ban, cron, disk, processes)
- `/audit-repos` — repo-niveau (open PRs, stale branches, billing)
- `/security-baseline` — **deze skill** — universele applicatie-security review tegen baseline
