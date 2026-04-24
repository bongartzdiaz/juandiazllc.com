/* ---------------------------------------------------------------
   Observability — SLO-aware span wrapper built on Sentry v9.
   ---------------------------------------------------------------
   Sentry v9 ships OTel-compatible tracing via @sentry/core. This
   wrapper adds:
   - automatic error capture (span tagged "error", exception reported)
   - SLO bucket tagging (ok / slow / error) based on per-operation
     latency budgets below
   - graceful no-op when SENTRY_DSN is unset (dev, small installs)

   Usage:
     await withSpan({ name: "auth.login", slo: SLO.LOGIN }, async () => {
       return doTheWork()
     })

   The returned value is exactly whatever the inner fn returned.
   --------------------------------------------------------------- */

// SLO latency budgets (ms). These are the p95 targets we're defending
// on each critical business path. If p95 drifts above the budget, the
// slo bucket flips to "slow" and the alert path lights up.
//
// Budgets are chosen from real user pain thresholds, not vanity:
// - LOGIN: form-submit to redirect. 1.2s is the point users think
//   something broke and click again.
// - CREATE_DEAL: perceived "I clicked save and it stuck" boundary
//   in the Philly CRM.
// - AI_ACTION: LLM paths are slow by nature; budget is generous
//   but anything past 15s probably means the upstream model timed out.
export const SLO = {
  LOGIN: 1_200,
  CREATE_DEAL: 800,
  AI_ACTION: 15_000,
} as const;

export type SloBudget = (typeof SLO)[keyof typeof SLO];

type SpanOpts = {
  name: string;
  slo: SloBudget;
  op?: string; // Sentry operation category, e.g. "auth.login", "db.create"
  attrs?: Record<string, string | number | boolean>;
};

type SentryLike = {
  startSpan: <T>(
    opts: { name: string; op?: string; attributes?: Record<string, unknown> },
    cb: (span: {
      setAttribute: (k: string, v: string | number | boolean) => void;
      setStatus: (s: { code: number; message?: string }) => void;
    }) => T | Promise<T>,
  ) => T | Promise<T>;
  captureException: (err: unknown, ctx?: Record<string, unknown>) => string;
};

let sentry: SentryLike | null = null;

function loadSentry(): SentryLike | null {
  if (sentry) return sentry;
  if (!process.env.SENTRY_DSN) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("@sentry/node") as SentryLike;
    sentry = mod;
    return mod;
  } catch {
    return null;
  }
}

function bucketFor(durationMs: number, slo: SloBudget, errored: boolean) {
  if (errored) return "error";
  if (durationMs > slo) return "slow";
  return "ok";
}

/**
 * Wrap a unit of work in a Sentry span with SLO bucket tagging.
 * No-ops cleanly when Sentry isn't configured.
 */
export async function withSpan<T>(opts: SpanOpts, fn: () => Promise<T>): Promise<T> {
  const started = performance.now();
  const s = loadSentry();

  if (!s) {
    // No Sentry — just run the work. Measurement still happens so
    // callers can log locally if they want.
    try {
      return await fn();
    } catch (err) {
      // Still rethrow — caller decides how to handle failures.
      throw err;
    }
  }

  return s.startSpan(
    {
      name: opts.name,
      op: opts.op ?? opts.name,
      attributes: { ...(opts.attrs ?? {}), "slo.budget_ms": opts.slo },
    },
    async (span) => {
      let errored = false;
      try {
        const result = await fn();
        return result;
      } catch (err) {
        errored = true;
        span.setStatus({ code: 2, message: "internal_error" });
        s.captureException(err, { span: opts.name, attrs: opts.attrs });
        throw err;
      } finally {
        const duration = performance.now() - started;
        span.setAttribute("slo.duration_ms", Math.round(duration));
        span.setAttribute("slo.bucket", bucketFor(duration, opts.slo, errored));
        span.setAttribute("slo.over_budget", duration > opts.slo);
      }
    },
  );
}

/** Synchronous variant — same shape, sync callback. */
export function withSpanSync<T>(opts: SpanOpts, fn: () => T): T {
  const started = performance.now();
  const s = loadSentry();

  if (!s) return fn();

  // The sync callback never returns a Promise, so the Sentry overload
  // we use here resolves to T. Cast is safe because we know the
  // control flow.
  return s.startSpan(
    {
      name: opts.name,
      op: opts.op ?? opts.name,
      attributes: { ...(opts.attrs ?? {}), "slo.budget_ms": opts.slo },
    },
    (span) => {
      let errored = false;
      try {
        return fn();
      } catch (err) {
        errored = true;
        span.setStatus({ code: 2, message: "internal_error" });
        s.captureException(err, { span: opts.name, attrs: opts.attrs });
        throw err;
      } finally {
        const duration = performance.now() - started;
        span.setAttribute("slo.duration_ms", Math.round(duration));
        span.setAttribute("slo.bucket", bucketFor(duration, opts.slo, errored));
        span.setAttribute("slo.over_budget", duration > opts.slo);
      }
    },
  ) as T;
}
