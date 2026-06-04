'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/philly/layout/Topbar'
import { Pagination } from '@/components/philly/ui/Pagination'
import { KpiCard } from '@/components/philly/ui/KpiCard'
import { useEntitySubscription } from '@/hooks/philly/useRealtime'
import { useFormat } from '@/hooks/philly/useFormat'
import {
  MessageSquare,
  MessageCircle,
  Send,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  Search,
  Phone,
  X,
} from 'lucide-react'

interface SmsMessage {
  id: string
  organizationId: string
  contactId: string | null
  direction: 'inbound' | 'outbound'
  channel: 'sms' | 'whatsapp'
  fromNumber: string | null
  toNumber: string
  body: string
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'received'
  sentAt: string | null
  deliveredAt: string | null
  createdAt: string
}

const STATUS_COLORS: Record<string, { bg: string; txt: string }> = {
  delivered: { bg: 'var(--g-bg)', txt: 'var(--g-txt)' },
  sent: { bg: 'var(--b-bg)', txt: 'var(--b-txt)' },
  queued: { bg: 'var(--y-bg)', txt: 'var(--y-txt)' },
  failed: { bg: 'var(--r-bg)', txt: 'var(--r-txt)' },
  received: { bg: 'var(--bg2)', txt: 'var(--txt2)' },
}

const CHANNEL_INFO: Record<string, { icon: typeof MessageSquare; color: string; label: string }> = {
  sms: { icon: MessageSquare, color: '#10b981', label: 'SMS' },
  whatsapp: { icon: MessageCircle, color: '#25d366', label: 'WhatsApp' },
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg2)',
  fontSize: 13,
  color: 'var(--txt)',
  fontFamily: 'inherit',
}

const selectBarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '7px 12px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--panel)',
  fontSize: 12,
}

const selectStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: 12,
  color: 'var(--txt)',
  fontFamily: 'inherit',
  cursor: 'pointer',
  outline: 'none',
}

