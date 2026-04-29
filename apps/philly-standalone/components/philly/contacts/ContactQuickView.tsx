'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import {
  Mail, Phone, Building2, Tag, Sparkles, Calendar,
  ExternalLink, X, FolderKanban, Pencil,
} from 'lucide-react'
import { Modal } from '@/components/philly/ui/Modal'
import { useApi } from '@/hooks/philly/useApi'
import { useToast } from '@/hooks/philly/useToast'
import { ContactForm } from '@/components/philly/forms/ContactForm'
import type { ContactFormData } from '@/components/philly/forms/ContactForm'

/* Bundle T — popover quick-view for a contact. Used from the
   contacts list grid (and reusable elsewhere). Fetches the full
   contact via the same endpoint the detail page uses, so AI
   attributes + counts are populated.

   Click on the card body → navigate to the full page (existing
   behaviour). Click the eye-icon → open this modal. The modal
   gives operators 90% of the detail-page utility without the
   navigation cost. */

interface ContactDetail {
  id: string
  name: string
  email: string
  phone: string
  company: string
  type: string
  source: string | null
  notes: string | null
  createdAt: string
  aiIndustry?: string | null
  aiIcpFit?: number | null
  aiSummary?: string | null
  aiAttributesUpdatedAt?: string | null
  contactProjects: Array<{ project: { id: string; title: string; status: string } }>
}

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

function fitColor(score: number): string {
  if (score >= 75) return 'var(--accent)'
  if (score >= 50) return 'var(--g, #f5c542)'
  return 'var(--txt3)'
}

interface Props {
  contactId: string | null
  onClose: () => void
}

