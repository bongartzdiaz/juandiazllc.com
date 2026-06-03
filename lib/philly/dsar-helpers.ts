/* ---------------------------------------------------------------
   Thin re-export so route handlers don't need to know about the
   DsarScope type. Keeps the route file lean.
   --------------------------------------------------------------- */

import type { DsarScope } from './dsar'

export { buildDsarArchive } from './dsar'
export type { DsarScope, DsarArchive, DsarManifest } from './dsar'

/** Parses the ?scope= query param. Defaults to 'user' on anything weird. */
export function dsarScopeFromQuery(raw: string | null): DsarScope {
  return raw === 'org' ? 'org' : 'user'
}
