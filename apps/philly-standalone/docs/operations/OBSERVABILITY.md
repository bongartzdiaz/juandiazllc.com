# Observability — operator runbook

Goal: when something goes wrong in production, find out within 60s,
get enough context to fix it within 30 min, and never lose forensic
data.

This runbook is the wiring guide. The code is already in place; what
you need to do is set the env vars and configure the upstream
services.

## Quick reference — env vars

| Var                       | Purpose                                                      | Required for |
| ------------------------- | ------------------------------------------------------------ | ------------ |
| `SENTRY_DSN`              | Server-side error + span tracing                             | Errors / SLO |
| `SENTRY_ENVIRONMENT`      | Tag (`production` / `preview` / `staging`)                   | Errors       |
| `SENTRY_RELEASE`          | Release tag (set to git SHA in CI)                           | Errors       |
| `SENTRY_TRACES_SAMPLE_RATE` | Float 0-1 (default 0; set `0.1` in prod for ~10% sampling) | SLO          |
| `SLACK_ALERTS_WEBHOOK`    | Incoming-webhook URL for ops alerts                          | Alerts       |
| `LOG_LEVEL`               | `debug` / `info` / `warn` / `error` (default `info`)         | Logs         |

When all of these are unset, every observability path no-ops cleanly
— dev and small installs don't pay for it.

---

## 1. Sentry — error + SLO tracing

Sentry is the primary error sink. `withSpan({ name, slo })` wraps
critical paths (login, deal create, AI actions) and tags every span
with `slo.bucket = ok | slow | error` so you can alert on **SLO
violations**, not just exceptions.

### 1.1 Setup (10 min)

1. Create a Sentry project (Node.js platform).
2. Copy the DSN and set in Vercel:
   ```
   vercel env add SENTRY_DSN production
   vercel env add SENTRY_ENVIRONMENT production   # value: "production"
   vercel env add SENTRY_TRACES_SAMPLE_RATE production  # value: "0.1"
   ```
3. Tag releases with the deploy SHA. In Vercel project settings →
   Build & Development → set:
   ```
   SENTRY_RELEASE = $VERCEL_GIT_COMMIT_SHA
   ```
4. (Optional but recommended) Upload source maps in CI. The
   `@sentry/nextjs` plugin handles this automatically; this codebase
   uses the lower-level `@sentry/node`, so you can either
   (a) add the Sentry CLI as a build step, or (b) accept that prod
   stack traces will be partially minified.
5. In Sentry → Settings → Integrations → Slack, connect your
   workspace and set up an alert rule:
   - "When an event with `level >= error` is captured, post to #ops"
   - "When `slo.over_budget == true` for >5 events in 1 min, post to #ops"

### 1.2 What gets reported

Server-side via `lib/philly/sentry.ts`:
- All unhandled errors (Next.js `onRequestError` hook in
  `instrumentation.ts`).
- Errors thrown inside `withSpan` calls — captured + rethrown.
- Manual events via `captureException()` / `captureMessage()`.

PII is scrubbed at the SDK edge (Art. 32 GDPR):
- `Authorization` / `Cookie` / `X-API-Key` headers redacted.
- Email-shaped strings in messages + extras replaced with `[redacted]`.
- Keys matching `password|secret|token|api_key|...` replaced.
- Cookies dropped wholesale.
- `request.user.ip_address` dropped.

### 1.3 What's NOT reported

