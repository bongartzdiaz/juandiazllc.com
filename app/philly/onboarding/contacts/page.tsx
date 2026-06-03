'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Upload, UserPlus } from 'lucide-react'
import {
  OnboardingFrame, obButtonSecondary, obHelperStyle,
} from '@/components/philly/onboarding/OnboardingFrame'

const cardStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 6,
  padding: 16, borderRadius: 10,
  border: '1px solid var(--border)', background: 'var(--bg2)',
  textDecoration: 'none', color: 'inherit', textAlign: 'left',
  cursor: 'pointer', fontFamily: 'inherit',
}

export default function StepContacts() {
  const router = useRouter()
  const t = useTranslations('wizard.contacts')

  const advance = async () => {
    await fetch('/philly/api/onboarding/step', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 'calendar' }),
    })
    router.push('/philly/onboarding/calendar')
  }

  const skip = async () => {
    await fetch('/philly/api/onboarding/skip', { method: 'POST' })
    await advance()
  }

  return (
    <OnboardingFrame
      step="contacts"
      title={t('heading')}
      sub={t('sub')}
      footer={
        <button type="button" onClick={skip} style={obButtonSecondary}>
          {t('skip')}
        </button>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Link
          href="/philly/contacts/import"
          style={cardStyle}
          onClick={() => { void advance() }}
        >
          <Upload size={18} style={{ color: 'var(--accent)' }} aria-hidden="true" />
          <div style={{ fontWeight: 600, fontSize: 14 }}>{t('cardATitle')}</div>
          <div style={{ fontSize: 12, color: 'var(--txt2)', lineHeight: 1.45 }}>
            {t('cardABody')}
          </div>
        </Link>

        <Link
          href="/philly/contacts"
          style={cardStyle}
          onClick={() => { void advance() }}
        >
          <UserPlus size={18} style={{ color: 'var(--accent)' }} aria-hidden="true" />
          <div style={{ fontWeight: 600, fontSize: 14 }}>{t('cardBTitle')}</div>
          <div style={{ fontSize: 12, color: 'var(--txt2)', lineHeight: 1.45 }}>
            {t('cardBBody')}
          </div>
        </Link>
      </div>

      <div style={{ ...obHelperStyle, marginTop: 14 }}>
        {t('tip')}
      </div>
    </OnboardingFrame>
  )
}