export default function SmsPage() {
  const t = useTranslations('sms')
  const fmt = useFormat()
  const [messages, setMessages] = useState<SmsMessage[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)

  // Filters
  const [channelFilter, setChannelFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  // Send modal
  const [showSend, setShowSend] = useState(false)
  const [sendToNumber, setSendToNumber] = useState('')
  const [sendChannel, setSendChannel] = useState<'sms' | 'whatsapp'>('sms')
  const [sendBody, setSendBody] = useState('')
  const [sending, setSending] = useState(false)

  const fetchMessages = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' })
      if (channelFilter) params.set('channel', channelFilter)
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/sms?${params}`)
      const json = await res.json()
      setMessages(json.data ?? [])
      setTotal(json.pagination?.total ?? 0)
      setTotalPages(json.pagination?.totalPages ?? 0)
    } catch {
      setMessages([])
    } finally {
      setLoading(false)
    }
  }, [page, channelFilter, statusFilter])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  // Live updates when messages are sent / received via webhook
  useEntitySubscription('sms', fetchMessages)

  // Client-side search by toNumber
  const filteredMessages = search
    ? messages.filter(m =>
        (m.toNumber ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (m.fromNumber ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : messages

  // KPIs computed from current page
  const totalMessages = messages.length
  const deliveredCount = messages.filter(m => m.status === 'delivered').length
  const failedCount = messages.filter(m => m.status === 'failed').length
  const queuedCount = messages.filter(m => m.status === 'queued').length

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return t('relative.justNow')
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d ago`
    return fmt.date(d)
  }

  const [sendError, setSendError] = useState<string | null>(null)

  const handleSend = async () => {
    if (!sendToNumber || !sendBody || sending) return
    setSending(true)
    setSendError(null)
    try {
      const res = await fetch('/api/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toNumber: sendToNumber,
          body: sendBody,
          channel: sendChannel,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSendError(typeof json.error === 'string' ? json.error : `Send failed (${res.status})`)
        return
      }
      setSendToNumber('')
      setSendBody('')
      setSendChannel('sms')
      setShowSend(false)
      fetchMessages()
    } catch (err) {
      setSendError(err instanceof Error ? err.message : t('errors.networkError'))
    } finally {
      setSending(false)
    }
  }

  const bodyLength = sendBody.length
  const smsLimit = 160
  const overLimit = sendChannel === 'sms' && bodyLength > smsLimit

  return (
    <>
      <Topbar
        title={t('title')}
        sub={t('subtitle')}
        onAdd={() => setShowSend(true)}
        addLabel={t('addLabel')}
      />
      <div style={{ padding: '18px 24px 40px' }}>
        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard icon="message-square" label={t('kpis.total')} value={String(totalMessages)} />
          <KpiCard icon="check-circle" label={t('kpis.delivered')} value={String(deliveredCount)} />
          <KpiCard icon="x-circle" label={t('kpis.failed')} value={String(failedCount)} />
          <KpiCard icon="clock" label={t('kpis.queued')} value={String(queuedCount)} />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ ...selectBarStyle, flex: 1, minWidth: 220, maxWidth: 320 }}>
            <Search size={13} style={{ color: 'var(--txt3)' }} />
            <input
              aria-label={t('filters.searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('filters.searchPlaceholder')}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 12,
                color: 'var(--txt)',
                fontFamily: 'inherit',
                outline: 'none',
                width: '100%',
              }}
            />
          </div>

          <div style={selectBarStyle}>
            <Filter size={13} style={{ color: 'var(--txt3)' }} />
            <select
              aria-label={t('filters.allChannels')}
              value={channelFilter}
              onChange={e => {
                setChannelFilter(e.target.value)
                setPage(1)
              }}
              style={selectStyle}
            >
              <option value="">{t('filters.allChannels')}</option>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>

          <div style={selectBarStyle}>
            <Filter size={13} style={{ color: 'var(--txt3)' }} />
            <select
              aria-label={t('filters.allStatuses')}
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              style={selectStyle}
            >
              <option value="">{t('filters.allStatuses')}</option>
              <option value="queued">{t('filters.queued')}</option>
              <option value="sent">{t('filters.sent')}</option>
              <option value="delivered">{t('filters.delivered')}</option>
              <option value="failed">{t('filters.failed')}</option>
            </select>
          </div>

          {(channelFilter || statusFilter || search) && (
            <button
              onClick={() => {
                setChannelFilter('')
                setStatusFilter('')
                setSearch('')
                setPage(1)
              }}
              style={{
                padding: '6px 12px',
                borderRadius: 7,
                border: '1px solid var(--border)',
                background: 'var(--panel)',
                fontSize: 11,
                color: 'var(--txt2)',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {t('filters.clear')}
            </button>
          )}
        </div>

        {/* Message List */}
        <div
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>{t('list.loading')}</div>
          ) : filteredMessages.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>
              <MessageSquare size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              {t('list.empty')}
            </div>
          ) : (
            filteredMessages.map((msg, idx) => {
              const channelInfo = CHANNEL_INFO[msg.channel] ?? CHANNEL_INFO.sms
              const ChannelIcon = channelInfo.icon
              const isOutbound = msg.direction === 'outbound'
              const DirectionIcon = isOutbound ? ArrowUpRight : ArrowDownLeft
              const sc = STATUS_COLORS[msg.status] ?? { bg: 'var(--bg2)', txt: 'var(--txt2)' }
              const displayNumber = isOutbound ? msg.toNumber : msg.fromNumber ?? msg.toNumber
              const timestamp = msg.sentAt ?? msg.createdAt

              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '36px 1fr 90px 90px',
                    gap: 12,
                    padding: '12px 16px',
                    borderBottom:
                      idx < filteredMessages.length - 1 ? '1px solid var(--border)' : 'none',
                    fontSize: 12,
                    alignItems: 'center',
                    background:
                      idx % 2 === 1
                        ? 'color-mix(in srgb, var(--bg2) 30%, transparent)'
                        : 'transparent',
                  }}
                >
                  {/* Icons: channel + direction */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: channelInfo.color + '18',
                        color: channelInfo.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ChannelIcon size={14} />
                    </div>
                    <DirectionIcon
                      size={10}
                      style={{ color: isOutbound ? 'var(--accent)' : 'var(--txt3)' }}
                    />
                  </div>

                  {/* Number + body */}
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginBottom: 3,
                      }}
                    >
                      <Phone size={10} style={{ color: 'var(--txt3)' }} />
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'var(--txt)',
                          fontFamily: 'var(--font-red-hat-mono), monospace',
                        }}
                      >
                        {displayNumber}
                      </span>
                      <span
                        style={{
                          fontSize: 9,
                          color: 'var(--txt3)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          fontWeight: 600,
                        }}
                      >
                        {isOutbound ? t('direction.to') : t('direction.from')}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--txt2)',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.4,
                      }}
                    >
                      {msg.body}
                    </div>
                  </div>

                  {/* Status pill */}
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      background: sc.bg,
                      color: sc.txt,
                      display: 'inline-block',
                      textAlign: 'center',
                      maxWidth: 'fit-content',
                    }}
                  >
                    {msg.status}
                  </span>

                  {/* Timestamp */}
                  <span
                    style={{
                      fontSize: 10,
                      color: 'var(--txt3)',
                      fontFamily: 'var(--font-red-hat-mono), monospace',
                      textAlign: 'right',
                    }}
                  >
                    {formatTime(timestamp)}
                  </span>
                </div>
              )
            })
          )}
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </div>

      {/* Send Message Modal */}
      {showSend && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setShowSend(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sms-send-title"
            style={{
              background: 'var(--panel)',
              borderRadius: 16,
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-lg)',
              padding: '24px 28px',
              width: 460,
              maxHeight: '85vh',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 4,
              }}
            >
              <div id="sms-send-title" style={{ fontSize: 16, fontWeight: 700 }}>{t('modal.title')}</div>
              <button
                onClick={() => setShowSend(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--txt3)',
                  padding: 2,
                  display: 'flex',
                }}
                aria-label={t('modal.close')}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 18 }}>
              {t('modal.subtitle')}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--txt2)',
                    marginBottom: 4,
                    display: 'block',
                  }}
                >
                  {t('modal.channel')}
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['sms', 'whatsapp'] as const).map(ch => {
                    const info = CHANNEL_INFO[ch]
                    const Icon = info.icon
                    const active = sendChannel === ch
                    return (
                      <button
                        key={ch}
                        onClick={() => setSendChannel(ch)}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                          background: active ? 'var(--accent-bg)' : 'var(--bg2)',
                          color: active ? 'var(--accent-txt)' : 'var(--txt2)',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                      >
                        <Icon size={13} />
                        {info.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--txt2)',
                    marginBottom: 4,
                    display: 'block',
                  }}
                >
                  {t('modal.toNumber')}
                </label>
                <input
                  aria-label={t('modal.toNumber')}
                  type="tel"
                  value={sendToNumber}
                  onChange={e => setSendToNumber(e.target.value)}
                  placeholder="+31612345678"
                  style={{
                    ...inputStyle,
                    fontFamily: 'var(--font-red-hat-mono), monospace',
                  }}
                />
              </div>

              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 4,
                  }}
                >
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--txt2)',
                    }}
                  >
                    {t('modal.message')}
                  </label>
                  {sendChannel === 'sms' && (
                    <span
                      style={{
                        fontSize: 10,
                        color: overLimit ? 'var(--r-txt)' : 'var(--txt3)',
                        fontFamily: 'var(--font-red-hat-mono), monospace',
                      }}
                    >
                      {bodyLength} / {smsLimit}
                    </span>
                  )}
                </div>
                <textarea
                  aria-label={t('modal.message')}
                  value={sendBody}
                  onChange={e => setSendBody(e.target.value)}
                  placeholder={t('modal.messagePlaceholder')}
                  rows={5}
                  style={{
                    ...inputStyle,
                    resize: 'vertical',
                    minHeight: 100,
                    fontFamily: 'inherit',
                  }}
                />
                {overLimit && (
                  <div
                    style={{
                      fontSize: 10,
                      color: 'var(--r-txt)',
                      marginTop: 4,
                    }}
                  >
                    {t('modal.overLimit')}
                  </div>
                )}
              </div>
            </div>

            {sendError && (
              <div role="alert" style={{
                marginTop: 12,
                padding: '8px 12px',
                borderRadius: 8,
                background: 'var(--r-bg)',
                border: '1px solid var(--r-border)',
                color: 'var(--r-txt)',
                fontSize: 12,
                fontWeight: 600,
              }}>
                {sendError}
              </div>
            )}
            <button
              onClick={handleSend}
              disabled={!sendToNumber || !sendBody || sending}
              style={{
                width: '100%',
                marginTop: 18,
                padding: '10px 0',
                borderRadius: 10,
                border: 'none',
                background:
                  !sendToNumber || !sendBody || sending ? 'var(--bg2)' : 'var(--accent)',
                color: !sendToNumber || !sendBody || sending ? 'var(--txt3)' : '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor:
                  !sendToNumber || !sendBody || sending ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Send size={13} />
              {sending ? t('modal.sending') : t('modal.submit')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
