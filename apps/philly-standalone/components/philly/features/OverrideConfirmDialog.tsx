/* OverrideConfirmDialog — modal that gathers the {state, reason} pair
   for a super-admin OrgFeatureOverride write.
   ──────────────────────────────────────────────────────────────────
   Mirrors the zod schema enforced at the route layer:
     - state ∈ { INHERIT, FORCED_ON, FORCED_OFF }
     - reason ∈ [10, 2000] chars (trimmed)

   The client-side validation is defensive UX (instant feedback before
   the round-trip); the route's zod is the SECURITY-level enforcement.
   Never rely on client validation alone. */

'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Modal, FormField } from '@/components/philly/ui/Modal'
import type { SuperAdminOverride } from '@/lib/philly/features/resolve'

export interface OverrideConfirmDialogProps {
  open: boolean
  onClose: () => void
  /** The feature being modified (display only — not editable in the dialog). */
  featureKey: string
  /** The current override state before this change. */
  currentState: SuperAdminOverride
  /**
   * Called when the user confirms. Returns a promise so the dialog can
   * show "saving…" state and keep the button disabled until the parent
   * resolves (success/error toast handled outside the dialog).
   */
  onConfirm: (input: { state: SuperAdminOverride; reason: string }) => Promise<void>
}

const MIN_REASON_LENGTH = 10
const MAX_REASON_LENGTH = 2000

const STATE_VALUES: SuperAdminOverride[] = ['INHERIT', 'FORCED_ON', 'FORCED_OFF']

const primaryBtn: React.CSSProperties = {
  background: 'var(--accent)',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '8px 16px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
}

const secondaryBtn: React.CSSProperties = {
  ...primaryBtn,
  background: 'var(--bg2)',
  color: 'var(--txt2)',
  border: '1px solid var(--border)',
}

export function OverrideConfirmDialog({
  open,
  onClose,
  featureKey,
  currentState,
  onConfirm,
}: OverrideConfirmDialogProps) {
  const t = useTranslations('adminFeatures.dialog')
  const tState = useTranslations('adminFeatures.state')

  const [state, setState] = useState<SuperAdminOverride>(currentState)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form whenever the dialog opens (otherwise stale state from
  // a previously-cancelled invocation lingers).
  useEffect(() => {
    if (open) {
      setState(currentState)
      setReason('')
      setError(null)
      setSaving(false)
    }
  }, [open, currentState])

  const trimmedReason = reason.trim()
  const reasonTooShort = trimmedReason.length < MIN_REASON_LENGTH
  const reasonTooLong = trimmedReason.length > MAX_REASON_LENGTH
  const stateUnchanged = state === currentState
  const canSubmit = !reasonTooShort && !reasonTooLong && !stateUnchanged && !saving

  async function handleSubmit() {
    if (!canSubmit) return
    setSaving(true)
    setError(null)
    try {
      await onConfirm({ state, reason: trimmedReason })
      // Parent closes the dialog on success.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t('title', { feature: featureKey })} size="md">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FormField label={t('newState')} required>
          <div
            role="radiogroup"
            aria-label={t('newState')}
            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            {STATE_VALUES.map(s => (
              <label
                key={s}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '10px 12px',
                  border: `1px solid ${state === s ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 8,
                  background: state === s ? 'var(--accent-bg)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background 100ms ease, border 100ms ease',
                }}
              >
                <input
                  type="radio"
                  name="override-state"
                  value={s}
                  checked={state === s}
                  onChange={() => setState(s)}
                  style={{ marginTop: 2 }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{tState(`${s}.label`)}</span>
                  <span style={{ color: 'var(--txt2)', fontSize: 12 }}>
                    {tState(`${s}.help`)}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </FormField>

        <FormField label={t('reason')} required>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder={t('reasonPlaceholder')}
            rows={3}
            maxLength={MAX_REASON_LENGTH + 100} /* allow paste then trim — UI shows the error */
            style={{
              width: '100%',
              padding: '10px 12px',
              border: `1px solid ${reasonTooShort && reason.length > 0 ? 'var(--r-border)' : 'var(--border)'}`,
              borderRadius: 8,
              fontSize: 13,
              fontFamily: 'inherit',
              resize: 'vertical',
              background: 'var(--panel)',
              color: 'var(--txt)',
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 6,
              fontSize: 11,
              color: 'var(--txt3)',
            }}
          >
            <span>{t('reasonHint')}</span>
            <span
              style={{
                color:
                  reasonTooShort || reasonTooLong
                    ? 'var(--r-txt)'
                    : 'var(--txt3)',
              }}
            >
              {trimmedReason.length} / {MAX_REASON_LENGTH}
            </span>
          </div>
        </FormField>

        {error && (
          <div
            role="alert"
            style={{
              background: 'var(--r-bg)',
              border: '1px solid var(--r-border)',
              color: 'var(--r-txt)',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 12,
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            marginTop: 8,
            paddingTop: 16,
            borderTop: '1px solid var(--border)',
          }}
        >
          <button type="button" onClick={onClose} style={secondaryBtn} disabled={saving}>
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            style={{
              ...primaryBtn,
              opacity: canSubmit ? 1 : 0.5,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
            }}
            disabled={!canSubmit}
          >
            {saving ? t('saving') : t('submit')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
