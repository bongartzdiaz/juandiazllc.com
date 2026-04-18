'use client'

import { useEffect, useState, useCallback } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Webhook, Plus, Trash2, Copy, Check, RefreshCw, ChevronDown, ChevronRight, Info } from 'lucide-react'
import { Modal, FormField } from '@/components/ui/Modal'

interface WebhookRow {
  id: string
  url: string
  events: string // JSON array string
  enabled: boolean
  secret: string
  createdAt: string
  _count?: { deliveries: number }
}

interface WebhookDelivery {
  id: string
  event: string
  statusCode: number | null
  response: string | null
  createdAt: string
}

interface WebhookDetail extends WebhookRow {
  deliveries: WebhookDelivery[]
}

const AVAILABLE_EVENTS: Record<string, string[]> = {
  contact: ['contact.created', 'contact.updated', 'contact.deleted'],
  deal: ['deal.created', 'deal.updated', 'deal.deleted'],
  project: ['project.created', 'project.updated', 'project.deleted'],
  room: ['room.created', 'room.updated', 'room.deleted'],
  reservation: ['reservation.created', 'reservation.updated', 'reservation.deleted'],
  property: ['property.created', 'property.updated', 'property.deleted'],
  showing: ['showing.created', 'showing.updated', 'showing.deleted'],
  offer: ['offer.created', 'offer.updated', 'offer.deleted'],
}

function parseEvents(raw: string): string[] {
  try {
    const p = JSON.parse(raw)
    return Array.isArray(p) ? p : []
  } catch { return [] }
}

function urlHost(url: string): string {
  try { return new URL(url).host } catch { return url }
}

function statusDotColor(enabled: boolean): string {
  return enabled ? '#22c55e' : 'var(--txt3)'
}

