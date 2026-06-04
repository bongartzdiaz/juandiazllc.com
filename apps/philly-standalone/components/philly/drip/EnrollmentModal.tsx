'use client'

import { useState, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Modal } from '@/components/philly/ui/Modal'
import { useApi } from '@/hooks/philly/useApi'
import { useConfirm } from '@/hooks/philly/useConfirm'
import { useToast } from '@/hooks/philly/useToast'
import { useDebouncedValue } from '@/hooks/philly/useDebouncedValue'
import { Search, X, UserMinus, AlertCircle, Clock, CheckCircle2, Pause } from 'lucide-react'

/* Bundle CA — operator UI for enrolling / unenrolling contacts in
   a single drip campaign. Pairs with the API in
   app/api/drip-campaigns/[id]/enroll/route.ts and the cron
   dispatcher at app/api/cron/drip-dispatch/route.ts. */

interface EnrollmentRow {
  id: string
  contactId: string
  status: 'active' | 'paused' | 'done' | 'cancelled'
  lastStepIndex: number
  nextDueAt: string | null
  lastDeliveredAt: string | null
  lastError: string | null
  attemptCount: number
  createdAt: string
  // Bundle CG — server returns the joined contact so the modal
  // doesn't need a separate /api/contacts pre-fetch.
  contact?: { name: string; company: string } | null
}

interface ContactOption {
  id: string
  firstName?: string
  lastName?: string
  name?: string
  email?: string
}

interface Props {
  campaignId: string | null
  campaignName: string
  totalSteps: number
  onClose: () => void
  /** Called after a successful enrollment / unenrollment so the parent
   *  can refetch its campaign list (the enrolledCount column shifts). */
  onChanged?: () => void
}

// Bundle CL — labels resolved at use-site via t('status.<key>') so the
// chip respects the active locale. Style + icon stay static.
const STATUS_STYLE: Record<EnrollmentRow['status'], { bg: string; txt: string; Icon: typeof Clock }> = {
  active:    { bg: 'var(--g-bg)',      txt: 'var(--g-txt)',      Icon: Clock },
  paused:    { bg: 'var(--y-bg)',      txt: 'var(--y-txt)',      Icon: Pause },
  done:      { bg: 'var(--accent-bg)', txt: 'var(--accent-txt)', Icon: CheckCircle2 },
  cancelled: { bg: 'var(--r-bg)',      txt: 'var(--r-txt)',      Icon: X },
}

