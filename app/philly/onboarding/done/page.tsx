'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Sparkles, BookOpen, Shield, ArrowRight } from 'lucide-react'
import {
  OnboardingFrame, obButtonPrimary,
} from '@/components/philly/onboarding/OnboardingFrame'

const cardStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-start', gap: 12,
  padding: 14, borderRadius: 10,
  border: '1px solid var(--border)', background: 'var(--bg2)',
  textDecoration: 'none', color: 'inherit',
}

export default function StepDone() {
  const router = useRouter()
  const t = useTranslations('wizard.done')

  // Defensive: if the user lands here without /complete being called, fire it
  // so the audit row + completed-timestamp land. Idempotent on the server.
  useEffect(() => {
    fetch('/philly/api/onboarding/complete', { method: 'POST' }).catch(() => {})
  }, [])

  const goToDashboard = () => {
    // Toast is handled on the dashboard via a query param.
    router.push('/philly?welcome=1')
  }

  return (
    <OnboardingFrame
      step="done"
      title={t('heroTitle')}
      sub={t('heroSub')}
      footer={
        <button type="button" onClick={goToDashboard} style={obButtonPrimary}>
          {t('primaryCta')}
          <ArrowRight size={14} />
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Link href="/philly/ai" style={cardStyle}>
          <Sparkles size={18} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{t('card1Title')}</div>
            <div style={{ fontSize: 12, color: 'var(--txt2)', lineHeight: 1.45, marginTop: 2 }}>
              {t('card1Body')}
            </div>
          </div>
        </Link>

        <Link href="/onboarding/first-day-deus" style={cardStyle}>
          <BookOpen size={18} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{t('card2Title')}</div>
            <div style={{ fontSize: 12, color: 'var(--txt2)', lineHeight: 1.45, marginTop: 2 }}>
              {t('card2Body')}
            </div>
          </div>
        </Link>

        <Link href="/philly/audit" style={cardStyle}>
          <Shield size={18} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{t('card3Title')}</div>
            <div style={{ fontSize: 12, color: 'var(--txt2)', lineHeight: 1.45, marginTop: 2 }}>
              {t('card3Body')}
            </div>
          </div>
        </Link>
      </div>
    </OnboardingFrame>
  )
}
