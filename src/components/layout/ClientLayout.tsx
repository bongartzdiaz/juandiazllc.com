'use client'

import { IndustryProvider } from '@/hooks/useIndustry'
import { ToastProvider } from '@/hooks/useToast'
import { ToastContainer } from '@/components/ui/Toast'
import { Sidebar } from './Sidebar'

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <IndustryProvider>
      <ToastProvider>
        <div style={{ display: 'flex', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
          <Sidebar />
          <main style={{ marginLeft: 240, flex: 1, display: 'flex', flexDirection: 'column' }}>
            {children}
          </main>
        </div>
        <ToastContainer />
      </ToastProvider>
    </IndustryProvider>
  )
}
