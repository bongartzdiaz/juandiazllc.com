'use client'

import { useOffline, useServiceWorker } from '@/hooks/useOffline'
import { WifiOff } from 'lucide-react'

export function OfflineBanner() {
  useServiceWorker()
  const { isOffline } = useOffline()
  if (!isOffline) return null

  return (
    <div style={{
      position: 'fixed', bottom: 16, left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      padding: '8px 14px', borderRadius: 999,
      background: 'var(--r-bg)', border: '1px solid var(--r-border)',
      color: 'var(--r-txt)', fontSize: 12, fontWeight: 600,
      display: 'flex', alignItems: 'center', gap: 8,
      boxShadow: 'var(--shadow-md)',
    }}>
      <WifiOff size={13} />
      You are offline — changes will retry when reconnected
    </div>
  )
}
