'use client'

import { AlertTriangle } from 'lucide-react'

interface Props {
  errors: string[]
}

export function ApiErrorBanner({ errors }: Props) {
  if (errors.length === 0) return null

  return (
    <div style={{
      background: 'var(--r-bg)',
      border: '1px solid var(--r-border)',
      borderRadius: 10,
      padding: '10px 14px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
      marginBottom: 16,
    }}>
      <AlertTriangle size={16} style={{ color: 'var(--r-txt)', flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--r-txt)' }}>
          API niet bereikbaar
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--txt2)', marginTop: 2 }}>
          {errors.join(' · ')}
        </div>
      </div>
    </div>
  )
}
