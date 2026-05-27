/* DripEnrollmentsTab — drip campaign enrollments for the Klant Master Profile.
   ──────────────────────────────────────────────────────────────────
   Lists every campaign this contact is in (active/paused/done/cancelled)
   with their current step progress + next-due time. Read-only — operators
   manage enrollments from the Drip Campaigns page; this is a per-contact
   reflection. */

'use client'

import { useTranslations } from 'next-intl'
import { useApi } from '@/hooks/philly/useApi'
import { Send, Clock, CheckCircle2, PauseCircle, XCircle } from 'lucide-react'

export interface DripEnrollment {
  id: string
  campaignId: string
  campaignName: string
  status: 'active' | 'paused' | 'done' | 'cancelled' | string
  lastStepIndex: number
  totalSteps: number
  nextDueAt: string | null
  lastDeliveredAt: string | null
  enrolledAt: string
}

interface Props {
  contactId: string
}

const STATUS_STYLES: Record<string, { bg: string; txt: string; icon: typeof Send }> = {
  active:    { bg: 'var(--g-bg)',  txt: 'var(--g-txt)',  icon: Send },
  paused:    { bg: 'var(--y-bg)',  txt: 'var(--y-txt)',  icon: PauseCircle },
  done:      { bg: 'var(--b-bg)',  txt: 'var(--b-txt)',  icon: CheckCircle2 },
  cancelled: { bg: 'var(--r-bg)',  txt: 'var(--r-txt)',  icon: XCircle },
}

function formatRelative(iso: string | null, neverLabel: string): string {
  if (!iso) return neverLabel
  const date = new Date(iso)
  const diffMs = date.getTime() - Date.now()
  const absMs = Math.abs(diffMs)
  const dayMs = 86_400_000
  if (absMs < dayMs) {
    const hours = Math.round(absMs / 3_600_000)
    return diffMs >= 0 ? `in ${hours}h` : `${hours}h ago`
  }
  const days = Math.round(absMs / dayMs)
  return diffMs >= 0 ? `in ${days}d` : `${days}d ago`
}

export function DripEnrollmentsTab({ contactId }: Props) {
  const t = useTranslations('contacts.masterProfile.drip')
  const query = useApi<{ data: DripEnrollment[] }>(`/contacts/${contactId}/drip-enrollments`)
  const enrollments = query.data?.data ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Send size={18} color="var(--accent)" />
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{t('heading')}</h2>
      </div>

      {query.loading ? (
        <div style={{ padding: 24, color: 'var(--txt3)', fontSize: 13 }}>Loading…</div>
      ) : enrollments.length === 0 ? (
        <div style={{
          padding: 32, textAlign: 'center', color: 'var(--txt3)',
          background: 'var(--bg2)', borderRadius: 8, border: '1px dashed var(--border)',
        }}>{t('noEnrollments')}</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {enrollments.map(e => {
            const styles = STATUS_STYLES[e.status] ?? STATUS_STYLES.active
            const Icon = styles.icon
            // lastStepIndex is the LAST delivered step (-1 means nothing yet);
            // "current" for display is lastStepIndex + 1 capped at totalSteps.
            const currentStep = Math.min(Math.max(e.lastStepIndex + 1, 0), e.totalSteps)
            const statusLabel = t(`status.${e.status as 'active'}`)
            return (
              <div key={e.id} style={{
                display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12,
                alignItems: 'center',
                background: 'var(--panel)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '12px 14px',
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{e.campaignName}</div>
                  <div style={{ fontSize: 12, color: 'var(--txt3)', marginTop: 2 }}>
                    {t('stepProgress', { current: currentStep, total: e.totalSteps })}
                  </div>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--txt3)', textAlign: 'right' }}>
                  {e.status === 'active' && e.nextDueAt && (
                    <div>{t('nextDue', { when: formatRelative(e.nextDueAt, '—') })}</div>
                  )}
                  <div>
                    {e.lastDeliveredAt
                      ? t('lastSent', { when: formatRelative(e.lastDeliveredAt, '—') })
                      : t('neverSent')}
                  </div>
                </div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: styles.bg, color: styles.txt,
                  padding: '4px 10px', borderRadius: 999,
                  fontSize: 11, fontWeight: 600,
                }}>
                  <Icon size={12} /> {statusLabel}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
