'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Topbar } from '@/components/philly/layout/Topbar'
import { useApi } from '@/hooks/philly/useApi'
import {
  Search, Filter, ChevronLeft, ChevronRight,
  ExternalLink, ArrowUpDown, Users,
} from 'lucide-react'

interface LeadRow {
  id: string
  first_name: string
  last_name: string
  headline: string | null
  title: string | null
  seniority: string | null
  country: string
  region: string | null
  icp_score: number | null
  icp_segment: number | null
  priority: string
  status: string
  do_not_contact: boolean
  linkedin_url: string
  source: string
  followup_count: number
  assigned_account_id: string | null
  campaign_id: string | null
  company_id: string | null
  connection_sent_at: string | null
  connection_accepted_at: string | null
  first_dm_sent_at: string | null
  last_reply_at: string | null
  discovery_call_at: string | null
  created_at: string
  company_name: string | null
  company_country: string | null
  account_slug: string | null
  account_name: string | null
  campaign_slug: string | null
  campaign_name: string | null
  campaign_type: string | null
}

const STATUS_LABELS: Record<string, string> = {
  sourced: 'Sourced',
  enriched: 'Enriched',
  icp_scored: 'ICP Scored',
  assigned: 'Assigned',
  connection_sent: 'Conn. Sent',
  connection_accepted: 'Accepted',
  first_dm_sent: '1st DM Sent',
  follow_up_sent: 'Follow-up',
  reply_received: 'Reply',
  reply_classified: 'Classified',
  nba_sent: 'NBA Sent',
  discovery_call_booked: 'Call Booked',
  partner_signed: 'Signed',
  handed_off: 'Handed Off',
  disqualified: 'Disqualified',
  do_not_contact: 'DNC',
  not_interested: 'Not Interested',
  dormant_90d: 'Dormant',
}

const STATUS_COLORS: Record<string, string> = {
  sourced: 'var(--txt3)',
  enriched: 'var(--txt3)',
  icp_scored: 'var(--b)',
  assigned: 'var(--b)',
  connection_sent: 'var(--y)',
  connection_accepted: 'var(--g)',
  first_dm_sent: 'var(--accent)',
  follow_up_sent: 'var(--accent)',
  reply_received: 'var(--g)',
  reply_classified: 'var(--g)',
  nba_sent: 'var(--accent)',
  discovery_call_booked: 'var(--g)',
  partner_signed: 'var(--g)',
  handed_off: 'var(--g)',
  disqualified: 'var(--r)',
  do_not_contact: 'var(--r)',
  not_interested: 'var(--y)',
  dormant_90d: 'var(--txt3)',
}

const SEGMENT_LABELS: Record<number, string> = { 1: 'Tier 1', 2: 'Tier 2', 3: 'Tier 3' }

const ALL_STATUSES = [
  'sourced', 'enriched', 'icp_scored', 'assigned',
  'connection_sent', 'connection_accepted',
  'first_dm_sent', 'follow_up_sent',
  'reply_received', 'reply_classified', 'nba_sent',
  'discovery_call_booked', 'partner_signed', 'handed_off',
  'disqualified', 'do_not_contact', 'not_interested', 'dormant_90d',
]