- Edge-runtime errors. `@sentry/node` requires Node APIs. Edge
  errors are POSTed to `/api/log-error` instead, which logs them
  server-side (so they reach Sentry via that path's normal flow).
- Client-side errors. `@sentry/react` is installed but not wired
  into a top-level `<ErrorBoundary>` yet — see "future work".

---

## 2. Slack alerts — operational events

For **non-runtime** events that don't belong in Sentry: integrity
checks, scheduled-job failures, daily reconciliation drift, etc.

Code: `lib/philly/alerts.ts` exposes `sendAlert({ severity, title,
body, fields, source })`. No-ops when `SLACK_ALERTS_WEBHOOK` is unset.

### 2.1 Setup (5 min)

1. Slack → your workspace → Apps → "Incoming Webhooks" → Add.
2. Pick a target channel (e.g. `#ops-alerts`).
3. Copy the webhook URL and set:
   ```
   vercel env add SLACK_ALERTS_WEBHOOK production
   ```

### 2.2 What gets paged today

| Source        | Trigger                                             | Severity   |
| ------------- | --------------------------------------------------- | ---------- |
| `audit-chain` | `npm run audit:chain` finds a broken hash chain    | `critical` |

The `audit:chain` script is meant to run daily (Vercel Cron or any
plain cron runner). If the chain ever breaks, **page on-call
unconditionally** — a tampered audit log is a security event.

### 2.3 Adding a new alert source

```ts
import { sendAlert } from '@/lib/philly/alerts'

await sendAlert({
  severity: 'error',
  source: 'erasure-cron',
  title: 'GDPR erasure run failed',
  body: 'Retention sweep raised; manual rerun required.',
  fields: { rows_due: 14, last_ok: '2026-04-29T03:00:00Z' },
})
```

The helper attaches `env`, `release`, and `source` automatically;
add anything else that helps on-call diagnose without opening logs.

---

## 3. Health checks — `/api/health`

Both apps expose an unauthenticated `GET /api/health` that returns
200 on success or 503 if the DB is unreachable. Use it as the
target for any uptime monitor.

### 3.1 Response shape

```json
{
  "status": "ok",
  "uptimeMs": 12345,
  "timestamp": "2026-04-30T10:00:00.000Z",
  "checks": [
    { "name": "database", "ok": true, "latencyMs": 8 }
  ],
  "version": "0.1.0"
}
```

The DB check is wrapped in a 2s timeout so a stuck DB doesn't pin
the probe — the monitor will get a fast 503 instead of hanging.

### 3.2 Recommended monitor (Better Stack — 5 min)

1. Sign up for Better Stack (free tier covers 10 monitors @ 30s).
2. Add a monitor:
   - URL: `https://<your-domain>/api/health`
   - Method: GET
   - Frequency: 60s (30s on paid)
   - Alert on: `status != 200` OR `body does not contain "status":"ok"`
3. Connect the monitor to the same Slack channel as Sentry.
4. (Recommended) Enable the public status page — procurement asks.

Equivalent options: UptimeRobot (free), Pingdom, Datadog Synthetics.

### 3.3 What's NOT in the health check

- Auth provider reachability (Supabase). Add a check if you start
  seeing auth-provider outages — easy 5-line addition to the route.
- Anthropic / Claude reachability. Don't add — a model outage isn't
  a 503 for the platform.
- Cache layer (none today; add when Redis lands).

---

## 4. Logs — Vercel + Axiom

Logger in `lib/philly/logger.ts` writes one JSON line per event with
secrets redacted. In dev it pretty-prints with colors; in prod it
emits raw JSON for log shippers.

### 4.1 Vercel logs (default)

Vercel keeps logs ~1h on Hobby, 7d on Pro. Good for "what just
happened" but useless for forensic analysis a week later.

### 4.2 Axiom (recommended)

Axiom has a Vercel-native integration — one click in their dashboard
ingests every Vercel log line. Free tier: 0.5 GB/day, 30-day
retention. Setup:

1. axiom.co → Settings → Integrations → Vercel.
2. Pick the Vercel project.
3. Done — logs flow within 1 min.

Useful queries:

```sql
-- 5xx rate by route, last hour
| where status >= 500 and ts > now() - 1h
| summarize count() by path

-- p95 latency by path, last hour
| where ts > now() - 1h and durationMs > 0
| summarize p95 = percentile(durationMs, 95) by path
| order by p95 desc

-- All audit events for an org, last 30 days
| where msg startsWith 'audit:' and meta.organizationId == "<org-id>"
| order by ts desc
```

Equivalent options: Better Stack Logs (same 0.5 GB free tier),
Datadog, Logflare.

### 4.3 Setting log level in prod

Default is `info`. To turn on debug temporarily:
```
vercel env add LOG_LEVEL preview   # value: "debug"
```
Always reset after the investigation — debug logs grow log volume
fast and may leak more than the redactor catches.

---

## 5. SLO budgets

Defined in `lib/philly/observability.ts`. p95 budgets, not p99 —
defending against the median experience, not the tail.

| SLO                  | Budget   | Wrap point                                     |
| -------------------- | -------- | ---------------------------------------------- |
| `SLO.LOGIN`          | 1,200ms  | `app/actions/auth.ts` (auth.login)             |
| `SLO.CREATE_DEAL`    | 800ms    | `POST /api/deals` (deal.create)                |
| `SLO.AI_ACTION`      | 15,000ms | `POST /api/ai/score`, contact AI attributes    |

Adding a new SLO:
1. Add the budget to the `SLO` const.
2. Wrap the work in `withSpan({ name, slo })`.
3. Document in `CLAUDE.md` § "SLOs".
4. Add a Sentry alert rule on `slo.over_budget == true` for that
   span name.

---

## 6. Alert routing summary

```
                          Sentry
                         ┌──────┐
  errors / spans ───────►│      │──► Slack #ops-alerts (Sentry → Slack integration)
                         └──────┘
                            ▲
                            │ withSpan
                            │
            app code ───────┤
                            │ sendAlert
                            ▼
                         ┌──────┐
                         │Slack │──► #ops-alerts (incoming webhook)
                         │webhk │
                         └──────┘
                            ▲
                            │
            cron / cli ─────┤
                            │
                         ┌──────┐
   GET /api/health ─────►│Better│──► #ops-alerts (uptime monitor)
   (every 60s)           │Stack │
                         └──────┘
```

One channel for everything in v1. Split into `#alerts-critical` /
`#alerts-warn` once volume justifies it.

---

## 7. Smoke test

After wiring, verify each path lands in Slack:

```bash
# 1. Sentry — capture a test event from prod
curl -X POST https://<your-domain>/api/_test/error
# (or use `npx @sentry/cli send-event --message "smoke test"`)

# 2. Slack alerts — fire a test webhook
SLACK_ALERTS_WEBHOOK=$YOUR_URL node -e '
  require("./lib/philly/alerts").sendAlert({
    severity: "info",
    source: "smoke-test",
    title: "Observability smoke test",
    body: "If you see this in Slack, the alert path is wired."
  }).then(console.log)
'

# 3. Health — should return 200 + status:ok
curl -s https://<your-domain>/api/health | jq .

# 4. Uptime monitor — temporarily kill the DB connection string and
#    confirm the monitor pages within 2 minutes.
```

If all four arrive in `#ops-alerts`, you're observable.

---

## 8. Frontend Sentry — browser errors + Session Replay

`<SentryBootstrap />` is mounted in both root layouts. It calls
`initBrowserSentry()` once per page load, which lazy-loads
`@sentry/react` only if `NEXT_PUBLIC_SENTRY_DSN` is set.

### 8.1 Setup (5 min, after server-side Sentry §1.1)

1. In Vercel, set the public mirrors of the server vars:
   ```
   NEXT_PUBLIC_SENTRY_DSN              = <same DSN as server>
   NEXT_PUBLIC_SENTRY_ENVIRONMENT      = production
   NEXT_PUBLIC_SENTRY_RELEASE          = $VERCEL_GIT_COMMIT_SHA
   NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE          = 0.1   (optional)
   NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE = 0      (default — only record on error)
   NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE = 1     (default — record 100% of error sessions)
   ```
2. In Sentry → Project Settings → Replay, enable "Capture Replays".
3. (Optional) Lift `replaysSessionSampleRate` to `0.05` once you have
   a feel for volume — captures 5% of normal sessions for general
   UX research, not just errors.

### 8.2 What's protected by default

- All text content masked (`maskAllText`).
- All form inputs masked (`maskAllInputs`).
- All `<img>` / `<video>` blocked (`blockAllMedia`).
- Network bodies redacted for any URL matching `/api/auth/*`,
  `/api/.../token`, or `/login*`.
- Email-shaped strings, sensitive keys (`password`, `secret`,
  `token`, `api_key`, etc.), `Authorization` / `Cookie` /
  `X-API-Key` headers, and `request.user.ip_address` are all
  scrubbed in `beforeSend`.
- Console breadcrumbs dropped — they leak too easily.

### 8.3 Cost shape

Replay-on-error means you only pay (in Sentry quota) when something
actually broke. Sessions on a healthy page produce no replay
events — Sentry buffers locally and discards if no error fires. The
default `replaysSessionSampleRate=0` keeps it that way.

## 9. Source-map upload — `.github/workflows/sentry-release.yml`

When a commit lands on `main`, GitHub Actions creates a Sentry
release tagged with the commit SHA, uploads the just-built source
maps, and finalises the release. Without this, prod stack traces
show minified gibberish.

### 9.1 Setup (5 min)

1. Sentry → User Settings → Auth Tokens → New token. Scope:
   `project:releases`. Copy the value.
2. GitHub → repo settings → Secrets and variables → Actions:
   - Secret `SENTRY_AUTH_TOKEN` ← the token from step 1.
   - Variable `SENTRY_ORG` ← your Sentry org slug.
   - Variable `SENTRY_PROJECT` ← your Sentry project slug.
3. Done. The next push to `main` creates a release. The workflow
   short-circuits if the variables are unset, so it stays dormant
   on forks / pre-wiring.

The workflow forces production source maps via
`NEXT_PRIVATE_PROD_SOURCEMAPS=true`. Vercel's deploy doesn't ship
source maps to the public bundle by default — they go to Sentry
only.

## 10. Synthetic probe — `.github/workflows/synthetic-prod.yml`

Hits production `/api/health` every 15 minutes from the
GitHub-hosted runner. Pages Slack on failure. Complements the
Better Stack monitor — different infrastructure, different region,
two cheap probes are better than one.

### 10.1 Setup (3 min)

1. GitHub → repo variables:
   - `PROD_HEALTH_URL_ROOT`       — e.g. `https://juandiazllc.com/api/health`
   - `PROD_HEALTH_URL_STANDALONE` — e.g. `https://app.juandiazllc.com/api/health`
2. GitHub → repo secrets:
   - `SLACK_ALERTS_WEBHOOK` (same webhook the app uses).
3. Done. First run within 15 minutes, then every 15 minutes after.
   Steps for any URL not set are skipped.

## 11. Future work

- DB slow-query alerts. Supabase exposes `pg_stat_statements`; the
  query is one-line, the alerting wiring is not.
- Status page (Better Stack does this from the same monitor that
  drives §3.2).
- Frontend Real User Monitoring (Vercel Speed Insights or
  `@vercel/analytics/web` web-vitals). Sentry traces give the
  important slice; RUM is a comfort layer.
