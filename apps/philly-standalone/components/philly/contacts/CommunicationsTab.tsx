/* CommunicationsTab — unified comms timeline for the Klant Master Profile.
   ──────────────────────────────────────────────────────────────────
   Last 25 across email / call / inbox-conversation, merged + sorted by
   timestamp desc. Server-side dedup + scoping; this is a pure render. */

'use client'

import { useTranslations } from 'next-intl'
import { useApi } from '@/hooks/philly/useApi'
import { Mail, Phone, MessageSquare, ArrowUpRight, ArrowDownLeft, Headphones } from 'lucide-react'

export interface CommItem {
  type: 'email' | 'call' | 'conversation'
  id: string
  timestamp: string
  summary: string
  direction?: 'inbound' | 'outbound'
  channel?: 'email' | 'sms' | 'whatsapp'
  unread?: boolean
}

interface Props {
  contactId: string
}

function typeIcon(item: CommItem) {
  if (item.type === 'email') return Mail
  if (item.type === 'call') return Phone
  return MessageSquare
}

function relativeAge(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0) return 'soon'
  const s = ms / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  if (s < 86400) return `${Math.round(s / 3600)}h ago`
  return `${Math.round(s / 86400)}d ago`
}

export function CommunicationsTab({ contactId }: Props) {
  const t = useTranslations('contacts.masterProfile.comms')
  const query = useApi<{ data: CommItem[] }>(`/contacts/${contactId}/communications`)
  const items = query.data?.data ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Headphones size={18} color="var(--accent)" />
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{t('heading')}</h2>
      </div>

      {query.loading ? (
        <div style={{ padding: 24, color: 'var(--txt3)', fontSize: 13 }}>Loading…</div>
      ) : query.error ? (
        <div style={{ padding: 24, color: 'var(--r)', fontSize: 13 }}>{t('loadError')}</div>
      ) : items.length === 0 ? (
        <div style={{
          padding: 32, textAlign: 'center', color: 'var(--txt3)',
          background: 'var(--bg2)', borderRadius: 8, border: '1px dashed var(--border)',
        }}>{t('noCommunications')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {items.map((item, idx) => {
            const Icon = typeIcon(item)
            const DirIcon = item.direction === 'inbound' ? ArrowDownLeft
                          : item.direction === 'outbound' ? ArrowUpRight
                          : null
            return (
              <div key={`${item.type}-${item.id}`} style={{
                display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: 12,
                alignItems: 'flex-start', padding: '12px 0',
                borderBottom: idx < items.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 999,
                  background: item.unread ? 'var(--accent-bg)' : 'var(--bg2)',
                  border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={14} color={item.unread ? 'var(--accent)' : 'var(--txt3)'} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13.5, fontWeight: item.unread ? 600 : 500 }}>{item.summary}</span>
                    {DirIcon && <DirIcon size={12} color="var(--txt3)" />}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: 'var(--txt3)', marginTop: 2 }}>
                    <span>{t(`type.${item.type as 'email'}`)}</span>
                    {item.channel && item.channel !== 'email' && (
                      <>
                        <span>·</span>
                        <span style={{ textTransform: 'capitalize' }}>{item.channel}</span>
                      </>
                    )}
                    {item.unread && (
                      <>
                        <span>·</span>
                        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{t('unread')}</span>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--txt3)', whiteSpace: 'nowrap' }}>
                  {relativeAge(item.timestamp)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
