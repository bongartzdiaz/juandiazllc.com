/* ---------------------------------------------------------------
   SCIM 2.0 — minimal filter parser
   ---------------------------------------------------------------
   IdPs query SCIM with filter expressions per RFC 7644 §3.4.2.2:

     userName eq "alice@example.com"
     externalId eq "okta-00u4abc123"
     userName eq "alice@example.com" and active eq true

   We support exactly the expressions IdPs use in practice for User
   provisioning workflows: `userName eq <str>`, `externalId eq <str>`,
   `active eq <bool>` and AND combinations. Anything else returns
   null and the caller responds with a 400/invalidFilter, which
   forces the IdP onto a known-supported path.

   externalId support added in Bundle BQ — Okta + Azure AD both use
   this for de-provisioning by stable identifier instead of email.
   --------------------------------------------------------------- */

export interface ParsedFilter {
  userName?: string
  externalId?: string
  active?: boolean
}

export function parseScimFilter(raw: string | null | undefined): ParsedFilter | null {
  if (!raw) return {}
  const filter = raw.trim()
  if (!filter) return {}

  // Split on " and " (case-insensitive); RFC says case-insensitive operators.
  const parts = filter.split(/\s+and\s+/i)
  const out: ParsedFilter = {}

  for (const part of parts) {
    const m = part.trim().match(/^(\w+)\s+eq\s+(?:"([^"]*)"|(true|false))$/i)
    if (!m) return null
    const attr = m[1].toLowerCase()
    const stringVal = m[2]
    const boolVal = m[3]
    if (attr === 'username') {
      if (stringVal === undefined) return null
      if (out.userName !== undefined) return null
      out.userName = stringVal
    } else if (attr === 'externalid') {
      if (stringVal === undefined) return null
      if (out.externalId !== undefined) return null
      out.externalId = stringVal
    } else if (attr === 'active') {
      if (boolVal === undefined) return null
      if (out.active !== undefined) return null
      out.active = boolVal.toLowerCase() === 'true'
    } else {
      // Unknown attribute — refuse rather than silently drop.
      return null
    }
  }
  return out
}
