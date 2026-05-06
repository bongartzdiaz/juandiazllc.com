---
name: queue-job
description: Bouw een async job queue met Postgres als broker — `jobs` tabel, worker loop, retry-with-backoff, dead-letter queue, idempotency. Geen Redis/Bull nodig. Werkt voor email-send, lead-enrichment, bulk-import, slow-call-fanout. Gebruik wanneer Juan een taak achtergrond wil gooien (>2s sync uit user-flow halen).
trigger: /queue-job
---

# /queue-job

Async jobs zonder extra infra (geen Redis, geen Cloudflare Queues). Postgres + pg_cron + edge-fn-worker.

## Usage
```
/queue-job <job-naam>
/queue-job <job-naam> --max-attempts <n>          # default 3
/queue-job <job-naam> --backoff <linear|exponential>
/queue-job <job-naam> --concurrency <n>           # default 1
```

## Architectuur

```
[ User-action ]
  ↓ INSERT
[ jobs tabel ]
  ↓ pg_cron elke minuut
[ worker edge-fn ]
  ↓ FOR each pending job
[ run handler ]
  ↓ success → status='done'
  ↓ failure → status='retry' + attempts++ + next_run_at
  ↓ max_attempts → status='dead'
```

## Schema

```sql
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','running','done','retry','dead')),
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  next_run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  done_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Idempotency: same job_type + idempotency_key kan maar 1× pending zijn
  idempotency_key TEXT
);

CREATE UNIQUE INDEX jobs_idempotency_idx
  ON public.jobs (job_type, idempotency_key)
  WHERE status IN ('pending','running','retry') AND idempotency_key IS NOT NULL;

CREATE INDEX jobs_pending_idx
  ON public.jobs (job_type, next_run_at)
  WHERE status IN ('pending','retry');

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
-- Geen policies — alleen service-role
```

## Enqueue (in API/edge-fn)

```ts
async function enqueue(jobType: string, payload: object, opts?: { idempotencyKey?: string }) {
  const { data, error } = await supabase
    .from("jobs")
    .insert({
      job_type: jobType,
      payload,
      idempotency_key: opts?.idempotencyKey,
    })
    .select()
    .single();

  if (error?.code === "23505") {
    // Unique violation — job already pending, OK
    return { deduplicated: true };
  }
  if (error) throw error;
  return { id: data.id };
}

// Use:
await enqueue("send_lead_email", { lead_id: "abc-123" }, { idempotencyKey: "send_lead_email:abc-123" });
```

## Worker (Supabase edge function)

```ts
// supabase/functions/job-worker/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handlers } from "./handlers.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const BATCH_SIZE = 10;
const RUN_TIMEOUT_MS = 25_000;  // edge-fn timeout buffer

Deno.serve(async (req) => {
  // Auth: alleen pg_cron mag dit aanroepen
  if (req.headers.get("x-api-key") !== Deno.env.get("WORKER_KEY")) {
    return new Response("forbidden", { status: 403 });
  }

  const startTime = Date.now();
  let processed = 0;

  while (Date.now() - startTime < RUN_TIMEOUT_MS) {
    // Claim batch atomically
    const { data: jobs } = await supabase.rpc("claim_jobs", { p_limit: BATCH_SIZE });
    if (!jobs || jobs.length === 0) break;

    for (const job of jobs) {
      try {
        const handler = handlers[job.job_type];
        if (!handler) throw new Error(`unknown_job_type: ${job.job_type}`);
        await handler(job.payload);
        await markDone(job.id);
      } catch (e: any) {
        await markFailure(job.id, e.message, job.attempts + 1, job.max_attempts);
      }
      processed++;
    }
  }

  return new Response(JSON.stringify({ processed }), { headers: { "Content-Type": "application/json" } });
});

async function markDone(id: string) {
  await supabase.from("jobs").update({
    status: "done",
    done_at: new Date().toISOString(),
  }).eq("id", id);
}

async function markFailure(id: string, error: string, attempts: number, maxAttempts: number) {
  if (attempts >= maxAttempts) {
    await supabase.from("jobs").update({
      status: "dead",
      last_error: error.slice(0, 1000),
      attempts,
    }).eq("id", id);
    return;
  }
  // Exponential backoff: 1m, 5m, 25m
  const delayMin = Math.pow(5, attempts);
  const nextRun = new Date(Date.now() + delayMin * 60_000).toISOString();
  await supabase.from("jobs").update({
    status: "retry",
    last_error: error.slice(0, 1000),
    attempts,
    next_run_at: nextRun,
    started_at: null,
  }).eq("id", id);
}
```

## Atomic claim RPC

```sql
CREATE OR REPLACE FUNCTION public.claim_jobs(p_limit INT DEFAULT 10)
RETURNS SETOF public.jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.jobs
  SET status = 'running', started_at = now()
  WHERE id IN (
    SELECT id FROM public.jobs
    WHERE status IN ('pending','retry')
      AND next_run_at <= now()
    ORDER BY next_run_at
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_jobs(INT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_jobs(INT) TO service_role;
```

`FOR UPDATE SKIP LOCKED` is crucial: meerdere workers kunnen tegelijk runnen zonder elkaar te blokkeren.

## Handlers registry

```ts
// supabase/functions/job-worker/handlers.ts
export const handlers: Record<string, (payload: unknown) => Promise<void>> = {
  send_lead_email: async (p) => {
    const { lead_id } = p as { lead_id: string };
    // ... call resend, etc
  },
  enrich_lead_geo: async (p) => {
    const { lead_id } = p as { lead_id: string };
    // ... call geo-API
  },
  // Add new types here
};
```

## Cron-trigger

```sql
SELECT cron.schedule(
  'job_worker_tick',
  '* * * * *',   -- elke minuut
  $cron$
    SELECT net.http_post(
      url := 'https://<ref>.supabase.co/functions/v1/job-worker',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'x-api-key', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='worker_key' LIMIT 1)
      ),
      body := '{}'::jsonb
    );
  $cron$
);
```

## Hard rules

### Idempotency
- Elk job-type met side-effects krijgt `idempotency_key`
- Format: `<job-type>:<entity-id>` — max 1 pending per entity
- Unique-constraint vangt double-enqueue

### Timeouts
- Edge-fn timeout = 30s (Supabase Free) of 60s (Pro)
- Run-loop laat ruim 5s buffer voor finalisatie
- Per-handler timeout via `AbortController`

### Dead-letter
- `status='dead'` na max-attempts — niet auto-retry
- Daily cron-job mailt overzicht dead-jobs naar admin

### Observability
- Dashboard-page: count per status, avg-attempts, top-failing job-types
- Sentry/log-endpoint voor handler-errors

## Common job-types

| Type | Use-case |
|---|---|
| `send_email` | Resend API call |
| `send_sms` | MessageBird OTP |
| `enrich_lead_geo` | Postcode → adres-API |
| `sync_to_ghl` | CRM-push |
| `generate_pdf` | Lead-magnet PDF |
| `recompute_kpi` | Materialized view refresh |

## Combineer met
- `/db-migration` — voor jobs tabel + claim_jobs RPC
- `/edge-fn-build` — voor de worker edge-fn
- `/cron-job` — voor de tick-trigger
- `/log-analysis` — voor debug-flow
