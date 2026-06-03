/**
 * BE-05 — reusable Zod building blocks shared across route families.
 *
 * Keep this small and generic: entity-specific schemas live next to their
 * route (inline `const createSchema = z.object({...})`). Only promote a shape
 * here once 2+ routes genuinely share it (DRY without premature abstraction).
 */
import { z } from 'zod'

/** A non-empty entity id from the request. We don't assume a cuid/uuid format
 *  here — Prisma + the org-scope `where` clause are the real authority on
 *  whether the id resolves. We only reject empty/whitespace. */
export const idSchema = z.string().trim().min(1, 'id is required')

/**
 * Body schema for drag-drop reorder endpoints: `{ ids: string[] }`.
 * - non-empty
 * - bounded (per-entity `max`, default 500) so a runaway client can't queue a
 *   giant transaction
 * - unique (two ids must never map to the same displayOrder)
 */
export function reorderBody(max = 500) {
  return z.object({
    ids: z
      .array(idSchema)
      .min(1, 'ids must be a non-empty array')
      .max(max, `Maximum ${max} items per reorder call`)
      .refine((ids) => new Set(ids).size === ids.length, {
        message: 'ids must be unique',
      }),
  })
}

/** Common pagination/query params. Spread into a route's query schema:
 *    const querySchema = z.object({ ...pageQuery.shape, status: z.enum([...]) })
 *  All optional with sane defaults so a bare GET still validates. */
export const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
})
