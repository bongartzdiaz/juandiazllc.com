'use client'

import { Fragment, useState } from 'react'
import { useApi } from '@/hooks/philly/useApi'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/philly/layout/Topbar'
import { Pagination } from '@/components/philly/ui/Pagination'
import { Shield, Filter, Clock, FileText, ChevronDown, Calendar } from 'lucide-react'
import type { AuditLog } from '@/lib/philly/types'

// Full entity catalogue mirrors AuditEntity in lib/philly/audit.ts.
// Dropdown options chosen for operator relevance — rarely-audited
// entities still filterable via URL param but hidden from the menu.
const ENTITY_OPTIONS: Array<[string, string]> = [
  ['contact', 'Contact'],
  ['deal', 'Deal'],
  ['project', 'Project'],
  ['property', 'Property'],
  ['transaction', 'Transaction'],
  ['offer', 'Offer'],
  ['kanbanCard', 'Kanban card'],
  ['kanbanBoard', 'Kanban board'],
  ['kanbanColumn', 'Kanban column'],
  ['calendarEvent', 'Calendar event'],
  ['email', 'Email'],
  ['sms', 'SMS'],
  ['call', 'Call'],
  ['document', 'Document'],
  ['eSignature', 'e-Signature'],
  ['automationRule', 'Automation rule'],
  ['dripCampaign', 'Drip campaign'],
  ['commissionRecord', 'Commission'],
  ['cmaReport', 'CMA report'],
  ['actionPlan', 'Action plan'],
  ['dialerList', 'Dialer list'],
  ['leadRoutingRule', 'Lead routing rule'],
  ['leadScore', 'Lead score'],
  ['room', 'Room'],
  ['reservation', 'Reservation'],
  ['showing', 'Showing'],
  ['openHouse', 'Open house'],
  ['grant', 'Grant'],
  ['volunteer', 'Volunteer'],
  ['impactMetric', 'Impact metric'],
  ['milestone', 'Milestone'],
  ['template', 'Template'],
  ['savedView', 'Saved view'],
  ['integration', 'Integration'],
  ['apiKey', 'API key'],
  ['user', 'User'],
  ['organization', 'Organization'],
]

const ACTION_COLORS: Record<string, { bg: string; txt: string }> = {
  create: { bg: 'var(--g-bg)', txt: 'var(--g-txt)' },
  update: { bg: 'var(--b-bg)', txt: 'var(--b-txt)' },
  delete: { bg: 'var(--r-bg)', txt: 'var(--r-txt)' },
}

