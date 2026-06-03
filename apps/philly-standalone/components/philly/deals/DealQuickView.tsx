'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import {
  User as UserIcon, Calendar, ExternalLink, X, FolderKanban,
} from 'lucide-react'
import { Modal } from '@/components/philly/ui/Modal'
import { useApi } from '@/hooks/philly/useApi'
import { useFormat } from '@/hooks/philly/useFormat'

/* Bundle V — popover quick-view for a deal. Same pattern as
   ContactQuickView (Bundle T): fetches the same endpoint the detail
   page uses and presents the most-frequently-needed fields without
   the navigation cost. Mounted from app/deals/page.tsx in both list
   and kanban views. */

interface DealDetail {
  id: string
  title: string
  valueCents: number
  probability: number
  status: string
  expectedClose: string | null
  actualClose: string | null
  createdAt: string
  notes?: string | null
  stage: { id: string; name: string; color: string }
  contact: { id: string; name: string } | null
  owner: { id: string; name: string } | null
  pipeline: { id: string; name: string } | null
  project: { id: string; title: string } | null
}

const STATUS_COLORS: Record<string, { bg: string; txt: string; border: string }> = {
  open: { bg: 'var(--b-bg)', txt: 'var(--b-txt)', border: 'var(--b-border)' },
  won: { bg: 'var(--g-bg)', txt: 'var(--g-txt)', border: 'var(--g-border)' },
  lost: { bg: 'var(--r-bg)', txt: 'var(--r-txt)', border: 'var(--r-border)' },
}

interface Props {
  dealId: string | null
  onClose: () => void
}

export function DealQuickView({ dealId, onClose }: Props) {
  const t = useTranslations('quickview')
  const tc = useTranslations('common')
  const fmt = useFormat()
  const fmtMoney = (cents: number) => fmt.currency(cents, { cents: true })
  const fmtDate = (iso: string | null) => (iso ? fmt.date(iso) : '—')
  const open = dealId != null
  const query = useApi<{ data: DealDetail }>(open ? `/deals/${dealId}` : '', { enabled: open })
  const d = query.data?.data ?? null
  const sc = (d && STATUS_COLORS[d.status]) || STATUS_COLORS.open

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={d?.title ?? 'Deal'}
      subtitle={d?.pipeline?.name || ''}
      size="md"
    >
      {!d ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>
          {query.loading ? t('loading') : query.error ?? t('notFound', { entity: 'Deal' })}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Status + stage pill row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
              background: sc.bg, color: sc.txt, border: `1px solid ${sc.border}`,
              textTransform: 'uppercase', letterSpacing: '.05em',
            }}>{d.status}</span>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6,
              background: d.stage.color + '22', color: d.stage.color,
            }}>{d.stage.name}</span>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: 'var(--txt3)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={11} />
              {t('openedOn', { date: fmtDate(d.createdAt) })}
            </span>
          </div>

          {/* Headline value */}
          <div style={{
            padding: '14px 16px',
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 10,
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
          }}>
            <div>
              <div style={{ fontSize: 10.5, color: 'var(--txt3)', marginBottom: 2 }}>{t('deal.value')}</div>
              <div className="mono" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>
                {fmtMoney(d.valueCents)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10.5, color: 'var(--txt3)', marginBottom: 2 }}>{t('deal.probability')}</div>
              <div className="mono" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>
                {d.probability}%
              </div>
            </div>
          </div>

          {/* Field grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
            padding: '12px 14px',
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 10,
          }}>
            <Field icon={UserIcon} label={t('deal.owner')} value={d.owner?.name ?? t('deal.unassigned')} />
            <Field icon={UserIcon} label={t('deal.contact')} value={d.contact?.name ?? '—'} />
            <Field icon={Calendar} label={t('deal.expectedClose')} value={fmtDate(d.expectedClose)} />
            <Field icon={Calendar} label={t('deal.actualClose')} value={fmtDate(d.actualClose)} />
          </div>

          {/* Linked project */}
          {d.project && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', borderRadius: 10,
              background: 'var(--bg2)', border: '1px solid var(--border)',
              fontSize: 12, color: 'var(--txt2)',
            }}>
              <FolderKanban size={12} color="var(--txt3)" />
              <span style={{ color: 'var(--txt3)', fontSize: 11 }}>{t('linkedProject')}</span>
              <span style={{ flex: 1 }} />
              <Link
                href={`/projects/${d.project.id}`}
                style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}
              >
                {d.project.title}
              </Link>
            </div>
          )}

          {/* Notes */}
          {d.notes && d.notes.trim() && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--txt3)', marginBottom: 4 }}>{t('notes')}</div>
              <div style={{
                fontSize: 12.5, color: 'var(--txt2)', lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                padding: '10px 12px',
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 10,
                maxHeight: 140, overflowY: 'auto',
              }}>
                {d.notes}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <Link
              href={`/deals/${d.id}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8,
                fontSize: 12, fontWeight: 600,
                background: 'var(--accent)', color: '#fff',
                textDecoration: 'none',
              }}
            >
              <ExternalLink size={12} />
              {tc('openFullPage')}
            </Link>
            <button
              type="button"
              onClick={onClose}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '7px 14px', borderRadius: 8,
                fontSize: 12, fontWeight: 500,
                background: 'transparent', color: 'var(--txt2)',
                border: '1px solid var(--border)', cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <X size={12} />
              {tc('close')}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function Field({
  icon: Icon, label, value,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>
  label: string
  value: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <Icon size={13} color="var(--txt3)" />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10.5, color: 'var(--txt3)', marginBottom: 2 }}>{label}</div>
        <div style={{
          fontSize: 13, fontWeight: 500, color: 'var(--txt)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {value}
        </div>
      </div>
    </div>
  )
}
