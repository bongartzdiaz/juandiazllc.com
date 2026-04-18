'use client'

import { usePresence } from '@/hooks/useRealtime'

function getInitials(input?: string): string {
  if (!input) return '?'
  const trimmed = input.trim()
  if (!trimmed) return '?'
  if (trimmed.includes('@')) return trimmed[0].toUpperCase()
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Stable hash → hue so the same user keeps the same color everywhere
function hueFor(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360
  return h
}

export function PresenceIndicator({ max = 5, showCount = true }: { max?: number; showCount?: boolean }) {
  const users = usePresence()
  if (users.length === 0) return null

  const shown = users.slice(0, max)
  const more = users.length - shown.length

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ display: 'flex' }}>
        {shown.map((u, i) => {
          const hue = hueFor(u.userId)
          return (
            <div
              key={u.userId}
              title={`${u.name ?? 'User'}${u.path ? ` — on ${u.path}` : ''}`}
              style={{
                width: 24, height: 24, borderRadius: '50%',
                background: `hsl(${hue} 60% 55%)`,
                color: '#fff', fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid var(--panel)',
                marginLeft: i === 0 ? 0 : -6,
                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                position: 'relative',
                zIndex: shown.length - i,
              }}
            >
              {getInitials(u.name)}
              <span style={{
                position: 'absolute', bottom: -1, right: -1,
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--g)', border: '2px solid var(--panel)',
              }} />
            </div>
          )
        })}
        {more > 0 && (
          <div style={{
            width: 24, height: 24, borderRadius: '50%',
            background: 'var(--bg2)', color: 'var(--txt2)',
            fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--panel)', marginLeft: -6,
          }}>+{more}</div>
        )}
      </div>
      {showCount && (
        <span style={{ fontSize: 11, color: 'var(--txt3)', fontWeight: 600 }}>
          {users.length} online
        </span>
      )}
    </div>
  )
}

// Small live dot + count, for compact contexts
export function PresenceDot() {
  const users = usePresence()
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 8px', borderRadius: 999,
      background: 'var(--g-bg)', color: 'var(--g-txt)',
      fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--g)' }} />
      {users.length}
    </div>
  )
}

// Floating banner that announces inbound entity changes
export function LiveUpdateBanner({ message, onDismiss, onReload }: {
  message: string
  onDismiss: () => void
  onReload?: () => void
}) {
  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 100,
      padding: '10px 14px', borderRadius: 10,
      background: 'var(--accent)', color: '#fff',
      boxShadow: 'var(--shadow-lg)',
      display: 'flex', alignItems: 'center', gap: 10,
      fontSize: 12.5, fontWeight: 600,
      animation: 'scaleIn 0.25s cubic-bezier(0.16,1,0.3,1)',
    }}>
      <span>{message}</span>
      {onReload && (
        <button
          onClick={onReload}
          style={{
            padding: '4px 10px', borderRadius: 6, border: 'none',
            background: 'rgba(255,255,255,0.2)', color: '#fff',
            cursor: 'pointer', fontSize: 12, fontWeight: 700,
          }}
        >Refresh</button>
      )}
      <button
        onClick={onDismiss}
        style={{
          padding: 0, width: 20, height: 20, borderRadius: 5, border: 'none',
          background: 'transparent', color: '#fff', cursor: 'pointer',
          opacity: 0.7,
        }}
      >✕</button>
    </div>
  )
}
