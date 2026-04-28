/* ---------------------------------------------------------------
   Membership-removal business logic.

   Extracted from app/api/users/[id]/membership/route.ts so the
   guards (home-org refusal, last-admin protection) can be unit-tested
   without spinning up a Next.js request.

   The Membership table is the canonical source of truth for "who
   has access to org X with what role". Every home-org user has a
   mirrored Membership row by migration backfill + the POST
   /api/users invariant, so admin-counting against Membership.role
   is the right question regardless of whether an org has multi-org
   members.
   --------------------------------------------------------------- */

export interface RemoveMembershipInput {
  targetUserId: string
  organizationId: string
}

export type RemoveMembershipResult =
  | { ok: true; removed: { id: string; role: string; email: string | null } }
  | { code: 'USER_NOT_FOUND' }
  | { code: 'IS_HOME_ORG' }
  | { code: 'NOT_A_MEMBER' }
  | { code: 'LAST_ADMIN' }

export interface RemovalPrisma {
  user: {
    findUnique: (args: {
      where: { id: string }
      select: { id: true; email: true; organizationId: true }
    }) => Promise<{ id: string; email: string | null; organizationId: string } | null>
  }
  membership: {
    findUnique: (args: {
      where: { userId_organizationId: { userId: string; organizationId: string } }
      select: { id: true; role: true }
    }) => Promise<{ id: string; role: string } | null>
    count: (args: {
      where: { organizationId: string; role: string }
    }) => Promise<number>
    delete: (args: {
      where: { userId_organizationId: { userId: string; organizationId: string } }
    }) => Promise<unknown>
  }
}

export async function removeMembership(
  prisma: RemovalPrisma,
  input: RemoveMembershipInput,
): Promise<RemoveMembershipResult> {
  const target = await prisma.user.findUnique({
    where: { id: input.targetUserId },
    select: { id: true, email: true, organizationId: true },
  })
  if (!target) return { code: 'USER_NOT_FOUND' }
  if (target.organizationId === input.organizationId) {
    return { code: 'IS_HOME_ORG' }
  }

  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: input.targetUserId,
        organizationId: input.organizationId,
      },
    },
    select: { id: true, role: true },
  })
  if (!membership) return { code: 'NOT_A_MEMBER' }

  if (membership.role === 'admin') {
    const adminCount = await prisma.membership.count({
      where: { organizationId: input.organizationId, role: 'admin' },
    })
    if (adminCount <= 1) return { code: 'LAST_ADMIN' }
  }

  await prisma.membership.delete({
    where: {
      userId_organizationId: {
        userId: input.targetUserId,
        organizationId: input.organizationId,
      },
    },
  })

  return {
    ok: true,
    removed: { id: membership.id, role: membership.role, email: target.email },
  }
}
