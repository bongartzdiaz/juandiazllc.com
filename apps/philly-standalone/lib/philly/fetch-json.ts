/* ---------------------------------------------------------------
   fetchJson — a thin wrapper around fetch that throws on non-2xx
   ---------------------------------------------------------------
   Bundle CJ. The audit pass over BK–CB found dozens of pages
   doing `const j = await r.json()` without checking `r.ok` first.
   When the API returned 401 / 500, the body shape was
   `{ error: '...' }` but the page expected `{ data: [...] }` and
   silently fell to the empty array. The user saw "No data" and
   filed a "platform is broken" support ticket.

   This helper:
   1. Throws if the response is not ok, with a typed error that
      surfaces { status, message } so the caller can render
      something useful.
   2. Returns the parsed JSON otherwise.
   3. Tolerates non-JSON error bodies (e.g. the framework's bare
      "Unauthorized" string).

   Use this in client components where you just want
     const data = await fetchJson<MyType>('/api/foo')
   to either succeed or throw. Server-rendering and infrastructure
   code keep the manual fetch() pattern because they often need
   richer control (status codes, headers, retry logic).
   --------------------------------------------------------------- */

export class FetchJsonError extends Error {
  status: number
  body: unknown
  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.name = 'FetchJsonError'
    this.status = status
    this.body = body
  }
}

export async function fetchJson<T = unknown>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    let body: unknown
    let message = `Request failed (${res.status})`
    try {
      body = await res.json()
      const err = (body as { error?: string; message?: string } | null)
      if (err?.error) message = err.error
      else if (err?.message) message = err.message
    } catch {
      // Body wasn't JSON; try text. If even that fails, fall back
      // to the default status-only message.
      try {
        const text = await res.text()
        if (text) message = text.slice(0, 500)
      } catch {
        /* keep default */
      }
    }
    throw new FetchJsonError(res.status, message, body)
  }
  return (await res.json()) as T
}
