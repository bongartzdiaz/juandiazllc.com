# Public status page — operator runbook

A status page is a public web page where customers (and procurement
review teams) can see whether the platform is up. Without one, every
outage produces N support tickets each starting with "is it down for
everyone or just me?". With one, the question answers itself.

This runbook covers the cheap-and-good option (Better Stack, free
tier) and the cheap-and-ours option (self-hosted via the
`/api/health` endpoints already exposed in [`OBSERVABILITY.md`](./OBSERVABILITY.md)).

## 1. What we already have

The two health endpoints from Bundle BA are the canonical "is it up"
signal. Both are unauthenticated, return JSON, and ship in well
under a second:

- Marketing site:       `GET https://juandiazllc.com/api/health`
- Philly CRM:           `GET https://app.juandiazllc.com/api/health`
  (replace with your customer's hostname)

They check the DB liveness with a 2s timeout and return:

```json
{ "status": "ok", "uptimeMs": 12345, "checks": [{ "name": "database", "ok": true, "latencyMs": 8 }] }
```

The synthetic-probe workflow (`.github/workflows/synthetic-prod.yml`)
already polls them every 15 minutes from a GitHub-hosted runner and
posts to Slack on failure.

## 2. Better Stack — the recommended option

[Better Stack](https://betterstack.com) is the same tool that
already drives the uptime monitor in `OBSERVABILITY.md` §3.2. Adding
a status page on top of an existing monitor is one toggle.

### 2.1 Setup (10 min)

1. Better Stack dashboard → **Status pages** → **Create status page**.
2. Name: `Juan Diaz, LLC`. Subdomain: `status.juandiazllc.com`
   (or pick a free `*.betteruptime.com` subdomain to start).
3. Add resources:
   - **Marketing site** ← link to the existing `/api/health` monitor.
   - **Philly CRM**     ← link to the existing CRM `/api/health` monitor.
   - (Optional) **Auth provider — Supabase EU** ← link to Supabase's
     own status URL (`https://status.supabase.com`), so a Supabase
     incident shows up here without needing to fail the app's own
     health check.
4. Branding → upload `/icon.svg`. Match to brand colour `#0E6B44`.
5. **Custom domain** → CNAME `status.juandiazllc.com` →
   `betteruptime.com`. SSL is auto-provisioned within ~5 min.
6. **Public link** → enable. Optionally enable email subscriptions
   so customers can sign up for outage notifications.
7. Update `app/[locale]/layout.tsx` or the marketing footer with a
   "Status" link to the new URL once live.

### 2.2 Cost

Free tier covers one status page + 10 monitors @ 30s checks. If you
outgrow it, the next tier (~$24/mo) buys multi-region checks +
incident postmortems. For a B2B SaaS at this stage, the free tier is
plenty.

### 2.3 What it gives you

- Live "all systems operational" page with per-resource uptime bars.
- Historical uptime % over 7 / 30 / 90 days.
- Email subscription so customers / counsel can opt in to
  notifications.
- Retroactive incident timeline with operator-written updates.
- A URL to put in procurement responses ("our public status page is
  available at status.juandiazllc.com").

## 3. Self-hosted alternative

If Better Stack isn't an option, the same data is achievable from
the existing `/api/health` endpoints with a tiny client. The
trade-off: you lose the historical uptime % + email subscription
+ external infra independence (when your platform goes down, your
status page goes down with it).

A simple stop-gap is a public `/status` route that pings both
health endpoints from an Edge function and renders the result —
this is in `Future work` below if you ever want it; we haven't
built it because Better Stack covers the same need with no code.

## 4. Procurement boilerplate

When a customer's compliance team asks "do you have a public status
page", the answer becomes:

> Yes — `https://status.juandiazllc.com` is publicly accessible
> 24/7 and is hosted by Better Stack on independent infrastructure
> (so an outage of our primary cloud does not take the status page
> with it). The page is driven by automated probes every 30 seconds
> from multiple geographic regions. Email subscriptions are
> available; an internal incident-response runbook (GDPR Art. 33
> aligned) is documented under `docs/legal/BREACH-RESPONSE.md`.

## 5. Future work

- Self-hosted `/status` page rendered from `/api/health` data, so
  the marketing site itself shows the same signal. Lower priority
  while Better Stack is wired.
- Status-page webhook → automatic incident creation in Linear /
  GitHub when an outage opens, and auto-resolve when it closes.
  Saves 90s of manual work per incident.
