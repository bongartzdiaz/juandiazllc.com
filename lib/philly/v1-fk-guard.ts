/* ---------------------------------------------------------------
   v1 API foreign-key tenant guard (A-02).

   The public /api/v1 handler is config-driven and accepts client-supplied
   foreign keys (propertyId, roomId, dealId, contactId, stageId, agentId)
   on create/update. For relation-scoped resources (offers, reservations)
   the tenant boundary lives entirely in a parent FK, so without an explicit
   check a write-scoped API key in Org A can attach a row to Org B's
   property/room/deal — a cross-tenant BOLA write.

   This module verifies every supplied FK resolves to a row inside the
   caller's organization before the create/update proceeds.
   --------------------------------------------------------------- */

// Duck-typed boundary against the Prisma client / test fakes. `any` on the
// findFirst arg keeps both the real client and typed mocks assignable.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaLike = { [key: string]: { findFirst: (args: any) => Promise<unknown> } }

/** For each FK field a v1 resource may accept, the Prisma model to look it
 *  up in and the org-ownership `where` clause. Models with a direct
 *  organizationId column check it directly; Deal and PipelineStage reach
 *  the org through their pipeline relation. */
const FK_ORG_CHECK: Record<
  string,
  { model: string; where: (id: unknown, orgId: string) => Record<string, unknown> }
> = {
  contactId: { model: 'contact', where: (id, org) => ({ id, organizationId: org }) },
  propertyId: { model: 'property', where: (id, org) => ({ id, organizationId: org }) },
  roomId: { model: 'room', where: (id, org) => ({ id, organizationId: org }) },
  agentId: { model: 'user', where: (id, org) => ({ id, organizationId: org }) },
  dealId: { model: 'deal', where: (id, org) => ({ id, pipeline: { organizationId: org } }) },
  stageId: { model: 'pipelineStage', where: (id, org) => ({ id, pipeline: { organizationId: org } }) },
}

/** Fields this guard knows how to validate (for tests / docs). */
export const V1_FK_FIELDS = Object.keys(FK_ORG_CHECK)

/**
 * Returns the name of the first foreign-key field in `data` whose
 * referenced row does NOT belong to `orgId`, or null if every supplied
 * FK is valid (or none are present). Only checks FK fields actually
 * present + non-empty in `data`.
 */
export async function findCrossOrgForeignKey(
  prisma: PrismaLike,
  orgId: string,
  data: Record<string, unknown>,
): Promise<string | null> {
  for (const field of V1_FK_FIELDS) {
    const val = data[field]
    if (val == null || val === '') continue
    const { model, where } = FK_ORG_CHECK[field]
    const found = await prisma[model].findFirst({ where: where(val, orgId), select: { id: true } })
    if (!found) return field
  }
  return null
}
