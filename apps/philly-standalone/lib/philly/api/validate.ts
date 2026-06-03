/**
 * BE-05 — shared request-validation helpers (Zod v4).
 *
 * One mental model for the whole API surface: these mirror the
 * `requireRole`/`requireScope` ergonomics — they return EITHER the typed,
 * validated value OR a ready-to-return `NextResponse` (HTTP 400). Callers
 * early-return on the `NextResponse` branch, exactly like the auth guards:
 *
 *     const scope = await requireRole(['admin'])
 *     if (scope instanceof NextResponse) return scope
 *
 *     const input = await parseBody(req, createSchema)
 *     if (input instanceof NextResponse) return input
 *     // input is fully typed via z.infer<typeof createSchema>
 *
 * 400 contract (agreed for all routes): a fieldErrors map so API clients and
 * the CSV/XLSX import flows can show which field failed, not just the first
 * message.
 *
 *     { "error": "Validation failed",
 *       "fieldErrors": { "email": ["Invalid email"], "price": ["Expected number"] },
 *       "formErrors": ["..."]   // only when top-level (non-field) errors exist
 *     }
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export type FieldErrors = Record<string, string[]>

/**
 * The single source of truth for the BE-05 validation-error 400 shape.
 * Shared by `parseBody`/`parseQuery` here AND by the older
 * `lib/philly/validation/validateBody` helper, so every route in the app —
 * regardless of which helper it uses — returns the identical wire contract:
 *   { error: 'Validation failed', fieldErrors: {...}, formErrors?: [...] }
 */
export function zodErrorResponse(error: z.ZodError): NextResponse {
  // z.flattenError is the Zod-v4 canonical replacement for the deprecated
  // ZodError.flatten() instance method.
  const flat = z.flattenError(error)
  const body: { error: string; fieldErrors: FieldErrors; formErrors?: string[] } = {
    error: 'Validation failed',
    fieldErrors: flat.fieldErrors as FieldErrors,
  }
  if (flat.formErrors.length) body.formErrors = flat.formErrors
  return NextResponse.json(body, { status: 400 })
}

/**
 * Parse + validate a JSON request body against `schema`.
 * Returns the typed data, or a 400 `NextResponse` (invalid JSON OR schema miss).
 */
export async function parseBody<S extends z.ZodType>(
  req: NextRequest,
  schema: S,
): Promise<z.infer<S> | NextResponse> {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON', fieldErrors: {} },
      { status: 400 },
    )
  }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) return zodErrorResponse(parsed.error)
  return parsed.data
}

/**
 * Parse + validate URL query params against `schema`. Pass
 * `req.nextUrl.searchParams`. Repeated keys collapse to an array, single keys
 * to a string — so the schema can use `z.coerce.number()`, `z.enum`, arrays, etc.
 *
 * Use `.partial()` / `.optional()` generously: most query schemas are filters
 * where every param is optional.
 */
export function parseQuery<S extends z.ZodType>(
  searchParams: URLSearchParams,
  schema: S,
): z.infer<S> | NextResponse {
  const obj: Record<string, string | string[]> = {}
  for (const key of new Set(searchParams.keys())) {
    const all = searchParams.getAll(key)
    obj[key] = all.length > 1 ? all : all[0]
  }
  const parsed = schema.safeParse(obj)
  if (!parsed.success) return zodErrorResponse(parsed.error)
  return parsed.data
}
