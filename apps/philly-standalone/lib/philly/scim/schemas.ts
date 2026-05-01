/* ---------------------------------------------------------------
   SCIM 2.0 — JSON shapes (RFC 7643 + RFC 7644)
   ---------------------------------------------------------------
   We implement the minimum subset that lets every common IdP (Okta,
   Entra ID, Google Workspace, Auth0) provision + de-provision users
   into the platform:

     - User Resource           — RFC 7643 §4.1
     - ListResponse            — RFC 7644 §3.4.2
     - PATCH operations        — RFC 7644 §3.5.2
     - Error                   — RFC 7644 §3.12

   The JSON is structured to match what those IdPs send/expect. We
   deliberately include only the attributes that map to fields we
   already store; anything else is silently ignored on POST/PATCH
   so an IdP shipping (say) `phoneNumbers` doesn't break.

   Group provisioning is intentionally out of scope for this bundle.
   The Membership table already represents per-org role assignment
   from Bundle G; mapping IdP-Groups onto Memberships requires a
   declarative IdP-group → role/sections map, which is the next
   iteration's work.
   --------------------------------------------------------------- */

import { NextResponse } from 'next/server'

export const USER_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:User'
export const GROUP_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:Group'
export const LIST_RESPONSE_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:ListResponse'
export const ERROR_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:Error'
export const PATCH_OP_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:PatchOp'

export interface ScimUser {
  schemas: string[]
  id: string
  externalId?: string
  userName: string
  name: { givenName?: string; familyName?: string; formatted?: string }
  emails: Array<{ value: string; primary?: boolean; type?: string }>
  active: boolean
  /** RFC 7643 §4.1.2 — usually "User" */
  meta: {
    resourceType: 'User'
    created: string
    lastModified: string
    location: string
    version?: string
  }
}

/* ── Group resource (RFC 7643 §4.2) ─────────────────────────── */

export interface ScimGroupMember {
  /** Platform User id (matches ScimUser.id). */
  value: string
  /** Optional URL the IdP uses to fetch the user. */
  $ref?: string
  /** Optional human label (the user's email or display name). */
  display?: string
  /** Always "User" for now (no nested Group memberships). */
  type?: 'User'
}

export interface ScimGroup {
  schemas: string[]
  id: string
  externalId?: string
  displayName: string
  members: ScimGroupMember[]
  meta: {
    resourceType: 'Group'
    created: string
    lastModified: string
    location: string
    version?: string
  }
}

export interface ScimListResponse<T> {
  schemas: [typeof LIST_RESPONSE_SCHEMA]
  totalResults: number
  startIndex: number
  itemsPerPage: number
  Resources: T[]
}

export interface ScimErrorBody {
  schemas: [typeof ERROR_SCHEMA]
  status: string
  detail: string
  scimType?: 'invalidValue' | 'invalidFilter' | 'tooMany' | 'uniqueness' | 'mutability' | 'invalidSyntax'
}

export function scimError(
  status: number,
  detail: string,
  scimType?: ScimErrorBody['scimType'],
): NextResponse {
  const body: ScimErrorBody = {
    schemas: [ERROR_SCHEMA],
    status: String(status),
    detail,
    ...(scimType ? { scimType } : {}),
  }
  return NextResponse.json(body, {
    status,
    headers: { 'Content-Type': 'application/scim+json' },
  })
}

export function scimJson<T>(body: T, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { 'Content-Type': 'application/scim+json' },
  })
}

/* ── PATCH operations (RFC 7644 §3.5.2) ─────────────────────── */

export interface PatchOperation {
  op: 'add' | 'remove' | 'replace'
  path?: string
  value?: unknown
}

export interface PatchRequest {
  schemas: [typeof PATCH_OP_SCHEMA]
  Operations: PatchOperation[]
}

export function isValidPatchRequest(body: unknown): body is PatchRequest {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  if (!Array.isArray(b.schemas) || !b.schemas.includes(PATCH_OP_SCHEMA)) return false
  if (!Array.isArray(b.Operations)) return false
  return b.Operations.every((op: unknown) => {
    if (!op || typeof op !== 'object') return false
    const o = op as Record<string, unknown>
    return o.op === 'add' || o.op === 'remove' || o.op === 'replace'
  })
}
