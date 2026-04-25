---
slug: features/settings-webhooks
lang: en
title: Settings → Webhooks
summary: Outbound HTTP webhooks fired on entity events — HMAC-signed delivery, retry on 5xx, delivery log, secret rotation.
tags: [features, settings, webhooks, integrations, admin]
related: [features/automations, features/integrations, features/audit]
updated: 2026-04-25
---

# Settings → Webhooks

`/settings/webhooks` (admin-only) registers outbound HTTP
endpoints to receive entity events. Each webhook has a URL,
an event filter, and a per-webhook HMAC secret used to sign
deliveries.

## Creating a webhook

**+ New webhook**:

- **URL** — your endpoint, https only in production
- **Events** — JSON array; `["*"]` for everything, or
  specific topics like `["deal.created", "deal.stage_changed"]`
- **Enabled** — toggle

Submit → the system generates a 32-byte hex secret and shows
it **once** in the response. Copy it; you can't read it again
(the stored value is encrypted at rest with AES-256-GCM).

Use this secret on your endpoint to verify the
`X-Philly-Signature` header.

## Verifying inbound delivery

Each delivery POSTs JSON with:

- `X-Philly-Signature: sha256=<hex hmac>` — the HMAC of the
  raw body, keyed by your webhook secret
- `User-Agent: Philly-Webhook/1.0`
- `Content-Type: application/json`

Body:

```json
{
  "event": "deal.stage_changed",
  "organizationId": "...",
  "payload": { ... },
  "timestamp": "2026-04-25T10:00:00Z"
}
```

Reject any request whose signature doesn't match.
Constant-time compare. The Philly side dispatches in parallel
across all enabled webhooks for the org; an event could be
delivered to multiple endpoints.

## Retries

5xx response or network error → retry up to 2 more times with
back-off (300ms × attempt). After 3 total attempts, mark the
delivery as failed and stop. Failed deliveries are visible in
the per-webhook delivery log.

4xx response → no retry; logged as failed.

2xx response → logged as success.

## Rotating the secret

Webhook detail page → **Rotate secret**. Two-step prompt;
confirms you understand the previous secret stops working
immediately. Returns the new secret once.

You'll have a brief window where deliveries-in-flight are
signed with the old secret while your endpoint expects the new
one. Coordinate the rotation with your endpoint update.

## Delivery log

Each webhook detail page shows the last 25 deliveries:
timestamp, event name, status code, response body (truncated).
Useful for debugging "why did my endpoint not get the event?".

## Permissions

Admin-only across the board. Managers + viewers see nothing.

## Privacy

Webhook secrets are encrypted at rest. Mask in API responses:
the `GET /api/webhooks` route returns `prefix...` (first 8
chars) instead of the full secret. Full secret is only ever
returned to the operator at create + rotate time.

## Where to go next

- **[Automations](features/automations)** — `post_webhook`
  action triggers webhooks on rule firings (alternative to
  raw entity events)
- **[Integrations](features/integrations)** — Slack webhook is
  a common destination
- **[Audit log](features/audit)** — every webhook
  create/edit/delete writes audit
