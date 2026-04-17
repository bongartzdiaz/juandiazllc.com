'use client'

import { useState, createContext, useContext, useCallback, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { SessionProvider, useSession } from 'next-auth/react'
import { IndustryProvider } from '@/hooks/useIndustry'
import { ToastProvider } from '@/hooks/useToast'
import { ToastContainer } from '@/components/ui/Toast'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { OfflineBanner } from '@/components/ui/OfflineBanner'

// Mobile menu context so Topbar can toggle the sidebar
const MobileMenuCtx = createContext<{ open: boolean; toggle: () => void }>({ open: false, toggle: () => {} })
export const useMobileMenu = () => useContext(MobileMenuCtx)

// Routes that bypass the auth shell (no sidebar, no session requirement)
const PUBLIC_PATHS = ['/login']

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <IndustryProvider>
        <ToastProvider>
          <AuthShell>{children}</AuthShell>
          <ToastContainer />
        </ToastProvider>
      </IndustryProvider>
    </SessionProvider>
  )
}

function AuthShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname?.startsWith(`${p}/`))

  // Public routes (login) render bare, no sidebar or session check
  if (isPublic) {
    return <>{children}</>
  }

  return <ProtectedShell>{children}</ProtectedShell>
}

function ProtectedShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { status } = useSession()
  const [mobileOpen, setMobileOpen] = useState(false)
  const toggle = useCallback(() => setMobileOpen(v => !v), [])

  // Auth enforcement. Dev-only escape hatch: set NEXT_PUBLIC_BYPASS_AUTH=1 in .env.local.
  // In production this flag has no effect — auth is always enforced.
  const bypassAuth =
    process.env.NODE_ENV !== 'production' &&
    process.env.NEXT_PUBLIC_BYPASS_AUTH === '1'

  useEffect(() => {
    if (!bypassAuth && status === 'unauthenticated') {
      const callback = encodeURIComponent(pathname || '/')
      router.replace(`/login?callbackUrl=${callback}`)
    }
  }, [bypassAuth, status, router, pathname])

  // Show spinner only while session is loading (not when unauthenticated)
  if (status === 'loading') {
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
        {/* Desktop sidebar */}
        <div className="sidebar-desktop">
          <Sidebar />
        </div>

        {/* Mobile overlay + sidebar */}
        {mobileOpen && (
          <>
            <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
            <div className="sidebar-mobile">
              <Sidebar onNavigate={() => setMobileOpen(false)} />
            </div>
          </>
        )}

        <main className="main-content" style={{ marginLeft: 240, flex: 1, display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>

        <CommandPalette />
        <OfflineBanner />
        <MobileNav />
      </div>
    </MobileMenuCtx.Provider>
  )
}
