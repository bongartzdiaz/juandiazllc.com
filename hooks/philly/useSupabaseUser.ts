'use client'

/* ---------------------------------------------------------------
   useSupabaseUser — read Supabase session on the client.

   Returns a shape compatible with NextAuth's session.user so the
   existing Sidebar/Topbar JSX (which referenced session?.user?.name,
   email, role) keeps working without edits. The `role` field is not
   yet sourced from Supabase app metadata — viewer is safe default,
   API routes re-resolve role server-side from the Philly User row.
   --------------------------------------------------------------- */

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type PhillySessionUser = {
  id: string
  email: string | null
  name: string | null
  role: string
}

export type PhillySession = {
  user: PhillySessionUser
} | null

export function useSupabaseUser(): PhillySession {
  const [session, setSession] = useState<PhillySession>(null)

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!mounted || !user) return
      setSession({
        user: {
          id: user.id,
          email: user.email ?? null,
          name:
            (user.user_metadata?.full_name as string | undefined) ??
            (user.user_metadata?.name as string | undefined) ??
            user.email?.split('@')[0] ??
            null,
          role: (user.app_metadata?.role as string | undefined) ?? 'viewer',
        },
      })
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!newSession?.user) {
        setSession(null)
        return
      }
      setSession({
        user: {
          id: newSession.user.id,
          email: newSession.user.email ?? null,
          name:
            (newSession.user.user_metadata?.full_name as string | undefined) ??
            (newSession.user.user_metadata?.name as string | undefined) ??
            newSession.user.email?.split('@')[0] ??
            null,
          role: (newSession.user.app_metadata?.role as string | undefined) ?? 'viewer',
        },
      })
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return session
}
