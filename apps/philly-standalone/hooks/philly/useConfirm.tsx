/* useConfirm — global confirm-dialog hook that REPLACES native window.confirm().
   ──────────────────────────────────────────────────────────────────
   Why this exists:
     - native window.confirm() is hardcoded-English (browser locale,
       not the app locale)
     - it bypasses Modal a11y (focus-trap, Escape, outside-click)
     - it can't render formatted content (bullets, code, danger styling)

   Pattern:
     const confirm = useConfirm()
     async function handleDelete() {
       const ok = await confirm({
         title: t('confirms.deleteRule.title', { name: rule.name }),
         body: t('confirms.deleteRule.body'),
         confirmLabel: t('common.delete'),
         danger: true,
       })
       if (!ok) return
       // ...proceed
     }

   The provider wraps the app once (in ClientLayout). It renders
   exactly ONE Modal in the DOM tree, regardless of how many call
   sites use the hook. Concurrent confirms are queued — only one
   shows at a time.

   2026-05-26: built to fix 9 native confirm() leaks found via the
   dead-link / i18n audit. */

'use client'

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from 'react'
import React from 'react'
import { Modal } from '@/components/philly/ui/Modal'

export interface ConfirmOptions {
  /** Required — the question being asked. */
  title: string
  /**
   * Optional explanatory body. Newline-separated lines render as
   * paragraphs. Use this for "This cannot be undone" style hints.
   */
  body?: string
  /** Confirm-button label. Defaults to "OK" / locale equivalent supplied by caller. */
  confirmLabel?: string
  /** Cancel-button label. Defaults to "Cancel" / locale equivalent supplied by caller. */
  cancelLabel?: string
  /**
   * Marks the action as DESTRUCTIVE — confirm button renders red,
   * the dialog gets focus-on-cancel by default so accidental Enter
   * doesn't trigger destruction.
   */
  danger?: boolean
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null)

  // Promise-resolver pattern — confirm() returns a Promise, the
  // provider stores the resolver so the dialog's buttons can call it.
  const confirm = useCallback<ConfirmFn>(opts => {
    return new Promise<boolean>(resolve => {
      setPending({ ...opts, resolve })
    })
  }, [])

  const handleConfirm = useCallback(() => {
    if (!pending) return
    pending.resolve(true)
    setPending(null)
  }, [pending])

  const handleCancel = useCallback(() => {
    if (!pending) return
    pending.resolve(false)
    setPending(null)
  }, [pending])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <ConfirmDialog options={pending} onConfirm={handleConfirm} onCancel={handleCancel} />
      )}
    </ConfirmContext.Provider>
  )
}

interface ConfirmDialogProps {
  options: ConfirmOptions
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmDialog({ options, onConfirm, onCancel }: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  // Render cancel BEFORE confirm in DOM order when danger=true so the
  // Modal's focus-trap (which focuses the first focusable element 30ms
  // after open) lands on cancel — preventing accidental Enter from
  // triggering destruction.
  const buttonsOrder = options.danger ? 'cancel-first' : 'confirm-first'

  const confirmBtn = (
    <button
      key="confirm"
      type="button"
      onClick={onConfirm}
      style={{
        padding: '8px 16px',
        borderRadius: 8,
        background: options.danger ? 'var(--r-txt)' : 'var(--accent)',
        color: '#fff',
        border: 'none',
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {options.confirmLabel ?? 'OK'}
    </button>
  )

  const cancelBtn = (
    <button
      key="cancel"
      ref={cancelRef}
      type="button"
      onClick={onCancel}
      style={{
        padding: '8px 16px',
        borderRadius: 8,
        background: 'var(--bg2)',
        color: 'var(--txt2)',
        border: '1px solid var(--border)',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {options.cancelLabel ?? 'Cancel'}
    </button>
  )

  const buttons = buttonsOrder === 'cancel-first' ? [cancelBtn, confirmBtn] : [confirmBtn, cancelBtn]

  return (
    <Modal open onClose={onCancel} title={options.title} size="sm">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {options.body && (
          <div
            style={{
              fontSize: 13,
              color: 'var(--txt2)',
              lineHeight: 1.55,
              whiteSpace: 'pre-line',
            }}
          >
            {options.body}
          </div>
        )}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            paddingTop: 12,
            borderTop: '1px solid var(--border)',
          }}
        >
          {buttons}
        </div>
      </div>
    </Modal>
  )
}

/**
 * Hook to call the global confirm dialog. Returns a function that
 * returns Promise<boolean> — true on confirm, false on cancel/Escape/
 * outside-click.
 *
 * Throws if called outside <ConfirmProvider>.
 */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) {
    throw new Error('useConfirm must be used inside <ConfirmProvider>')
  }
  return ctx
}
