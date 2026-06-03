'use client'

import { useState, useCallback } from 'react'
import { Topbar } from '@/components/philly/layout/Topbar'
import { useApi } from '@/hooks/philly/useApi'
import { api } from '@/lib/philly/api/client'
import { useToast } from '@/hooks/philly/useToast'
import {
  Check, X, Edit3, Send, ChevronDown, ExternalLink,
  MessageSquare, UserCheck, RefreshCw,
} from 'lucide-react'

interface MessageRow {
  id: string
  lead_id: string
  account_id: string
  campaign_id: string | null
  type: string
  status: string
  body: string
  char_count: number
  model_used: string | null
  approved_by: string | null
  approved_at: string | null
  sent_at: string | null
  error_message: string | null
  created_at: string
  lead_name: string
  lead_headline: string | null
  lead_linkedin_url: string | null
  account_slug: string
  account_name: string
}

const TYPE_LABELS: Record<string, string> = {
  connection_note: 'Connection Note',
  first_dm: 'First DM',
  follow_up: 'Follow-up',
  nba: 'Next Best Action',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'var(--txt3)',
  dry_run: 'var(--b)',
  pending_approval: 'var(--y)',
  approved: 'var(--g)',
  sent: 'var(--accent)',
  failed: 'var(--r)',
}

