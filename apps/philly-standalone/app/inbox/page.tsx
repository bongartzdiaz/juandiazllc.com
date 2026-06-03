'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/philly/layout/Topbar'
import { Pagination } from '@/components/philly/ui/Pagination'
import { KpiCard } from '@/components/philly/ui/KpiCard'
import { useEntitySubscription } from '@/hooks/philly/useRealtime'
import { useApi } from '@/hooks/philly/useApi'
import { useToast } from '@/hooks/philly/useToast'
import { fetchJson } from '@/lib/philly/fetch-json'
import { Filter, Mail, MessageSquare, Phone, MessageCircle, Clock, Inbox, Send, ArrowLeft, Loader2 } from 'lucide-react'
import { ListLoading, ListEmpty, ListError } from '@/components/philly/ui/ListStates'

interface Message {
  id: string
  body: string
  bodyHtml?: string
  direction: string
  channel?: string
  fromAddress?: string
  toAddress?: string
  subject?: string
  status?: string
  createdAt: string
}

interface Conversation {
  id: string
  contactId: string
  channel: string
  subject: string
  status: string
  assignedTo: string | null
  lastMessageAt: string
  createdAt: string
  messages: Message[]
  contact?: { id: string; name: string; email?: string; phone?: string } | null
}

interface ContactLite { id: string; name: string }

const STATUS_COLORS: Record<string, { bg: string; txt: string }> = {
  open: { bg: 'var(--g-bg)', txt: 'var(--g-txt)' },
  closed: { bg: 'var(--b-bg)', txt: 'var(--b-txt)' },
  archived: { bg: 'var(--bg2)', txt: 'var(--txt3)' },
}

const CHANNEL_ICONS: Record<string, { icon: typeof Mail; color: string }> = {
  email: { icon: Mail, color: '#3b82f6' },
  sms: { icon: MessageSquare, color: '#10b981' },
  whatsapp: { icon: MessageCircle, color: '#25d366' },
  phone: { icon: Phone, color: '#f59e0b' },
}

