/* ---------------------------------------------------------------
   Cross-tenant foreign-key guards (A-02, BE-02, BE-09).

   The CRM runs on MySQL/MariaDB with NO row-level security, so any client-
   supplied foreign key must be proven to belong to the caller's organization
   before it is written — otherwise an authenticated user in Org A can attach a
   row to Org B's contact / property / deal / agent (a cross-tenant BOLA write).

   Originally built for the public /api/v1 handler (A-02); extended for the
   internal create/update routes (BE-09) which had the same gap, plus a
   stage-in-pipeline check (BE-02) and an attendee-set check for calendar.
   --------------------------------------------------------------- */

// Duck-typed boundary against the Prisma client / test fakes. Real client and
// typed mocks both satisfy it; the index signature carries findFirst + count.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaLike = Record<string, any>

/** `where`-clause builder per model kind: models with a direct organizationId
 *  column check it directly; Deal / PipelineStage reach the org through their
 *  pipeline relation. */
const ORG_WHERE = {
  contact: (id: unknown, org: string) => ({ id, organizationId: org }),
  property: (id: unknown, org: string) => ({ id, organizationId: org }),
  room: (id: unknown, org: string) => ({ id, organizationId: org }),
  user: (id: unknown, org: string) => ({ id, organizationId: org }),
  project: (id: unknown, org: string) => ({ id, organizationId: org }),
  deal: (id: unknown, org: string) => ({ id, pipeline: { organizationId: org } }),
  pipelineStage: (id: unknown, org: string) => ({ id, pipeline: { organizationId: org } }),
} as const

export type OrgScopedModel = keyof typeof ORG_WHERE

/** A foreign key to verify: the request field name, the model it points to,
 *  and the supplied value. */
export type FkCheck = { field: string; model: OrgScopedModel; value: unknown }

/**
 * Returns the `field` of the first FK whose referenced row does NOT belong to
 * `orgId`, or null if every supplied FK is valid (or absent). Empty/null
 * values are skipped. The reusable core for both v1 and internal routes.
 */
export async function findForeignKeyNotInOrg(
  prisma: PrismaLike,
  orgId: string,
  checks: FkCheck[],
): Promise<string | null> {
  for (const { field, model, value } of checks) {
    if (value == null || value === '') continue
    const found = await prisma[model].findFirst({
      where: ORG_WHERE[model](value, orgId),
      select: { id: true },
    })
    if (!found) return field
  }
  return null
}

/** The v1 API's writable FK fields → the model each points to. */
const V1_FK_FIELD_MODEL: Record<string, OrgScopedModel> = {
  contactId: 'contact',
  propertyId: 'property',
  roomId: 'room',
  agentId: 'user',
  dealId: 'deal',
  stageId: 'pipelineStage',
  projectId: 'project',
}

/** Fields the v1 guard knows how to validate (for tests / docs). */
export const V1_FK_FIELDS = Object.keys(V1_FK_FIELD_MODEL)

/**
 * v1 convenience wrapper: validates every known FK field present in `data`.
 * Returns the offending field name or null.
 */
export async function findCrossOrgForeignKey(
  prisma: PrismaLike,
  orgId: string,
  data: Record<string, unknown>,
): Promise<string | null> {
  const checks: FkCheck[] = V1_FK_FIELDS.map((field) => ({
    field,
    model: V1_FK_FIELD_MODEL[field],
    value: data[field],
  }))
  return findForeignKeyNotInOrg(prisma, orgId, checks)
}

/**
 * True if `stageId` is a PipelineStage of `pipelineId` (BE-02). Used to stop a
 * deal being moved to a stage from another pipeline (or another tenant).
 */
export async function stageBelongsToPipeline(
  prisma: PrismaLike,
  stageId: unknown,
  pipelineId: string,
): Promise<boolean> {
  if (stageId == null || stageId === '') return false
  const stage = await prisma.pipelineStage.findFirst({
    where: { id: stageId, pipelineId },
    select: { id: true },
  })
  return Boolean(stage)
}

/**
 * True if ANY of `userIds` is not a user of `orgId` (BE-09, calendar
 * attendees). Empty/duplicate ids are ignored; an empty set returns false.
 */
export async function someUserNotInOrg(
  prisma: PrismaLike,
  orgId: string,
  userIds: unknown[],
): Promise<boolean> {
  const ids = [...new Set((userIds ?? []).filter((u): u is string => typeof u === 'string' && u !== ''))]
  if (ids.length === 0) return false
  const count = await prisma.user.count({
    where: { id: { in: ids }, organizationId: orgId },
  })
  return count !== ids.length
}
