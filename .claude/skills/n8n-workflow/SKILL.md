---
name: n8n-workflow
description: Bouw n8n workflow JSON met NEXUS BOS regels — 6-uurs cron, Supabase x-api-key header, jsonb pg_net headers, IF node voor pending_review check, geen denken in n8n (alleen orchestratie). Gebruik tijdens week 11 migratie van Relevance AI naar n8n.
trigger: /n8n-workflow
---

# /n8n-workflow

n8n workflow builder volgens NEXUS BOS architectuur (CLAUDE.md §7).

## Usage

```
/n8n-workflow <pipeline-naam>
# vb: /n8n-workflow content-cyclus-6u
# vb: /n8n-workflow ahrefs-ranking-fetch
# vb: /n8n-workflow ghl-lead-inbound
# vb: /n8n-workflow supabase-publish-trigger
```

## Architectuur principes (CLAUDE.md §7)

n8n = orchestratie. Denkt NIET zelf na. Triggert Claude Code op 6-uurs schema.

Basis flow:
```
Cron (00/06/12/18)
 → ranking data fetch (Ahrefs)
 → opdracht naar Claude Code agent
 → Claude Code: genereer / optimaliseer
 → push Supabase (status: pending_review)
 → Slack notif Juan
```

## Standaard nodes & patterns

### Trigger nodes
- **Cron**: 6-uurs schema `0 0,6,12,18 * * *` (Amsterdam timezone!)
- **Webhook**: voor inbound (GHL leads, callbacks)
- **Manual**: voor test runs

### HTTP Request nodes (Supabase calls)
```
Method: POST / GET / PATCH
URL: https://<project-ref>.supabase.co/rest/v1/<table>
Headers:
  apikey: {{ $env.SUPABASE_ANON_KEY }}
  Authorization: Bearer {{ $env.SUPABASE_SERVICE_KEY }}
  Content-Type: application/json
  Prefer: return=representation
```

Voor edge functions specifiek:
```
URL: https://<project-ref>.supabase.co/functions/v1/<function-name>
Headers:
  x-api-key: {{ $env.EDGE_FN_KEY }}   ← NIET Authorization Bearer
```

### IF node (pending_review check)
```
Condition: {{ $json.status }} === "pending_review"
True: ga door met publish flow
False: stop / log
```

### Code node (JS) — minimale logica
- Alleen voor data transformatie
- Geen "thinking" — als logica complex wordt, push naar Claude Code agent
- Bekend: feedback_n8n_javascript indien nodig

### Code node (Python)
- Voor data processing waar JS te beperkt is
- Gebruik n8n-code-python skill (CLAUDE.md §10)

### pg_net (Postgres → outbound)
HEADERS MOETEN JSONB ZIJN, NIET ARRAY:
```sql
SELECT net.http_post(
  url := '...',
  body := '{"foo":"bar"}'::jsonb,
  headers := '{"x-api-key":"..."}'::jsonb   -- jsonb NIET ARRAY
);
```
(feedback_pg_net_jsonb_headers)

## Standaard workflow templates

### Template 1: 6-uurs content cyclus
```
[Cron 0 0,6,12,18 * * *]
  ↓
[HTTP: Ahrefs rank-tracker]
  ↓
[Code: filter top deltas]
  ↓
[HTTP: trigger Claude Code agent webhook]
  ↓ (wait callback)
[HTTP: Supabase insert article (status=pending_review)]
  ↓
[HTTP: Slack notif Juan]
```

### Template 2: GHL inbound lead
```
[Webhook: /ghl/new-lead]
  ↓
[Code: extract lead fields]
  ↓
[IF: source matches campaign?]
  ├ true → [HTTP: Supabase upsert leads] → [HTTP: DM Champ webhook]
  └ false → [Log + drop]
```

### Template 3: Supabase publish trigger (auth approval)
```
[Webhook: /publish/<id>]
  ↓
[HTTP: Supabase select article]
  ↓
[IF: status == pending_review]
  ├ true → [HTTP: PATCH status=published, set published_at]
  │         → [HTTP: Slack notif]
  └ false → [Log + 400 response]
```

## Flow

### 1. Spec vragen
- Wat is de trigger?
- Welke data fetch / write?
- Welke conditional branches?
- Wat is success / failure path?

### 2. Bouw flow
Use n8n expression syntax `{{ $json.field }}` correct (n8n-expression-syntax skill bestaat al, CLAUDE.md §10).

### 3. Validate
- Cron syntax check (5 fields)
- Header types (jsonb voor pg_net)
- Auth: edge fn = x-api-key, REST = apikey + Authorization
- Geen secrets in body — gebruik env vars / credentials

### 4. Error handling
Per HTTP node:
- Retry policy (3 retries, exponential)
- On error: branch naar error-log node + Slack alert

### 5. Test in n8n staging
- Manual trigger eerst
- Check elke node output
- Daarna: enable cron

### 6. Output: JSON workflow + setup instructies

```json
{
  "name": "<workflow-naam>",
  "nodes": [
    { "id": "cron-1", "type": "n8n-nodes-base.cron", "parameters": { ... } },
    { "id": "http-1", "type": "n8n-nodes-base.httpRequest", "parameters": { ... } },
    ...
  ],
  "connections": { ... }
}
```

### 7. Setup checklist
- [ ] Credentials gevuld in n8n: Supabase, Slack, Ahrefs, DM Champ
- [ ] Env vars gezet: SUPABASE_ANON_KEY, SERVICE_KEY, EDGE_FN_KEY
- [ ] Webhook URL gepubliceerd waar nodig
- [ ] Test run succesvol
- [ ] Cron enabled

## Output format

```
═══ N8N WORKFLOW — <naam> ═══

DOEL
[1-2 zin]

TRIGGER
[type + schedule/url]

NODE FLOW
[ASCII diagram]

KEY DECISIONS
- Auth pattern: <REST / edge fn>
- Header type: <Bearer / x-api-key>
- Cron: <expression> Europe/Amsterdam

JSON
[code block]

ERROR HANDLING
- Retry: 3x exponential
- On fail: Slack alert via #nexus-alerts

ENV VARS NODIG
- SUPABASE_ANON_KEY
- ...

CREDENTIALS NODIG
- ...

TEST PLAN
1. Manual trigger met dummy payload
2. Check elke node output
3. Verify Supabase row geschreven
4. Verify Slack post

DEPLOY
[ ] Import JSON in n8n UI
[ ] Vul credentials
[ ] Test run
[ ] Enable

MEMORY
project_n8n_workflow_<naam>.md
```

## Hard rules
- n8n DENKT NIET — alleen orchestratie. Complexe logica → Claude Code agent
- pg_net headers ALTIJD jsonb (NIET array)
- Edge function header: x-api-key (NIET Authorization Bearer)
- Cron timezone Europe/Amsterdam expliciet zetten
- Secrets in env / credentials, NOOIT in workflow body
- Status pending_review bij Supabase insert (CLAUDE.md publisher regel)
- Slack notif bij elke completion (Juan in de loop)

## Skills referentie (op server al installed, CLAUDE.md §10)
- n8n-expression-syntax
- n8n-workflow-patterns
- n8n-validation-expert
- n8n-mcp-tools-expert
- n8n-node-configuration
- n8n-code-javascript
- n8n-code-python

## Memory check
Lees: feedback_pg_net_jsonb_headers, CLAUDE.md §7, project_n8n_*, project_supabase_publisher_*
