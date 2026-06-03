/* ---------------------------------------------------------------
   Request body validation helper using Zod
   --------------------------------------------------------------- */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { jsonError } from '@/lib/philly/auth-helpers'
import { zodErrorResponse } from '@/lib/philly/api/validate'

/**
 * Parse and validate the JSON body of a NextRequest against a Zod schema.
 *
 * Returns either:
 * - { success: true, data: T }  — validated & transformed data
 * - { success: false, response: NextResponse }  — ready-to-return 400 error
 *
 * The 400 error body is the shared BE-05 contract (`zodErrorResponse`):
 * `{ error: 'Validation failed', fieldErrors: {...} }` — identical to the
 * newer `parseBody` helper, so the whole API surface speaks one error shape.
 */
export async function validateBody<T extends z.ZodTypeAny>(
  req: NextRequest,
  schema: T,
): Promise<
  | { success: true; data: z.infer<T> }
  | { success: false; response: NextResponse }
> {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return { success: false, response: jsonError('Invalid JSON', 400) }
  }

  const result = schema.safeParse(raw)

  if (!result.success) {
    return { success: false, response: zodErrorResponse(result.error) }
  }

  return { success: true, data: result.data }
}
