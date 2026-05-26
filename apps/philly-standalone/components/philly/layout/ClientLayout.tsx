'use client'

import { useState, createContext, useContext, useCallback, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Session } from '@supabase/supabase-js'
import { SWRConfig } from 'swr'
import { IndustryProvider } from '@/hooks/philly/useIndustry'
import { ToastProvider } from '@/hooks/philly/useToast'
import { ToastContainer } from '@/components/philly/ui/Toast'
import { ConfirmProvider } from '@/hooks/philly/useConfirm'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { SectionGuard } from './SectionGuard'
import { CommandPalette } from '@/components/philly/ui/CommandPalette'
import { KeyboardShortcuts } from '@/components/philly/ui/KeyboardShortcuts'
import { OfflineBanner } from '@/components/philly/ui/OfflineBanner'
import { OrgIndustrySync } from './OrgIndustrySync'

// Mobile menu context so Topbar can toggle the sidebar
const MobileMenuCtx = createContext<{ open: boolean; toggle: () => void }>({ open: false, toggle: () => {} })
export const useMobileMenu = () => useContext(MobileMenuCtx)

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    // SWR sits at the root so every useApi() call under /philly shares
    // one cache — navigation between pages reads from cache first,
    // then revalidates in the background. dedupingInterval 2s collapses
    // simultaneous identical requests (common when multiple widgets ask
    // for the same entity in the same render).
    <SWRConfig
      value={{
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        dedupingInterval: 2000,
        errorRetryCount: 2,
        errorRetryInterval: 3000,
        keepPreviousData: true,
        shouldRetryOnError: (err) => {
          // Don't hammer the server on 4xx — those are client errors
          // (auth, validation, not-found) that a retry won't fix.
          const msg = err instanceof Error ? err.message : ''
          return !/^4\d\d\b/.test(msg)
        },
      }}
    >
      <IndustryProvider>
        <ToastProvider>
          <ConfirmProvider>
            <ProtectedShell>{children}</ProtectedShell>
            <ToastContainer />
          </ConfirmProvider>
        </ToastProvider>
      </IndustryProvider>
    </SWRConfig>
  )
}

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

function ProtectedShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [mobileOpen, setMobileOpen] = useState(false)
  const toggle = useCallback(() => setMobileOpen(v => !v), [])

  // Dev-only escape hatch: NEXT_PUBLIC_BYPASS_AUTH=1 in .env.local
  const bypassAuth =
    process.env.NODE_ENV !== 'production' &&
    process.env.NEXT_PUBLIC_BYPASS_AUTH === '1'

  useEffect(() => {
    if (bypassAuth) {
      setStatus('authenticated')
      return
    }

    const supabase = createClient()

    let mounted = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setStatus(session ? 'authenticated' : 'unauthenticated')
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
      setStatus(session ? 'authenticated' : 'unauthenticated')
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [bypassAuth])

  // Unauthenticated → send to brand Supabase login, bring user back afterwards.
  useEffect(() => {
    if (status !== 'unauthenticated') return
    const next = encodeURIComponent(pathname || '/')
    router.replace(`/login?next=${next}`)
  }, [status, router, pathname])

  if (status !== 'authenticated') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', width: '100%',
      }}>
        <div style={{
          width: 28, height: 28,
          border: '3px solid var(--border)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 0.6s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <MobileMenuCtx.Provider value={{ open: mobileOpen, toggle }}>
      <div style={{ display: 'flex', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        <div className="sidebar-desktop">
          <Sidebar />
        </div>

        {mobileOpen && (
          <>
            <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
            <div className="sidebar-mobile">
              <Sidebar onNavigate={() => setMobileOpen(false)} />
            </div>
          </>
        )}

        <main className="main-content" style={{ marginLeft: 240, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <SectionGuard>{children}</SectionGuard>
        </main>

        <CommandPalette />
        <KeyboardShortcuts />
        <OrgIndustrySync />
        <OfflineBanner />
        <MobileNav />
      </div>
    </MobileMenuCtx.Provider>
  )
}
