'use client'

import { useState, createContext, useContext, useCallback } from 'react'
import { IndustryProvider } from '@/hooks/phily/useIndustry'
import { ToastProvider } from '@/hooks/phily/useToast'
import { ToastContainer } from '@/components/phily/ui/Toast'
import { Sidebar } from './Sidebar'

// Mobile menu context so Topbar can toggle the sidebar
const MobileMenuCtx = createContext<{ open: boolean; toggle: () => void }>({ open: false, toggle: () => {} })
export const useMobileMenu = () => useContext(MobileMenuCtx)

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const toggle = useCallback(() => setMobileOpen(v => !v), [])

  return (
    <IndustryProvider>
      <ToastProvider>
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
          </div>
          <ToastContainer />
        </MobileMenuCtx.Provider>
      </ToastProvider>
    </IndustryProvider>
  )
}
