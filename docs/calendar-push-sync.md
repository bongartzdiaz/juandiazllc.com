# Calendar push-sync — implementation reference

Two-way real-time sync of calendar events between DEUS and Google
Calendar / Microsoft 365. Replaces polling with provider-pushed
notifications.

This doc captures the decisions baked into Bundle D (the push-sync
implementation) and the API gotchas an engineer needs to know before
extending it.

## Why it matters

Without push-sync, a meeting added to a user's Google Calendar shows
up in DEUS only after the next polling cycle (currently on-demand via
`/api/calendar/external-events`). Push-sync flips that — the calendar
provider notifies our webhook within seconds, and DEUS reflects the
change immediately.

## Architecture

```
                    ┌──────────────────┐
  Google Calendar   │                  │
  Microsoft Graph   │ Provider         │
                    │ ──────────────── │
                    └────────┬─────────┘
                             │ webhook (HTTPS)
                             ▼
        ┌────────────────────────────────────────────┐
        │ /philly/api/calendar/webhook/[provider]    │
        │  - Validates auth (clientState / token)    │
        │  - 200/202 within 3s (MS hard SLA)         │
        │  - Enqueues sync via lib/philly/calendar/  │
        └────────────────────┬───────────────────────┘
                             │
                             ▼
        ┌────────────────────────────────────────────┐
        │ Delta fetch (provider-aware)               │
        │  - Google: events.list with syncToken      │
        │  - MS:     /me/calendarView/delta          │
        └────────────────────────────────────────────┘
```

## Schema

`CalendarChannel` is a sibling of `CalendarConnection`:

```prisma
model CalendarChannel {
  id              String    @id @default(cuid())
  connectionId    String    // FK to CalendarConnection (cascade)
  provider        String    // mirrors connection.provider
  externalId      String    // Google: channel id we generated. MS: subscriptionId.
  resourceId      String?   // Google only — opaque resource identifier returned by watch
  resource        String?   // MS only — the subscribed resource path
  authSecretEnc   String    @db.Text  // Encrypted: Google `token` / MS `clientState`
  syncToken       String?   @db.Text  // Google: events.list syncToken; MS: deltaLink
  expiresAt       DateTime
  lastRenewedAt   DateTime?
  lastMessageNum  Int?      // Google: highest X-Goog-Message-Number seen
  status          String    @default("active") // active, expired, error
  lastError       String?   @db.Text
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  connection CalendarConnection @relation(fields: [connectionId], references: [id], onDelete: Cascade)

  @@unique([provider, externalId])
  @@index([expiresAt, status])  // for the renewal cron
}
```

Why a separate table:
- OAuth state (`CalendarConnection`) and push-sync state (`CalendarChannel`)
  have different lifecycles — channel can fail/expire without invalidating tokens
- Future: multiple channels per connection (multiple calendars)
- Failure isolation

## Provider differences cheat-sheet

| Aspect | Google | Microsoft |
|---|---|---|
| Endpoint | `POST /calendar/v3/calendars/primary/events/watch` | `POST /v1.0/subscriptions` |
| Resource | implicit (URL) | `/me/events` |
| Max TTL | 7 days (no documented hard cap) | **4230 min ≈ 70 hours** |
| Renewal cadence | every 6 days (1-day buffer) | every 60 hours (10-hour buffer) |
| Renewal API | new `watch` + stop old | `PATCH /subscriptions/{id}` |
| Auth on webhook | `X-Goog-Channel-Token` header | `clientState` in body |
| Validation handshake | none | `POST ?validationToken=…`, return plain text within 10s |
| Notification body | empty | JSON envelope `{value: [...]}` |
| Response SLA | none documented | **3 seconds**, queue + 202 |
| Lifecycle events | none — channel just expires | separate `lifecycleNotificationUrl` |
| Stop API | `POST /channels/stop {id, resourceId}` | `DELETE /subscriptions/{id}` |
| Idempotency hint | `X-Goog-Message-Number` (monotonic int) | `id` per notification |

## Webhook auth

Both providers use a shared secret we set at subscription time:

- **Google**: we set `token` in the watch body. Provider sends it back as `X-Goog-Channel-Token` header. Verify `header === storedToken`.
- **MS**: we set `clientState` in the subscription body. Provider sends it in every notification's `clientState` field. Verify `body.clientState === storedClientState`.

