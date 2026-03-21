'use client'

import { useToast } from '@/hooks/useToast'
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react'

const typeConfig = {
  success: { icon: CheckCircle2, color: 'var(--g)', bg: 'var(--g-bg)', border: 'var(--g-border)', txt: 'var(--g-txt)' },
  error: { icon: XCircle, color: 'var(--r)', bg: 'var(--r-bg)', border: 'var(--r-border)', txt: 'var(--r-txt)' },
  info: { icon: Info, color: 'var(--accent)', bg: 'var(--accent-bg)', border: 'var(--accent-border)', txt: 'var(--accent-txt)' },
  warning: { icon: AlertTriangle, color: 'var(--y)', bg: 'var(--y-bg)', border: 'var(--y-border)', txt: 'var(--y-txt)' },
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div style={{
      position: 'fixed', top: 16, right: 16, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8,
      maxWidth: 380,
    }}>
      {toasts.map(toast => {
        const cfg = typeConfig[toast.type]
        const Icon = cfg.icon
        return (
          <div
            key={toast.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 14px', borderRadius: 10,
              background: 'var(--panel)', border: `1px solid ${cfg.border}`,
              boxShadow: 'var(--shadow-md)',
              animation: 'slideInRight 0.3s cubic-bezier(0.16,1,0.3,1)',
              borderLeft: `3px solid ${cfg.color}`,
            }}
          >
            <Icon size={16} color={cfg.color} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 13, flex: 1, color: 'var(--txt)' }}>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 2, display: 'flex', color: 'var(--txt3)',
              }}
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
