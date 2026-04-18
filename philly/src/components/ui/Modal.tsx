'use client'

import { useEffect, useCallback, useId, useRef } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

const sizes = { sm: 440, md: 580, lg: 720 }

export function Modal({ open, onClose, title, subtitle, size = 'md', children }: ModalProps) {
  const titleId = useId()
  const subtitleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
      return
    }
    // Focus trap on Tab
    if (e.key === 'Tab' && dialogRef.current) {
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }, [onClose])

  useEffect(() => {
    if (open) {
      previouslyFocused.current = document.activeElement as HTMLElement | null
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
      // Move focus into the dialog on open
      const t = setTimeout(() => {
        const first = dialogRef.current?.querySelector<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )
        first?.focus()
      }, 30)
      return () => {
        clearTimeout(t)
        document.removeEventListener('keydown', handleKeyDown)
        document.body.style.overflow = ''
        previouslyFocused.current?.focus?.()
      }
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, handleKeyDown])

  if (!open) return null

  return (
    <div
      onClick={onClose}
      role="presentation"
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: sizes[size],
          maxHeight: 'calc(100vh - 48px)',
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 14, boxShadow: 'var(--shadow-md)',
          display: 'flex', flexDirection: 'column',
          animation: 'scaleIn 0.2s cubic-bezier(0.16,1,0.3,1)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <div>
            <div id={titleId} style={{ fontSize: 16, fontWeight: 600 }}>{title}</div>
            {subtitle && <div id={subtitleId} style={{ fontSize: 11.5, color: 'var(--txt3)', marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button
            onClick={onClose}
            type="button"
            aria-label="Close dialog"
            style={{
              width: 28, height: 28, borderRadius: 7,
              background: 'var(--bg2)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--txt3)',
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// Form field helper
export function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: 'block', fontSize: 12, fontWeight: 600,
        color: 'var(--txt2)', marginBottom: 5,
      }}>
        {label} {required && <span style={{ color: 'var(--r)' }}>*</span>}
      </label>
      {children}
    </div>
  )
}