Both secrets are stored encrypted in `CalendarChannel.authSecretEnc` via
`lib/philly/crypto.ts`. Generated as 32-byte base64url random per channel.

## Validation handshake (MS only)

When you create a subscription, MS Graph immediately sends a `POST`
request to your `notificationUrl`:

```
POST {notificationUrl}?validationToken={opaque-token-string}
Content-Type: text/plain
```

You have **10 seconds** to respond with:
- HTTP 200
- Content-Type: text/plain
- Body: the URL-decoded plain text validation token (NO HTML/JS escaping)

If we don't respond correctly, `POST /subscriptions` returns 400 and the
subscription isn't created. Implementation:

```ts
const validationToken = url.searchParams.get('validationToken')
if (validationToken) {
  return new Response(validationToken, {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  })
}
```

This must be the FIRST branch in the webhook handler — before reading the
body.

## 3-second SLA (MS)

Microsoft considers a notification dropped if we don't respond within 3s.
Their throttling kicks in at:
- >10% slow (>3s) responses in a 10-minute window → "slow" state, 10-min delay
- >15% timeouts (>10s) in a 10-minute window → "drop" state, 10-min drop

Implementation: validate clientState, persist a delta-sync job, return 202
Accepted within ~50ms. Process the actual sync asynchronously (queue worker
or pg_notify). Don't fetch events inside the webhook handler.

## Bootstrap "sync" notification (Google)

Immediately after `watch` returns, Google sends one notification with
`X-Goog-Resource-State: sync`. This is the "channel is alive" handshake.
Ignore it — only process `exists` (and rare `not_exists`).

## Renewal

A cron job runs at a regular interval (e.g. hourly) and looks for:

```sql
SELECT * FROM CalendarChannel
WHERE status = 'active'
  AND expiresAt < (NOW() + INTERVAL '6 hours')
ORDER BY expiresAt
```

For each row:
- **Google**: create a new channel via `watch` (new id), then stop the old one. Update row with new externalId/resourceId/expiresAt.
- **Microsoft**: PATCH `/subscriptions/{id}` with new `expirationDateTime`. Update row.

If renewal fails (token expired, scope revoked), mark `status='error'` and
let the user reconnect via the integrations settings page.

## Idempotency

Same notification can be delivered twice (network retry, provider re-send).
Two layers of dedup:

1. **Process-level**: `lastMessageNum` (Google) or recent-id ring buffer (MS).
   In-row state, atomic update.
2. **Sync-level**: the actual event fetch is idempotent (Prisma upsert by
   external event id). Even if a notification triggers two fetches, the
   resulting DB state is the same.

## Failure modes

| Failure | Recovery |
|---|---|
| Channel expires without renewal | User reconnects via settings page; old channel row is auto-cleaned |
| `syncToken` expires (Google 410) | Drop syncToken, full re-fetch on next sync, new syncToken stored |
| Provider revokes app permission | Lifecycle notification (MS) or watch returns 403 (Google); mark connection.status='error' |
| Webhook URL becomes unreachable | Provider drops notifications after retry window; renewal cron eventually flags |
| User changes calendar (e.g. switches primary) | Schema doesn't bind to a specific calendar id (uses `primary`); change is invisible to us |

## Operator setup

Both providers need our webhook URL whitelisted, but no extra config beyond
the OAuth app registration that already exists for read-only sync. The
webhook URL is `${NEXT_PUBLIC_APP_URL}/philly/api/calendar/webhook/{provider}`.

## Sources

- Google Calendar API — Push notifications: https://developers.google.com/workspace/calendar/api/guides/push
- Google Calendar Events: watch: https://developers.google.com/workspace/calendar/api/v3/reference/events/watch
- Microsoft Graph — Receive change notifications through webhooks: https://learn.microsoft.com/en-us/graph/change-notifications-delivery-webhooks
- Microsoft Graph — Create subscription: https://learn.microsoft.com/en-us/graph/api/subscription-post-subscriptions
- Microsoft Graph — Lifecycle notifications: https://learn.microsoft.com/en-us/graph/change-notifications-lifecycle-events
- Nango Engineering — Real-time Google Calendar integration: https://www.nango.dev/blog/how-to-build-a-real-time-google-calendar-api-integration

Last reviewed: 2026-05-07.
