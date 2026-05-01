'use client'

import { useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Topbar } from '@/components/philly/layout/Topbar'
import { useApi } from '@/hooks/philly/useApi'
import { api } from '@/lib/philly/api/client'
import { useToast } from '@/hooks/philly/useToast'
import {
  ArrowLeft, ExternalLink, Building2, MapPin, User,
  MessageSquare, CornerDownLeft, Shield, Clock, Star, Ban,
  ChevronDown, ChevronUp, Edit3, Check, Link2,
} from 'lucide-react'

/* ── Types ─────────────────────────────────────────────── */

interface TimelineEntry {
  id: string
  kind: 'message' | 'reply'
  type?: string
  status?: string
  classification?: string
  classification_confidence?: number
  body: string
  char_count?: number
  model_used?: string | null
  approved_at?: string | null
  sent_at?: string | null
  error_message?: string | null
  timestamp: string
}

interface LeadDetail {
  lead: {
    id: string; first_name: string; last_name: string; headline: string | null
    title: string | null; seniority: string | null; country: string; region: string | null
    linkedin_url: string; language_pref: string; icp_score: number | null
    icp_segment: number | null; priority: string; status: string
    do_not_contact: boolean; dnc_reason: string | null; source: string
    followup_count: number; connections_count: number | null; notes: string | null
    assigned_at: string | null; connection_sent_at: string | null
    connection_accepted_at: string | null; first_dm_sent_at: string | null
    last_reply_at: string | null; discovery_call_at: string | null
    partner_signed_at: string | null; handed_off_at: string | null
    enriched_at: string | null; enrichment_confidence: number | null
    created_at: string; updated_at: string
  }
  company: {
    id: string; name: string; website: string | null; country: string
    region: string | null; employee_count: number | null
    specializations: string[]; installq_registered: boolean
    rescert_registered: boolean; notes: string | null
  } | null
  account: {
    id: string; slug: string; display_name: string; real_human_name: string
    linkedin_url: string; status: string
  } | null
  campaign: {
    id: string; slug: string; name: string; type: string
    description: string | null; status: string
  } | null
  messages: any[]
  replies: any[]
  gdpr_events: { id: string; event_type: string; details: any; created_at: string }[]
  timeline: TimelineEntry[]
}

/* ── Helpers ───────────────────────────────────────────── */

const STATUS_LABELS: Record<string, string> = {
  sourced: 'Sourced', enriched: 'Enriched', icp_scored: 'ICP Scored',
  assigned: 'Assigned', connection_sent: 'Conn. Sent',
  connection_accepted: 'Accepted', first_dm_sent: '1st DM Sent',
  follow_up_sent: 'Follow-up', reply_received: 'Reply',
  reply_classified: 'Classified', nba_sent: 'NBA Sent',
  discovery_call_booked: 'Call Booked', partner_signed: 'Signed',
  handed_off: 'Handed Off', disqualified: 'Disqualified',
  do_not_contact: 'DNC', not_interested: 'Not Interested',
  dormant_90d: 'Dormant',
}

const MSG_TYPE_LABELS: Record<string, string> = {
  connection_note: 'Connection Note',
  first_dm: 'First DM',
  follow_up: 'Follow-up',
  nba: 'Next Best Action',
}