export function ContactQuickView({ contactId, onClose }: Props) {
  const t = useTranslations('quickview')
  const tCommon = useTranslations('common')
  const open = contactId != null
  const query = useApi<{ data: ContactDetail }>(open ? `/contacts/${contactId}` : '', {
    enabled: open,
  })
  const c = query.data?.data ?? null
  const colors = (c && typeColors[c.type]) || typeColors.partner
  const { addToast } = useToast()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Reset edit state when the modal closes or the contactId changes.
  const handleClose = () => {
    setEditing(false)
    onClose()
  }

  const handleSave = async (data: ContactFormData) => {
    if (!c || saving) return
    setSaving(true)
    try {
      const res = await fetch(`/api/contacts/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error ?? `Failed (${res.status})`)
      addToast('Contact updated', 'success')
      setEditing(false)
      query.refetch()
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Update failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={c?.name ?? 'Contact'}
      subtitle={c?.company || ''}
      size="md"
    >
      {!c ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>
          {query.loading ? t('loading') : query.error ?? t('notFound', { entity: 'Contact' })}
        </div>
      ) : editing ? (
        <ContactForm
          initial={{
            name: c.name,
            email: c.email,
            phone: c.phone,
            type: c.type,
            company: c.company,
            notes: c.notes ?? '',
          }}
          onSubmit={handleSave}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Type + source pill row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6,
              background: colors.bg, color: colors.txt, border: `1px solid ${colors.border}`,
              textTransform: 'capitalize',
            }}>{c.type}</span>
            {c.source && (
              <span style={{ fontSize: 11.5, color: 'var(--txt3)' }}>{t('contact.via', { source: c.source })}</span>
            )}
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: 'var(--txt3)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={11} />
              {t('addedOn', { date: new Date(c.createdAt).toLocaleDateString() })}
            </span>
          </div>

          {/* Contact lines */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
            padding: '12px 14px',
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 10,
          }}>
            <Field icon={Mail} label={t('contact.email')} value={c.email || '—'} />
            <Field icon={Phone} label={t('contact.phone')} value={c.phone || '—'} />
            <Field icon={Building2} label={t('contact.company')} value={c.company || '—'} />
            <Field icon={Tag} label={t('contact.type')} value={c.type} capitalize />
          </div>

          {/* AI panel — only if we have inferred attributes */}
          {(c.aiIndustry || c.aiSummary || c.aiIcpFit != null) && (
            <div style={{
              padding: '12px 14px',
              border: '1px solid var(--border)', borderRadius: 10,
              background: 'color-mix(in srgb, var(--accent) 4%, transparent)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Sparkles size={13} color="var(--accent)" />
                <span style={{ fontSize: 12, fontWeight: 600 }}>{t('contact.aiHeading')}</span>
                <span
                  className="mono"
                  title={t('contact.aiHeading')}
                  style={{
                    fontSize: 9.5, padding: '1px 6px', borderRadius: 999,
                    background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
                    color: 'var(--accent)',
                    letterSpacing: '.08em', textTransform: 'uppercase',
                    border: '1px solid color-mix(in srgb, var(--accent) 24%, transparent)',
                  }}
                >
                  {t('contact.aiBadge')}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {c.aiIndustry && (
                    <div>
                      <div style={{ fontSize: 10.5, color: 'var(--txt3)', marginBottom: 2 }}>{t('contact.industry')}</div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{c.aiIndustry}</div>
                    </div>
                  )}
                  {c.aiSummary && (
                    <div style={{ fontSize: 12, color: 'var(--txt2)', lineHeight: 1.5 }}>
                      {c.aiSummary}
                    </div>
                  )}
                </div>
                {c.aiIcpFit != null && (
                  <div style={{ textAlign: 'center' }}>
                    <div className="mono" style={{
                      fontSize: 26, fontWeight: 700,
                      color: fitColor(c.aiIcpFit), lineHeight: 1,
                    }}>
                      {c.aiIcpFit}
                    </div>
                    <div style={{
                      fontSize: 9.5, color: 'var(--txt3)',
                      letterSpacing: '.1em', textTransform: 'uppercase', marginTop: 3,
                    }}>
                      {t('contact.icpFit')}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {c.notes && c.notes.trim() && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--txt3)', marginBottom: 4 }}>{t('notes')}</div>
              <div style={{
                fontSize: 12.5, color: 'var(--txt2)', lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                padding: '10px 12px',
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 10,
                maxHeight: 140, overflowY: 'auto',
              }}>
                {c.notes}
              </div>
            </div>
          )}

          {/* Linked projects */}
          {c.contactProjects.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--txt3)', marginBottom: 6 }}>
                {t('linkedCount', { count: c.contactProjects.length })}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {c.contactProjects.slice(0, 4).map((cp) => (
                  <div key={cp.project.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 10px', borderRadius: 8,
                    background: 'var(--bg2)', border: '1px solid var(--border)',
                    fontSize: 12, color: 'var(--txt2)',
                  }}>
                    <FolderKanban size={11} color="var(--txt3)" />
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {cp.project.title}
                    </span>
                    <span style={{
                      fontSize: 10, color: 'var(--txt3)',
                      textTransform: 'capitalize',
                    }}>
                      {cp.project.status}
                    </span>
                  </div>
                ))}
                {c.contactProjects.length > 4 && (
                  <div style={{ fontSize: 11, color: 'var(--txt3)', paddingLeft: 8 }}>
                    {t('more', { count: c.contactProjects.length - 4 })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <Link
              href={`/contacts/${c.id}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8,
                fontSize: 12, fontWeight: 600,
                background: 'var(--accent)', color: '#fff',
                textDecoration: 'none',
              }}
            >
              <ExternalLink size={12} />
              {tCommon('openFullPage')}
            </Link>
            <button
              type="button"
              onClick={() => setEditing(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8,
                fontSize: 12, fontWeight: 600,
                background: 'var(--bg2)', color: 'var(--txt)',
                border: '1px solid var(--border)', cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <Pencil size={12} />
              {tCommon('edit')}
            </button>
            <button
              type="button"
              onClick={handleClose}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '7px 14px', borderRadius: 8,
                fontSize: 12, fontWeight: 500,
                background: 'transparent', color: 'var(--txt2)',
                border: '1px solid var(--border)', cursor: 'pointer',
                fontFamily: 'inherit', marginLeft: 'auto',
              }}
            >
              <X size={12} />
              {tCommon('close')}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function Field({
  icon: Icon, label, value, capitalize,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>
  label: string
  value: string
  capitalize?: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <Icon size={13} color="var(--txt3)" />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10.5, color: 'var(--txt3)', marginBottom: 2 }}>{label}</div>
        <div style={{
          fontSize: 13, fontWeight: 500, color: 'var(--txt)',
          textTransform: capitalize ? 'capitalize' : undefined,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {value}
        </div>
      </div>
    </div>
  )
}
