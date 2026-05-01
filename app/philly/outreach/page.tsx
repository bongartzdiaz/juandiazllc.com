'use client'

import { useMemo } from 'react'
import { Topbar } from '@/components/philly/layout/Topbar'
import { KpiCard } from '@/components/philly/ui/KpiCard'
import { useApi } from '@/hooks/philly/useApi'
import {
  Users, Send, UserCheck, MessageSquare, Phone,
  TrendingUp, Globe2, AlertTriangle, DollarSign,
} from 'lucide-react'

interface FunnelRow {
  campaign: string | null
  campaign_type: string | null
  status: string
  lead_count: number
  avg_icp_score: number | null
}

interface CampaignRow {
  campaign: string
  campaign_type: string
  total_leads: number
  icp_qualified: number
  connections_sent: number
  connections_accepted: number
  dms_sent: number
  replies_received: number
  calls_booked: number
  dnc_count: number
  accept_rate_pct: number | null
}

interface AccountRow {
  account: string
  display_name: string
  account_status: string
  budget_date: string | null
  connections_used: number | null
  connections_cap: number | null
  dms_used: number | null
  dms_cap: number | null
  profile_views_used: number | null
  profile_views_cap: number | null
}

interface ReplyRow {
  campaign: string | null
  classification: string | null
  reply_count: number
  avg_confidence: number | null
}

interface CostRow {
  task_type: string
  model: string
  calls: number
  total_tokens_in: number
  total_tokens_out: number
  total_cost_usd: number
  day: string
}

interface CountryRow {
  country: string
  campaign: string | null
  lead_count: number
  qualified: number
  accepted: number
  replied: number
  dnc: number
}

interface ErrorRow {
  level: string
  category: string
  message: string
  account: string | null
  resolved: boolean
  created_at: string
}

interface OutreachData {
  summary: { total_leads: number; active_accounts: number; active_campaigns: number }
  funnel: FunnelRow[]
  campaigns: CampaignRow[]
  accounts: AccountRow[]
  replies: ReplyRow[]
  costs: CostRow[]
  countries: CountryRow[]
  errors: ErrorRow[]
}

const STATUS_ORDER = [
  'sourced', 'enriched', 'icp_scored', 'assigned',
  'connection_sent', 'connection_accepted',
  'first_dm_sent', 'follow_up_sent',
  'reply_received', 'reply_classified', 'nba_sent',
  'discovery_call_booked', 'partner_signed', 'handed_off',
]

const STATUS_LABELS: Record<string, string> = {
  sourced: 'Sourced',
  enriched: 'Enriched',
  icp_scored: 'ICP Scored',
  assigned: 'Assigned',
  connection_sent: 'Conn. Sent',
  connection_accepted: 'Accepted',
  first_dm_sent: '1st DM',
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

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'var(--g)',
    warming: 'var(--y)',
    halted: 'var(--r)',
    banned: 'var(--r)',
    inactive: 'var(--txt3)',
  }
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 6,
      fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
      background: `${colors[status] ?? 'var(--txt3)'}20`,
      color: colors[status] ?? 'var(--txt3)',
    }}>
      {status}
    </span>
  )
}