export default function LeadsListPage() {
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [sortField, setSortField] = useState('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(0)
  const pageSize = 50

  const params = new URLSearchParams()
  if (statusFilter) params.set('status', statusFilter)
  if (activeSearch) params.set('search', activeSearch)
  params.set('sort', sortField)
  params.set('dir', sortDir)
  params.set('limit', String(pageSize))
  params.set('offset', String(page * pageSize))

  const { data: raw, loading } = useApi<{
    data: LeadRow[]
    meta: { total: number; limit: number; offset: number }
  }>(`/outreach/leads?${params}`, { interval: 30000 })

  const leads = raw?.data ?? []
  const total = raw?.meta?.total ?? 0
  const totalPages = Math.ceil(total / pageSize)

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
    setPage(0)
  }

  const handleSearch = () => {
    setActiveSearch(searchQuery)
    setPage(0)
  }

  const thStyle: React.CSSProperties = {
    padding: '8px 10px', fontSize: 10, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.05em',
    color: 'var(--txt3)', textAlign: 'left',
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap', cursor: 'pointer',
    userSelect: 'none',
  }

  const tdStyle: React.CSSProperties = {
    padding: '8px 10px', fontSize: 13, color: 'var(--txt)',
    borderBottom: '1px solid var(--border)',
  }

  return (
    <div>
      <Topbar title="Leads" sub={`${total} in pipeline`} />

      <div style={{ padding: '24px 28px', maxWidth: 1400 }}>
        {/* Toolbar */}
        <div style={{
          display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap',
        }}>
          {/* Search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 0,
            border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden',
            background: 'var(--panel)',
          }}>
            <input
              type="text"
              placeholder="Search name, title, or headline"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              style={{
                padding: '7px 12px', fontSize: 12, border: 'none', outline: 'none',
                background: 'transparent', color: 'var(--txt)', width: 240,
              }}
            />
            <button
              onClick={handleSearch}
              style={{
                padding: '7px 10px', border: 'none', borderLeft: '1px solid var(--border)',
                background: 'var(--bg2)', cursor: 'pointer', color: 'var(--txt3)',
                display: 'flex', alignItems: 'center',
              }}
            >
              <Search size={13} />
            </button>
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(0) }}
            style={{
              padding: '7px 12px', borderRadius: 8, fontSize: 12,
              border: '1px solid var(--border)', background: 'var(--panel)',
              color: 'var(--txt)', cursor: 'pointer',
            }}
          >
            <option value="">All statuses</option>
            {ALL_STATUSES.map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
            ))}
          </select>

          <div style={{ flex: 1 }} />

          {/* Pagination */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--txt3)',
          }}>
            <span>
              {total > 0 ? `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, total)} of ${total}` : '0 leads'}
            </span>
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{
                padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)',
                background: 'var(--panel)', cursor: page === 0 ? 'default' : 'pointer',
                opacity: page === 0 ? 0.4 : 1, color: 'var(--txt3)',
                display: 'flex', alignItems: 'center',
              }}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages - 1}
              style={{
                padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)',
                background: 'var(--panel)', cursor: page >= totalPages - 1 ? 'default' : 'pointer',
                opacity: page >= totalPages - 1 ? 0.4 : 1, color: 'var(--txt3)',
                display: 'flex', alignItems: 'center',
              }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 12, overflow: 'hidden',
        }}>
          {loading && leads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--txt3)' }}>
              Loading leads
            </div>
          ) : leads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--txt3)' }}>
              <Users size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
              {activeSearch || statusFilter ? (
                <>
                  <div style={{ fontWeight: 600 }}>No matches</div>
                  <div style={{ marginTop: 6, fontSize: 13 }}>
                    No leads match these filters. Clear them to see everything.
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontWeight: 600 }}>No leads yet</div>
                  <div style={{ marginTop: 6, fontSize: 13 }}>
                    Run the sourcing pipeline to populate the queue.
                  </div>
                  <code style={{
                    display: 'inline-block', marginTop: 12, padding: '6px 12px',
                    background: 'var(--bg2)', borderRadius: 6, fontSize: 12,
                  }}>npm run source -- &lt;campaign&gt; &lt;account&gt;</code>
                </>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle} onClick={() => handleSort('first_name')}>
                      Name {sortField === 'first_name' && <ArrowUpDown size={10} />}
                    </th>
                    <th style={thStyle}>Company</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
                    <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('icp_score')}>
                      ICP {sortField === 'icp_score' && <ArrowUpDown size={10} />}
                    </th>
                    <th style={thStyle}>Seniority</th>
                    <th style={thStyle}>Country</th>
                    <th style={thStyle}>Campaign</th>
                    <th style={thStyle}>Account</th>
                    <th style={thStyle} onClick={() => handleSort('last_reply_at')}>
                      Last Reply {sortField === 'last_reply_at' && <ArrowUpDown size={10} />}
                    </th>
                    <th style={thStyle} onClick={() => handleSort('created_at')}>
                      Added {sortField === 'created_at' && <ArrowUpDown size={10} />}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => {
                    const statusColor = STATUS_COLORS[lead.status] ?? 'var(--txt3)'
                    return (
                      <tr
                        key={lead.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          window.location.href = `/philly/outreach/leads/${lead.id}`
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.background = 'var(--bg2)'
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.background = ''
                        }}
                      >
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>
                                {lead.first_name} {lead.last_name}
                                {lead.do_not_contact && (
                                  <span style={{
                                    marginLeft: 6, fontSize: 9, padding: '1px 5px',
                                    borderRadius: 4, background: 'var(--r)20', color: 'var(--r)',
                                    fontWeight: 700, textTransform: 'uppercase',
                                  }}>DNC</span>
                                )}
                              </div>
                              {lead.title && (
                                <div style={{
                                  fontSize: 11, color: 'var(--txt3)', marginTop: 1,
                                  maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}>
                                  {lead.title}
                                </div>
                              )}
                            </div>
                            <a
                              href={lead.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              style={{ color: 'var(--accent)', display: 'flex', flexShrink: 0 }}
                            >
                              <ExternalLink size={11} />
                            </a>
                          </div>
                        </td>
                        <td style={{ ...tdStyle, fontSize: 12 }}>
                          {lead.company_name ?? '—'}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: 6,
                            fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                            background: `${statusColor}20`,
                            color: statusColor,
                          }}>
                            {STATUS_LABELS[lead.status] ?? lead.status}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                          <span className="mono" style={{ fontWeight: 600 }}>
                            {lead.icp_score ?? '—'}
                          </span>
                          {lead.icp_segment && (
                            <span style={{
                              marginLeft: 4, fontSize: 9, color: 'var(--txt3)',
                            }}>
                              {SEGMENT_LABELS[lead.icp_segment]}
                            </span>
                          )}
                        </td>
                        <td style={{ ...tdStyle, fontSize: 11, textTransform: 'capitalize' }}>
                          {lead.seniority?.replace('_', ' ') ?? '—'}
                        </td>
                        <td style={{ ...tdStyle, fontSize: 12 }}>
                          {lead.country}
                        </td>
                        <td style={{ ...tdStyle, fontSize: 11 }}>
                          {lead.campaign_name ?? '—'}
                        </td>
                        <td style={{ ...tdStyle, fontSize: 11 }}>
                          {lead.account_name ?? '—'}
                        </td>
                        <td style={{ ...tdStyle, fontSize: 11, color: 'var(--txt3)' }}>
                          {lead.last_reply_at
                            ? new Date(lead.last_reply_at).toLocaleDateString()
                            : '—'}
                        </td>
                        <td style={{ ...tdStyle, fontSize: 11, color: 'var(--txt3)' }}>
                          {new Date(lead.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bottom pagination */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 8,
            marginTop: 16, fontSize: 12, color: 'var(--txt3)',
          }}>
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{
                padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--panel)', cursor: page === 0 ? 'default' : 'pointer',
                opacity: page === 0 ? 0.4 : 1, color: 'var(--txt2)',
              }}
            >
              Previous
            </button>
            <span style={{ padding: '6px 0', minWidth: 80, textAlign: 'center' }}>
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages - 1}
              style={{
                padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--panel)', cursor: page >= totalPages - 1 ? 'default' : 'pointer',
                opacity: page >= totalPages - 1 ? 0.4 : 1, color: 'var(--txt2)',
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