export default function AuditLogPage() {
  const t = useTranslations('audit')
  const [page, setPage] = useState(1)
  const [entityFilter, setEntityFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [rangeFilter, setRangeFilter] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const limit = 25

  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (entityFilter) params.set('entity', entityFilter)
  if (actionFilter) params.set('action', actionFilter)
  if (rangeFilter) params.set('range', rangeFilter)

  interface AuditResponse {
    data: AuditLog[]
    pagination: { total: number; totalPages: number }
  }
  const auditQuery = useApi<AuditResponse>(`/audit?${params}`)
  const logs = auditQuery.data?.data ?? []
  const total = auditQuery.data?.pagination.total ?? 0
  const totalPages = auditQuery.data?.pagination.totalPages ?? 0
  const loading = auditQuery.loading

  const handlePageChange = (p: number) => setPage(p)

  return (
    <>
      <Topbar title={t('title')} sub={t('subtitle')} />

      <div style={{ padding: '18px 24px 40px' }}>
        {/* Filters */}
        <div style={{
          display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 12px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--panel)',
            fontSize: 12,
          }}>
            <Filter size={13} style={{ color: 'var(--txt3)' }} />
            <select
              value={entityFilter}
              onChange={e => { setEntityFilter(e.target.value); setPage(1) }}
              style={{
                background: 'none', border: 'none', fontSize: 12,
                color: 'var(--txt)', fontFamily: 'inherit', cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="">All entities</option>
              {ENTITY_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 12px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--panel)',
            fontSize: 12,
          }}>
            <Shield size={13} style={{ color: 'var(--txt3)' }} />
            <select
              value={actionFilter}
              onChange={e => { setActionFilter(e.target.value); setPage(1) }}
              style={{
                background: 'none', border: 'none', fontSize: 12,
                color: 'var(--txt)', fontFamily: 'inherit', cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="">All actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
            </select>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 12px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--panel)',
            fontSize: 12,
          }}>
            <Calendar size={13} style={{ color: 'var(--txt3)' }} />
            <select
              value={rangeFilter}
              onChange={e => { setRangeFilter(e.target.value); setPage(1) }}
              style={{
                background: 'none', border: 'none', fontSize: 12,
                color: 'var(--txt)', fontFamily: 'inherit', cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="">All time</option>
              <option value="1d">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div style={{
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 12, overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)',
        }}>
          {/* Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '24px 140px 100px 120px 1fr 180px',
            gap: 12, padding: '10px 16px',
            borderBottom: '1px solid var(--border)',
            fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: 'var(--txt3)',
          }}>
            <span aria-hidden />
            <span>Timestamp</span>
            <span>Action</span>
            <span>Entity</span>
            <span>Changes</span>
            <span>User</span>
          </div>

          {/* Rows */}
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>
              Loading audit logs...
            </div>
          ) : logs.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>
              No audit logs found.
            </div>
          ) : (
            logs.map((log, idx) => {
              const expanded = expandedId === log.id
              const hasChanges = Boolean(log.changes) && log.changes !== '{}'
              return (
                <div
                  key={log.id}
                  style={{
                    borderBottom: idx < logs.length - 1 ? '1px solid var(--border)' : 'none',
                    background: idx % 2 === 1 ? 'color-mix(in srgb, var(--bg2) 30%, transparent)' : 'transparent',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : log.id)}
                    aria-expanded={expanded}
                    disabled={!hasChanges}
                    style={{
                      all: 'unset',
                      display: 'grid',
                      gridTemplateColumns: '24px 140px 100px 120px 1fr 180px',
                      gap: 12, padding: '10px 16px',
                      fontSize: 12, alignItems: 'center', width: '100%',
                      boxSizing: 'border-box',
                      cursor: hasChanges ? 'pointer' : 'default',
                    }}
                  >
                    <div style={{
                      color: 'var(--txt3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform .15s',
                      opacity: hasChanges ? 1 : 0.3,
                    }}>
                      <ChevronDown size={14} />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--txt3)', fontSize: 11 }}>
                      <Clock size={11} />
                      {formatTimestamp(log.createdAt)}
                    </div>

                    <div>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px', borderRadius: 6,
                        fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                        background: ACTION_COLORS[log.action]?.bg ?? 'var(--bg2)',
                        color: ACTION_COLORS[log.action]?.txt ?? 'var(--txt2)',
                      }}>
                        {log.action}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <FileText size={12} style={{ color: 'var(--txt3)' }} />
                      <span style={{ fontWeight: 500, color: 'var(--txt)' }}>{log.entity}</span>
                    </div>

                    <div style={{
                      fontSize: 11, color: 'var(--txt2)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      fontFamily: "var(--font-red-hat-mono), 'Red Hat Mono', monospace",
                      textAlign: 'left',
                    }}>
                      {formatChanges(log.changes)}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--accent) 0%, var(--g) 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0,
                      }}>
                        {log.user?.name?.[0]?.toUpperCase() ?? 'U'}
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--txt2)' }}>
                        {log.user?.name ?? log.userId.slice(0, 8)}
                      </span>
                    </div>
                  </button>

                  {expanded && hasChanges && (
                    <div style={{
                      padding: '0 16px 16px 52px',
                      fontSize: 11.5, lineHeight: 1.6,
                      fontFamily: "var(--font-red-hat-mono), 'Red Hat Mono', monospace",
                    }}>
                      <ChangesDiff changesStr={log.changes} />
                      {log.entityId && (
                        <div style={{ marginTop: 10, color: 'var(--txt3)', fontSize: 10.5 }}>
                          entity id: <span style={{ color: 'var(--txt2)' }}>{log.entityId}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={handlePageChange} />
      </div>
    </>
  )
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function formatChanges(changesStr: string): string {
  try {
    const changes = JSON.parse(changesStr)
    const keys = Object.keys(changes)
    if (keys.length === 0) return 'No details'
    return keys.map(k => `${k}: ${JSON.stringify(changes[k].new)}`).join(', ')
  } catch {
    return changesStr || 'No details'
  }
}

function ChangesDiff({ changesStr }: { changesStr: string }) {
  let changes: Record<string, { old: unknown; new: unknown }> | null = null
  try {
    const parsed = JSON.parse(changesStr || '{}')
    if (parsed && typeof parsed === 'object') changes = parsed as typeof changes
  } catch {
    return <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--txt3)' }}>{changesStr}</pre>
  }

  const keys = changes ? Object.keys(changes) : []
  if (keys.length === 0) {
    return <span style={{ color: 'var(--txt3)' }}>No field-level details recorded.</span>
  }

  const render = (v: unknown) => {
    if (v === null || v === undefined) return <em style={{ color: 'var(--txt3)' }}>null</em>
    if (typeof v === 'string') return `"${v}"`
    return JSON.stringify(v)
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '160px 1fr 1fr',
      gap: '4px 14px',
      background: 'color-mix(in srgb, var(--bg2) 50%, transparent)',
      border: '1px solid var(--border)', borderRadius: 8,
      padding: '10px 14px',
    }}>
      <div style={{ color: 'var(--txt3)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>Field</div>
      <div style={{ color: 'var(--r-txt)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>Before</div>
      <div style={{ color: 'var(--g-txt)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>After</div>
      {keys.map((k) => (
        <Fragment key={k}>
          <div style={{ color: 'var(--txt)', fontWeight: 500 }}>{k}</div>
          <div style={{ color: 'var(--txt2)', wordBreak: 'break-word' }}>{render(changes![k].old)}</div>
          <div style={{ color: 'var(--txt2)', wordBreak: 'break-word' }}>{render(changes![k].new)}</div>
        </Fragment>
      ))}
    </div>
  )
}
