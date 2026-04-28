/* GET /api/scim/v2/ResourceTypes
   ─────────────────────────────────────────────────────────────
   Lists the SCIM resource types we expose. Today: User only.
   Group will be added when IdP-group → role mapping ships. */

import { NextRequest } from 'next/server'
import { scimJson, LIST_RESPONSE_SCHEMA, USER_SCHEMA } from '@/lib/philly/scim/schemas'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const baseUrl = `${url.origin}/api/scim/v2`
  const resources = [
    {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'],
      id: 'User',
      name: 'User',
      endpoint: '/Users',
      description: 'Platform users — CRM operators',
      schema: USER_SCHEMA,
      meta: {
        resourceType: 'ResourceType',
        location: `${baseUrl}/ResourceTypes/User`,
      },
    },
  ]
  return scimJson({
    schemas: [LIST_RESPONSE_SCHEMA],
    totalResults: resources.length,
    startIndex: 1,
    itemsPerPage: resources.length,
    Resources: resources,
  })
}
