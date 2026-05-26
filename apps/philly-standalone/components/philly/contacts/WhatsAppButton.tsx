/* WhatsAppButton — click-to-chat with template picker.
   ──────────────────────────────────────────────────────────────────
   Shown next to a Contact's phone number on the detail page. Click
   opens a popover with 5 templates; selecting one opens wa.me in a
   new tab with the message pre-filled.

   Renders nothing when the phone can't be normalized — keeps the
   contact page clean for contacts without a valid international
   number. Tooltip explains why in that case.

   PR for task #13 (EU real estate sprint 2 — Whise has no WhatsApp
   integration; this alone makes DEUS feel native to BE/FR/NL agents). */

'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { MessageCircle, ChevronDown } from 'lucide-react'
import { WHATSAPP_TEMPLATES, buildWhatsAppLink, normalizePhoneForWhatsApp } from '@/lib/philly/contacts/whatsapp'

export interface WhatsAppButtonProps {
  phone: string | null | undefined
  /** Contact's first name — interpolated into template messages as {name}. */
  contactName: string
}

export function WhatsAppButton({ phone, contactName }: WhatsAppButtonProps) {
  const t = useTranslations('whatsapp')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Close popover on outside-click.
  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const canChat = normalizePhoneForWhatsApp(phone) !== null

  // Phone missing or unnormalizable — render a disabled button with tooltip.
  if (!canChat) {
    return (
      <button
        type="button"
        disabled
        title={t('disabledReason')}
        aria-label={t('disabledReason')}
        style={{
          ...buttonBaseStyle,
          opacity: 0.4,
          cursor: 'not-allowed',
        }}
      >
        <MessageCircle size={13} aria-hidden="true" />
        WhatsApp
      </button>
    )
  }

  function handleTemplateClick(templateBody: string) {
    const url = buildWhatsAppLink(phone, templateBody)
    if (!url) return
    setOpen(false)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('buttonAriaLabel', { name: contactName })}
        style={buttonBaseStyle}
      >
        <MessageCircle size={13} aria-hidden="true" />
        WhatsApp
        <ChevronDown size={12} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t('menuAriaLabel')}
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            zIndex: 50,
            minWidth: 260,
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            boxShadow: 'var(--shadow-lg)',
            padding: 6,
          }}
        >
          <div
            style={{
              padding: '6px 10px',
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--txt3)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {t('pickTemplate')}
          </div>
          {WHATSAPP_TEMPLATES.map(template => {
            const label = t(`templates.${template.id}.label`)
            // Template body has {name} placeholder; do the substitution
            // here so wa.me opens with the personalized text.
            const body = t(`templates.${template.id}.body`, { name: contactName })
            return (
              <button
                key={template.id}
                type="button"
                role="menuitem"
                onClick={() => handleTemplateClick(body)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 10px',
                  borderRadius: 7,
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--txt)',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--bg2)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

const buttonBaseStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  padding: '5px 10px',
  borderRadius: 7,
  fontSize: 11.5,
  fontWeight: 600,
  background: '#25D366', // WhatsApp brand green
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
}
