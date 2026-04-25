---
slug: features/settings-api-keys
lang: en
title: Settings → API keys
summary: Programmatic access to /api/v1 — create, rotate, revoke keys with read/write/admin permissions and optional expiry.
tags: [features, settings, api-keys, integrations, admin]
related: [features/settings-webhooks, features/integrations, features/audit]
updated: 2026-04-25
---

# Settings → API keys

`/settings/api-keys` (admin-only) issues programmatic
credentials for the public API at `/api/v1`. Use these for
Zapier, n8n, custom scripts, ETL pipelines.

## Creating a key

**+ New key**:

- **Name** — descriptive label (e.g. "Zapier integration",
  "ETL job — daily sync")
- **Permissions** — `read` / `write` / `admin`
- **Expires in (days)** — optional; leave blank for never

Submit. The key is shown **once** in a green banner — copy it
now, you can't read it again. Format: `phlly_<base64>...`.

The DB stores the SHA-256 hash, not the key itself. Lost keys
must be revoked + a new one issued — there's no recovery.

## Permission tiers

- **read** — `GET /api/v1/*` only. Safe for dashboards / read
  replicas.
- **write** — read + `POST/PATCH/DELETE` on most entities.
  Cannot manage users, integrations, webhooks, or other API
  keys.
- **admin** — full surface, including the management endpoints.
  Treat like a master credential.

Pick the lowest tier that works. A Zapier zap that creates
contacts only needs `write`, not `admin`.

## Using a key

Send as `Authorization: Bearer phlly_...` on every request:

```bash
curl -H "Authorization: Bearer $PHILLY_API_KEY" \
  https://your-deployment/api/v1/contacts
```

The API gateway (`/api/v1/[...path]/route.ts`) validates the
key, resolves the org, applies the permission tier, and
forwards to the underlying handler.

## Rotating

Click **Rotate**. Confirmation prompt; explains the old key
stops working immediately. Returns the new key once.

Use rotate for "I leaked the key" or "scheduled quarterly
rotation". Audit log records both old + new key prefixes.

## Revoking

Click **Revoke**. Confirmation; deletes the key row. Apps using
the key get 401 on the next request.

## Expiring

Set `expires_in_days` at create time. Expired keys are visible
in the list with a red badge but reject new requests. The
nightly cron doesn't auto-delete expired keys — they sit in the
list as a record. Manually revoke to remove.

Keys expiring within 7 days show a yellow "Expires soon" badge.

## Security posture

- Key string is never stored; only the SHA-256 hash
- Hash is unique-indexed for O(1) lookup
- Rate-limit per key: 100 requests/sec by default
- Audit log records every create/rotate/revoke
- Last-used timestamp updates on every authenticated request

If you suspect a key is compromised, **revoke first, ask
questions later**.

## Permissions

Admin-only across the page.

## Where to go next

- **[Webhooks](features/settings-webhooks)** — push direction
  (CRM → your endpoint), often paired with API keys for the
  pull direction
- **[Audit log](features/audit)** — review every API-key
  action
