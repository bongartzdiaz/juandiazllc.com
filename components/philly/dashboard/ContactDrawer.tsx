'use client'

import { useEffect } from 'react'
import { X, Mail, Phone, Building2, Calendar, Clock, Tag, Pencil } from 'lucide-react'

export interface ContactData {
  name: string
  email: string
  phone: string
  company: string
  type: string
  source: string
  stage: string
  value?: number
  createdAt: string
  lastActivity: string
  assignee?: string
  notes?: string
  tags?: string[]
}

interface Props {
  contact: ContactData | null
  onClose: () => void
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diff = now - date
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function SectionLabel({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase',
      letterSpacing: '0.06em', color: 'var(--txt3)', marginBottom: 8,
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      <Icon size={11} />
      {children}
    </div>
  )
}

const tagColors = ['var(--accent)', 'var(--p)', 'var(--o)', 'var(--g)', 'var(--b)']

export function ContactDrawer({ contact, onClose }: Props) {
  useEffect(() => {
    if (!contact) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [contact, onClose])

  if (!contact) return null

  const infoRows: { icon: any; label: string; value: string; href?: string }[] = [
    { icon: Mail, label: 'Email', value: contact.email, href: contact.email ? `mailto:${contact.email}` : undefined },
    { icon: Phone, label: 'Phone', value: contact.phone, href: contact.phone ? `tel:${contact.phone}` : undefined },
    { icon: Building2, label: 'Company', value: contact.company },
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(2px)',
          animation: 'fadeIn 200ms ease',
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 41,
        width: 400, background: 'var(--panel)',
        borderLeft: '1px solid var(--border)',
        boxShadow: 'var(--shadow-md)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 250ms cubic-bezier(0.16,1,0.3,1)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          {/* Avatar */}
          <div style={{
            width: 42, height: 42, borderRadius: '50%',
            background: 'var(--accent-bg)', border: '1px solid var(--accent-border, var(--border))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: 'var(--accent-txt)',
            flexShrink: 0,
          }}>
            {getInitials(contact.name)}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {contact.name}
            </div>
            <span style={{
              display: 'inline-block', marginTop: 3, fontSize: 10.5, fontWeight: 600,
              padding: '2px 8px', borderRadius: 5,
              background: 'var(--accent-bg)', color: 'var(--accent-txt)',
            }}>
              {contact.type}
            </span>
          </div>

          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 7,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg2)', border: '1px solid var(--border)',
              cursor: 'pointer', color: 'var(--txt2)', flexShrink: 0,
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

          {/* Contact Info */}
          <div style={{ marginBottom: 20 }}>
            <SectionLabel icon={Mail}>Contact Info</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {infoRows.map(row => (
                <div key={row.label} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 8, background: 'var(--bg2)',
                }}>
                  <row.icon size={14} color="var(--txt3)" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: 'var(--txt3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{row.label}</div>
                    {row.href ? (
                      <a href={row.href} style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--accent)', textDecoration: 'none' }}>
                        {row.value || '--'}
                      </a>
                    ) : (
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--txt)' }}>{row.value || '--'}</div>
                    )}
                  </div>
                  {/* Source badge for last row */}
                </div>
              ))}
              {/* Source */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 8, background: 'var(--bg2)',
              }}>
                <Tag size={14} color="var(--txt3)" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: 'var(--txt3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Source</div>
                  <span style={{
                    display: 'inline-block', marginTop: 2, fontSize: 11, fontWeight: 600,
                    padding: '2px 8px', borderRadius: 5,
                    background: 'var(--b-bg)', color: 'var(--b-txt)',
                  }}>
                    {contact.source || '--'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Pipeline Status */}
          <div style={{ marginBottom: 20 }}>
            <SectionLabel icon={Calendar}>Pipeline Status</SectionLabel>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8,
            }}>
              <div style={{ padding: 10, borderRadius: 8, background: 'var(--bg2)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, color: 'var(--txt3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>Stage</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-txt)' }}>{contact.stage}</div>
              </div>
              <div style={{ padding: 10, borderRadius: 8, background: 'var(--bg2)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, color: 'var(--txt3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>Value</div>
                <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--g-txt)' }}>
                  {contact.value != null ? `EUR ${contact.value.toLocaleString('en', { minimumFractionDigits: 2 })}` : '--'}
                </div>
              </div>
              <div style={{ padding: 10, borderRadius: 8, background: 'var(--bg2)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, color: 'var(--txt3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>Created</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--txt2)' }}>
                  {new Date(contact.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
              <div style={{ padding: 10, borderRadius: 8, background: 'var(--bg2)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, color: 'var(--txt3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>Last Activity</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--txt2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={11} /> {relativeTime(contact.lastActivity)}
                </div>
              </div>
            </div>
            {contact.assignee && (
              <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, background: 'var(--bg2)', fontSize: 12 }}>
                <span style={{ color: 'var(--txt3)', fontWeight: 600 }}>Assignee: </span>
                <span style={{ fontWeight: 500, color: 'var(--txt)' }}>{contact.assignee}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {contact.tags && contact.tags.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <SectionLabel icon={Tag}>Tags</SectionLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {contact.tags.map((tag, i) => {
                  const c = tagColors[i % tagColors.length]
                  return (
                    <span key={tag} style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 10px',
                      borderRadius: 6, color: c,
                      background: `color-mix(in srgb, ${c} 10%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${c} 20%, transparent)`,
                    }}>
                      {tag}
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          {contact.notes && (
            <div style={{ marginBottom: 20 }}>
              <SectionLabel icon={Pencil}>Notes</SectionLabel>
              <div style={{
                padding: '10px 12px', borderRadius: 8, background: 'var(--bg2)',
                border: '1px solid var(--border)', fontSize: 12.5, lineHeight: 1.6,
                color: 'var(--txt2)', whiteSpace: 'pre-wrap',
              }}>
                {contact.notes}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex', gap: 8, padding: '14px 20px',
          borderTop: '1px solid var(--border)', flexShrink: 0,
        }}>
          <ActionBtn icon={Phone} label="Call" color="var(--g)" bg="var(--g-bg)" href={contact.phone ? `tel:${contact.phone}` : undefined} />
          <ActionBtn icon={Mail} label="Email" color="var(--b)" bg="var(--b-bg)" href={contact.email ? `mailto:${contact.email}` : undefined} />
          <ActionBtn icon={Pencil} label="Edit" color="var(--o)" bg="var(--o-bg)" />
        </div>
      </div>
    </>
  )
}

function ActionBtn({ icon: Icon, label, color, bg, href }: { icon: any; label: string; color: string; bg: string; href?: string }) {
  const style: React.CSSProperties = {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '9px 0', borderRadius: 8, fontSize: 12, fontWeight: 600,
    background: bg, color, border: 'none', cursor: 'pointer',
    textDecoration: 'none', transition: 'opacity 150ms',
  }
  if (href) {
    return <a href={href} style={style}><Icon size={14} />{label}</a>
  }
  return <button style={style}><Icon size={14} />{label}</button>
}
