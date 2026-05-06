---
name: webhook-handler
description: Bouw een veilige webhook-handler (inbound) — signature-verify (HMAC of provider-specifiek), idempotency-key dedup, raw-body capture, proper response timing, retry-friendly status codes. Provider-aware (Stripe, GoHighLevel, Meta, MessageBird, GitHub). Gebruik wanneer Juan vraagt "ontvang webhook van X" of bij integratie met externe vendor.
trigger: /webhook-handler
---

# /webhook-handler

Inbound webhook-endpoints die provider-veilig zijn. Geen "iedereen kan POSTen en wij vertrouwen het".

## Usage
```
/webhook-handler <provider>
/webhook-handler <provider> --target <next-app|edge-fn|deno-http>
/webhook-handler <provider> --events "<csv>"
/webhook-handler <provider> --idempotent
```

## Per-provider auth-patterns

| Provider | Verify-method |
|---|---|
| **Stripe** | HMAC-SHA256 over raw body, header `stripe-signature` |
| **GitHub** | HMAC-SHA256 over raw body, header `x-hub-signature-256` |
| **GoHighLevel** | API-key in custom header (geen HMAC) — eigen risico, voeg IP-allowlist |
| **Meta (WhatsApp/Pages)** | HMAC-SHA256, header `x-hub-signature-256` |
| **MessageBird** | HMAC-SHA256 over body, header `messagebird-signature` |
| **Resend** | HMAC + secret in header `svix-signature` |
| **Twilio** | HMAC, header `x-twilio-signature` |

## Hard rules

### 1. Verify FIRST, parse LATER
Verifieer signature op **raw body** (string, niet `JSON.parse`). Sommige providers eisen exacte byte-volgorde.

```ts
const raw = await req.text();   // KRIJG raw body als string, niet json
const sig = req.headers.get("stripe-signature") || "";
const ok = await verifyHmacSha256(raw, sig, process.env.STRIPE_WEBHOOK_SECRET!);
if (!ok) return NextResponse.json({ error: "invalid_signature" }, { status: 401 });

const event = JSON.parse(raw);  // pas NA verify
```

### 2. Idempotency
Provider stuurt vaak dubbel (retry, replay). Sla event-id op in DB; skip duplicates.

```ts
const eventId = event.id;
const seen = await selectOne("webhook_events", { provider: "eq.stripe", external_id: `eq.${eventId}` });
if (seen) return NextResponse.json({ ok: true, deduplicated: true });
await insert("webhook_events", { provider: "stripe", external_id: eventId, payload: event });
```

DB-tabel:
```sql
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  external_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (provider, external_id)
);
```

### 3. Snel responden
Provider verwacht **<5s response** anders retry. Doe heavy work async (queue + worker), respond direct met 200.

```ts
await insert("webhook_events", { ... });
queueProcessing(eventId);   // fire-and-forget OF DB-queue
return NextResponse.json({ ok: true });
```

### 4. Status codes voor retry
- **2xx** — provider stopt retry
- **4xx** — provider stopt retry (ALLEEN voor permanent fout — verkeerd geconfigureerd)
- **5xx** — provider retried (gebruik bij temp-failure)

### 5. Geen sensitive data in 4xx response
Webhook endpoints zijn target voor probing. Geen leakage in error-body.

## Templates

### Stripe (Next.js App Router)
```ts
// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing_sig" }, { status: 401 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (e) {
    return NextResponse.json({ error: "invalid_sig" }, { status: 401 });
  }

  // Idempotency
  const seen = await selectOne("webhook_events", { provider: "eq.stripe", external_id: `eq.${event.id}` });
  if (seen) return NextResponse.json({ ok: true, deduplicated: true });
  await insert("webhook_events", { provider: "stripe", external_id: event.id, payload: event });

  // Handle events you care about
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
  }

  return NextResponse.json({ ok: true });
}
```

### GitHub webhook (Vercel/Deno)
```ts
async function verifyGithub(raw: string, sig: string, secret: string): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(raw));
  const hex = Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, "0")).join("");
  const expected = `sha256=${hex}`;
  return timingSafeEqual(expected, sig);
}
```

### GoHighLevel (geen HMAC)
GHL gebruikt API-key in header. Voeg toe:
- IP-allowlist (GHL heeft vaste IP-ranges)
- Rate-limit op endpoint
- Aparte secret per workflow

```ts
const apiKey = req.headers.get("x-api-key");
if (apiKey !== process.env.GHL_WEBHOOK_SECRET) {
  return NextResponse.json({ error: "auth" }, { status: 401 });
}
// + IP check via x-forwarded-for tegen GHL ranges
```

### Meta (WhatsApp/Pages)
Naast HMAC ook **GET-handshake** voor verify-token:

```ts
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");
  if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
    return new NextResponse(challenge);
  }
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}
```

## Test-strategie
- **Local**: gebruik `ngrok` voor publieke URL → registreer in provider sandbox
- **Replay**: Stripe CLI `stripe listen` + `stripe trigger checkout.session.completed`
- **Unit-test**: mock raw-body + signature → `verify` returns true/false

## Logging
- Log **niet** de hele payload (kan PII bevatten)
- Log **wel**: provider, event_type, external_id, status, latency-ms
- Bij error: error-bericht (geen stack-trace in prod)

## Combineer met
- `/api-route` — algemene API-route patterns
- `/db-migration` — voor `webhook_events` tabel
- `/queue-job` — voor async processing van events
- `/log-analysis` — webhook-failure debugging
