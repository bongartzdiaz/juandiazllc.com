'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Hotel, Loader2 } from 'lucide-react'
import {
  OnboardingFrame, obButtonPrimary,
} from '@/components/philly/onboarding/OnboardingFrame'

const cardBase: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 8,
  padding: 18, borderRadius: 10, cursor: 'pointer',
  border: '2px solid var(--border)', background: 'var(--bg2)',
  textAlign: 'left', fontFamily: 'inherit', minHeight: 110,
}

const cardActive: React.CSSProperties = {
  borderColor: 'var(--accent)',
  background: 'var(--accent-bg, rgba(59,130,246,0.08))',
}

export default function StepWelcome() {
  const router = useRouter()
  const [pick, setPick] = useState<'realestate' | 'hospitality' | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const proceed = async () => {
    if (!pick) return
    setSubmitting(true)
    setError(null)
    try {
      // Persist industry choice on the org. The org-details step lets the
      // user double-confirm + add company name and locale.
      const orgRes = await fetch('/philly/api/organizations/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        // Keep current name + tz/currency (server will reject empty, so
        // first save here happens with the placeholders this step has).
        // Real values come from step 2.
        body: JSON.stringify({
          name: 'Pending', // overwritten in step 2 — Zod requires non-empty here
          industry: pick,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Amsterdam',
          defaultCurrency: 'EUR',
        }),
      })
      if (!orgRes.ok) {
        // Fall back to step 2 — let user re-enter details there.
      }
      const advance = await fetch('/philly/api/onboarding/step', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'org' }),
      })
      if (!advance.ok) {
        const j = await advance.json().catch(() => ({}))
        setError(j.error ?? 'Could not save. Try again.')
        setSubmitting(false)
        return
      }
      router.push('/philly/onboarding/org')
    } catch {
      setError('Network error. Try again.')
      setSubmitting(false)
    }
  }

  return (
    <OnboardingFrame
      step="welcome"
      title="Welcome to DEUS"
      sub="Five short steps to get your team and contacts in. Skip anything you want to do later."
      footer={
        <button
          type="button"
          onClick={proceed}
          disabled={!pick || submitting}
          style={{ ...obButtonPrimary, opacity: pick && !submitting ? 1 : 0.5 }}
        >
          {submitting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
          Continue
        </button>
      }
    >
      {error && (
        <div style={{
          marginBottom: 12, padding: '8px 12px', borderRadius: 8,
          background: 'var(--bg2)', color: 'var(--r, #dc2626)', fontSize: 13,
        }}>{error}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button
          type="button"
          onClick={() => setPick('realestate')}
          aria-pressed={pick === 'realestate'}
          style={{ ...cardBase, ...(pick === 'realestate' ? cardActive : {}) }}
        >
          <Building2 size={20} style={{ color: 'var(--accent)' }} aria-hidden="true" />
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--txt)' }}>
            Real estate
          </div>
          <div style={{ fontSize: 12, color: 'var(--txt2)', lineHeight: 1.45 }}>
            Brokerage, property management, agent teams. Deals, properties, and showings.
          </div>
        </button>

        <button
          type="button"
          onClick={() => setPick('hospitality')}
          aria-pressed={pick === 'hospitality'}
          style={{ ...cardBase, ...(pick === 'hospitality' ? cardActive : {}) }}
        >
          <Hotel size={20} style={{ color: 'var(--accent)' }} aria-hidden="true" />
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--txt)' }}>
            Hospitality
          </div>
          <div style={{ fontSize: 12, color: 'var(--txt2)', lineHeight: 1.45 }}>
            Hotels, restaurants, venues. Reservations, rooms, and quotes.
          </div>
        </button>
      </div>
    </OnboardingFrame>
  )
}
