'use client'

/* Email thread list for the contact detail page.
   Fetches /api/email/threads?contactId=... via the same useApi hook so
   navigation is instant. Collapsed rows show subject + snippet + who +
   when; clicking a row opens the (existing) inbox UI focused on that
   thread via the providerThreadId query param. */

import { Mail, Clock, Inbox } from 'lucide-react'
import { useApi } from '@/hooks/philly/useApi'

interface EmailThread {
  id: string
  accountId: string
  providerThreadId: string
  contactId: string | null
  subject: string
  snippet: string
  participants: string[]
  messageCount: number
  unreadCount: number
  lastMessageAt: string | null
  labels: string[]
}

interface ApiResponse {
  threads: EmailThread[]
  nextCursor: string | null
}

function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export function EmailThreadList({ contactId }: { contactId: string }) {
  const { data, loading, error } = useApi<ApiResponse>(`/email/threads?contactId=${contactId}&limit=25`)

  const threads = data?.threads ?? []

  return (
    <div style={{
      background: 'var(--panel)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '20px 24px',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>
          Email threads ({threads.length})
        </span>
        <span style={{ fontSize: 11, color: 'var(--txt3)' }}>
          From synced Gmail accounts
        </span>
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: 'var(--txt3)', padding: '20px 0', textAlign: 'center' }}>
          Loading threads…
        </div>
      ) : error ? (
        <div style={{ fontSize: 13, color: 'var(--r-txt)', padding: '20px 0', textAlign: 'center' }}>
          Failed to load threads. Make sure a Gmail account is connected in Settings.
        </div>
      ) : threads.length === 0 ? (
        <div style={{
          fontSize: 13, color: 'var(--txt3)',
          padding: '28px 0', textAlign: 'center',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        }}>
          <Inbox size={22} color="var(--txt3)" />
          <div>No email threads linked to this contact yet.</div>
          <div style={{ fontSize: 11, opacity: 0.8 }}>
            Connect a Gmail account (Settings → Integrations) and run a sync.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {threads.map((t, i) => (
            <div key={t.id} style={{
              display: 'grid',
              gridTemplateColumns: '32px 1fr auto',
              gap: 12, alignItems: 'flex-start',
              padding: '12px 0',
              borderBottom: i < threads.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: t.unreadCount > 0 ? 'var(--accent-bg)' : 'var(--bg2)',
                border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Mail size={14} color={t.unreadCount > 0 ? 'var(--accent-txt)' : 'var(--txt3)'} />
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: t.unreadCount > 0 ? 700 : 600,
                  color: 'var(--txt)',
                  lineHeight: 1.35,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {t.subject || '(no subject)'}
                </div>
                <div style={{
                  fontSize: 12, color: 'var(--txt3)', marginTop: 2,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {t.snippet || t.participants.join(', ')}
                </div>
                {t.participants.length > 0 && (
                  <div style={{
                    fontSize: 11, color: 'var(--txt3)', marginTop: 3,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {t.participants.slice(0, 3).join(', ')}
                    {t.participants.length > 3 ? ` +${t.participants.length - 3}` : ''}
                    {' · '}
                    {t.messageCount} msg{t.messageCount === 1 ? '' : 's'}
                  </div>
                )}
              </div>

              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4,
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 11, color: 'var(--txt3)' }}>
                  <Clock size={10} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                  {timeAgo(t.lastMessageAt)}
                </span>
                {t.unreadCount > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                    background: 'var(--accent-bg)', color: 'var(--accent-txt)',
                    border: '1px solid var(--accent-border)',
                  }}>
                    {t.unreadCount} new
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