export default function MessagesPage() {
  const [statusFilter, setStatusFilter] = useState('pending_approval')
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBody, setEditBody] = useState('')
  const { addToast } = useToast()

  const queryParams = new URLSearchParams({ status: statusFilter })
  if (typeFilter) queryParams.set('type', typeFilter)

  const { data: raw, loading, refetch } = useApi<{ data: MessageRow[] }>(
    `/outreach/messages?${queryParams}`,
    { interval: 15000 },
  )
  const messages = raw?.data ?? []

  const handleAction = useCallback(async (id: string, action: string, body?: string) => {
    const res = await api.patch<{ data: { id: string; status: string } }>(
      '/outreach/messages',
      { id, action, body },
    )
    if (res.error) {
      addToast(res.error, 'error')
    } else {
      addToast(action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : 'Updated', 'success')
      setEditingId(null)
      refetch()
    }
  }, [addToast, refetch])

  const approveAll = useCallback(async () => {
    for (const msg of messages) {
      await handleAction(msg.id, 'approve')
    }
  }, [messages, handleAction])

  const sectionStyle: React.CSSProperties = {
    background: 'var(--panel)', border: '1px solid var(--border)',
    borderRadius: 12, marginBottom: 12, overflow: 'hidden',
  }

  return (
    <div>
      <Topbar title="Message Review" sub={`${messages.length} to review`} />

      <div style={{ padding: '24px 28px', maxWidth: 960 }}>
        {/* Filter bar */}
        <div style={{
          display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap',
        }}>
          {['pending_approval', 'draft', 'approved', 'sent', 'failed'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: `1px solid ${statusFilter === s ? 'var(--accent)' : 'var(--border)'}`,
                background: statusFilter === s ? 'var(--accent)' : 'var(--panel)',
                color: statusFilter === s ? '#fff' : 'var(--txt2)',
                cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.04em',
              }}
            >
              {s.replace('_', ' ')}
            </button>
          ))}

          <div style={{ flex: 1 }} />

          <select
            value={typeFilter ?? ''}
            onChange={e => setTypeFilter(e.target.value || null)}
            style={{
              padding: '6px 12px', borderRadius: 8, fontSize: 12,
              border: '1px solid var(--border)', background: 'var(--panel)',
              color: 'var(--txt)', cursor: 'pointer',
            }}
          >
            <option value="">All types</option>
            <option value="connection_note">Connection Notes</option>
            <option value="first_dm">First DMs</option>
            <option value="follow_up">Follow-ups</option>
            <option value="nba">NBA</option>
          </select>

          {statusFilter === 'pending_approval' && messages.length > 0 && (
            <button
              onClick={approveAll}
              style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: 'none', background: 'var(--g)', color: '#fff',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <Check size={12} /> Approve All ({messages.length})
            </button>
          )}

          <button
            onClick={() => refetch()}
            style={{
              padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--panel)', cursor: 'pointer', color: 'var(--txt3)',
              display: 'flex', alignItems: 'center',
            }}
          >
            <RefreshCw size={13} />
          </button>
        </div>

        {loading && messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--txt3)' }}>
            Loading queue
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--txt3)' }}>
            <MessageSquare size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
            <div style={{ fontWeight: 600 }}>No {statusFilter.replace('_', ' ')} messages</div>
            <div style={{ marginTop: 6, fontSize: 13 }}>
              Run dispatch to generate drafts.
            </div>
            <code style={{
              display: 'inline-block', marginTop: 12, padding: '6px 12px',
              background: 'var(--bg2)', borderRadius: 6, fontSize: 12,
            }}>npm run dispatch</code>
          </div>
        )}

        {/* Message cards */}
        {messages.map((msg) => (
          <div key={msg.id} style={sectionStyle}>
            {/* Header */}
            <div style={{
              padding: '12px 16px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--txt)' }}>
                    {msg.lead_name}
                  </span>
                  {msg.lead_linkedin_url && (
                    <a
                      href={msg.lead_linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--accent)', display: 'flex' }}
                    >
                      <ExternalLink size={12} />
                    </a>
                  )}
                  <span style={{
                    padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                    textTransform: 'uppercase',
                    background: `${STATUS_COLORS[msg.status] ?? 'var(--txt3)'}20`,
                    color: STATUS_COLORS[msg.status] ?? 'var(--txt3)',
                  }}>
                    {msg.status.replace('_', ' ')}
                  </span>
                </div>
                {msg.lead_headline && (
                  <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 2 }}>
                    {msg.lead_headline}
                  </div>
                )}
              </div>

              <div style={{ textAlign: 'right', fontSize: 10, color: 'var(--txt3)' }}>
                <div>{TYPE_LABELS[msg.type] ?? msg.type}</div>
                <div>via {msg.account_name}</div>
                <div>{new Date(msg.created_at).toLocaleDateString()}</div>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '14px 16px' }}>
              {editingId === msg.id ? (
                <textarea
                  value={editBody}
                  onChange={e => setEditBody(e.target.value)}
                  style={{
                    width: '100%', minHeight: 120, padding: 12, borderRadius: 8,
                    border: '1px solid var(--accent)', background: 'var(--bg2)',
                    color: 'var(--txt)', fontSize: 13, fontFamily: 'inherit',
                    resize: 'vertical', outline: 'none',
                  }}
                />
              ) : (
                <div style={{
                  fontSize: 13, lineHeight: 1.6, color: 'var(--txt)',
                  whiteSpace: 'pre-wrap', fontFamily: 'inherit',
                }}>
                  {msg.body}
                </div>
              )}

              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                marginTop: 10, fontSize: 10, color: 'var(--txt3)',
              }}>
                <span className="mono">{msg.char_count} chars</span>
                {msg.model_used && <span>• {msg.model_used}</span>}
                {msg.approved_by && <span>• approved by {msg.approved_by}</span>}
                {msg.sent_at && <span>• sent {new Date(msg.sent_at).toLocaleString()}</span>}
                {msg.error_message && (
                  <span style={{ color: 'var(--r)' }}>• {msg.error_message}</span>
                )}
              </div>
            </div>

            {/* Actions */}
            {(msg.status === 'pending_approval' || msg.status === 'draft') && (
              <div style={{
                padding: '10px 16px', borderTop: '1px solid var(--border)',
                display: 'flex', gap: 8,
              }}>
                {editingId === msg.id ? (
                  <>
                    <button
                      onClick={() => handleAction(msg.id, 'edit', editBody)}
                      style={{
                        padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        border: 'none', background: 'var(--accent)', color: 'var(--accent-fg)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      <Check size={12} /> Save Edit
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      style={{
                        padding: '6px 14px', borderRadius: 8, fontSize: 12,
                        border: '1px solid var(--border)', background: 'var(--panel)',
                        color: 'var(--txt2)', cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleAction(msg.id, 'approve')}
                      style={{
                        padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        border: 'none', background: 'var(--g)', color: '#fff', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      <Check size={12} /> Approve
                    </button>
                    <button
                      onClick={() => { setEditingId(msg.id); setEditBody(msg.body) }}
                      style={{
                        padding: '6px 14px', borderRadius: 8, fontSize: 12,
                        border: '1px solid var(--border)', background: 'var(--panel)',
                        color: 'var(--txt)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      <Edit3 size={12} /> Edit
                    </button>
                    <button
                      onClick={() => handleAction(msg.id, 'reject')}
                      style={{
                        padding: '6px 14px', borderRadius: 8, fontSize: 12,
                        border: '1px solid var(--border)', background: 'var(--panel)',
                        color: 'var(--r)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      <X size={12} /> Reject
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
