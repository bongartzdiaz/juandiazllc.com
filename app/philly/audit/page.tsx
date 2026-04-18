'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/philly/layout/Topbar'
import { Pagination } from '@/components/philly/ui/Pagination'
import { Shield, Filter, Clock, FileText } from 'lucide-react'
import type { AuditLog } from '@/lib/philly/types'

const ACTION_COLORS: Record<string, { bg: string; txt: string }> = {
  create: { bg: 'var(--g-bg)', txt: 'var(--g-txt)' },
  update: { bg: 'var(--b-bg)', txt: 'var(--b-txt)' },
  delete: { bg: 'var(--r-bg)', txt: 'var(--r-txt)' },
}

export default function AuditLogPage() {
  const t = useTranslations('audit')
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [entityFilter, setEntityFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const limit = 25

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (entityFilter) params.set('entity', entityFilter)
      if (actionFilter) params.set('action', actionFilter)

      const res = await fetch(`/api/audit?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      setLogs(json.data)
      setTotal(json.pagination.total)
      setTotalPages(json.pagination.totalPages)
    } catch {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [page, entityFilter, actionFilter])

  useEffect(() => { fetchLogs() }, [fetchLogs])

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
              <option value="project">Project</option>
              <option value="contact">Contact</option>
              <option value="kanbanCard">Kanban Card</option>
              <option value="kanbanBoard">Kanban Board</option>
              <option value="impactMetric">Impact Metric</option>
              <option value="milestone">Milestone</option>
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
            gridTemplateColumns: '140px 100px 120px 1fr 180px',
            gap: 12, padding: '10px 16px',
            borderBottom: '1px solid var(--border)',
            fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: 'var(--txt3)',
          }}>
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
            logs.map((log, idx) => (
              <div
                key={log.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '140px 100px 120px 1fr 180px',
                  gap: 12, padding: '10px 16px',
                  borderBottom: idx < logs.length - 1 ? '1px solid var(--border)' : 'none',
                  fontSize: 12, alignItems: 'center',
                  background: idx % 2 === 1 ? 'color-mix(in srgb, var(--bg2) 30%, transparent)' : 'transparent',
                }}
              >
                {/* Timestamp */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--txt3)', fontSize: 11 }}>
                  <Clock size={11} />
                  {formatTimestamp(log.createdAt)}
                </div>

                {/* Action Badge */}
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

                {/* Entity */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <FileText size={12} style={{ color: 'var(--txt3)' }} />
                  <span style={{ fontWeight: 500, color: 'var(--txt)' }}>{log.entity}</span>
                </div>

                {/* Changes */}
                <div style={{
                  fontSize: 11, color: 'var(--txt2)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  fontFamily: "var(--font-red-hat-mono), 'Red Hat Mono', monospace",
                }}>
                  {formatChanges(log.changes)}
                </div>

                {/* User */}
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
              </div>
            ))
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
