---
name: edge-fn-build
description: Bouw een nieuwe Supabase edge function (Deno) met juiste auth-pattern (Type A JWT vs Type B vault x-api-key), CORS, validation, error-handling, shared modules. Werkt voor HMB, PT, alle Supabase projects. Anders dan /edge-fn-deploy (uitrollen) — deze schrijft de code. Gebruik wanneer Juan vraagt "maak een edge function voor X".
trigger: /edge-fn-build
---

# /edge-fn-build

Supabase edge function bouwen volgens PT-conventies en Juan's auth-patterns.

## Usage
```
/edge-fn-build <naam> <doel>
/edge-fn-build <naam> --auth <jwt|vault-key|public>
/edge-fn-build <naam> --project <hmb|pt|<ref>>
/edge-fn-build <naam> --triggers "<csv>"          # bv "http,cron,db-trigger"
```

## File-structuur

```
supabase/functions/
├── _shared/
│   ├── auth.ts              # isAuthorized() + unauthorizedResponse()
│   ├── cors.ts              # corsHeaders + handlePreflight
│   └── supabaseAdmin.ts     # service-role client
├── <naam>/
│   ├── index.ts             # entry-point
│   └── README.md            # doel, env-vars, smoke-test
└── _tests/
    └── <naam>.test.ts
```

## Auth-patterns (kritiek)

### Type A — Gateway JWT (`verify_jwt=true`, default)

`supabase/config.toml`:
```toml
[functions.my-fn]
# verify_jwt is default true; geen entry nodig
```

```ts
// _shared/cors.ts
export const corsHeaders = {
  "Access-Control-Allow-Origin": "https://your-domain.nl",   // SPECIFIEK
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// functions/my-fn/index.ts
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Gateway heeft Bearer JWT geverifieerd; user-context in headers
  const userJwt = req.headers.get("Authorization")?.replace("Bearer ", "");
  // ... handle ...
});
```

### Type B — Vault x-api-key (`verify_jwt=false`)

`supabase/config.toml`:
```toml
[functions.my-sync-fn]
verify_jwt = false
```

```ts
// _shared/auth.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

export async function isAuthorized(req: Request): Promise<boolean> {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) return false;

  // Vault-first via RPC (PT pattern)
  const { data: vaultKey } = await supabase.rpc("get_sync_api_key_text");
  if (vaultKey && apiKey === vaultKey) return true;

  // Env-fallback
  const envKey = Deno.env.get("N8N_SYNC_API_KEY");
  return Boolean(envKey && apiKey === envKey);
}

export function unauthorizedResponse(corsHeaders: HeadersInit): Response {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
```

```ts
// functions/my-sync-fn/index.ts
import { isAuthorized, unauthorizedResponse } from "../_shared/auth.ts";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!(await isAuthorized(req))) return unauthorizedResponse(corsHeaders);

  try {
    const body = await req.json();
    // ... handle ...
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error(`[my-sync-fn] ${e?.message || "error"}`);
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

### Type C — Public (geen auth, alleen voor lead-form / public webhook)

CORS wildcard alleen als ECHT publiek — geen authenticated context.

## Hard rules

### Validation
Zod-equivalent in Deno: import `https://deno.land/x/zod/mod.ts` of `https://esm.sh/zod`.

```ts
import { z } from "https://esm.sh/zod@3.23.8";

const Body = z.object({
  email: z.string().email(),
  phone: z.string().regex(/^\+\d{10,15}$/),
});

const parsed = Body.safeParse(await req.json());
if (!parsed.success) {
  return new Response(JSON.stringify({ error: "validation", issues: parsed.error.issues }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
```

### Logging zonder PII
```ts
console.log(`[fn] received event=${event_type} contact_hash=${hashEmail(email).slice(0, 8)}`);
// NIET: console.log(`[fn] email=${email}`);
```

### Idempotency voor write-side fns
Gebruik `webhook_events` tabel pattern (zie `/webhook-handler`).

### CORS — geen wildcard voor authenticated
```ts
// FOUT
"Access-Control-Allow-Origin": "*",
// GOED
"Access-Control-Allow-Origin": "https://performancetracker.nl",
```

Voor multi-domain: switch op `Origin`-header tegen allowlist.

## Test-pattern

```ts
// _tests/my-fn.test.ts
Deno.test("rejects without api-key", async () => {
  const req = new Request("http://localhost/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const resp = await handler(req);
  assertEquals(resp.status, 401);
});
```

## Local dev

```bash
# Start Supabase locally
npx supabase start

# Serve fn lokaal
npx supabase functions serve my-fn --env-file .env.local

# Test
curl -X POST http://localhost:54321/functions/v1/my-fn \
  -H "x-api-key: test-key" \
  -H "Content-Type: application/json" \
  -d '{"email":"x@y.nl","phone":"+31612345678"}'
```

## README per fn

```markdown
# my-fn

## Doel
<wat doet 'ie>

## Auth
Type B — vault x-api-key

## Env-vars
- `SUPABASE_URL` (auto)
- `SUPABASE_SERVICE_ROLE_KEY` (auto)
- `N8N_SYNC_API_KEY` (fallback)

## Smoke-test
```bash
curl -X POST <url> -H "x-api-key: $KEY" -d '{...}'
# expect 200 { ok: true }
```

## Triggers
- HTTP POST
- Cron `*/15 * * * *` via pg_cron
```

## Combineer met
- `/edge-fn-deploy` — uitrollen na build
- `/api-route` — als alternatief voor Next.js API
- `/db-migration` — voor RPC's die fn aanroept
- `/test-write` — Deno tests