const REPLY_COLORS: Record<string, string> = {
  interested: 'var(--g)',
  question: 'var(--b)',
  not_now: 'var(--y)',
  not_interested: 'var(--r)',
  do_not_contact: 'var(--r)',
  unrelated: 'var(--txt3)',
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function formatDateTime(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

function StatusBadge({ status, large }: { status: string; large?: boolean }) {
  const colors: Record<string, string> = {
    sourced: 'var(--txt3)', enriched: 'var(--txt3)', icp_scored: 'var(--b)',
    assigned: 'var(--b)', connection_sent: 'var(--y)',
    connection_accepted: 'var(--g)', first_dm_sent: 'var(--accent)',
    follow_up_sent: 'var(--accent)', reply_received: 'var(--g)',
    reply_classified: 'var(--g)', discovery_call_booked: 'var(--g)',
    partner_signed: 'var(--g)', handed_off: 'var(--g)',
    disqualified: 'var(--r)', do_not_contact: 'var(--r)',
    not_interested: 'var(--y)', dormant_90d: 'var(--txt3)',
    // account statuses
    active: 'var(--g)', warming: 'var(--y)', halted: 'var(--r)',
    paused: 'var(--y)', archived: 'var(--txt3)',
  }
  const c = colors[status] ?? 'var(--txt3)'
  return (
    <span style={{
      display: 'inline-block',
      padding: large ? '3px 10px' : '2px 8px',
      borderRadius: 6,
      fontSize: large ? 11 : 10,
      fontWeight: 600,
      textTransform: 'uppercase',
      background: `${c}20`,
      color: c,
    }}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

/* ── Component ────────────────────────────────────────── */

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { addToast } = useToast()

  const { data: raw, loading, refetch } = useApi<{ data: LeadDetail }>(
    `/outreach/leads/${id}`,
    { interval: 30000 },
  )
  const d = raw?.data

  const [showGdpr, setShowGdpr] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState('')

  const saveNotes = useCallback(async () => {
    const res = await api.patch<any>(`/outreach/leads/${id}`, { notes })
    if (res.error) {
      addToast(res.error, 'error')
    } else {
      addToast('Notes saved', 'success')
      setEditingNotes(false)
      refetch()
    }
  }, [id, notes, addToast, refetch])

  const markDnc = useCallback(async () => {
    const reason = prompt('Reason for DNC:')
    if (!reason) return
    const res = await api.patch<any>(`/outreach/leads/${id}`, {
      do_not_contact: true,
      dnc_reason: reason,
      status: 'do_not_contact',
    })
    if (res.error) {
      addToast(res.error, 'error')
    } else {
      addToast('Marked as DNC', 'success')
      refetch()
    }
  }, [id, addToast, refetch])

  const sectionStyle: React.CSSProperties = {
    background: 'var(--panel)', border: '1px solid var(--border)',
    borderRadius: 12, padding: '16px 20px', marginBottom: 16,
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: '0.05em', color: 'var(--txt3)', marginBottom: 3,
  }

  const valStyle: React.CSSProperties = {
    fontSize: 13, color: 'var(--txt)', fontWeight: 500,
  }

  if (loading && !d) {
    return (
      <div>
        <Topbar title="Lead Detail" sub="Loading..." />
        <div style={{ padding: '60px 28px', textAlign: 'center', color: 'var(--txt3)' }}>
          Loading lead data...
        </div>
      </div>
    )
  }

  if (!d) {
    return (
      <div>
        <Topbar title="Lead Not Found" sub="" />
        <div style={{ padding: '60px 28px', textAlign: 'center', color: 'var(--txt3)' }}>
          Lead not found.{' '}
          <Link href="/philly/outreach/leads" style={{ color: 'var(--accent)' }}>
            Back to leads
          </Link>
        </div>
      </div>
    )
  }

  const { lead, company, account, campaign, timeline, gdpr_events } = d

  return (
    <div>
      <Topbar
        title={`${lead.first_name} ${lead.last_name}`}
        sub={lead.title ?? lead.headline ?? 'Lead'}
      />

      <div style={{ padding: '24px 28px', maxWidth: 1200 }}>
        {/* Back link */}
        <Link
          href="/philly/outreach/leads"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 12, color: 'var(--txt3)', textDecoration: 'none',
            marginBottom: 16,
          }}
        >
          <ArrowLeft size={13} /> All leads
        </Link>

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20 }}>
          {/* ─── LEFT SIDEBAR ─── */}
          <div>
            {/* Profile card */}
            <div style={sectionStyle}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: 'var(--accent)20', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  color: 'var(--accent)', fontWeight: 700, fontSize: 16,
                  flexShrink: 0,
                }}>
                  {lead.first_name[0]}{lead.last_name[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--txt)' }}>
                    {lead.first_name} {lead.last_name}
                  </div>
                  {lead.headline && (
                    <div style={{ fontSize: 12, color: 'var(--txt3)', marginTop: 2, lineHeight: 1.3 }}>
                      {lead.headline}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                <StatusBadge status={lead.status} large />
                {lead.do_not_contact && (
                  <span style={{
                    padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                    background: 'var(--r)20', color: 'var(--r)', textTransform: 'uppercase',
                  }}>DNC</span>
                )}
                {lead.priority === 'high' && (
                  <span style={{
                    padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                    background: 'var(--y)20', color: 'var(--y)', textTransform: 'uppercase',
                  }}>High Priority</span>
                )}
              </div>

              <a
                href={lead.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  border: '1px solid var(--border)', color: 'var(--accent)',
                  textDecoration: 'none', background: 'var(--bg2)',
                }}
              >
                <Link2 size={13} /> View LinkedIn Profile <ExternalLink size={11} />
              </a>

              {/* Key fields */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px',
                marginTop: 16,
              }}>
                <div>
                  <div style={labelStyle}>ICP Score</div>
                  <div style={valStyle} className="mono">
                    {lead.icp_score ?? '—'}
                    {lead.icp_segment && (
                      <span style={{ fontSize: 10, color: 'var(--txt3)', marginLeft: 4 }}>
                        Tier {lead.icp_segment}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div style={labelStyle}>Seniority</div>
                  <div style={{ ...valStyle, textTransform: 'capitalize' }}>
                    {lead.seniority?.replace('_', ' ') ?? '—'}
                  </div>
                </div>
                <div>
                  <div style={labelStyle}>Country</div>
                  <div style={valStyle}>
                    <MapPin size={11} style={{ marginRight: 3, verticalAlign: '-1px' }} />
                    {lead.country}{lead.region ? `, ${lead.region}` : ''}
                  </div>
                </div>
                <div>
                  <div style={labelStyle}>Language</div>
                  <div style={{ ...valStyle, textTransform: 'uppercase' }}>{lead.language_pref}</div>
                </div>
                <div>
                  <div style={labelStyle}>Connections</div>
                  <div style={valStyle} className="mono">{lead.connections_count ?? '—'}</div>
                </div>
                <div>
                  <div style={labelStyle}>Follow-ups</div>
                  <div style={valStyle} className="mono">{lead.followup_count}</div>
                </div>
                <div>
                  <div style={labelStyle}>Source</div>
                  <div style={{ ...valStyle, fontSize: 11 }}>{lead.source}</div>
                </div>
                <div>
                  <div style={labelStyle}>Added</div>
                  <div style={{ ...valStyle, fontSize: 11 }}>{formatDate(lead.created_at)}</div>
                </div>
              </div>

              {/* Actions */}
              {!lead.do_not_contact && (
                <button
                  onClick={markDnc}
                  style={{
                    marginTop: 16, padding: '6px 12px', borderRadius: 8,
                    fontSize: 11, fontWeight: 600, border: '1px solid var(--r)40',
                    background: 'transparent', color: 'var(--r)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <Ban size={11} /> Mark as Do Not Contact
                </button>
              )}
              {lead.dnc_reason && (
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--r)' }}>
                  DNC reason: {lead.dnc_reason}
                </div>
              )}
            </div>

            {/* Company card */}
            {company && (
              <div style={sectionStyle}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 12, fontWeight: 700, color: 'var(--txt)', marginBottom: 12,
                }}>
                  <Building2 size={14} /> Company
                </div>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--txt)' }}>
                  {company.name}
                </div>
                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12, color: 'var(--accent)', display: 'block', marginTop: 4 }}
                  >
                    {company.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px',
                  marginTop: 12,
                }}>
                  <div>
                    <div style={labelStyle}>Country</div>
                    <div style={valStyle}>{company.country}{company.region ? `, ${company.region}` : ''}</div>
                  </div>
                  <div>
                    <div style={labelStyle}>Employees</div>
                    <div style={valStyle} className="mono">{company.employee_count ?? '—'}</div>
                  </div>
                </div>
                {company.specializations?.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={labelStyle}>Specializations</div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                      {company.specializations.map(s => (
                        <span key={s} style={{
                          padding: '2px 8px', borderRadius: 6, fontSize: 10,
                          background: 'var(--bg2)', color: 'var(--txt2)',
                        }}>{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                  {company.installq_registered && (
                    <span style={{ fontSize: 10, color: 'var(--g)', fontWeight: 600 }}>
                      <Check size={10} /> InstallQ
                    </span>
                  )}
                  {company.rescert_registered && (
                    <span style={{ fontSize: 10, color: 'var(--g)', fontWeight: 600 }}>
                      <Check size={10} /> ResCert
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Account + Campaign */}
            <div style={sectionStyle}>
              {account && (
                <div style={{ marginBottom: campaign ? 14 : 0 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: 12, fontWeight: 700, color: 'var(--txt)', marginBottom: 8,
                  }}>
                    <User size={14} /> Account
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>
                    {account.display_name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--txt3)' }}>
                    {account.real_human_name} &middot; <StatusBadge status={account.status} />
                  </div>
                </div>
              )}
              {campaign && (
                <div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: 12, fontWeight: 700, color: 'var(--txt)', marginBottom: 8,
                  }}>
                    <Star size={14} /> Campaign
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>
                    {campaign.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--txt3)' }}>
                    {campaign.type} &middot; <StatusBadge status={campaign.status} />
                  </div>
                  {campaign.description && (
                    <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 4 }}>
                      {campaign.description}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notes */}
            <div style={sectionStyle}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 8,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt)' }}>Notes</div>
                <button
                  onClick={() => {
                    if (editingNotes) {
                      saveNotes()
                    } else {
                      setNotes(lead.notes ?? '')
                      setEditingNotes(true)
                    }
                  }}
                  style={{
                    padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                    border: '1px solid var(--border)', background: 'var(--bg2)',
                    color: 'var(--txt2)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 3,
                  }}
                >
                  {editingNotes ? <><Check size={10} /> Save</> : <><Edit3 size={10} /> Edit</>}
                </button>
              </div>
              {editingNotes ? (
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  style={{
                    width: '100%', minHeight: 80, padding: 10, borderRadius: 8,
                    border: '1px solid var(--accent)', background: 'var(--bg2)',
                    color: 'var(--txt)', fontSize: 12, fontFamily: 'inherit',
                    resize: 'vertical', outline: 'none',
                  }}
                  autoFocus
                />
              ) : (
                <div style={{
                  fontSize: 12, color: lead.notes ? 'var(--txt)' : 'var(--txt3)',
                  lineHeight: 1.5, whiteSpace: 'pre-wrap',
                }}>
                  {lead.notes || 'No notes yet.'}
                </div>
              )}
            </div>

            {/* Timeline milestones */}
            <div style={sectionStyle}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt)', marginBottom: 10 }}>
                <Clock size={13} style={{ marginRight: 4, verticalAlign: '-2px' }} />
                Pipeline Timeline
              </div>
              {[
                { label: 'Assigned', date: lead.assigned_at },
                { label: 'Connection Sent', date: lead.connection_sent_at },
                { label: 'Connection Accepted', date: lead.connection_accepted_at },
                { label: 'First DM Sent', date: lead.first_dm_sent_at },
                { label: 'Last Reply', date: lead.last_reply_at },
                { label: 'Discovery Call', date: lead.discovery_call_at },
                { label: 'Partner Signed', date: lead.partner_signed_at },
                { label: 'Handed Off', date: lead.handed_off_at },
              ].map(({ label, date }) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '4px 0', borderBottom: '1px solid var(--border)',
                  fontSize: 12,
                }}>
                  <span style={{ color: date ? 'var(--txt)' : 'var(--txt3)' }}>{label}</span>
                  <span className="mono" style={{ fontSize: 11, color: date ? 'var(--txt2)' : 'var(--txt3)' }}>
                    {formatDate(date)}
                  </span>
                </div>
              ))}
            </div>

            {/* GDPR events */}
            <div style={sectionStyle}>
              <button
                onClick={() => setShowGdpr(!showGdpr)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 700, color: 'var(--txt)', padding: 0,
                }}
              >
                <Shield size={13} />
                GDPR Events ({gdpr_events.length})
                {showGdpr ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
              {showGdpr && gdpr_events.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  {gdpr_events.map(ev => (
                    <div key={ev.id} style={{
                      display: 'flex', justifyContent: 'space-between',
                      padding: '4px 0', borderBottom: '1px solid var(--border)',
                      fontSize: 11,
                    }}>
                      <span style={{ color: 'var(--txt2)' }}>{ev.event_type}</span>
                      <span style={{ color: 'var(--txt3)' }}>{formatDate(ev.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ─── RIGHT: CONVERSATION TIMELINE ─── */}
          <div>
            <div style={{
              fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <MessageSquare size={16} />
              Conversation ({timeline.length} event{timeline.length !== 1 ? 's' : ''})
            </div>

            {timeline.length === 0 ? (
              <div style={{
                ...sectionStyle, textAlign: 'center', padding: 40,
                color: 'var(--txt3)',
              }}>
                <MessageSquare size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No conversation yet</div>
                <div style={{ fontSize: 12 }}>
                  Messages and replies will appear here as the pipeline progresses.
                </div>
              </div>
            ) : (
              <div style={{ position: 'relative', paddingLeft: 24 }}>
                {/* Vertical timeline line */}
                <div style={{
                  position: 'absolute', left: 8, top: 8, bottom: 8,
                  width: 2, background: 'var(--border)', borderRadius: 1,
                }} />

                {timeline.map((entry, idx) => {
                  const isMessage = entry.kind === 'message'
                  const dotColor = isMessage
                    ? (entry.status === 'sent' ? 'var(--accent)' : entry.status === 'failed' ? 'var(--r)' : 'var(--y)')
                    : (REPLY_COLORS[entry.classification ?? ''] ?? 'var(--g)')

                  return (
                    <div key={entry.id} style={{ position: 'relative', marginBottom: 16 }}>
                      {/* Dot */}
                      <div style={{
                        position: 'absolute', left: -20, top: 14,
                        width: 10, height: 10, borderRadius: '50%',
                        background: dotColor, border: '2px solid var(--panel)',
                        zIndex: 1,
                      }} />

                      <div style={{
                        background: 'var(--panel)', border: '1px solid var(--border)',
                        borderRadius: 12, overflow: 'hidden',
                        borderLeft: `3px solid ${dotColor}`,
                      }}>
                        {/* Header */}
                        <div style={{
                          padding: '10px 14px', display: 'flex',
                          alignItems: 'center', justifyContent: 'space-between',
                          borderBottom: '1px solid var(--border)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {isMessage ? (
                              <MessageSquare size={12} color="var(--accent)" />
                            ) : (
                              <CornerDownLeft size={12} color={dotColor} />
                            )}
                            <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--txt)' }}>
                              {isMessage
                                ? (MSG_TYPE_LABELS[entry.type ?? ''] ?? entry.type)
                                : 'Reply'}
                            </span>
                            {isMessage && entry.status && (
                              <span style={{
                                padding: '1px 6px', borderRadius: 4, fontSize: 9,
                                fontWeight: 600, textTransform: 'uppercase',
                                background: `${dotColor}20`, color: dotColor,
                              }}>
                                {entry.status}
                              </span>
                            )}
                            {!isMessage && entry.classification && (
                              <span style={{
                                padding: '1px 6px', borderRadius: 4, fontSize: 9,
                                fontWeight: 600, textTransform: 'uppercase',
                                background: `${dotColor}20`, color: dotColor,
                              }}>
                                {entry.classification}
                                {entry.classification_confidence != null &&
                                  ` ${(entry.classification_confidence * 100).toFixed(0)}%`}
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: 10, color: 'var(--txt3)' }}>
                            {formatDateTime(entry.timestamp)}
                          </span>
                        </div>

                        {/* Body */}
                        <div style={{
                          padding: '12px 14px', fontSize: 13, lineHeight: 1.6,
                          color: 'var(--txt)', whiteSpace: 'pre-wrap',
                        }}>
                          {entry.body}
                        </div>

                        {/* Footer meta */}
                        {(entry.model_used || entry.char_count || entry.error_message) && (
                          <div style={{
                            padding: '6px 14px', borderTop: '1px solid var(--border)',
                            fontSize: 10, color: 'var(--txt3)',
                            display: 'flex', gap: 10,
                          }}>
                            {entry.char_count && (
                              <span className="mono">{entry.char_count} chars</span>
                            )}
                            {entry.model_used && <span>{entry.model_used}</span>}
                            {entry.approved_at && (
                              <span>approved {formatDateTime(entry.approved_at)}</span>
                            )}
                            {entry.error_message && (
                              <span style={{ color: 'var(--r)' }}>{entry.error_message}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
