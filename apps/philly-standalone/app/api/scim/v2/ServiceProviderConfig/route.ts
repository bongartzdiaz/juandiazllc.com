/* GET /api/scim/v2/ServiceProviderConfig
   ─────────────────────────────────────────────────────────────
   Discovery endpoint per RFC 7644 §4. IdPs hit this first to
   learn what we support. Anonymous (no auth) is permitted by the
   spec for this resource. */

import { NextRequest } from 'next/server'
import { scimJson } from '@/lib/philly/scim/schemas'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const baseUrl = `${url.origin}/api/scim/v2`
  return scimJson({
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
    documentationUri: 'https://datatracker.ietf.org/doc/html/rfc7644',
    patch: { supported: true },
    bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
    filter: { supported: true, maxResults: 200 },
    changePassword: { supported: false },
    sort: { supported: false },
    etag: { supported: false },
    authenticationSchemes: [
      {
        type: 'oauthbearertoken',
        name: 'OAuth Bearer Token',
        description:
          'Long-lived bearer token, issued via the admin Settings → API Keys page with the `scim:users` scope.',
        primary: true,
      },
    ],
    meta: {
      resourceType: 'ServiceProviderConfig',
      location: `${baseUrl}/ServiceProviderConfig`,
    },
  })
}
