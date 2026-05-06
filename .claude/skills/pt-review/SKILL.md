---
name: pt-review
description: Performance Tracker security/quality sweep tegen project_pt_security_todo backlog (USING(true) RLS audit, PinGate, hardcoded keys, edge function auth). Gebruik wanneer Juan PT/Voltafy security wil checken, vóór een release, of na grote wijzigingen.
trigger: /pt-review
---

# /pt-review

Security & quality sweep voor Performance Tracker volgens project_pt_security_todo + reference_pt_auth_architecture.

## Usage

```
/pt-review                  # full sweep
/pt-review --scope rls      # alleen RLS policies
/pt-review --scope auth     # alleen edge function auth
/pt-review --scope keys     # hardcoded secrets/keys
/pt-review --quick          # snelle check, top-10 risks
```

## Checks (volledig)

### 1. RLS Policies — `USING(true)` audit
```sql
SELECT schemaname, tablename, policyname, qual
FROM pg_policies
WHERE qual = 'true' OR qual ILIKE '%true%';
```
Per gevonden policy:
- Tabel + policy naam
- Risico: wie kan dit lezen/schrijven?
- Fix: concrete USING expressie suggestie

### 2. Edge function auth (Type A vs Type B)
- Type A (verify_jwt gateway): scan supabase/config.toml — `verify_jwt = false` is RED FLAG zonder reden
- Type B (x-api-key vault): scan _shared/auth.ts gebruik — alle functies moeten via shared module
- Hardcoded keys in function code (NIET via Deno.env): RED FLAG

### 3. PinGate
- Welke routes hebben PinGate?
- Welke ZOUDEN moeten? (admin, klantreis-edit, sync triggers)
- Check op bypass via querystring/header

### 4. Hardcoded secrets
Grep door codebase:
- `eyJ...` (JWT)
- `sk_`, `pk_` (Stripe-style)
- `SUPABASE_SERVICE_ROLE` literal
- `GHL_API_KEY` literal
- `.env` files in git history

### 5. CORS
- ALTIJD `performancetracker.nl` (zie feedback_cors_domein)
- NOOIT `app.voltafy.nl`
- Geen wildcard `*` op auth endpoints

### 6. Code quality
- USING(true) backlog uit memory
- Onbeschermde sync endpoints
- Missing rate limits op publieke routes

## Output

```
PT REVIEW — [datum]
Scope: [scope]

═══ KRITIEK (fix vandaag) ═══
1. [finding] — [bestand:regel] — [fix]

═══ HIGH (deze sprint) ═══
1. [finding] — [bestand:regel] — [fix]

═══ MEDIUM (backlog) ═══
1. [finding] — [bestand:regel] — [fix]

═══ TOTAAL ═══
Kritiek: N | High: N | Medium: N | Low: N
Vergelijking met vorige sweep: ±N

═══ MEMORY UPDATE ═══
[Voorstel update voor project_pt_security_todo.md]
```

## Hard rules
- Bij KRITIEK finding: Slack-bericht naar Juan suggereren
- ALTIJD memory updaten na sweep
- GEEN N8N (zie feedback_geen_n8n) — flag elk N8N gebruik
