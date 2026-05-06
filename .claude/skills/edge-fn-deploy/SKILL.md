---
name: edge-fn-deploy
description: Deploy een Supabase edge function met juiste auth-pattern (Type A verify_jwt vs Type B x-api-key vault), shared module check, smoke test. Gebruik wanneer Juan een edge function wil pushen, herstellen, of nieuw wil opzetten.
trigger: /edge-fn-deploy
---

# /edge-fn-deploy

Edge function deploy volgens reference_pt_auth_architecture (vault-first via _shared/auth.ts is canonical).

## Usage

```
/edge-fn-deploy <function-name>
/edge-fn-deploy <function-name> --type A   # verify_jwt gateway
/edge-fn-deploy <function-name> --type B   # x-api-key vault (default)
/edge-fn-deploy <function-name> --dry-run  # alleen check, geen deploy
```

## Pre-deploy checks

### 1. Auth pattern check
- Type A (`verify_jwt = true` in config.toml): user-facing, JWT van auth.users
- Type B (`verify_jwt = false`): server-to-server, gebruikt `_shared/auth.ts` met `x-api-key` vanuit vault

### 2. Code quality
- [ ] Importeert `_shared/auth.ts` (Type B) of valideert JWT (Type A)
- [ ] Gebruikt `Deno.env.get()` — geen hardcoded secrets
- [ ] CORS headers correct (zie feedback_cors_domein: performancetracker.nl)
- [ ] Error handling met try/catch
- [ ] Geen `console.log` met sensitive data
- [ ] Logs naar `pg_audit` of dedicated table

### 3. Vault secrets present
Check dat alle `Deno.env.get('X')` keys bestaan in Supabase Vault.

### 4. SQL dependencies
- Migrations gerelateerd aan deze function applied?
- pg_cron jobs verwijzen naar juiste URL?

## Deploy flow

```bash
# Via Supabase MCP (preferred)
mcp__claude_ai_Supabase__deploy_edge_function

# Of CLI
supabase functions deploy <function-name> --project-ref <ref>
```

## Post-deploy smoke test

```bash
# Type A
curl -X POST https://<ref>.supabase.co/functions/v1/<name> \
  -H "Authorization: Bearer <user-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"smoke":"test"}'

# Type B (kritisch: pg_net http_post MOET jsonb headers, NIET ARRAY::net.http_header — zie feedback_pg_net_jsonb_headers)
curl -X POST https://<ref>.supabase.co/functions/v1/<name> \
  -H "x-api-key: <vault-key>" \
  -H "Content-Type: application/json" \
  -d '{"smoke":"test"}'
```

Check logs:
```
mcp__claude_ai_Supabase__get_logs
```

## Output

```
EDGE FN DEPLOY — <function-name>
Type: A | B
Pre-checks: PASS/FAIL
Deploy: SUCCESS/FAIL
Smoke test: HTTP <code> in <ms>ms
Logs: [snippet recente errors of 'clean']

VOLGENDE STAPPEN:
- [actiepunt indien nodig]
```

## Hard rules
- NOOIT Type A→B omschakelen zonder migratie van calling clients
- NOOIT deploy zonder smoke test
- pg_net calls: jsonb headers, geen ARRAY syntax
