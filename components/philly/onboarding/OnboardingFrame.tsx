'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'
import type { OnboardingStep } from '@/lib/philly/onboarding'
import { stepProgress } from '@/lib/philly/onboarding'

const wrapStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'var(--bg)',
  display: 'flex',
  flexDirection: 'column',
  padding: '24px 16px 40px',
}

const cardStyle: React.CSSProperties = {
  width: '100%', maxWidth: 560, margin: '0 auto',
  background: 'var(--panel)', border: '1px solid var(--border)',
  borderRadius: 12, padding: '28px 24px',
}

const headerStyle: React.CSSProperties = {
  width: '100%', maxWidth: 560, margin: '0 auto 16px',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  fontSize: 12, color: 'var(--txt3)',
}

const progressBarStyle: React.CSSProperties = {
  flex: 1, maxWidth: 200, height: 4, background: 'var(--bg2)',
  borderRadius: 2, overflow: 'hidden', margin: '0 12px',
}

const closeBtn: React.CSSProperties = {
  background: 'transparent', border: 'none', cursor: 'pointer',
  color: 'var(--txt3)', padding: 4, borderRadius: 6,
  display: 'flex', alignItems: 'center',
}

interface Props {
  step: OnboardingStep
  title: string
  sub?: string
  children: React.ReactNode
  /** Footer slot for primary + secondary buttons. Step pages pass their own. */
  footer?: React.ReactNode
}

/**
 * Shared chrome for every onboarding step. Mobile-first: single column,
 * 560px max width, 16px viewport padding. Close button bounces back to
 * the dashboard; the resume-banner picks them up from there.
 */
export function OnboardingFrame({ step, title, sub, children, footer }: Props) {
  const router = useRouter()
  const t = useTranslations('wizard.frame')
  const progress = stepProgress(step)
  const pct = Math.round((progress.current / progress.total) * 100)

  const close = () => router.push('/philly')

  return (
    <div style={wrapStyle}>
      <div style={headerStyle}>
        <span>{t('stepIndicator', { current: progress.current, total: progress.total })}</span>
        <div style={progressBarStyle} aria-hidden="true">
          <div style={{
            width: `${pct}%`, height: '100%',
            background: 'var(--accent)', transition: 'width 240ms ease',
          }} />
        </div>
        <button
          type="button"
          onClick={close}
          style={closeBtn}
          aria-label={t('closeAria')}
        >
          <X size={16} />
        </button>
      </div>

      <div style={cardStyle}>
        <h1 style={{
          fontSize: 22, fontWeight: 700, margin: '0 0 6px',
          color: 'var(--txt)', letterSpacing: '-0.01em',
        }}>{title}</h1>
        {sub && (
          <p style={{
            fontSize: 14, color: 'var(--txt2)', margin: '0 0 20px',
            lineHeight: 1.5,
          }}>{sub}</p>
        )}
        <div>{children}</div>
        {footer && (
          <div style={{
            marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)',
            display: 'flex', gap: 8, flexWrap: 'wrap',
          }}>
            {footer}
          </div>
        )}
      </div>

      <div style={{
        textAlign: 'center', fontSize: 11, color: 'var(--txt3)',
        marginTop: 24,
      }}>
        {t('footerByline')} · <Link href="/legal/privacy" style={{ color: 'inherit' }}>{t('footerPrivacy')}</Link>
      </div>
    </div>
  )
}

export const obButtonPrimary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  padding: '10px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600,
  background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none',
  cursor: 'pointer', fontFamily: 'inherit',
  minHeight: 44, // touch target compliance
}

export const obButtonSecondary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  padding: '10px 18px', borderRadius: 8, fontSize: 14, fontWeight: 500,
  background: 'transparent', color: 'var(--txt2)',
  border: '1px solid var(--border)', cursor: 'pointer',
  fontFamily: 'inherit',
  minHeight: 44,
}

export const obInputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--bg2)',
  fontSize: 14, color: 'var(--txt)', fontFamily: 'inherit',
  outline: 'none', minHeight: 44,
}

export const obLabelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600,
  marginBottom: 4, color: 'var(--txt2)',
}

export const obHelperStyle: React.CSSProperties = {
  fontSize: 11, color: 'var(--txt3)', marginTop: 4,
}
