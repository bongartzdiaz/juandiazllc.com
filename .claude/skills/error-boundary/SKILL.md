---
name: error-boundary
description: Bouw error-boundary patterns voor React (class-based of via react-error-boundary), Next.js (`error.tsx` + `global-error.tsx`), en async edge cases (TanStack Query). Inclusief Sentry/beacon-integration en herstel-actie-UI. Gebruik wanneer Juan vraagt "wat gebeurt er als X faalt", bij prod-ready features, of na incident waar witte pagina werd gemeld.
trigger: /error-boundary
---

# /error-boundary

Robuuste error-handling in React + Next.js — geen witte pagina's, geen silent failures.

## Usage
```
/error-boundary <scope>
/error-boundary <scope> --stack <pt|hmb|funnel|philly>
/error-boundary <scope> --fallback <minimal|friendly|technical>
/error-boundary <scope> --report <sentry|beacon|console>
```

## Hard rules
- **Geen lege `catch {}`** — log of gooi door
- **User-friendly fallback** — geen stack-trace in productie
- **Recovery-actie** verplicht: "Probeer opnieuw" / "Ga terug" / "Mail support"
- **Reset-key** zodat boundary herstelt na route-change
- **Async errors** apart afhandelen (boundaries vangen geen Promises)

## Patterns per stack

### Next.js App Router — automatic
```tsx
// app/<route>/error.tsx
"use client";
import { useEffect } from "react";

export default function Error({
  error, reset,
}: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    fetch("/api/log-error", {
      method: "POST",
      body: JSON.stringify({
        message: error.message,
        digest: error.digest,
        url: window.location.href,
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-2xl font-bold">Er ging iets mis</h1>
      <p className="mt-2 text-gray-600">
        We konden deze pagina niet laden. Probeer het opnieuw of mail privacy@helpmijbesparen.nl.
      </p>
      <button onClick={reset} className="mt-6 rounded-xl bg-emerald-600 px-4 py-2 text-white">
        Probeer opnieuw
      </button>
    </div>
  );
}
```

`global-error.tsx` voor app-wide fallback (vervangt root layout). `not-found.tsx` voor 404.

### React (Vite, PT) — react-error-boundary
```tsx
import { ErrorBoundary, FallbackProps } from "react-error-boundary";

function Fallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4">
      <h2 className="font-semibold">Er ging iets mis</h2>
      <p className="text-sm text-red-700">{error.message}</p>
      <button onClick={resetErrorBoundary} className="mt-3 underline">
        Opnieuw proberen
      </button>
    </div>
  );
}

<ErrorBoundary
  FallbackComponent={Fallback}
  onError={(err, info) => reportError(err, info)}
  resetKeys={[location.pathname]}
>
  <Route />
</ErrorBoundary>
```

### TanStack Query — async errors
```tsx
const { data, error, isError, refetch } = useQuery({ ... });

if (isError) {
  return (
    <div role="alert" className="...">
      <p>Kon data niet laden: {error.message}</p>
      <button onClick={() => refetch()}>Opnieuw proberen</button>
    </div>
  );
}
```

Of via `<QueryErrorResetBoundary>` + `<ErrorBoundary>`.

### Edge functions / API routes — server-side
```ts
try {
  return await handleRequest(req);
} catch (e: any) {
  console.error(`[<route>] error: ${e?.message || "unknown"}`);
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  return NextResponse.json({ error: "server_error", details: String(e?.message || e) }, { status: 500 });
}
```

## Reporting-patterns

### Sentry beacon (lightweight, no SDK)
```ts
async function reportError(error: Error, info?: Record<string, unknown>) {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  fetch(`${process.env.NEXT_PUBLIC_SENTRY_DSN}/store/`, {
    method: "POST",
    body: JSON.stringify({
      message: error.message,
      level: "error",
      extra: info,
      url: typeof window !== "undefined" ? window.location.href : "",
    }),
  }).catch(() => {});
}
```

### Custom log-endpoint
Maak `/api/log-error` die in Supabase `error_log` schrijft. Goedkoper dan Sentry voor low volume.

## Fallback-tones

| Tone | Wanneer |
|---|---|
| `minimal` | Internal tools (PT admin) — "Er ging iets mis. [Opnieuw]" |
| `friendly` | Public-facing (HMB, funnel) — empathisch, recovery-pad, support-mail |
| `technical` | Dev/staging — stack-trace + reload + clear-cache button |

## Checklist
- [ ] `error.tsx` per route-segment dat dynamic data laadt
- [ ] `global-error.tsx` op app-niveau
- [ ] TanStack Query errors hebben UI-fallback
- [ ] Form-submission errors getoond met `role="alert"`
- [ ] API routes hebben generic 500 in prod (geen stack-leak)
- [ ] Edge functions loggen error zonder PII
- [ ] Sentry/beacon-config werkt (test met `throw new Error`)
- [ ] Reset-flow getest (na error: kan user verder?)

## Combineer met
- `/log-analysis` — review wat er in productie faalt
- `/incident` — bij actuele crisis
- `/test-write` — boundary-tests met `@testing-library/react`
