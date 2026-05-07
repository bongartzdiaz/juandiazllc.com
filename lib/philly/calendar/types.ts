/* Shared response types for calendar API surfaces.

   Two UIs back the same /api/calendar/connections endpoint:
     - app/philly/onboarding/calendar/page.tsx (the wizard)
     - app/philly/settings/integrations/page.tsx (the management page)

   Both used to declare their own `Connection` interface inline,
   which silently drifted (Bundle D2 added a `channel` field; only
   the integrations page picked it up). This module is the single
   source of truth — both UIs import from here.

   Server-side, these are the same shapes that the route handler
   (app/philly/api/calendar/connections/route.ts) emits via
   JSON.stringify, so the contract is end-to-end typed without a
   runtime validator (Zod is overkill for our own internal payloads). */

import type { ProviderKey } from './providers'

/** Public-safe shape of a CalendarConnection over the wire — never
 *  includes encrypted token bytes, only metadata. ISO strings for
 *  dates because JSON. */
export interface ConnectionDTO {
  id: string
  provider: ProviderKey
  providerEmail: string | null
  status: string
  scopes: string[]
  connectedAt: string
  lastUsedAt: string | null
  lastError: string | null
  /** Push-sync state (Bundle D / D2). Null when no active channel
   *  exists for this connection (provider rejected `watch`, channel
   *  expired without renewal, etc.). */
  channel: ChannelDTO | null
}

/** Public-safe shape of a CalendarChannel over the wire. */
export interface ChannelDTO {
  id: string
  status: string
  expiresAt: string
  lastRenewedAt: string | null
}

/** Wire envelope for `GET /api/calendar/connections`. */
export interface ConnectionsResponse {
  data: ConnectionDTO[]
}