export default function OutreachPage() {
  const { data: raw, loading } = useApi<{ data: OutreachData }>('/outreach', { interval: 30000 })
  const d = raw?.data

  const funnelTotals = useMemo(() => {
    if (!d?.funnel) return {}
    const totals: Record<string, number> = {}
    for (const row of d.funnel) {
      totals[row.status] = (totals[row.status] ?? 0) + row.lead_count
    }
    return totals
  }, [d?.funnel])

  const totalLeads = d?.summary.total_leads ?? 0
  const connSent = funnelTotals['connection_sent'] ?? 0
  const connAccepted = funnelTotals['connection_accepted'] ?? 0
  const dmsSent = (funnelTotals['first_dm_sent'] ?? 0) + (funnelTotals['follow_up_sent'] ?? 0)
  const replies = (funnelTotals['reply_received'] ?? 0) + (funnelTotals['reply_classified'] ?? 0)
  const callsBooked = funnelTotals['discovery_call_booked'] ?? 0
  const signed = funnelTotals['partner_signed'] ?? 0

  const totalCost = useMemo(() => {
    if (!d?.costs) return 0
    return d.costs.reduce((sum, c) => sum + Number(c.total_cost_usd), 0)
  }, [d?.costs])

  const unresolvedErrors = useMemo(() => {
    if (!d?.errors) return 0
    return d.errors.filter(e => !e.resolved).length
  }, [d?.errors])

  const sectionStyle: React.CSSProperties = {
    background: 'var(--panel)', border: '1px solid var(--border)',
    borderRadius: 12, padding: '18px 20px', marginBottom: 16,
  }

  const thStyle: React.CSSProperties = {
    padding: '8px 12px', fontSize: 10, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.05em',
    color: 'var(--txt3)', textAlign: 'left', borderBottom: '1px solid var(--border)',
  }

  const tdStyle: React.CSSProperties = {
    padding: '8px 12px', fontSize: 13, color: 'var(--txt)',
    borderBottom: '1px solid var(--border)',
  }

  return (
    <div>
      <Topbar title="LinkedIn Outreach" sub="Pipeline analytics & account status" />

      <div style={{ padding: '24px 28px', maxWidth: 1280 }}>
        {loading && !d && (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--txt3)' }}>Loading outreach data...</div>
        )}

        {d && (
          <>
            {/* KPI Strip */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12, marginBottom: 20,
            }}>
              <KpiCard label="Total Leads" value={totalLeads} icon="users" delay={0} />
              <KpiCard label="Conn. Sent" value={connSent} icon="trending-up" delay={50} />
              <KpiCard label="Accepted" value={connAccepted} icon="check-circle" delay={100}
                hot={connAccepted > 0} />
              <KpiCard label="DMs Sent" value={dmsSent} icon="message-square" delay={150} />
              <KpiCard label="Replies" value={replies} icon="inbox" delay={200} />
              <KpiCard label="Calls Booked" value={callsBooked} icon="phone" delay={250}
                hot={callsBooked > 0} />
              <KpiCard label="AI Cost" value={`$${totalCost.toFixed(2)}`} icon="dollar-sign" delay={300} />
              <KpiCard label="Errors" value={unresolvedErrors} icon="zap" delay={350}
                accentColor={unresolvedErrors > 0 ? 'var(--r)' : 'var(--g)'} />
            </div>

            {/* Pipeline Funnel */}
            <div style={sectionStyle}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: 'var(--txt)' }}>
                <TrendingUp size={14} style={{ marginRight: 6, verticalAlign: '-2px' }} />
                Pipeline Funnel
              </h3>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {STATUS_ORDER.map(status => {
                  const count = funnelTotals[status] ?? 0
                  if (count === 0 && !['sourced', 'connection_sent', 'connection_accepted', 'first_dm_sent', 'discovery_call_booked'].includes(status)) return null
                  const maxCount = Math.max(...Object.values(funnelTotals).map(Number), 1)
                  const pct = Math.max(4, (count / maxCount) * 100)
                  return (
                    <div key={status} style={{
                      flex: '1 1 60px', minWidth: 60, textAlign: 'center',
                    }}>
                      <div style={{
                        height: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                        marginBottom: 4,
                      }}>
                        <div style={{
                          width: '80%', borderRadius: '4px 4px 0 0',
                          height: `${pct}%`, minHeight: 4,
                          background: count > 0 ? 'var(--accent)' : 'var(--bg2)',
                          transition: 'height 0.5s ease',
                        }} />
                      </div>
                      <div className="mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt)' }}>
                        {count}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--txt3)', lineHeight: 1.2, marginTop: 2 }}>
                        {STATUS_LABELS[status] ?? status}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Campaign Performance */}
            {d.campaigns.length > 0 && (
              <div style={sectionStyle}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: 'var(--txt)' }}>
                  <Globe2 size={14} style={{ marginRight: 6, verticalAlign: '-2px' }} />
                  Campaign Performance
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Campaign</th>
                        <th style={thStyle}>Type</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Leads</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>ICP</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Sent</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Accepted</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Accept %</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>DMs</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Replies</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Calls</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>DNC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.campaigns.map(c => (
                        <tr key={c.campaign}>
                          <td style={{ ...tdStyle, fontWeight: 600 }}>{c.campaign}</td>
                          <td style={tdStyle}><StatusBadge status={c.campaign_type} /></td>
                          <td style={{ ...tdStyle, textAlign: 'right' }} className="mono">{c.total_leads}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }} className="mono">{c.icp_qualified}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }} className="mono">{c.connections_sent}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }} className="mono">{c.connections_accepted}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }} className="mono">
                            {c.accept_rate_pct != null ? `${c.accept_rate_pct}%` : '—'}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right' }} className="mono">{c.dms_sent}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }} className="mono">{c.replies_received}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }} className="mono">{c.calls_booked}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }} className="mono">{c.dnc_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Account Status */}
            <div style={sectionStyle}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: 'var(--txt)' }}>
                <Users size={14} style={{ marginRight: 6, verticalAlign: '-2px' }} />
                Account Status
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Account</th>
                      <th style={thStyle}>Status</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Conn Used</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Conn Cap</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>DMs Used</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>DMs Cap</th>
                      <th style={thStyle}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.accounts.map((a, i) => (
                      <tr key={`${a.account}-${i}`}>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{a.display_name || a.account}</td>
                        <td style={tdStyle}><StatusBadge status={a.account_status} /></td>
                        <td style={{ ...tdStyle, textAlign: 'right' }} className="mono">{a.connections_used ?? 0}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }} className="mono">{a.connections_cap ?? '—'}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }} className="mono">{a.dms_used ?? 0}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }} className="mono">{a.dms_cap ?? '—'}</td>
                        <td style={{ ...tdStyle, fontSize: 11, color: 'var(--txt3)' }}>
                          {a.budget_date ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Reply Breakdown + Country Heatmap side by side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              {/* Reply Breakdown */}
              {d.replies.length > 0 && (
                <div style={sectionStyle}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: 'var(--txt)' }}>
                    <MessageSquare size={14} style={{ marginRight: 6, verticalAlign: '-2px' }} />
                    Reply Breakdown
                  </h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Classification</th>
                        <th style={thStyle}>Campaign</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Count</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.replies.map((r, i) => (
                        <tr key={i}>
                          <td style={{ ...tdStyle, fontWeight: 600 }}>{r.classification ?? 'unclassified'}</td>
                          <td style={tdStyle}>{r.campaign ?? '—'}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }} className="mono">{r.reply_count}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }} className="mono">
                            {r.avg_confidence != null ? `${(r.avg_confidence * 100).toFixed(0)}%` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Country Heatmap */}
              {d.countries.length > 0 && (
                <div style={sectionStyle}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: 'var(--txt)' }}>
                    <Globe2 size={14} style={{ marginRight: 6, verticalAlign: '-2px' }} />
                    Country Breakdown
                  </h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Country</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Leads</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Qualified</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Accepted</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Replied</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.countries.slice(0, 15).map((c, i) => (
                        <tr key={i}>
                          <td style={{ ...tdStyle, fontWeight: 600 }}>{c.country}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }} className="mono">{c.lead_count}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }} className="mono">{c.qualified}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }} className="mono">{c.accepted}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }} className="mono">{c.replied}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* AI Costs */}
            {d.costs.length > 0 && (
              <div style={sectionStyle}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: 'var(--txt)' }}>
                  <DollarSign size={14} style={{ marginRight: 6, verticalAlign: '-2px' }} />
                  AI Usage & Costs
                </h3>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Task</th>
                      <th style={thStyle}>Model</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Calls</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Tokens In</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Tokens Out</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Cost</th>
                      <th style={thStyle}>Day</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.costs.map((c, i) => (
                      <tr key={i}>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{c.task_type}</td>
                        <td style={tdStyle}>{c.model}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }} className="mono">{c.calls}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }} className="mono">{c.total_tokens_in.toLocaleString()}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }} className="mono">{c.total_tokens_out.toLocaleString()}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }} className="mono">${Number(c.total_cost_usd).toFixed(4)}</td>
                        <td style={{ ...tdStyle, fontSize: 11, color: 'var(--txt3)' }}>{c.day?.slice(0, 10)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={5} style={{ ...tdStyle, fontWeight: 600, textAlign: 'right' }}>Total</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }} className="mono">
                        ${totalCost.toFixed(4)}
                      </td>
                      <td style={tdStyle} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Recent Errors */}
            {d.errors.length > 0 && (
              <div style={sectionStyle}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: 'var(--txt)' }}>
                  <AlertTriangle size={14} style={{ marginRight: 6, verticalAlign: '-2px' }} />
                  Recent Errors (30 days)
                </h3>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Level</th>
                      <th style={thStyle}>Category</th>
                      <th style={thStyle}>Message</th>
                      <th style={thStyle}>Account</th>
                      <th style={thStyle}>Resolved</th>
                      <th style={thStyle}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.errors.map((e, i) => (
                      <tr key={i}>
                        <td style={tdStyle}>
                          <span style={{
                            color: e.level === 'fatal' ? 'var(--r)' : e.level === 'error' ? 'var(--y)' : 'var(--txt3)',
                            fontWeight: 600, fontSize: 11, textTransform: 'uppercase',
                          }}>{e.level}</span>
                        </td>
                        <td style={tdStyle}>{e.category}</td>
                        <td style={{ ...tdStyle, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {e.message}
                        </td>
                        <td style={tdStyle}>{e.account ?? '—'}</td>
                        <td style={tdStyle}>{e.resolved ? '✓' : '—'}</td>
                        <td style={{ ...tdStyle, fontSize: 11, color: 'var(--txt3)' }}>
                          {new Date(e.created_at).toISOString().slice(0, 16).replace('T', ' ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Empty state when no leads yet */}
            {totalLeads === 0 && d.campaigns.length === 0 && (
              <div style={{
                textAlign: 'center', padding: '60px 20px',
                color: 'var(--txt3)', fontSize: 14,
              }}>
                <Send size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
                <div style={{ fontWeight: 600, marginBottom: 6 }}>No outreach data yet</div>
                <div>Run the sourcing pipeline to start populating leads.</div>
                <code style={{
                  display: 'inline-block', marginTop: 12, padding: '8px 16px',
                  background: 'var(--bg2)', borderRadius: 8, fontSize: 12,
                }}>npm run source -- energy-eu-en juan-stefan</code>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
