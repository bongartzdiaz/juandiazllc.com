---
name: api-route
description: Bouw een Next.js API route of Supabase edge function met validation (Zod), auth-check, error-handling, rate-limiting, origin-guard, en typed response. Volgt PT auth-pattern (Type A JWT vs Type B vault x-api-key) en Juan's compliance rules. Gebruik wanneer Juan vraagt "maak een endpoint voor X", "nieuwe API route Y", of bij elke nieuwe server-side data-flow.
trigger: /api-route
---

# /api-route

Server-side endpoint bouwen volgens stack-conventies. Twee targets: Next.js API routes (HMB/funnel/Philly) of Supabase edge functions (PT/HMB).

## Usage

```
/api-route <pad> <doel>
/api-route <pad> --target <next-app|next-pages|edge-fn>
/api-route <pad> --method <GET|POST|PUT|PATCH|DELETE>
/api-route <pad> --auth <public|jwt|api-key|service-role>
/api-route <pad> --schema <pad-naar-zod>
/api-route <pad> --rate-limit <ip|user|phone>
```

## Hard rules

### Algemeen
- **Zod-validation** voor request body/query/params — zelfde schema als client
- **Typed response** — exporteer `Response`-type voor client te importeren
- **Geen stack-leak** in productie 500 — `error_details` alleen in `NODE_ENV !== "production"`
- **Origin-check** in productie voor POST/PUT/PATCH/DELETE
- **Rate-limit** waar passend — Postgres-backed (in-memory faalt op multi-instance)
- **Logging zonder PII** — geen email/phone/naam in console.log
- **Idempotency** voor POST endpoints die niet idempotent zijn (idempotency-key header)

### Next.js App Router (HMB / funnel / Philly)

```ts
// app/api/<pad>/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";        // of "edge" als geen Node-deps
export const dynamic = "force-dynamic"; // als POST of dynamic

const Body = z.object({ /* ... */ });

export async function POST(req: NextRequest) {
  // 1. Origin-guard
  const origin = req.headers.get("origin") || "";
  const allowed = process.env.NEXT_PUBLIC_SITE_URL || "";
  if (process.env.NODE_ENV === "production" && allowed && origin && !origin.startsWith(allowed)) {
    return NextResponse.json({ error: "origin_not_allowed" }, { status: 403 });
  }

  // 2. Parse + validate
  let body;
  try {
    body = Body.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: "validation_failed", issues: e.issues }, { status: 400 });
  }

  // 3. Rate-limit (optioneel)
  // ...

  // 4. Business logic
  try {
    const result = await doStuff(body);
    return NextResponse.json(result);
  } catch (e: any) {
    console.error(`[<pad>] error: ${e?.message || "unknown"}`);
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
    return NextResponse.json(
      { error: "server_error", details: String(e?.message || e) },
      { status: 500 }
    );
  }
}
```

### Supabase Edge Functions (PT / HMB)

**Twee auth-patterns** (zie [[project_pt_auth_audit_april30]]):

#### Type A — Gateway JWT (verify_jwt=true, default)
```ts
// supabase/functions/<naam>/index.ts
import { serve } from "https://deno.land/std/http/server.ts";

serve(async (req) => {
  // Gateway heeft al Bearer JWT geverifieerd; req.headers.get("Authorization") aanwezig
  // Doorlees Supabase server-context met x-supabase-* headers
  // ...
});
```

#### Type B — x-api-key vault (verify_jwt=false)
```ts
// supabase/functions/<naam>/index.ts
import { isAuthorized, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = { /* ... */ };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!(await isAuthorized(req))) return unauthorizedResponse(corsHeaders);

  try {
    const body = await req.json();
    // Zod-parse
    // ...
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

`_shared/auth.ts` gebruikt Vault-first via `get_sync_api_key_text` RPC — env-var alleen fallback.

## Auth-keuzes uitgelegd

| Flag | Wat | Wanneer |
|---|---|---|
| `public` | geen auth | lead-form submit (HMB), pixel beacons |
| `jwt` | gateway JWT vereist | user-context endpoints (PT dashboard) |
| `api-key` | x-api-key tegen vault | server-to-server (n8n, GHL webhook) |
| `service-role` | service-role JWT vereist | interne tools, admin |

**Gouden regel:** SERVICE_ROLE_KEY mag NOOIT client-side terechtkomen. Alleen server-side env.

## Standaard error-codes

```ts
type ApiError =
  | "validation_failed"        // 400
  | "origin_not_allowed"       // 403
  | "auth_required"            // 401
  | "forbidden"                // 403
  | "not_found"                // 404
  | "method_not_allowed"       // 405
  | "duplicate"                // 409
  | "rate_limit"               // 429
  | "server_error"             // 500
  | "upstream_error";          // 502
```

Geen vrije strings in `error`-veld — altijd uit deze enum.

## Rate-limiting patterns

### Postgres-backed (productie-veilig)
```ts
import { rpc } from "@/lib/supabaseAdmin";
const result = await rpc("rate_check", { p_key: key, p_limit: 5, p_window_sec: 60 });
if (!result.ok) return NextResponse.json({ error: "rate_limit", retry_after: result.retry_after }, { status: 429 });
```

### In-memory (alleen dev/single-instance, MARKEER zo)
```ts
// VERMIJD in productie op Vercel/serverless
const buckets = new Map<string, number[]>();
```

## Idempotency-key pattern

Voor POST-endpoints die effecten triggeren (lead-create, payment, send-email):
```ts
const idem = req.headers.get("idempotency-key");
if (idem) {
  const cached = await getCachedResponse(idem);
  if (cached) return NextResponse.json(cached);
}
const result = await doIt();
if (idem) await cacheResponse(idem, result, 24 * 3600);
return NextResponse.json(result);
```

## CORS voor edge functions

```ts
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://performancetracker.nl",  // SPECIFIEK, niet *
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
```

NOOIT `*` voor authenticated endpoints. Wildcard alleen voor zuiver public webhooks.

## Output flow
1. **Brief** — bevestig pad, method, auth-mode, target
2. **Zod-schema** — request body/query/params types
3. **Route-file** — kant-en-klare implementatie
4. **Helper-libs** als nodig (rate-limit, supabase admin)
5. **Type voor client** — `export type FooResponse = ...`
6. **Test-stub** — happy + 3 error-paths
7. **Compliance-check** — als endpoint PII verwerkt: noem retentie, lawful basis, log-policy

## Combineer met
- `/ui-form` — als de route door een form gevoed wordt
- `/db-migration` — als nieuwe tabel/RPC nodig is
- `/test-write` — voor de endpoint-tests
- `/security-baseline` of `/security-review` — review na bouwen
- `/edge-fn-deploy` — voor het uitrollen
