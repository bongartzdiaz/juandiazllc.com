'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  children: React.ReactNode
}

export function AuthGuard({ children }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'ok' | 'redirect'>('loading')

  useEffect(() => {
    try {
      const raw = localStorage.getItem('pai-auth')
      if (raw) {
        const auth = JSON.parse(raw)
        if (auth && auth.email) {
          setStatus('ok')
          return
        }
      }
    } catch {
      // invalid JSON — treat as not authenticated
    }
    setStatus('redirect')
    router.push('/login')
  }, [router])

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

  if (status === 'redirect') return null

  return <>{children}</>
}
