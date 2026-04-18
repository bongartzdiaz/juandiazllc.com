'use client'

import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/philly/layout/Topbar'
import { KpiCard } from '@/components/philly/ui/KpiCard'
import { useEntitySubscription } from '@/hooks/philly/useRealtime'
import { Mail, Send, Plus, X, RefreshCw, Paperclip, Clock } from 'lucide-react'

interface EmailAccount {
  id: string
  organizationId: string
  provider: string
  email: string
  displayName: string | null
  status: string
  lastSyncAt: string | null
  createdAt: string
}

const STATUS_COLORS: Record<string, { bg: string; txt: string }> = {
  connected: { bg: 'var(--g-bg)', txt: 'var(--g-txt)' },
  disconnected: { bg: 'var(--bg2)', txt: 'var(--txt3)' },
}

const PROVIDER_INFO: Record<string, { label: string; color: string }> = {
  smtp: { label: 'SMTP', color: '#6b7280' },
  gmail: { label: 'Gmail', color: '#ea4335' },
  outlook: { label: 'Outlook', color: '#0078d4' },
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--bg2)',
  fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block',
}

export default function EmailPage() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Add Account modal
  const [showAdd, setShowAdd] = useState(false)
  const [addProvider, setAddProvider] = useState<'smtp' | 'gmail' | 'outlook'>('smtp')
  const [addEmail, setAddEmail] = useState('')
  const [addDisplayName, setAddDisplayName] = useState('')
  const [addSubmitting, setAddSubmitting] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // Compose modal
  const [showCompose, setShowCompose] = useState(false)
  const [cmpTo, setCmpTo] = useState('')
  const [cmpCc, setCmpCc] = useState('')
  const [cmpBcc, setCmpBcc] = useState('')
  const [cmpSubject, setCmpSubject] = useState('')
  const [cmpBody, setCmpBody] = useState('')
  const [cmpShowCcBcc, setCmpShowCcBcc] = useState(false)
  const [cmpSending, setCmpSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  const fetchAccounts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/philly/api/email/accounts')
      const json = await res.json()
      const list: EmailAccount[] = json.data ?? []
      setAccounts(list)
      if (list.length > 0 && !list.some(a => a.id === selectedId)) {
        setSelectedId(list[0].id)
      } else if (list.length === 0) {
        setSelectedId(null)
      }
    } catch { setAccounts([]) }
    finally { setLoading(false) }
  }, [selectedId])

  useEffect(() => { fetchAccounts() }, [fetchAccounts])
  useEntitySubscription('emailAccount', fetchAccounts)
  useEntitySubscription('email', fetchAccounts)

  const connectedCount = accounts.filter(a => a.status === 'connected').length
  const selected = accounts.find(a => a.id === selectedId) ?? null

  const timeAgo = (dateStr: string | null) => {
    if (!dateStr) return 'never'
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  }

  const closeAddModal = () => {
    setShowAdd(false)
    setAddError(null)
  }

  const closeComposeModal = () => {
    setShowCompose(false)
    setSendError(null)
  }

  const handleCreateAccount = async () => {
    if (addSubmitting) return
    if (!addEmail) {
      setAddError('Email is required')
      return
    }
    setAddSubmitting(true)
    setAddError(null)
    try {
      const res = await fetch('/philly/api/email/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: addProvider,
          email: addEmail,
          displayName: addDisplayName || undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAddError(json?.error ?? json?.message ?? `Failed (${res.status})`)
        return
      }
      setAddProvider('smtp')
      setAddEmail('')
      setAddDisplayName('')
      setAddError(null)
      setShowAdd(false)
      fetchAccounts()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setAddSubmitting(false)
    }
  }

  const handleSend = async () => {
    if (cmpSending) return
    if (!selected || !cmpTo || !cmpSubject) {
      setSendError('To and Subject are required')
      return
    }
    setCmpSending(true)
    setSendError(null)
    try {
      const res = await fetch('/philly/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: selected.id,
          to: cmpTo,
          subject: cmpSubject,
          body: cmpBody,
          cc: cmpCc || undefined,
          bcc: cmpBcc || undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSendError(json?.error ?? json?.message ?? `Failed (${res.status})`)
        return
      }
      setCmpTo(''); setCmpCc(''); setCmpBcc('')
      setCmpSubject(''); setCmpBody('')
      setCmpShowCcBcc(false)
      setSendError(null)
      setShowCompose(false)
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setCmpSending(false)
    }
  }

  return (
    <>
      <Topbar title="Email" sub="Manage accounts and send messages" onAdd={() => setShowAdd(true)} addLabel="Connect Account" />
      <div style={{ padding: '18px 24px 40px' }}>
        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard icon="mail" label="Total Accounts" value={String(accounts.length)} />
          <KpiCard icon="check-circle" label="Connected" value={String(connectedCount)} />
          <KpiCard icon="inbox" label="Messages Today" value="0" />
          <KpiCard icon="clock" label="Pending" value="0" />
        </div>

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, alignItems: 'flex-start' }}>
          {/* LEFT: Account list */}
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', borderBottom: '1px solid var(--border)',
              fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.06em', color: 'var(--txt3)',
            }}>
              <span>Accounts</span>
              <button
                onClick={fetchAccounts}
                title="Refresh"
                style={{
                  background: 'none', border: 'none', padding: 4,
                  color: 'var(--txt3)', cursor: 'pointer', display: 'flex',
                }}
              ><RefreshCw size={12} /></button>
            </div>

            {loading ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>Loading...</div>
            ) : accounts.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>
                <Mail size={28} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <div style={{ marginBottom: 12 }}>No email accounts connected</div>
                <button
                  onClick={() => setShowAdd(true)}
                  style={{
                    padding: '6px 14px', borderRadius: 8, border: 'none',
                    background: 'var(--accent)', color: '#fff',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >Connect one</button>
              </div>
            ) : accounts.map((acc, idx) => {
              const info = PROVIDER_INFO[acc.provider] ?? { label: acc.provider, color: '#6b7280' }
              const sc = STATUS_COLORS[acc.status] ?? { bg: 'var(--bg2)', txt: 'var(--txt2)' }
              const isSelected = acc.id === selectedId
              return (
                <div
                  key={acc.id}
                  onClick={() => setSelectedId(acc.id)}
                  style={{
                    padding: '12px 14px',
                    borderBottom: idx < accounts.length - 1 ? '1px solid var(--border)' : 'none',
                    background: isSelected ? 'var(--accent-bg)' : 'transparent',
                    borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
                    cursor: 'pointer',
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: info.color + '18', color: info.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Mail size={15} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2,
                    }}>
                      <span style={{
                        fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                        color: info.color, letterSpacing: '0.04em',
                      }}>{info.label}</span>
                      <span style={{
                        padding: '1px 6px', borderRadius: 5, fontSize: 9, fontWeight: 600,
                        textTransform: 'uppercase',
                        background: sc.bg, color: sc.txt,
                      }}>{acc.status}</span>
                    </div>
                    <div style={{
                      fontSize: 12, fontWeight: 600, color: 'var(--txt)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{acc.email}</div>
                    {acc.displayName && (
                      <div style={{
                        fontSize: 11, color: 'var(--txt2)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{acc.displayName}</div>
                    )}
                    <div style={{
                      fontSize: 10, color: 'var(--txt3)',
                      fontFamily: 'var(--font-red-hat-mono), monospace',
                      display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 3,
                    }}>
                      <Clock size={9} /> sync {timeAgo(acc.lastSyncAt)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* RIGHT: Compose + thread placeholder */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{
              background: 'var(--panel)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '12px 16px',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>
                  {selected ? selected.email : 'No account selected'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--txt3)' }}>
                  {selected
                    ? `Send from ${PROVIDER_INFO[selected.provider]?.label ?? selected.provider}`
                    : 'Connect an account to start sending'}
                </div>
              </div>
              <button
                onClick={() => setShowCompose(true)}
                disabled={!selected}
                style={{
                  padding: '8px 14px', borderRadius: 8, border: 'none',
                  background: selected ? 'var(--accent)' : 'var(--bg2)',
                  color: selected ? '#fff' : 'var(--txt3)',
                  fontSize: 12, fontWeight: 600,
                  cursor: selected ? 'pointer' : 'not-allowed',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontFamily: 'inherit',
                }}
              >
                <Plus size={13} /> Compose
              </button>
            </div>

            <div style={{
              background: 'var(--panel)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '60px 20px', textAlign: 'center',
              boxShadow: 'var(--shadow-sm)',
              color: 'var(--txt3)', fontSize: 13,
            }}>
              <Mail size={36} style={{ margin: '0 auto 14px', opacity: 0.25 }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt2)', marginBottom: 6 }}>
                Email thread view coming soon
              </div>
              <div style={{ fontSize: 12, color: 'var(--txt3)', maxWidth: 380, margin: '0 auto' }}>
                Inbound and outbound messages will appear here once the mailbox sync endpoint is live.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Account Modal */}
      {showAdd && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.35)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }} onClick={closeAddModal}>
          <div
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="email-account-add-title"
            style={{
              background: 'var(--panel)', borderRadius: 16,
              border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)',
              padding: '24px 28px', width: 420, maxHeight: '80vh', overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <div>
                <div id="email-account-add-title" style={{ fontSize: 16, fontWeight: 700 }}>Connect Email Account</div>
                <div style={{ fontSize: 12, color: 'var(--txt3)', marginTop: 2 }}>Add a mailbox to send and receive messages</div>
              </div>
              <button onClick={closeAddModal} aria-label="Close" style={{
                background: 'none', border: 'none', color: 'var(--txt3)',
                cursor: 'pointer', padding: 2, display: 'flex',
              }}><X size={16} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
              <div>
                <label style={labelStyle}>Provider</label>
                <select
                  value={addProvider}
                  onChange={e => setAddProvider(e.target.value as 'smtp' | 'gmail' | 'outlook')}
                  style={inputStyle}
                >
                  <option value="smtp">SMTP</option>
                  <option value="gmail">Gmail</option>
                  <option value="outlook">Outlook</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Email Address</label>
                <input
                  type="email"
                  value={addEmail}
                  onChange={e => setAddEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Display Name</label>
                <input
                  value={addDisplayName}
                  onChange={e => setAddDisplayName(e.target.value)}
                  placeholder="Optional — shown on outgoing mail"
                  style={inputStyle}
                />
              </div>
            </div>

            {addError && (
              <div role="alert" style={{
                padding: '8px 12px', borderRadius: 8, marginTop: 12,
                background: 'var(--r-bg)', border: '1px solid var(--r-border)',
                color: 'var(--r-txt)', fontSize: 12, fontWeight: 600,
              }}>{addError}</div>
            )}
            <button
              onClick={handleCreateAccount}
              disabled={!addEmail || addSubmitting}
              style={{
                width: '100%', marginTop: 18, padding: '10px 0',
                borderRadius: 10, border: 'none',
                background: (!addEmail || addSubmitting) ? 'var(--bg2)' : 'var(--accent)',
                color: (!addEmail || addSubmitting) ? 'var(--txt3)' : '#fff',
                fontSize: 13, fontWeight: 600,
                cursor: (!addEmail || addSubmitting) ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >{addSubmitting ? 'Connecting...' : 'Connect Account'}</button>
          </div>
        </div>
      )}

      {/* Compose Modal */}
      {showCompose && selected && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.35)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }} onClick={closeComposeModal}>
          <div
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="email-compose-title"
            style={{
              background: 'var(--panel)', borderRadius: 16,
              border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)',
              padding: '24px 28px', width: 560, maxHeight: '85vh', overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <div>
                <div id="email-compose-title" style={{ fontSize: 16, fontWeight: 700 }}>New Message</div>
                <div style={{ fontSize: 12, color: 'var(--txt3)', marginTop: 2 }}>
                  From <span style={{ fontFamily: 'var(--font-red-hat-mono), monospace', color: 'var(--txt2)' }}>{selected.email}</span>
                </div>
              </div>
              <button onClick={closeComposeModal} aria-label="Close" style={{
                background: 'none', border: 'none', color: 'var(--txt3)',
                cursor: 'pointer', padding: 2, display: 'flex',
              }}><X size={16} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
              <div>
                <label style={labelStyle}>To</label>
                <input
                  value={cmpTo}
                  onChange={e => setCmpTo(e.target.value)}
                  placeholder="recipient@example.com"
                  style={inputStyle}
                />
              </div>

              {!cmpShowCcBcc ? (
                <button
                  onClick={() => setCmpShowCcBcc(true)}
                  style={{
                    alignSelf: 'flex-start', background: 'none', border: 'none',
                    color: 'var(--txt3)', fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', padding: 0, fontFamily: 'inherit',
                  }}
                >+ Add Cc / Bcc</button>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={labelStyle}>Cc</label>
                    <input value={cmpCc} onChange={e => setCmpCc(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Bcc</label>
                    <input value={cmpBcc} onChange={e => setCmpBcc(e.target.value)} style={inputStyle} />
                  </div>
                </div>
              )}

              <div>
                <label style={labelStyle}>Subject</label>
                <input
                  value={cmpSubject}
                  onChange={e => setCmpSubject(e.target.value)}
                  placeholder="Subject line"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Message</label>
                <textarea
                  value={cmpBody}
                  onChange={e => setCmpBody(e.target.value)}
                  placeholder="Write your message..."
                  rows={10}
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 180, lineHeight: 1.5 }}
                />
              </div>
            </div>

            {sendError && (
              <div role="alert" style={{
                padding: '8px 12px', borderRadius: 8, marginTop: 12,
                background: 'var(--r-bg)', border: '1px solid var(--r-border)',
                color: 'var(--r-txt)', fontSize: 12, fontWeight: 600,
              }}>{sendError}</div>
            )}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginTop: 18, gap: 12,
            }}>
              <button
                disabled
                title="Attachments coming soon"
                style={{
                  background: 'none', border: '1px solid var(--border)',
                  color: 'var(--txt3)', fontSize: 11, padding: '7px 12px',
                  borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6,
                  cursor: 'not-allowed', fontFamily: 'inherit',
                }}
              >
                <Paperclip size={12} /> Attach
              </button>

              <button
                onClick={handleSend}
                disabled={!cmpTo || !cmpSubject || cmpSending}
                style={{
                  padding: '10px 20px', borderRadius: 10, border: 'none',
                  background: (!cmpTo || !cmpSubject || cmpSending) ? 'var(--bg2)' : 'var(--accent)',
                  color: (!cmpTo || !cmpSubject || cmpSending) ? 'var(--txt3)' : '#fff',
                  fontSize: 13, fontWeight: 600,
                  cursor: (!cmpTo || !cmpSubject || cmpSending) ? 'not-allowed' : 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontFamily: 'inherit',
                }}
              >
                <Send size={13} /> {cmpSending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
