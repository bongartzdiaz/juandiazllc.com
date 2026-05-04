/* ---------------------------------------------------------------
   SCIM 2.0 — Group ↔ ScimGroup mapping
   ---------------------------------------------------------------
   IdPs send/receive SCIM `Group` resources. The platform stores
   each as a ScimGroup row plus a join table (ScimGroupMembership).
   This module is the bidirectional adapter.

   Platform-specific extras (role, dashboardSections) are operator-
   set via the admin UI — IdPs neither know nor care about them.
   When a member-add PATCH lands, those values flow onto the user's
   per-org Membership row so `engineering` group → manager etc.
   without per-IdP claim parsing.

   Bundle BW.
   --------------------------------------------------------------- */

import { GROUP_SCHEMA, type ScimGroup, type ScimGroupMember } from './schemas'

export interface PlatformGroupRow {
  id: string
  organizationId: string
  scimExternalId: string | null
  displayName: string
  createdAt: Date
  updatedAt?: Date
  /** Pre-fetched joined member rows (id + email). Pass [] when
   *  serialising a freshly-created group. */
  members?: Array<{ id: string; email: string }>
}

export function groupToScim(group: PlatformGroupRow, baseUrl: string): ScimGroup {
  const members: ScimGroupMember[] = (group.members ?? []).map((u) => ({
    value: u.id,
    display: u.email,
    type: 'User',
    $ref: `${baseUrl}/Users/${u.id}`,
  }))

  return {
    schemas: [GROUP_SCHEMA],
    id: group.id,
    ...(group.scimExternalId ? { externalId: group.scimExternalId } : {}),
    displayName: group.displayName,
    members,
    meta: {
      resourceType: 'Group',
      created: group.createdAt.toISOString(),
      lastModified: (group.updatedAt ?? group.createdAt).toISOString(),
      location: `${baseUrl}/Groups/${group.id}`,
    },
  }
}

export interface ScimGroupCreateInput {
  displayName: string
  externalId: string | null
  /** Member ids (platform User ids). RFC 7643 says member.value is
   *  the SCIM resource id; for User members that's User.id. */
  memberIds: string[]
}

/** Parse a SCIM Group POST/PUT body. Throws on structural errors;
 *  caller surfaces 400. */
export function parseScimGroupInput(body: unknown): ScimGroupCreateInput {
  if (!body || typeof body !== 'object') {
    throw new Error('SCIM Group: body must be a JSON object')
  }
  const b = body as Record<string, unknown>

  // displayName is required (RFC 7643 §4.2)
  const displayName = typeof b.displayName === 'string' ? b.displayName.trim() : ''
  if (!displayName) throw new Error('SCIM Group: displayName is required')

  const externalId = typeof b.externalId === 'string' ? b.externalId : null

  const memberIds: string[] = []
  if (Array.isArray(b.members)) {
    for (const raw of b.members) {
      if (!raw || typeof raw !== 'object') continue
      const m = raw as Record<string, unknown>
      if (typeof m.value === 'string' && m.value) memberIds.push(m.value)
    }
  }

  return { displayName, externalId, memberIds }
}

/* ---------------------------------------------------------------
   Members PATCH op — extract add/remove targets
   ---------------------------------------------------------------
   IdPs send PATCH ops in two shapes for member changes:

     {"op": "add", "path": "members",
      "value": [{"value": "<userId>"}, ...]}

     {"op": "remove",
      "path": "members[value eq \"<userId>\"]"}

   Some send a path-less replace whose value is the new member set
   (Azure AD specifically). We support all three.

   Returns the diff to apply, OR { error } when the path / value is
   un-parseable.
   --------------------------------------------------------------- */

export interface MemberDiff {
  add: string[]
  remove: string[]
  /** When set, replace the entire member list with this set
   *  (Azure-style path-less replace). */
  replace?: string[]
  /** Mutations to non-member group attributes (displayName etc.). */
  setDisplayName?: string
  /** string = set to that value; null = clear the column (RFC 7644
   *  PATCH-replace value:null semantics); undefined = no change.
   *  Bundle CG. */
  setExternalId?: string | null
}

const MEMBER_FILTER_RE = /^members\[\s*value\s+eq\s+"([^"]*)"\s*\]$/

export function parseGroupPatchOp(
  op: { op: string; path?: string; value?: unknown },
): MemberDiff | { error: string } {
  const diff: MemberDiff = { add: [], remove: [] }
  const path = op.path?.trim() ?? null

  /* ── members add ─────────────────────────────────────────── */
  if (op.op === 'add' && path === 'members') {
    if (!Array.isArray(op.value)) return { error: '`add members` requires array value' }
    for (const v of op.value) {
      if (v && typeof v === 'object' && typeof (v as { value?: unknown }).value === 'string') {
        diff.add.push((v as { value: string }).value)
      }
    }
    return diff
  }

  /* ── members remove (filter form) ────────────────────────── */
  if (op.op === 'remove' && path) {
    const m = MEMBER_FILTER_RE.exec(path)
    if (m) {
      diff.remove.push(m[1])
      return diff
    }
    if (path === 'members') {
      // Whole-list remove — drops every member.
      diff.replace = []
      return diff
    }
  }

  /* ── path-less replace (Azure AD shape) ──────────────────── */
  if (!path && op.op === 'replace' && op.value && typeof op.value === 'object') {
    const v = op.value as Record<string, unknown>
    if (typeof v.displayName === 'string') diff.setDisplayName = v.displayName
    if (typeof v.externalId === 'string') diff.setExternalId = v.externalId
    else if (v.externalId === null) diff.setExternalId = null  // explicit clear (Bundle CG)
    if (Array.isArray(v.members)) {
      const ids: string[] = []
      for (const m of v.members) {
        if (m && typeof m === 'object' && typeof (m as { value?: unknown }).value === 'string') {
          ids.push((m as { value: string }).value)
        }
      }
      diff.replace = ids
    }
    return diff
  }

  /* ── path-ed replace (displayName / externalId) ──────────── */
  if (op.op === 'replace' && path === 'displayName') {
    if (typeof op.value !== 'string') return { error: 'displayName must be a string' }
    diff.setDisplayName = op.value
    return diff
  }
  if (op.op === 'replace' && path === 'externalId') {
    // Bundle CG — accept explicit null to clear the column. RFC 7644
    // PATCH-replace with `value: null` is the canonical "remove this
    // attribute" form for nullable single-valued attributes.
    if (op.value === null) {
      diff.setExternalId = null
    } else if (typeof op.value === 'string') {
      diff.setExternalId = op.value
    } else {
      return { error: 'externalId must be a string or null' }
    }
    return diff
  }

  if (op.op === 'replace' && path === 'members') {
    if (!Array.isArray(op.value)) return { error: 'replace members requires array value' }
    const ids: string[] = []
    for (const v of op.value) {
      if (v && typeof v === 'object' && typeof (v as { value?: unknown }).value === 'string') {
        ids.push((v as { value: string }).value)
      }
    }
    diff.replace = ids
    return diff
  }

  return { error: `Unsupported Group PATCH op: ${op.op}${path ? ' ' + path : ''}` }
}
