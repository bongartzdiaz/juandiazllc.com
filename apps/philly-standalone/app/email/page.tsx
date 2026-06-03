'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/philly/layout/Topbar'
import { KpiCard } from '@/components/philly/ui/KpiCard'
import { useApi } from '@/hooks/philly/useApi'
import { useEntitySubscription } from '@/hooks/philly/useRealtime'
import { Mail, Send, Plus, X, RefreshCw, Paperclip, Clock } from 'lucide-react'
import { ListLoading, ListEmpty, ListError } from '@/components/philly/ui/ListStates'

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
  const t = useTranslations('email')
  const accountsQuery = useApi<{ data: EmailAccount[] }>('/email/accounts')
  const accounts = accountsQuery.data?.data ?? []
  const loading = accountsQuery.loading
  const fetchAccounts = accountsQuery.refetch
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

  useEffect(() => {
    if (accounts.length === 0) {
      if (selectedId !== null) setSelectedId(null)
      return
    }
    if (!accounts.some(a => a.id === selectedId)) {
      setSelectedId(accounts[0].id)
    }
  }, [accounts, selectedId])

  useEntitySubscription('emailAccount', fetchAccounts)
  useEntitySubscription('email', fetchAccounts)

  const connectedCount = accounts.filter(a => a.status === 'connected').length
  const selected = accounts.find(a => a.id === selectedId) ?? null

  const timeAgo = (dateStr: string | null) => {
    if (!dateStr) return t('accounts.timeAgo.never')
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return t('accounts.timeAgo.justNow')
    if (mins < 60) return t('accounts.timeAgo.minutes', { n: mins })
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return t('accounts.timeAgo.hours', { n: hrs })
    const days = Math.floor(hrs / 24)
    return t('accounts.timeAgo.days', { n: days })
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
      setAddError(t('addModal.emailRequired'))
      return
    }
    setAddSubmitting(true)
    setAddError(null)
    try {
      const res = await fetch('/api/email/accounts', {
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
        setAddError(json?.error ?? json?.message ?? t('addModal.genericFailed', { status: res.status }))
        return
      }
      setAddProvider('smtp')
      setAddEmail('')
      setAddDisplayName('')
      setAddError(null)
      setShowAdd(false)
      fetchAccounts()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : t('addModal.networkError'))
    } finally {
      setAddSubmitting(false)
    }
  }

  const handleSend = async () => {
    if (cmpSending) return
    if (!selected || !cmpTo || !cmpSubject) {
      setSendError(t('compose.toSubjectRequired'))
      return
    }
    setCmpSending(true)
    setSendError(null)
    try {
      const res = await fetch('/api/email/send', {
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
        setSendError(json?.error ?? json?.message ?? t('sendErrors.genericFailed', { status: res.status }))
        return
      }
      setCmpTo(''); setCmpCc(''); setCmpBcc('')
      setCmpSubject(''); setCmpBody('')
      setCmpShowCcBcc(false)
      setSendError(null)
      setShowCompose(false)
    } catch (err) {
      setSendError(err instanceof Error ? err.message : t('sendErrors.networkError'))
    } finally {
      setCmpSending(false)
    }
  }

  return (
    <>
      <Topbar title={t('title')} sub={t('subtitle')} onAdd={() => setShowAdd(true)} addLabel={t('connectAccount')} />
      <div style={{ padding: '18px 24px 40px' }}>
        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard icon="mail" label={t('kpi.totalAccounts')} value={String(accounts.length)} />
          <KpiCard icon="check-circle" label={t('kpi.connected')} value={String(connectedCount)} />
          <KpiCard icon="inbox" label={t('kpi.messagesToday')} value="0" />
          <KpiCard icon="clock" label={t('kpi.pending')} value="0" />
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
              <span>{t('accounts.sectionTitle')}</span>
              <button
                onClick={fetchAccounts}
                title={t('accounts.refresh')}
                style={{
                  background: 'none', border: 'none', padding: 4,
                  color: 'var(--txt3)', cursor: 'pointer', display: 'flex',
                }}
              ><RefreshCw size={12} /></button>
            </div>

            {accountsQuery.error ? (
              <ListError onRetry={fetchAccounts} message={accountsQuery.error} />
            ) : loading ? (
              <ListLoading />
            ) : accounts.length === 0 ? (
              <ListEmpty
                icon={<Mail size={28} />}
                title={t('accounts.emptyTitle')}
                action={
                  <button
                    onClick={() => setShowAdd(true)}
                    style={{
                      padding: '6px 14px', borderRadius: 8, border: 'none',
                      background: 'var(--accent)', color: '#fff',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >{t('accounts.emptyAction')}</button>
                }
              />
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
                      <Clock size={9} /> {t('accounts.syncPrefix')} {timeAgo(acc.lastSyncAt)}
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
                  {selected ? selected.email : t('compose.noAccount')}
                </div>
                <div style={{ fontSize: 11, color: 'var(--txt3)' }}>
                  {selected
                    ? t('compose.sendFrom', { provider: PROVIDER_INFO[selected.provider]?.label ?? selected.provider })
                    : t('compose.connectPrompt')}
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
                <Plus size={13} /> {t('compose.button')}
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
                {t('thread.comingSoonTitle')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--txt3)', maxWidth: 380, margin: '0 auto' }}>
                {t('thread.comingSoonBody')}
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
                <div id="email-account-add-title" style={{ fontSize: 16, fontWeight: 700 }}>{t('addModal.title')}</div>
                <div style={{ fontSize: 12, color: 'var(--txt3)', marginTop: 2 }}>{t('addModal.subtitle')}</div>
              </div>
              <button onClick={closeAddModal} aria-label={t('addModal.close')} style={{
                background: 'none', border: 'none', color: 'var(--txt3)',
                cursor: 'pointer', padding: 2, display: 'flex',
              }}><X size={16} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
              <div>
                <label style={labelStyle}>{t('addModal.provider')}</label>
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
                <label style={labelStyle}>{t('addModal.emailLabel')}</label>
                <input
                  type="email"
                  value={addEmail}
                  onChange={e => setAddEmail(e.target.value)}
                  placeholder={t('addModal.emailPlaceholder')}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>{t('addModal.displayName')}</label>
                <input
                  value={addDisplayName}
                  onChange={e => setAddDisplayName(e.target.value)}
                  placeholder={t('addModal.displayNamePlaceholder')}
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
            >{addSubmitting ? t('addModal.submitting') : t('addModal.submit')}</button>
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
                <div id="email-compose-title" style={{ fontSize: 16, fontWeight: 700 }}>{t('compose.title')}</div>
                <div style={{ fontSize: 12, color: 'var(--txt3)', marginTop: 2 }}>
                  {t('compose.fromLabel')} <span style={{ fontFamily: 'var(--font-red-hat-mono), monospace', color: 'var(--txt2)' }}>{selected.email}</span>
                </div>
              </div>
              <button onClick={closeComposeModal} aria-label={t('addModal.close')} style={{
                background: 'none', border: 'none', color: 'var(--txt3)',
                cursor: 'pointer', padding: 2, display: 'flex',
              }}><X size={16} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
              <div>
                <label style={labelStyle}>{t('compose.to')}</label>
                <input
                  value={cmpTo}
                  onChange={e => setCmpTo(e.target.value)}
                  placeholder={t('compose.toPlaceholder')}
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
                >{t('compose.addCcBcc')}</button>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={labelStyle}>{t('compose.cc')}</label>
                    <input value={cmpCc} onChange={e => setCmpCc(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t('compose.bcc')}</label>
                    <input value={cmpBcc} onChange={e => setCmpBcc(e.target.value)} style={inputStyle} />
                  </div>
                </div>
              )}

              <div>
                <label style={labelStyle}>{t('compose.subject')}</label>
                <input
                  value={cmpSubject}
                  onChange={e => setCmpSubject(e.target.value)}
                  placeholder={t('compose.subjectPlaceholder')}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>{t('compose.message')}</label>
                <textarea
                  value={cmpBody}
                  onChange={e => setCmpBody(e.target.value)}
                  placeholder={t('compose.messagePlaceholder')}
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
                title={t('compose.attachTooltip')}
                style={{
                  background: 'none', border: '1px solid var(--border)',
                  color: 'var(--txt3)', fontSize: 11, padding: '7px 12px',
                  borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6,
                  cursor: 'not-allowed', fontFamily: 'inherit',
                }}
              >
                <Paperclip size={12} /> {t('compose.attach')}
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
                <Send size={13} /> {cmpSending ? t('compose.sending') : t('compose.send')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