export default function InboxPage() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [channelFilter, setChannelFilter] = useState('')

  const params = new URLSearchParams({ page: String(page), limit: '25' })
  if (statusFilter) params.set('status', statusFilter)
  if (channelFilter) params.set('channel', channelFilter)
  interface ConversationsResponse { data: Conversation[]; pagination: { total: number; totalPages: number } }
  const conversationsQuery = useApi<ConversationsResponse>(`/inbox?${params}`)
  const conversations = conversationsQuery.data?.data ?? []
  const total = conversationsQuery.data?.pagination.total ?? 0
  const totalPages = conversationsQuery.data?.pagination.totalPages ?? 0
  const loading = conversationsQuery.loading
  const fetchConversations = conversationsQuery.refetch
  const [showAdd, setShowAdd] = useState(false)
  const [addContactId, setAddContactId] = useState('')
  const [addChannel, setAddChannel] = useState('email')
  const [addSubject, setAddSubject] = useState('')
  const [addFirstMessage, setAddFirstMessage] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [addSubmitting, setAddSubmitting] = useState(false)
  const [contactOptions, setContactOptions] = useState<ContactLite[]>([])

  // Detail-pane state
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [replyError, setReplyError] = useState<string | null>(null)

  const t = useTranslations('inbox')
  const { addToast } = useToast()
  const threadEndRef = useRef<HTMLDivElement | null>(null)

  // Load contact options once for the New Conversation modal
  useEffect(() => {
    fetch('/api/contacts?limit=500', { cache: 'no-store' })
      .then(r => r.json())
      .then(j => setContactOptions(Array.isArray(j.data) ? j.data.map((c: ContactLite) => ({ id: c.id, name: c.name })) : []))
      .catch(() => {})
  }, [])

  // Live updates: refresh list when any conversation/message changes
  useEntitySubscription('inboxConversation', fetchConversations)
  useEntitySubscription('inboxMessage', useCallback(() => {
    fetchConversations()
    if (selectedId) loadMessages(selectedId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, fetchConversations]))

  const loadMessages = useCallback(async (convId: string) => {
    setMessagesLoading(true)
    try {
      // Bundle CJ — fetchJson surfaces non-2xx as a typed error so a
      // 401 / 500 doesn't silently fall to "[]" and look like an
      // empty inbox.
      const json = await fetchJson<{ data: typeof messages }>(`/api/inbox/${convId}/messages`, { cache: 'no-store' })
      setMessages(json.data ?? [])
    } catch (err) {
      setMessages([])
      addToast(err instanceof Error ? err.message : t('toasts.loadMessagesFailed'), 'error')
    }
    finally { setMessagesLoading(false) }
  }, [addToast, t])

  // Load messages whenever a conversation is opened
  useEffect(() => {
    if (!selectedId) { setMessages([]); return }
    loadMessages(selectedId)
  }, [selectedId, loadMessages])

  // Auto-scroll thread to bottom on new messages
  useEffect(() => {
    if (!selectedId) return
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, selectedId])

  const selected = conversations.find(c => c.id === selectedId) ?? null

  const sendReply = useCallback(async () => {
    if (!selectedId || !reply.trim() || sending) return
    setSending(true)
    setReplyError(null)
    try {
      const res = await fetch(`/api/inbox/${selectedId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: reply.trim(), direction: 'outbound' }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setReplyError(j.error ?? t('toasts.sendFailed'))
        return
      }
      setReply('')
      await loadMessages(selectedId)
      // Optimistic conversation list refresh in case SSE is slow
      fetchConversations()
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : t('toasts.sendFailed'))
    } finally {
      setSending(false)
    }
  }, [selectedId, reply, sending, loadMessages, fetchConversations, t])

  const openCount = conversations.filter(c => c.status === 'open').length
  const closedCount = conversations.filter(c => c.status === 'closed').length
  const channelCount = new Set(conversations.map(c => c.channel)).size

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return t('time.justNow')
    if (mins < 60) return t('time.mAgo', { count: mins })
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return t('time.hAgo', { count: hrs })
    const days = Math.floor(hrs / 24)
    return t('time.dAgo', { count: days })
  }

  const formatStamp = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const submitAdd = async () => {
    setAddError(null)
    if (!addContactId) { setAddError(t('toasts.selectContact')); return }
    if (!addSubject.trim()) { setAddError(t('toasts.subjectRequired')); return }
    setAddSubmitting(true)
    try {
      const res = await fetch('/api/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: addContactId,
          channel: addChannel,
          subject: addSubject.trim(),
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setAddError(j.error ?? t('toasts.createFailed'))
        return
      }
      const created = await res.json().catch(() => ({}))
      const newId = created?.data?.id as string | undefined

      // Optionally send the first message
      if (newId && addFirstMessage.trim()) {
        await fetch(`/api/inbox/${newId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: addFirstMessage.trim(), direction: 'outbound' }),
        }).catch(() => {})
      }

      setAddContactId(''); setAddChannel('email'); setAddSubject(''); setAddFirstMessage('')
      setShowAdd(false)
      await fetchConversations()
      if (newId) setSelectedId(newId)
    } catch (err) {
      setAddError(err instanceof Error ? err.message : t('toasts.createFailed'))
    } finally {
      setAddSubmitting(false)
    }
  }

  return (
    <>
      <Topbar title={t('title')} sub={t('subtitle')} onAdd={() => setShowAdd(true)} addLabel={t('add.conversation')} />
      <div style={{ padding: '18px 24px 40px' }}>
        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard icon="mail" label={t('kpis.total')} value={String(total)} />
          <KpiCard icon="message-circle" label={t('kpis.open')} value={String(openCount)} />
          <KpiCard icon="check-circle" label={t('kpis.closed')} value={String(closedCount)} />
          <KpiCard icon="zap" label={t('kpis.channels')} value={String(channelCount)} />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <FilterSelect value={statusFilter} onChange={v => { setStatusFilter(v); setPage(1) }}
            options={[{ value: '', label: t('filters.allStatuses') }, { value: 'open', label: t('statuses.open') }, { value: 'closed', label: t('statuses.closed') }, { value: 'archived', label: t('statuses.archived') }]} />
          <FilterSelect value={channelFilter} onChange={v => { setChannelFilter(v); setPage(1) }}
            options={[{ value: '', label: t('filters.allChannels') }, { value: 'email', label: t('channels.email') }, { value: 'sms', label: t('channels.sms') }, { value: 'whatsapp', label: t('channels.whatsapp') }, { value: 'phone', label: t('channels.phone') }]} />
        </div>

        {/* Two-pane layout: list (left) + thread (right) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.3fr)', gap: 12, alignItems: 'flex-start' }}>
          {/* Conversation List */}
          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 80px', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)' }}>
              <span>{t('columns.conversation')}</span><span>{t('columns.channel')}</span><span>{t('columns.time')}</span>
            </div>
            <div style={{ maxHeight: 'calc(100vh - 360px)', overflowY: 'auto' }}>
              {conversationsQuery.error ? (
                <ListError onRetry={fetchConversations} message={conversationsQuery.error} />
              ) : loading ? (
                <ListLoading />
              ) : conversations.length === 0 ? (
                <ListEmpty icon={<Inbox size={28} />} />
              ) : conversations.map((conv, idx) => {
                const channelInfo = CHANNEL_ICONS[conv.channel] ?? CHANNEL_ICONS.email
                const ChannelIcon = channelInfo.icon
                const lastMessage = conv.messages?.[0]
                const snippet = lastMessage?.body
                  ? lastMessage.body.length > 50 ? lastMessage.body.slice(0, 50) + '...' : lastMessage.body
                  : t('states.noMessagesYet')
                const isSelected = conv.id === selectedId

                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedId(conv.id)}
                    aria-pressed={isSelected}
                    style={{
                      display: 'grid', gridTemplateColumns: '1fr 70px 80px',
                      gap: 10, padding: '12px 14px',
                      borderBottom: idx < conversations.length - 1 ? '1px solid var(--border)' : 'none',
                      fontSize: 12, alignItems: 'center', textAlign: 'left',
                      background: isSelected
                        ? 'color-mix(in srgb, var(--accent) 12%, transparent)'
                        : (idx % 2 === 1 ? 'color-mix(in srgb, var(--bg2) 30%, transparent)' : 'transparent'),
                      borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
                      cursor: 'pointer', width: '100%', border: 'none',
                      borderRight: 'none', borderTop: 'none',
                      borderBottomColor: idx < conversations.length - 1 ? 'var(--border)' : 'transparent',
                      borderBottomStyle: 'solid', borderBottomWidth: 1,
                      color: 'inherit', fontFamily: 'inherit',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {conv.contact?.name ?? t('states.unknownContact')}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--txt2)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {conv.subject || t('states.noSubject')}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--txt3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {snippet}
                      </div>
                    </div>
                    <span style={{
                      padding: '2px 6px', borderRadius: 6, fontSize: 9, fontWeight: 600,
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                      background: channelInfo.color + '18', color: channelInfo.color,
                      maxWidth: 'fit-content', justifySelf: 'start',
                    }}>
                      <ChannelIcon size={9} /> {channelLabel(conv.channel, t)}
                    </span>
                    <span style={{
                      fontSize: 10, color: 'var(--txt3)',
                      fontFamily: 'var(--font-red-hat-mono), monospace',
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                    }}>
                      <Clock size={9} /> {timeAgo(conv.lastMessageAt)}
                    </span>
                  </button>
                )
              })}
            </div>
            <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
          </div>

          {/* Thread / Reply Pane */}
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, boxShadow: 'var(--shadow-sm)',
            display: 'flex', flexDirection: 'column',
            minHeight: 480, maxHeight: 'calc(100vh - 240px)',
          }}>
            {!selected ? (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                color: 'var(--txt3)', fontSize: 13, padding: 24, textAlign: 'center',
              }}>
                <Inbox size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
                {t('states.selectConversation')}
              </div>
            ) : (
              <>
                {/* Thread header */}
                <div style={{
                  padding: '14px 18px', borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <button
                    onClick={() => setSelectedId(null)}
                    aria-label={t('actions.backToInbox')}
                    style={{
                      width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)',
                      background: 'var(--bg2)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--txt2)',
                    }}
                  >
                    <ArrowLeft size={14} />
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {selected.subject || t('states.noSubject')}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 2 }}>
                      {selected.contact?.name ?? t('states.contactShort', { id: selected.contactId.slice(0, 8) })} · {channelLabel(selected.channel, t)}
                      {selected.contact?.email && ` · ${selected.contact.email}`}
                    </div>
                  </div>
                  <span style={{
                    padding: '3px 9px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                    textTransform: 'uppercase',
                    background: STATUS_COLORS[selected.status]?.bg ?? 'var(--bg2)',
                    color: STATUS_COLORS[selected.status]?.txt ?? 'var(--txt2)',
                  }}>{statusLabel(selected.status, t)}</span>
                </div>

                {/* Message thread */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
                  {messagesLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--txt3)', fontSize: 13, gap: 8 }}>
                      <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> {t('states.loadingMessages')}
                    </div>
                  ) : messages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--txt3)', fontSize: 13, padding: '40px 0' }}>
                      {t('states.noMessagesPrompt')}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {messages.map(m => {
                        const outbound = m.direction === 'outbound'
                        return (
                          <div key={m.id} style={{
                            alignSelf: outbound ? 'flex-end' : 'flex-start',
                            maxWidth: '80%',
                            background: outbound ? 'var(--accent)' : 'var(--bg2)',
                            color: outbound ? '#fff' : 'var(--txt)',
                            border: outbound ? 'none' : '1px solid var(--border)',
                            borderRadius: 10,
                            padding: '8px 12px',
                            fontSize: 13, lineHeight: 1.45,
                            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                            boxShadow: 'var(--shadow-sm)',
                          }}>
                            <div>{m.body}</div>
                            <div style={{
                              fontSize: 9, marginTop: 4,
                              opacity: 0.75,
                              fontFamily: 'var(--font-red-hat-mono), monospace',
                              color: outbound ? 'rgba(255,255,255,0.85)' : 'var(--txt3)',
                            }}>
                              {outbound ? t('thread.you') : (m.fromAddress || t('thread.contact'))} · {formatStamp(m.createdAt)}
                            </div>
                          </div>
                        )
                      })}
                      <div ref={threadEndRef} />
                    </div>
                  )}
                </div>

                {/* Reply composer */}
                <div style={{ borderTop: '1px solid var(--border)', padding: 12 }}>
                  {replyError && (
                    <div style={{
                      background: 'var(--r-bg)', color: 'var(--r-txt)',
                      padding: '6px 10px', borderRadius: 6, fontSize: 11, marginBottom: 8,
                    }}>{replyError}</div>
                  )}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <textarea
                      value={reply}
                      onChange={e => setReply(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault()
                          sendReply()
                        }
                      }}
                      placeholder={t('reply.placeholder', { channel: channelLabel(selected.channel, t) })}
                      rows={2}
                      style={{
                        flex: 1, padding: '8px 12px', borderRadius: 8,
                        border: '1px solid var(--border)', background: 'var(--bg2)',
                        fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
                        resize: 'vertical', minHeight: 44, maxHeight: 200,
                      }}
                    />
                    <button
                      onClick={sendReply}
                      disabled={!reply.trim() || sending}
                      style={{
                        padding: '0 14px', height: 38,
                        borderRadius: 8, border: 'none',
                        background: reply.trim() && !sending ? 'var(--accent)' : 'var(--bg2)',
                        color: reply.trim() && !sending ? '#fff' : 'var(--txt3)',
                        fontSize: 13, fontWeight: 600,
                        cursor: reply.trim() && !sending ? 'pointer' : 'not-allowed',
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        fontFamily: 'inherit',
                      }}
                    >
                      {sending ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={13} />}
                      {sending ? t('reply.sending') : t('reply.send')}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add Conversation Modal */}
      {showAdd && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('addModal.aria')}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.35)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => !addSubmitting && setShowAdd(false)}
        >
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--panel)', borderRadius: 16,
            border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)',
            padding: '24px 28px', width: 420, maxHeight: '80vh', overflowY: 'auto',
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{t('addModal.title')}</div>
            <div style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 18 }}>{t('addModal.subtitle')}</div>
            {addError && (
              <div style={{ background: 'var(--r-bg)', color: 'var(--r-txt)', padding: '8px 12px', borderRadius: 8, fontSize: 12, marginBottom: 12 }}>
                {addError}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>{t('fields.contact')}</label>
                <select value={addContactId} onChange={e => setAddContactId(e.target.value)} style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg2)',
                  fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
                }}>
                  <option value="">{t('placeholders.selectContact')}</option>
                  {contactOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>{t('fields.channel')}</label>
                <select value={addChannel} onChange={e => setAddChannel(e.target.value)} style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg2)',
                  fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
                }}>
                  <option value="email">{t('channels.email')}</option>
                  <option value="sms">{t('channels.sms')}</option>
                  <option value="whatsapp">{t('channels.whatsapp')}</option>
                  <option value="phone">{t('channels.phone')}</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>{t('fields.subject')}</label>
                <input value={addSubject} onChange={e => setAddSubject(e.target.value)} placeholder={t('placeholders.subject')} style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg2)',
                  fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
                }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>{t('fields.firstMessage')}</label>
                <textarea value={addFirstMessage} onChange={e => setAddFirstMessage(e.target.value)} rows={3}
                  placeholder={t('placeholders.firstMessage')} style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg2)',
                  fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit', resize: 'vertical',
                }} />
              </div>
            </div>
            <button
              onClick={submitAdd}
              disabled={addSubmitting}
              style={{
                width: '100%', marginTop: 18, padding: '10px 0',
                borderRadius: 10, border: 'none',
                background: addSubmitting ? 'var(--bg2)' : 'var(--accent)',
                color: addSubmitting ? 'var(--txt3)' : '#fff',
                fontSize: 13, fontWeight: 600,
                cursor: addSubmitting ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >{addSubmitting ? t('addModal.creating') : t('addModal.submit')}</button>
          </div>
        </div>
      )}

    </>
  )
}

type InboxT = ReturnType<typeof useTranslations<'inbox'>>

const KNOWN_CHANNELS = new Set(['email', 'sms', 'whatsapp', 'phone'])
const KNOWN_STATUSES = new Set(['open', 'closed', 'archived'])

function channelLabel(channel: string, t: InboxT): string {
  if (KNOWN_CHANNELS.has(channel)) return t(`channels.${channel as 'email' | 'sms' | 'whatsapp' | 'phone'}`)
  return channel
}

function statusLabel(status: string, t: InboxT): string {
  if (KNOWN_STATUSES.has(status)) return t(`statuses.${status as 'open' | 'closed' | 'archived'}`)
  return status
}

function FilterSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel)', fontSize: 12 }}>
      <Filter size={13} style={{ color: 'var(--txt3)' }} />
      <select value={value} onChange={e => onChange(e.target.value)} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--txt)', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}
