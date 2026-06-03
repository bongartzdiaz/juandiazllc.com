'use client'

import { use, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Topbar } from '@/components/philly/layout/Topbar'
import { useTranslations } from 'next-intl'
import { useApi } from '@/hooks/philly/useApi'
import { useToast } from '@/hooks/philly/useToast'
import { useFormat } from '@/hooks/philly/useFormat'
import {
  ArrowLeft, Mail, Phone, Building2, Tag, Globe2, Calendar,
  Save, X, Pencil, FileText, Activity, FolderKanban, User,
  MessageSquare, Clock, CheckCircle2, AlertCircle, Briefcase, TrendingUp,
} from 'lucide-react'
import { AiAttributesCard, type ContactAiAttributes } from '@/components/philly/contacts/AiAttributesCard'
import { EmailThreadList } from '@/components/philly/contacts/EmailThreadList'
import { WhatsAppButton } from '@/components/philly/contacts/WhatsAppButton'
import { InsightsTab } from '@/components/philly/contacts/InsightsTab'
import { DripEnrollmentsTab } from '@/components/philly/contacts/DripEnrollmentsTab'
import { CommunicationsTab } from '@/components/philly/contacts/CommunicationsTab'
import { Sparkles, Send, Headphones } from 'lucide-react'

/* ------------------------------------------------------------------
   Types
   ------------------------------------------------------------------ */

interface ContactProject {
  project: { id: string; title: string; status: string }
}

interface Contact extends ContactAiAttributes {
  id: string
  name: string
  email: string
  phone: string
  company: string
  type: string
  notes: string | null
  avatarUrl: string | null
  source: string | null
  createdAt: string
  contactProjects: ContactProject[]
}

interface Note {
  id: string
  content: string
  createdAt: string
  user: { id: string; name: string; avatarUrl: string | null }
}

interface ActivityItem {
  id: string
  type: string
  description: string
  metadata: Record<string, unknown> | null
  createdAt: string
  user: { id: string; name: string }
}

interface ContactDeal {
  id: string
  title: string
  valueCents: number
  probability: number
  status: string
  dealType: string
  expectedClose: string | null
  createdAt: string
  stage: { id: string; name: string; color: string }
  pipeline: { id: string; name: string } | null
  owner: { id: string; name: string } | null
}

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

const typeColors: Record<string, { bg: string; txt: string; border: string }> = {
  partner: { bg: 'var(--accent-bg)', txt: 'var(--accent-txt)', border: 'var(--accent-border)' },
  donor: { bg: 'var(--g-bg)', txt: 'var(--g-txt)', border: 'var(--g-border)' },
  stakeholder: { bg: 'var(--p-bg)', txt: 'var(--p-txt)', border: 'var(--p-border)' },
  beneficiary: { bg: 'var(--o-bg)', txt: 'var(--o-txt)', border: 'var(--o-border)' },
  buyer: { bg: 'var(--accent-bg)', txt: 'var(--accent-txt)', border: 'var(--accent-border)' },
  seller: { bg: 'var(--g-bg)', txt: 'var(--g-txt)', border: 'var(--g-border)' },
  tenant: { bg: 'var(--o-bg)', txt: 'var(--o-txt)', border: 'var(--o-border)' },
  investor: { bg: 'var(--p-bg)', txt: 'var(--p-txt)', border: 'var(--p-border)' },
  landlord: { bg: 'var(--y-bg)', txt: 'var(--y-txt)', border: 'var(--y-border)' },
  guest: { bg: 'var(--accent-bg)', txt: 'var(--accent-txt)', border: 'var(--accent-border)' },
  vendor: { bg: 'var(--o-bg)', txt: 'var(--o-txt)', border: 'var(--o-border)' },
  staff: { bg: 'var(--y-bg)', txt: 'var(--y-txt)', border: 'var(--y-border)' },
}

const avatarColors: Record<string, string> = {
  partner: 'var(--accent)', donor: 'var(--g)', stakeholder: 'var(--p)',
  beneficiary: 'var(--o)', buyer: 'var(--accent)', seller: 'var(--g)',
  tenant: 'var(--o)', investor: 'var(--p)', landlord: 'var(--y)',
  guest: 'var(--accent)', vendor: 'var(--o)', staff: 'var(--y)',
}