function fmtRelative(iso: string | null): string {
  if (!iso) return '—'
  const ms = new Date(iso).getTime() - Date.now()
  const abs = Math.abs(ms)
  const min = Math.round(abs / 60000)
  if (min < 1) return ms > 0 ? 'now' : 'just now'
  if (min < 60) return ms > 0 ? `in ${min}m` : `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return ms > 0 ? `in ${hr}h` : `${hr}h ago`
  const d = Math.round(hr / 24)
  return ms > 0 ? `in ${d}d` : `${d}d ago`
}

export function EnrollmentModal({ campaignId, campaignName, totalSteps, onClose, onChanged }: Props) {
  const t = useTranslations('dripEnrollment')
  const tCommon = useTranslations('common')
  const confirm = useConfirm()
  const open = campaignId != null
  const { addToast } = useToast()

  const enrollmentsQuery = useApi<{ data: EnrollmentRow[] }>(
    open ? `/drip-campaigns/${campaignId}/enroll` : '',
    { enabled: open },
  )
  const enrollments = enrollmentsQuery.data?.data ?? []

  // Bundle CG — server-side search (was client-side over a 500-item
  // pre-fetch which got silently truncated to 200 by the contacts
  // API's MAX_LIMIT). Empty query returns the first page (50 by
  // default); a non-empty query goes through ?q= which honours the
  // blind-index hash for email/phone exact-match.
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 250)
  const contactsQueryUrl = useMemo(() => {
    if (!open) return ''
    const params = new URLSearchParams({ limit: '50' })
    if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim())
    return `/contacts?${params.toString()}`
  }, [open, debouncedSearch])
  const contactsQuery = useApi<{ data: ContactOption[] }>(contactsQueryUrl, { enabled: open })
  const filtered = contactsQuery.data?.data ?? []
  const enrolledIds = useMemo(() => new Set(enrollments.map((e) => e.contactId)), [enrollments])

  // Bundle CJ — Set instead of single string. The previous
  // `busyId | null` model dropped concurrent enroll clicks
  // silently: clicking Enroll on contact A then on B before A's
  // network round-trip resolved would no-op the B click. The
  // Set lets per-button busy state coexist; UX shows individual
  // spinners instead of one global lock.
  const [busy, setBusy] = useState<Set<string>>(new Set())
  const isBusy = useCallback((id: string) => busy.has(id), [busy])
  const setBusyFor = useCallback((id: string, on: boolean) => {
    setBusy((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  async function enroll(contactId: string) {
    if (!campaignId || isBusy(contactId)) return
    setBusyFor(contactId, true)
    try {
      const res = await fetch(`/api/drip-campaigns/${campaignId}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        addToast(json?.error ?? t('toasts.enrollFailed', { status: res.status }), 'error')
        return
      }
      addToast(t('toasts.enrolled'), 'success')
      enrollmentsQuery.refetch()
      onChanged?.()
    } catch (err) {
      addToast(err instanceof Error ? err.message : t('toasts.networkError'), 'error')
    } finally {
      setBusyFor(contactId, false)
    }
  }

  async function unenroll(contactId: string) {
    if (!campaignId || isBusy(contactId)) return
    const ok = await confirm({ title: t('cancelConfirm'), confirmLabel: tCommon('delete'), cancelLabel: tCommon('cancel'), danger: true })
    if (!ok) return
    setBusyFor(contactId, true)
    try {
      const res = await fetch(`/api/drip-campaigns/${campaignId}/enroll?contactId=${encodeURIComponent(contactId)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        addToast(json?.error ?? t('toasts.cancelFailed', { status: res.status }), 'error')
        return
      }
      addToast(t('toasts.cancelled'), 'success')
      enrollmentsQuery.refetch()
      onChanged?.()
    } catch (err) {
      addToast(err instanceof Error ? err.message : t('toasts.networkError'), 'error')
    } finally {
      setBusyFor(contactId, false)
    }
  }

  // Bundle CG — read the inline contact relation returned by GET
  // /api/drip-campaigns/[id]/enroll. Falls back to id-prefix when
  // the row was somehow stored without a contact (shouldn't happen
  // with the FK in place, but defensive).
  function contactLabel(e: EnrollmentRow): string {
    const name = e.contact?.name?.trim()
    if (name) return name
    const company = e.contact?.company?.trim()
    if (company) return company
    return e.contactId.slice(0, 8) + '…'
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('title', { name: campaignName })}
      subtitle={t('subtitle', { count: enrollments.length, steps: totalSteps })}
      size="lg"
    >
      {/* Add-contact picker */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <Search
            size={13}
            style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--txt3)',
            }}
          />
          <input
            type="search"
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '8px 10px 8px 30px',
              borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--bg2)', fontSize: 13, color: 'var(--txt)',
              fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        <div
          style={{
            maxHeight: 160, overflowY: 'auto',
            border: '1px solid var(--border)', borderRadius: 8,
            background: 'var(--panel)',
          }}
        >
          {contactsQuery.loading && (
            <div style={{ padding: 14, textAlign: 'center', color: 'var(--txt3)', fontSize: 12 }}>
              {t('loadingContacts')}
            </div>
          )}
          {!contactsQuery.loading && filtered.length === 0 && (
            <div style={{ padding: 14, textAlign: 'center', color: 'var(--txt3)', fontSize: 12 }}>
              {search ? t('noMatches') : t('noContactsYet')}
            </div>
          )}
          {filtered.map((c) => {
            const already = enrolledIds.has(c.id)
            const composed = `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim()
            const name = c.name ?? (composed || c.email || c.id)
            return (
              <div
                key={c.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 10px', borderBottom: '1px solid var(--border)',
                  fontSize: 12,
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 500, color: 'var(--txt)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {name}
                  </div>
                  {c.email && (
                    <div style={{ fontSize: 11, color: 'var(--txt3)' }}>{c.email}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => enroll(c.id)}
                  disabled={already || isBusy(c.id)}
                  style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                    background: already ? 'var(--bg2)' : 'var(--accent)',
                    color: already ? 'var(--txt3)' : '#fff',
                    border: 'none', cursor: already ? 'default' : 'pointer',
                    fontFamily: 'inherit', flexShrink: 0,
                    opacity: isBusy(c.id) ? 0.6 : 1,
                  }}
                >
                  {already ? t('enrolled') : isBusy(c.id) ? '…' : t('enroll')}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Current enrollments */}
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt2)', marginBottom: 6 }}>
        {t('currentEnrollments', { count: enrollments.length })}
      </div>

      {enrollmentsQuery.loading && (
        <div style={{ padding: 18, textAlign: 'center', color: 'var(--txt3)', fontSize: 12 }}>
          {t('loadingEnrollments')}
        </div>
      )}

      {!enrollmentsQuery.loading && enrollments.length === 0 && (
        <div
          style={{
            padding: 18, textAlign: 'center', color: 'var(--txt3)', fontSize: 12,
            border: '1px dashed var(--border)', borderRadius: 8,
          }}
        >
          {t('noneEnrolled')}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {enrollments.map((e) => {
          const sStyle = STATUS_STYLE[e.status]
          const Icon = sStyle.Icon
          const stepsDelivered = e.lastStepIndex + 1
          return (
            <div
              key={e.id}
              style={{
                padding: 10, borderRadius: 8,
                background: 'var(--panel)', border: '1px solid var(--border)',
                display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12,
                alignItems: 'center',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--txt)', marginBottom: 2 }}>
                  {contactLabel(e)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--txt3)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span>{t('step', { n: Math.max(0, stepsDelivered), total: totalSteps })}</span>
                  <span>·</span>
                  <span>
                    {e.lastDeliveredAt
                      ? t('lastSent', { ago: fmtRelative(e.lastDeliveredAt) })
                      : t('noSendsYet')}
                  </span>
                  {e.nextDueAt && (
                    <>
                      <span>·</span>
                      <span>{t('next', { when: fmtRelative(e.nextDueAt) })}</span>
                    </>
                  )}
                  {e.attemptCount > 0 && (
                    <>
                      <span>·</span>
                      <span>{t('attempts', { count: e.attemptCount })}</span>
                    </>
                  )}
                </div>
                {e.lastError && (
                  <div
                    style={{
                      fontSize: 11, color: 'var(--r-txt)', marginTop: 4,
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '2px 6px', borderRadius: 4,
                      background: 'var(--r-bg)', border: '1px solid var(--r-border)',
                    }}
                  >
                    <AlertCircle size={10} />
                    {e.lastError}
                  </div>
                )}
              </div>
              <span
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                  padding: '3px 8px', borderRadius: 5,
                  background: sStyle.bg, color: sStyle.txt,
                }}
              >
                <Icon size={10} />
                {t(`status.${e.status}`)}
              </span>
              {(e.status === 'active' || e.status === 'paused') ? (
                <button
                  type="button"
                  onClick={() => unenroll(e.contactId)}
                  disabled={isBusy(e.contactId)}
                  title={t('cancelTitle')}
                  aria-label={t('cancelTitle')}
                  style={{
                    padding: '5px 8px', borderRadius: 6,
                    background: 'var(--bg2)', color: 'var(--r-txt)',
                    border: '1px solid var(--border)', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center',
                    opacity: isBusy(e.contactId) ? 0.5 : 1,
                  }}
                >
                  <UserMinus size={12} />
                </button>
              ) : (
                <span style={{ width: 28 }} />
              )}
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
