---
name: deploy
description: Generieke deploy flow met pre-flight checks, smoke test en rollback-tag. Werkt voor HMB site, PT app, edge functions, NEXUS agents. Gebruik wanneer Juan iets live wil zetten met veiligheidsnet.
trigger: /deploy
---

# /deploy

Deploy met pre-flight + smoke + rollback-tag.

## Usage

```
/deploy <target>
/deploy <target> --env <prod|staging>
/deploy <target> --skip-tests        # alleen bij hotfix met confirm
/deploy <target> --dry-run
```

Targets:
- `hmb-site` — helpmijbesparen.nl op VPS 165.232.82.71
- `pt` — Performance Tracker (Vercel + Supabase)
- `voltafy` — voltafy.nl
- `edge-fn:<name>` — gebruikt /edge-fn-deploy
- `agent:<name>` — NEXUS BOS agent op 64.225.74.36
- `repo:<owner>/<name>` — push naar main + CI watch

## Flow

### 1. Pre-flight (FAIL → STOP)
- Branch is main/master?
- Geen uncommitted changes?
- CI groen op laatste commit?
- Tests passing lokaal?
- Lockfile up-to-date (npm/pnpm)?
- Env vars compleet (vergelijk .env.example)?
- Memory check op blockers: `project_status_*` recente notes
- Server low-RAM? typescript.ignoreBuildErrors nodig (feedback_server_build_low_ram — let op: server is 8GB volgens feedback_server_8gb_ram, oude 961MB regel niet meer relevant tenzij echt low)

### 2. Tag rollback point
```bash
git tag -a "rollback-<target>-<ts>" -m "Pre-deploy <target> <ts>"
git push --tags
```
Of: noteer current SHA + previous deploy SHA in memory.

### 3. Deploy
Per target:
- **HMB site:** `git pull && npm ci && npm run build && pm2 reload`
- **PT:** Vercel auto via push to main, of `vercel deploy --prod`
- **Edge fn:** delegeer naar /edge-fn-deploy
- **Agent:** ssh + git pull + pm2 restart `nexus-agent-<name>`
- **Repo:** push + watch `gh run watch`

### 4. Smoke test
- HTTP 200 op homepage / health endpoint
- Critical user flow check (login, lead form, calculator)
- Error rate eerste 5 min
- Response time p50/p95

### 5. Notify
Slack:
```
✅ DEPLOY <target>
Env: <env>
SHA: <short>
Smoke: PASS (<ms>ms)
Rollback: /rollback <target> rollback-<target>-<ts>
```

### 6. Memory log
Append to `project_deploys_<jaarmaand>.md`:
- timestamp, target, env, SHA, who, smoke result

## Hard rules
- NOOIT `--no-verify` (skip hooks) tenzij Juan expliciet vraagt
- NOOIT force-push main
- ALTIJD rollback-tag voor deploy
- Bij smoke FAIL: roep `/rollback` voor met de rollback-tag
- Voor PT: respecteer feedback_cors_domein (performancetracker.nl)
- Voor edge functions: pg_net jsonb headers (feedback_pg_net_jsonb_headers)
- Voor HMB: confirm geen prijzen-violations (run /audit-content compliance scope eerst bij grote content deploys)

## Memory check
Lees: project_status_<recent>, project_deploys_<jaarmaand>, feedback_server_*