export default function WebhooksPage() {
  const [rows, setRows] = useState<WebhookRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [url, setUrl] = useState('')
  const [events, setEvents] = useState<string[]>([])
  const [enabled, setEnabled] = useState(true)
  const [creating, setCreating] = useState(false)

  const [revealedSecret, setRevealedSecret] = useState<{ id: string; secret: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const [expanded, setExpanded] = useState<string | null>(null)
  const [details, setDetails] = useState<Record<string, WebhookDetail>>({})

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/webhooks')
      .then(r => r.json())
      .then(json => setRows(json.data ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const create = async () => {
    if (!url.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), events: events.length ? events : ['*'], enabled }),
      })
      const json = await res.json()
      if (res.ok) {
        setRevealedSecret({ id: json.data.id, secret: json.data.secret })
        setUrl(''); setEvents([]); setEnabled(true)
        setShowCreate(false)
        load()
      } else {
        alert(json.message ?? 'Failed to create webhook')
      }
    } finally {
      setCreating(false)
    }
  }

  const rotate = async (id: string) => {
    if (!confirm('Rotate the signing secret? Existing integrations will break until updated.')) return
    const res = await fetch(`/api/webhooks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rotateSecret: true }),
    })
    const json = await res.json()
    if (res.ok) {
      setRevealedSecret({ id, secret: json.data.secret })
      load()
    }
  }

  const del = async (id: string) => {
    if (!confirm('Delete this webhook? Events will no longer be delivered.')) return
    await fetch(`/api/webhooks/${id}`, { method: 'DELETE' })
    load()
  }

  const loadDetail = useCallback(async (id: string) => {
    const res = await fetch(`/api/webhooks/${id}`)
    const json = await res.json()
    if (res.ok) setDetails(prev => ({ ...prev, [id]: json.data }))
  }, [])

  const retryDelivery = useCallback(async (webhookId: string, deliveryId: string) => {
    try {
      const res = await fetch(`/api/webhooks/${webhookId}/deliveries/${deliveryId}/retry`, { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { alert(json.error ?? 'Retry failed'); return }
      await loadDetail(webhookId)
      load()
    } catch {
      alert('Network error')
    }
  }, [loadDetail, load])

  const toggleExpand = (id: string) => {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    if (!details[id]) loadDetail(id)
  }

  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const toggleEvent = (ev: string) => {
    setEvents(prev => prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev])
  }

  return (
    <>
      <Topbar title="Webhooks" sub="HTTP endpoints called when events happen" />
      <div style={{ padding: '20px 28px 40px' }}>
        {/* Explainer callout */}
        <div style={{
          display: 'flex', gap: 10, alignItems: 'flex-start',
          background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
          borderRadius: 10, padding: '12px 14px', marginBottom: 16,
        }}>
          <Info size={14} style={{ color: 'var(--accent-txt)', marginTop: 2, flexShrink: 0 }} />
          <div style={{ fontSize: 12, color: 'var(--accent-txt)', lineHeight: 1.5 }}>
            Philly will POST a JSON body with an HMAC-SHA256 signature in the{' '}
            <code style={{ fontFamily: 'var(--font-red-hat-mono), monospace', fontSize: 11.5 }}>X-Philly-Signature</code>{' '}
            header to your URL. Verify the signature using the webhook&apos;s signing secret.
          </div>
        </div>

        {/* Revealed secret banner */}
        {revealedSecret && (
          <div style={{
            background: 'var(--g-bg)', border: '1px solid var(--g-border)',
            borderRadius: 10, padding: 16, marginBottom: 18,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--g-txt)', marginBottom: 6 }}>
              This is the signing secret — save it now, you can&apos;t see it again.
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--panel)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '10px 14px',
              fontFamily: 'var(--font-red-hat-mono), monospace', fontSize: 13,
            }}>
              <span style={{ flex: 1, userSelect: 'all', wordBreak: 'break-all' }}>{revealedSecret.secret}</span>
              <button
                onClick={() => copy(revealedSecret.secret)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--txt2)', display: 'flex', alignItems: 'center', gap: 4,
                  fontFamily: 'inherit', fontSize: 11, fontWeight: 600,
                }}
              >
                {copied ? <Check size={14} color="var(--g-txt)" /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <button
              onClick={() => setRevealedSecret(null)}
              style={{
                marginTop: 10, background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--txt3)', fontSize: 11, textDecoration: 'underline',
                fontFamily: 'inherit',
              }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Header row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 14,
        }}>
          <div style={{ fontSize: 13, color: 'var(--txt3)' }}>
            {rows.length} webhook{rows.length === 1 ? '' : 's'} configured
          </div>
          <button
            onClick={() => setShowCreate(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8,
              background: 'var(--accent)', color: 'white', border: 'none',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <Plus size={13} /> New Webhook
          </button>
        </div>

        {/* List */}
        <div style={{
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 12, overflow: 'hidden',
        }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: 'var(--txt3)' }}>
              Loading…
            </div>
          ) : rows.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <Webhook size={32} color="var(--txt3)" style={{ marginBottom: 10 }} />
              <div style={{ fontSize: 13, color: 'var(--txt2)', fontWeight: 600 }}>
                No webhooks yet
              </div>
              <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 4 }}>
                Create a webhook to receive HTTP callbacks on events
              </div>
            </div>
          ) : rows.map((w, i) => {
            const parsed = parseEvents(w.events)
            const isExpanded = expanded === w.id
            const detail = details[w.id]
            return (
              <div key={w.id} style={{
                borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                {/* Row */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '20px 1fr 80px 140px 32px 32px 32px',
                  gap: 12, alignItems: 'center', padding: '12px 16px',
                }}>
                  <button
                    onClick={() => toggleExpand(w.id)}
                    aria-label="Toggle deliveries"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--txt3)', padding: 2, display: 'flex',
                    }}
                  >
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>

                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3,
                    }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: statusDotColor(w.enabled),
                        flexShrink: 0,
                      }} />
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--txt)' }}>
                        {urlHost(w.url)}
                      </span>
                    </div>
                    <div style={{
                      fontSize: 11, color: 'var(--txt3)',
                      fontFamily: 'var(--font-red-hat-mono), monospace',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {w.url}
                    </div>
                  </div>

                  <span style={{
                    padding: '3px 10px', borderRadius: 6,
                    background: 'var(--bg2)', color: 'var(--txt2)',
                    fontSize: 10, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                    textAlign: 'center',
                  }}>
                    {parsed.length} {parsed.length === 1 ? 'event' : 'events'}
                  </span>

                  <div style={{ fontSize: 11, color: 'var(--txt3)' }}>
                    {w._count?.deliveries ? `${w._count.deliveries} deliveries` : 'No deliveries'}
                  </div>

                  <button
                    onClick={() => rotate(w.id)}
                    aria-label="Rotate secret"
                    title="Rotate secret"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--txt2)', padding: 6, borderRadius: 6,
                      display: 'flex', alignItems: 'center',
                    }}
                  >
                    <RefreshCw size={14} />
                  </button>
                  <div />
                  <button
                    onClick={() => del(w.id)}
                    aria-label="Delete webhook"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--r-txt)', padding: 6, borderRadius: 6,
                      display: 'flex', alignItems: 'center',
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Expanded deliveries */}
                {isExpanded && (
                  <div style={{
                    background: 'var(--bg2)', padding: '12px 16px 16px 48px',
                    borderTop: '1px solid var(--border)',
                  }}>
                    <div style={{
                      fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.05em', color: 'var(--txt3)', marginBottom: 8,
                    }}>
                      Recent deliveries
                    </div>
                    {!detail ? (
                      <div style={{ fontSize: 12, color: 'var(--txt3)' }}>Loading…</div>
                    ) : detail.deliveries.length === 0 ? (
                      <div style={{ fontSize: 12, color: 'var(--txt3)' }}>No deliveries yet.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {detail.deliveries.slice(0, 10).map(d => {
                          const ok = d.statusCode != null && d.statusCode >= 200 && d.statusCode < 300
                          return (
                            <div key={d.id} style={{
                              display: 'grid', gridTemplateColumns: '1fr 70px 180px auto',
                              gap: 10, alignItems: 'center',
                              padding: '7px 10px', borderRadius: 7,
                              background: 'var(--panel)', border: '1px solid var(--border)',
                              fontSize: 11.5,
                            }}>
                              <span style={{
                                fontFamily: 'var(--font-red-hat-mono), monospace',
                                color: 'var(--txt2)',
                              }}>{d.event}</span>
                              <span style={{
                                padding: '2px 8px', borderRadius: 6, textAlign: 'center',
                                fontSize: 10, fontWeight: 700,
                                background: ok ? 'var(--g-bg)' : 'var(--r-bg)',
                                color: ok ? 'var(--g-txt)' : 'var(--r-txt)',
                                border: `1px solid ${ok ? 'var(--g-border)' : 'var(--r-border)'}`,
                              }}>
                                {d.statusCode ?? 'ERR'}
                              </span>
                              <span style={{ color: 'var(--txt3)', fontSize: 10.5 }}>
                                {new Date(d.createdAt).toLocaleString()}
                              </span>
                              {!ok ? (
                                <button
                                  onClick={() => retryDelivery(w.id, d.id)}
                                  title="Retry this delivery"
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                    padding: '3px 8px', borderRadius: 5,
                                    background: 'var(--accent)', color: '#fff', border: 'none',
                                    fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                                  }}
                                >
                                  <RefreshCw size={9} /> Retry
                                </button>
                              ) : <span />}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Create modal */}
      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); setUrl(''); setEvents([]); setEnabled(true) }}
        title="New Webhook"
        subtitle="Send HTTP POST callbacks on events"
        size="md"
      >
        <FormField label="URL" required>
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://example.com/webhook"
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 7,
              border: '1px solid var(--border)', background: 'var(--bg2)',
              color: 'var(--txt)', fontSize: 13, fontFamily: 'inherit',
            }}
          />
        </FormField>

        <FormField label="Events">
          <div style={{ fontSize: 11, color: 'var(--txt3)', marginBottom: 8 }}>
            Leave empty to subscribe to all events (*)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(AVAILABLE_EVENTS).map(([group, list]) => (
              <div key={group} style={{
                padding: '10px 12px', borderRadius: 8,
                background: 'var(--bg2)', border: '1px solid var(--border)',
              }}>
                <div style={{
                  fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.05em', color: 'var(--txt3)', marginBottom: 6,
                }}>
                  {group}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {list.map(ev => {
                    const active = events.includes(ev)
                    return (
                      <label key={ev} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
                        background: active ? 'var(--accent-bg)' : 'var(--panel)',
                        border: `1px solid ${active ? 'var(--accent-border)' : 'var(--border)'}`,
                        fontSize: 11, color: active ? 'var(--accent-txt)' : 'var(--txt2)',
                        fontFamily: 'var(--font-red-hat-mono), monospace',
                        fontWeight: active ? 600 : 500,
                      }}>
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => toggleEvent(ev)}
                          style={{ margin: 0, cursor: 'pointer' }}
                        />
                        {ev}
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </FormField>

        <FormField label="Enabled">
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={e => setEnabled(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ fontSize: 12, color: 'var(--txt2)' }}>
              Deliver events to this endpoint immediately
            </span>
          </label>
        </FormField>

        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 8 }}>
          <button
            onClick={() => { setShowCreate(false); setUrl(''); setEvents([]); setEnabled(true) }}
            style={{
              padding: '8px 16px', borderRadius: 8,
              background: 'var(--bg2)', color: 'var(--txt2)',
              border: '1px solid var(--border)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
          <button
            onClick={create}
            disabled={!url.trim() || creating}
            style={{
              padding: '8px 16px', borderRadius: 8,
              background: 'var(--accent)', color: 'white', border: 'none',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              opacity: url.trim() && !creating ? 1 : 0.5, fontFamily: 'inherit',
            }}
          >
            {creating ? 'Creating…' : 'Create Webhook'}
          </button>
        </div>
      </Modal>
    </>
  )
}