const statusColors: Record<string, { bg: string; txt: string; border: string }> = {
  active: { bg: 'var(--g-bg)', txt: 'var(--g-txt)', border: 'var(--g-border)' },
  planned: { bg: 'var(--accent-bg)', txt: 'var(--accent-txt)', border: 'var(--accent-border)' },
  completed: { bg: 'var(--p-bg)', txt: 'var(--p-txt)', border: 'var(--p-border)' },
  paused: { bg: 'var(--o-bg)', txt: 'var(--o-txt)', border: 'var(--o-border)' },
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// LOC-03 — `timeAgo` takes the locale-bound date formatter so its
// >30-day fallback renders in the active locale, not hardcoded en-US.
function timeAgo(iso: string, fmtDate: (iso: string) => string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return fmtDate(iso)
}

const activityIcons: Record<string, typeof Activity> = {
  note: MessageSquare, email: Mail, call: Phone, meeting: Calendar,
  update: Pencil, create: CheckCircle2, status: AlertCircle, default: Activity,
}

/* ------------------------------------------------------------------
   Tabs
   ------------------------------------------------------------------ */

type Tab = 'overview' | 'activity' | 'notes' | 'projects' | 'deals' | 'emails' | 'insights' | 'drip' | 'comms'

const TABS: { key: Tab; label: string; icon: typeof Activity }[] = [
  { key: 'overview', label: 'Overview', icon: User },
  { key: 'insights', label: 'Insights', icon: Sparkles },
  { key: 'activity', label: 'Activity', icon: Activity },
  { key: 'comms', label: 'Communications', icon: Headphones },
  { key: 'emails', label: 'Emails', icon: Mail },
  { key: 'drip', label: 'Campaigns', icon: Send },
  { key: 'notes', label: 'Notes', icon: FileText },
  { key: 'projects', label: 'Projects', icon: FolderKanban },
  { key: 'deals', label: 'Deals', icon: Briefcase },
]

/* ------------------------------------------------------------------
   Page Component
   ------------------------------------------------------------------ */

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const t = useTranslations('contacts')
  const tCommon = useTranslations('common')
  const { addToast } = useToast()
  // LOC-03 — locale-bound money/date, replacing the old en-US helpers.
  const fmt = useFormat()
  const fmtMoney = (cents: number) => fmt.currency(cents, { cents: true })
  const fmtDate = (iso: string) => fmt.date(iso)
  const fmtDateTime = (iso: string) => fmt.dateTime(iso)

  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [editing, setEditing] = useState(false)

  /* ---- Data fetching ---- */

  const contactQuery = useApi<{ data: Contact }>(`/contacts/${id}`)
  const notesQuery = useApi<{ data: Note[] }>(`/contacts/${id}/notes`)
  const activityQuery = useApi<{ data: ActivityItem[] }>(`/contacts/${id}/activity`)
  const dealsQuery = useApi<{ data: ContactDeal[] }>(`/deals?contactId=${id}&limit=100`)

  const contact = contactQuery.data?.data ?? null
  const notes = notesQuery.data?.data ?? []
  const activities = activityQuery.data?.data ?? []
  const deals = dealsQuery.data?.data ?? []

  /* ---- Inline edit state ---- */

  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editCompany, setEditCompany] = useState('')
  const [savingContact, setSavingContact] = useState(false)

  useEffect(() => {
    if (contact) {
      setEditName(contact.name)
      setEditEmail(contact.email)
      setEditPhone(contact.phone)
      setEditCompany(contact.company)
    }
  }, [contact])

  const handleSave = useCallback(async () => {
    if (savingContact) return
    setSavingContact(true)
    try {
      const res = await fetch(`/api/contacts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          phone: editPhone,
          company: editCompany,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to update' }))
        throw new Error(err.error || 'Failed to update contact')
      }
      addToast('Contact updated', 'success')
      setEditing(false)
      contactQuery.refetch()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Something went wrong'
      addToast(msg, 'error')
    } finally {
      setSavingContact(false)
    }
  }, [id, editName, editEmail, editPhone, editCompany, addToast, contactQuery, savingContact])

  const handleCancelEdit = useCallback(() => {
    if (contact) {
      setEditName(contact.name)
      setEditEmail(contact.email)
      setEditPhone(contact.phone)
      setEditCompany(contact.company)
    }
    setEditing(false)
  }, [contact])

  /* ---- Add note ---- */

  const [noteText, setNoteText] = useState('')
  const [submittingNote, setSubmittingNote] = useState(false)

  const handleAddNote = useCallback(async () => {
    if (!noteText.trim()) return
    setSubmittingNote(true)
    try {
      const res = await fetch(`/api/contacts/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteText.trim() }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to add note' }))
        throw new Error(err.error || 'Failed to add note')
      }
      addToast('Note added', 'success')
      setNoteText('')
      notesQuery.refetch()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Something went wrong'
      addToast(msg, 'error')
    } finally {
      setSubmittingNote(false)
    }
  }, [id, noteText, addToast, notesQuery])

  /* ---- Loading / Error ---- */

  if (contactQuery.loading) {
    return (
      <>
        <Topbar title="Contact Detail" sub={tCommon('loading')} />
        <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--txt3)', fontSize: 14 }}>
          {tCommon('loading')}
        </div>
      </>
    )
  }

  if (!contact) {
    return (
      <>
        <Topbar title="Contact Detail" sub="Not found" />
        <div style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: 'var(--txt3)', marginBottom: 16 }}>Contact not found</div>
          <Link href="/contacts" style={{
            fontSize: 13, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none',
          }}>
            Back to Contacts
          </Link>
        </div>
      </>
    )
  }

  const tc = typeColors[contact.type] || typeColors.partner
  const initials = getInitials(contact.name)

  return (
    <>
      <Topbar title={contact.name} sub={contact.email || 'Contact Detail'} />

      <div style={{ padding: '18px 24px 40px' }}>

        {/* ---- Back link ---- */}
        <Link href="/contacts" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 13, fontWeight: 600, color: 'var(--txt2)',
          textDecoration: 'none', marginBottom: 16,
        }}>
          <ArrowLeft size={14} />
          {tCommon('back')} to {t('title')}
        </Link>

        {/* ---- Header card ---- */}
        <div style={{
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '20px 24px', marginBottom: 16,
          boxShadow: 'var(--shadow-sm)',
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          {/* Avatar */}
          <div style={{
            width: 56, height: 56, borderRadius: 28,
            background: avatarColors[contact.type] || 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>{initials}</div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <input
                    value={editName} onChange={e => setEditName(e.target.value)}
                    placeholder={t('fields.name')}
                    style={{
                      padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)',
                      background: 'var(--bg2)', fontSize: 14, fontWeight: 600,
                    }}
                  />
                  <input
                    value={editCompany} onChange={e => setEditCompany(e.target.value)}
                    placeholder={t('fields.company')}
                    style={{
                      padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)',
                      background: 'var(--bg2)', fontSize: 13,
                    }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <input
                    value={editEmail} onChange={e => setEditEmail(e.target.value)}
                    placeholder={t('fields.email')}
                    style={{
                      padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)',
                      background: 'var(--bg2)', fontSize: 13,
                    }}
                  />
                  <input
                    value={editPhone} onChange={e => setEditPhone(e.target.value)}
                    placeholder={t('fields.phone')}
                    style={{
                      padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)',
                      background: 'var(--bg2)', fontSize: 13,
                    }}
                  />
                </div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 2, lineHeight: 1.3 }}>
                  {contact.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  {contact.email && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, color: 'var(--txt2)' }}>
                      <Mail size={12} color="var(--txt3)" /> {contact.email}
                    </span>
                  )}
                  {contact.phone && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--txt2)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Phone size={12} color="var(--txt3)" /> {contact.phone}
                      </span>
                      <WhatsAppButton phone={contact.phone} contactName={contact.name} />
                    </span>
                  )}
                  {contact.company && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, color: 'var(--txt2)' }}>
                      <Building2 size={12} color="var(--txt3)" /> {contact.company}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Type badge */}
          <span style={{
            fontSize: 10.5, fontWeight: 600, padding: '3px 10px', borderRadius: 6,
            background: tc.bg, color: tc.txt, border: `1px solid ${tc.border}`,
            textTransform: 'capitalize', flexShrink: 0,
          }}>{contact.type}</span>

          {/* Edit / Save / Cancel */}
          {editing ? (
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button
                onClick={handleSave}
                disabled={savingContact}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: 'var(--accent)', color: '#fff', border: 'none',
                  cursor: savingContact ? 'default' : 'pointer',
                  opacity: savingContact ? 0.6 : 1,
                  fontFamily: 'inherit',
                }}
              >
                <Save size={13} /> {savingContact ? '…' : tCommon('save')}
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={savingContact}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: 'var(--bg2)', color: 'var(--txt2)', border: '1px solid var(--border)',
                  cursor: savingContact ? 'default' : 'pointer',
                  opacity: savingContact ? 0.6 : 1,
                  fontFamily: 'inherit',
                }}
              >
                <X size={13} /> {tCommon('cancel')}
              </button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: 'var(--bg2)', color: 'var(--txt2)', border: '1px solid var(--border)',
              cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
            }}>
              <Pencil size={13} /> {tCommon('edit')}
            </button>
          )}
        </div>

        {/* ---- Tabs ---- */}
        <div style={{
          display: 'flex', gap: 4, marginBottom: 16,
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 10, padding: 4,
        }}>
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                background: isActive ? 'var(--txt)' : 'transparent',
                color: isActive ? 'var(--panel)' : 'var(--txt2)',
                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s ease',
              }}>
                <Icon size={13} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* ---- Tab Content ---- */}

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* AI-derived attributes (Attio-style) */}
            <AiAttributesCard
              contactId={contact.id}
              attrs={contact}
              onUpdated={() => contactQuery.refetch?.()}
            />

            {/* Quick stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                { label: 'Projects', value: contact.contactProjects.length, icon: FolderKanban, color: 'var(--accent)' },
                { label: 'Notes', value: notes.length, icon: FileText, color: 'var(--p)' },
                { label: 'Activities', value: activities.length, icon: Activity, color: 'var(--g)' },
              ].map(s => (
                <div key={s.label} style={{
                  background: 'var(--panel)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: '16px 18px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  boxShadow: 'var(--shadow-sm)',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `color-mix(in srgb, ${s.color} 12%, transparent)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <s.icon size={16} color={s.color} />
                  </div>
                  <div>
                    <div className="mono" style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>{s.value}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--txt3)' }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Contact info card */}
            <div style={{
              background: 'var(--panel)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '20px 24px',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Contact Information</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { icon: User, label: t('fields.name'), value: contact.name },
                  { icon: Mail, label: t('fields.email'), value: contact.email || '-' },
                  { icon: Phone, label: t('fields.phone'), value: contact.phone || '-' },
                  { icon: Building2, label: t('fields.company'), value: contact.company || '-' },
                  { icon: Tag, label: t('fields.type'), value: contact.type, capitalize: true },
                  { icon: Globe2, label: 'Source', value: contact.source || '-' },
                  { icon: Calendar, label: tCommon('created'), value: fmtDate(contact.createdAt) },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <row.icon size={14} color="var(--txt3)" style={{ marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--txt3)', marginBottom: 2 }}>{row.label}</div>
                      <div style={{
                        fontSize: 13, fontWeight: 500, color: 'var(--txt)',
                        textTransform: row.capitalize ? 'capitalize' : undefined,
                      }}>{row.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Notes field */}
              {contact.notes && (
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--txt3)', marginBottom: 4 }}>{t('fields.notes')}</div>
                  <div style={{ fontSize: 13, color: 'var(--txt2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {contact.notes}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ACTIVITY */}
        {activeTab === 'activity' && (
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '20px 24px',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Activity Feed</div>
            {activityQuery.loading ? (
              <div style={{ fontSize: 13, color: 'var(--txt3)', padding: '20px 0', textAlign: 'center' }}>
                {tCommon('loading')}
              </div>
            ) : activities.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--txt3)', padding: '20px 0', textAlign: 'center' }}>
                No activity yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {activities.map((a, i) => {
                  const Icon = activityIcons[a.type] || activityIcons.default
                  return (
                    <div key={a.id} style={{
                      display: 'flex', gap: 12, padding: '12px 0',
                      borderBottom: i < activities.length - 1 ? '1px solid var(--border)' : 'none',
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: 'var(--bg2)', border: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Icon size={14} color="var(--txt3)" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: 'var(--txt)', lineHeight: 1.5 }}>
                          {a.description}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                          <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{a.user.name}</span>
                          <span style={{ fontSize: 11, color: 'var(--txt3)' }}>
                            <Clock size={10} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                            {timeAgo(a.createdAt, fmtDate)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* EMAILS */}
        {activeTab === 'emails' && (
          <EmailThreadList contactId={contact.id} />
        )}

        {/* NOTES */}
        {activeTab === 'notes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Add note form */}
            <div style={{
              background: 'var(--panel)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '16px 20px',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Add a Note</div>
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Write a note..."
                rows={3}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg2)',
                  fontSize: 13, resize: 'vertical', fontFamily: 'inherit',
                  lineHeight: 1.6, boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                  onClick={handleAddNote}
                  disabled={!noteText.trim() || submittingNote}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '6px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: noteText.trim() ? 'var(--accent)' : 'var(--bg2)',
                    color: noteText.trim() ? '#fff' : 'var(--txt3)',
                    border: 'none', cursor: noteText.trim() ? 'pointer' : 'default',
                    fontFamily: 'inherit', opacity: submittingNote ? 0.6 : 1,
                  }}
                >
                  <MessageSquare size={12} />
                  {submittingNote ? 'Saving...' : 'Add Note'}
                </button>
              </div>
            </div>

            {/* Notes list */}
            <div style={{
              background: 'var(--panel)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '20px 24px',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>
                Notes ({notes.length})
              </div>
              {notesQuery.loading ? (
                <div style={{ fontSize: 13, color: 'var(--txt3)', padding: '20px 0', textAlign: 'center' }}>
                  {tCommon('loading')}
                </div>
              ) : notes.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--txt3)', padding: '20px 0', textAlign: 'center' }}>
                  No notes yet. Add one above.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {notes.map((n, i) => (
                    <div key={n.id} style={{
                      padding: '14px 0',
                      borderBottom: i < notes.length - 1 ? '1px solid var(--border)' : 'none',
                    }}>
                      <div style={{ fontSize: 13, color: 'var(--txt)', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 8 }}>
                        {n.content}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {/* Note author avatar */}
                        <div style={{
                          width: 20, height: 20, borderRadius: 10,
                          background: 'var(--accent)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0,
                        }}>{getInitials(n.user.name)}</div>
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--txt2)' }}>{n.user.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--txt3)' }}>
                          <Clock size={10} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                          {fmtDateTime(n.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PROJECTS */}
        {activeTab === 'projects' && (
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '20px 24px',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>
              Linked Projects ({contact.contactProjects.length})
            </div>
            {contact.contactProjects.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--txt3)', padding: '20px 0', textAlign: 'center' }}>
                No linked projects.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {contact.contactProjects.map(cp => {
                  const sc = statusColors[cp.project.status] || statusColors.active
                  return (
                    <div key={cp.project.id} className="card-hover" style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px', borderRadius: 10,
                      border: '1px solid var(--border)', background: 'var(--bg2)',
                      cursor: 'pointer',
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: 'var(--panel)', border: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <FolderKanban size={14} color="var(--accent)" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>
                          {cp.project.title}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                        background: sc.bg, color: sc.txt, border: `1px solid ${sc.border}`,
                        textTransform: 'capitalize', flexShrink: 0,
                      }}>{cp.project.status}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* INSIGHTS — Klant Master Profile (added 2026-05-27) */}
        {activeTab === 'insights' && contact && (
          <InsightsTab
            contactId={id}
            insights={{
              aiIndustry: contact.aiIndustry ?? null,
              aiIcpFit: contact.aiIcpFit ?? null,
              aiSummary: contact.aiSummary ?? null,
              aiAttributesStatus: contact.aiAttributesStatus ?? null,
              aiAttributesUpdatedAt: contact.aiAttributesUpdatedAt ?? null,
              leadScore: (contact as { leadScore?: number }).leadScore ?? 0,
            }}
            onRefreshed={() => contactQuery.refetch()}
          />
        )}

        {/* DRIP CAMPAIGNS — Klant Master Profile (added 2026-05-27) */}
        {activeTab === 'drip' && (
          <DripEnrollmentsTab contactId={id} />
        )}

        {/* COMMUNICATIONS — Klant Master Profile (added 2026-05-27) */}
        {activeTab === 'comms' && (
          <CommunicationsTab contactId={id} />
        )}

        {/* DEALS */}
        {activeTab === 'deals' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Deal KPIs */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 12,
            }}>
              <DealKpi
                label="Total Pipeline"
                value={fmtMoney(deals.filter(d => d.status === 'open').reduce((s, d) => s + d.valueCents, 0))}
                icon={Briefcase}
                color="var(--accent)"
              />
              <DealKpi
                label="Weighted"
                value={fmtMoney(deals.filter(d => d.status === 'open').reduce((s, d) => s + (d.valueCents * d.probability) / 100, 0))}
                icon={TrendingUp}
                color="var(--p)"
              />
              <DealKpi
                label="Won"
                value={String(deals.filter(d => d.status === 'won').length)}
                icon={CheckCircle2}
                color="var(--g)"
              />
              <DealKpi
                label="Lost"
                value={String(deals.filter(d => d.status === 'lost').length)}
                icon={AlertCircle}
                color="var(--r)"
              />
            </div>

            {/* Deal list */}
            <div style={{
              background: 'var(--panel)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '20px 24px',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>
                  Deals ({deals.length})
                </span>
                <Link
                  href={`/deals?contactId=${id}`}
                  style={{
                    fontSize: 11, fontWeight: 600, color: 'var(--accent)',
                    textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4,
                  }}
                >
                  Open deals board <ArrowLeft size={11} style={{ transform: 'rotate(180deg)' }} />
                </Link>
              </div>
              {dealsQuery.loading ? (
                <div style={{ fontSize: 13, color: 'var(--txt3)', padding: '20px 0', textAlign: 'center' }}>
                  {tCommon('loading')}
                </div>
              ) : deals.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--txt3)', padding: '20px 0', textAlign: 'center' }}>
                  No deals linked yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {deals.map(d => {
                    const statusColor =
                      d.status === 'won' ? { bg: 'var(--g-bg)', txt: 'var(--g-txt)', border: 'var(--g-border)' }
                      : d.status === 'lost' ? { bg: 'var(--r-bg)', txt: 'var(--r-txt)', border: 'var(--r-border)' }
                      : { bg: 'var(--b-bg)', txt: 'var(--b-txt)', border: 'var(--b-border)' }
                    return (
                      <Link
                        key={d.id}
                        href={`/deals/${d.id}`}
                        className="card-hover"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '36px 1fr auto auto auto',
                          alignItems: 'center', gap: 14,
                          padding: '12px 14px', borderRadius: 10,
                          border: '1px solid var(--border)', background: 'var(--bg2)',
                          cursor: 'pointer', textDecoration: 'none', color: 'inherit',
                        }}
                      >
                        <div style={{
                          width: 36, height: 36, borderRadius: 8,
                          background: d.stage.color + '18',
                          border: `1px solid ${d.stage.color}44`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <Briefcase size={14} color={d.stage.color} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)', lineHeight: 1.3, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {d.title}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--txt3)' }}>
                            {d.pipeline?.name ?? '—'} · {d.stage.name}
                            {d.expectedClose && ` · closes ${fmtDate(d.expectedClose)}`}
                          </div>
                        </div>
                        <div style={{
                          fontSize: 14, fontWeight: 700,
                          fontFamily: 'var(--font-red-hat-mono), monospace',
                          color: 'var(--txt)',
                        }}>
                          {fmtMoney(d.valueCents)}
                        </div>
                        <div style={{
                          fontSize: 11, fontWeight: 700, minWidth: 38, textAlign: 'right',
                          color: d.probability >= 70 ? 'var(--g-txt)' : d.probability >= 40 ? 'var(--y-txt)' : 'var(--txt3)',
                          fontFamily: 'var(--font-red-hat-mono), monospace',
                        }}>
                          {d.probability}%
                        </div>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
                          background: statusColor.bg, color: statusColor.txt,
                          border: `1px solid ${statusColor.border}`,
                          textTransform: 'uppercase',
                        }}>
                          {d.status}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </>
  )
}

/* ------------------------------------------------------------------
   Deal KPI chip
   ------------------------------------------------------------------ */

function DealKpi({
  label, value, icon: Icon, color,
}: {
  label: string
  value: string
  icon: React.ComponentType<{ size?: number; color?: string }>
  color: string
}) {
  return (
    <div style={{
      background: 'var(--panel)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '14px 16px',
      boxShadow: 'var(--shadow-sm)',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon size={12} color={color} />
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </span>
      </div>
      <div style={{
        fontSize: 18, fontWeight: 700,
        fontFamily: 'var(--font-red-hat-mono), monospace',
        color: 'var(--txt)',
      }}>
        {value}
      </div>
    </div>
  )
}
