/* ---------------------------------------------------------------
   SCIM 2.0 — User ↔ Platform User mapping
   ---------------------------------------------------------------
   IdPs send/receive SCIM `User` resources. The platform stores
   Users with a richer schema (organizationId, role, dashboard
   sections, 2FA, GDPR fields, etc.). This module is the
   bidirectional adapter.

   On RECEIVE (POST/PATCH/PUT from IdP):
     - userName  → email
     - name      → name (formatted, or `${given} ${family}`)
     - active    → derived: false ⇔ deletionScheduledAt set in the
                   near future + tokensInvalidAfter bumped
     - emails    → primary email goes to User.email; we store one
                   primary, ignore secondaries
     - externalId is captured for round-tripping

   On EMIT (GET):
     - We use the Philly User row id as the SCIM `id`
     - meta.location is the canonical URL for IdPs to follow
     - active reflects whether the account is currently usable

   Anything an IdP sends beyond this set is silently dropped — the
   IdP gets a 200 + the resource we actually persisted, which is
   the SCIM-conformant behaviour for partial implementations.
   --------------------------------------------------------------- */

import { USER_SCHEMA, type ScimUser } from './schemas'

export interface PlatformUserRow {
  id: string
  email: string
  name: string
  organizationId: string | null
  deletionScheduledAt: Date | null
  createdAt: Date
  updatedAt?: Date
  /** Bundle BQ — IdP's stable identifier, round-tripped to SCIM
   *  `externalId`. Null when the user wasn't SCIM-provisioned. */
  scimExternalId?: string | null
}

export function userToScim(
  user: PlatformUserRow,
  baseUrl: string,
): ScimUser {
  const parts = (user.name ?? '').trim().split(/\s+/)
  const givenName = parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0] || ''
  const familyName = parts.length > 1 ? parts[parts.length - 1] : ''

  return {
    schemas: [USER_SCHEMA],
    id: user.id,
    ...(user.scimExternalId ? { externalId: user.scimExternalId } : {}),
    userName: user.email,
    name: {
      givenName,
      familyName,
      formatted: user.name,
    },
    emails: [{ value: user.email, primary: true, type: 'work' }],
    active: user.deletionScheduledAt == null,
    meta: {
      resourceType: 'User',
      created: user.createdAt.toISOString(),
      lastModified: (user.updatedAt ?? user.createdAt).toISOString(),
      location: `${baseUrl}/Users/${user.id}`,
    },
  }
}

export interface ScimUserCreateInput {
  email: string
  name: string
  active: boolean
  externalId: string | null
}

/** Parse a SCIM POST body into the subset we persist. Throws when
 *  the resource is structurally invalid (caller surfaces 400). */
export function parseScimUserInput(body: unknown): ScimUserCreateInput {
  if (!body || typeof body !== 'object') {
    throw new Error('SCIM User: body must be a JSON object')
  }
  const b = body as Record<string, unknown>

  // userName is required (RFC 7643 §4.1.1)
  const userName = typeof b.userName === 'string' ? b.userName.trim() : ''
  if (!userName) throw new Error('SCIM User: userName is required')

  // Compute a sensible name: prefer formatted, then give+family, then userName local-part
  const nameObj = (b.name && typeof b.name === 'object') ? (b.name as Record<string, unknown>) : {}
  const formatted = typeof nameObj.formatted === 'string' ? nameObj.formatted : ''
  const given = typeof nameObj.givenName === 'string' ? nameObj.givenName : ''
  const family = typeof nameObj.familyName === 'string' ? nameObj.familyName : ''
  let resolvedName = formatted.trim() || `${given} ${family}`.trim()
  if (!resolvedName) {
    const at = userName.indexOf('@')
    resolvedName = at > 0 ? userName.slice(0, at) : userName
  }

  // emails[].primary → email; fall back to userName
  let email = userName
  if (Array.isArray(b.emails)) {
    const primary = b.emails.find((e: unknown) => {
      if (!e || typeof e !== 'object') return false
      const er = e as Record<string, unknown>
      return er.primary === true && typeof er.value === 'string' && er.value.length > 0
    }) as { value: string } | undefined
    if (primary) email = primary.value
    else {
      const first = b.emails.find((e: unknown) => {
        if (!e || typeof e !== 'object') return false
        const er = e as Record<string, unknown>
        return typeof er.value === 'string' && er.value.length > 0
      }) as { value: string } | undefined
      if (first) email = first.value
    }
  }

  const active = b.active === undefined ? true : Boolean(b.active)
  const externalId = typeof b.externalId === 'string' ? b.externalId : null

  return { email, name: resolvedName, active, externalId }
}
