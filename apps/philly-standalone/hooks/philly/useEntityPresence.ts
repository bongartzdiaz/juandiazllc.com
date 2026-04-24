'use client'

/* ---------------------------------------------------------------
   useEntityPresence — filters the org-wide presence feed down to
   users who are currently viewing a specific entity detail page.

   Built on top of the existing usePresence() hook + PresenceTracker
   (which already stamps each entry with the user's `path`). No
   server changes required — the `path` field is already part of
   every heartbeat the SSE route emits.

   Usage:
     const others = useEntityPresence('/deals/abc123')
     // others is excluding the current user, refreshes live
   --------------------------------------------------------------- */

import { useMemo } from 'react'
import { useApi } from './useApi'
import { usePresence, type PresenceUser } from './useRealtime'

type MeEnvelope = { data: { id: string } }

export function useEntityPresence(pathPrefix: string): PresenceUser[] {
  const all = usePresence()
  const { data } = useApi<MeEnvelope>('/me', { interval: 5 * 60_000 })
  const myId = data?.data?.id ?? null

  return useMemo(() => {
    if (!pathPrefix) return []
    const normalized = pathPrefix.replace(/\/+$/, '')
    return all.filter((u) => {
      if (myId && u.userId === myId) return false
      if (!u.path) return false
      return u.path === normalized || u.path.startsWith(normalized + '/')
    })
  }, [all, myId, pathPrefix])
}
