/* ---------------------------------------------------------------
   Request body validation helper using Zod
   --------------------------------------------------------------- */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonError } from '@/lib/auth-helpers'

/**
 * Parse and validate the JSON body of a NextRequest against a Zod schema.
 *
 * Returns either:
 * - { success: true, data: T }  — validated & transformed data
 * - { success: false, response: NextResponse }  — ready-to-return 400 error
 */
export async function validateBody<T extends z.ZodTypeAny>(
  req: NextRequest,
  schema: T,
): Promise<
  | { success: true; data: z.infer<T> }
  | { success: false; response: ReturnType<typeof jsonError> }
> {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return { success: false, response: jsonError('Invalid JSON body', 400) }
  }

  const result = schema.safeParse(raw)

  if (!result.success) {
    const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
    return { success: false, response: jsonError(issues, 400) }
  }

  return { success: true, data: result.data }
}
