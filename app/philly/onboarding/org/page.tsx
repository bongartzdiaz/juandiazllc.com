'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import {
  OnboardingFrame, obButtonPrimary, obInputStyle, obLabelStyle, obHelperStyle,
} from '@/components/philly/onboarding/OnboardingFrame'

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'NOK', 'SEK', 'DKK'] as const
type Currency = typeof CURRENCIES[number]

export default function StepOrg() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [timeZone, setTimeZone] = useState('Europe/Amsterdam')
  const [currency, setCurrency] = useState<Currency>('EUR')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-detect time zone on mount; pre-fill the company name from /api/me's org.
  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (detected) setTimeZone(detected)
    fetch('/philly/api/me')
      .then(r => r.json())
      .then(j => {
        const org = j?.data?.organization
        if (org?.name && org.name !== 'Pending') setName(org.name)
      })
      .catch(() => { /* non-blocking */ })
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Enter your company name.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/philly/api/organizations/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), timeZone, defaultCurrency: currency }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error ?? 'Could not save. Try again.')
        setSubmitting(false)
        return
      }
      await fetch('/philly/api/onboarding/step', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'team' }),
      })
      router.push('/philly/onboarding/team')
    } catch {
      setError('Network error. Try again.')
      setSubmitting(false)
    }
  }

  return (
    <OnboardingFrame
      step="org"
      title="About your organization"
      sub="We need a few basics to set up dates, deals, and reports correctly."
      footer={
        <button
          type="submit"
          form="org-form"
          disabled={submitting}
          style={{ ...obButtonPrimary, opacity: submitting ? 0.6 : 1 }}
        >
          {submitting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
          Save and continue
        </button>
      }
    >
      {error && (
        <div style={{
          marginBottom: 12, padding: '8px 12px', borderRadius: 8,
          background: 'var(--bg2)', color: 'var(--r, #dc2626)', fontSize: 13,
        }}>{error}</div>
      )}

      <form id="org-form" onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label htmlFor="org-name" style={obLabelStyle}>Company name</label>
          <input
            id="org-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Bongartz Diaz Real Estate"
            required
            autoFocus
            style={obInputStyle}
          />
        </div>

        <div>
          <label htmlFor="org-tz" style={obLabelStyle}>Time zone</label>
          <input
            id="org-tz"
            type="text"
            value={timeZone}
            onChange={(e) => setTimeZone(e.target.value)}
            list="tz-list"
            style={obInputStyle}
          />
          <datalist id="tz-list">
            <option value="Europe/Amsterdam" />
            <option value="Europe/Berlin" />
            <option value="Europe/London" />
            <option value="Europe/Madrid" />
            <option value="Europe/Paris" />
            <option value="Europe/Zurich" />
            <option value="America/New_York" />
            <option value="America/Los_Angeles" />
          </datalist>
          <div style={obHelperStyle}>We auto-detect from your browser. Change if needed.</div>
        </div>

        <div>
          <label htmlFor="org-cur" style={obLabelStyle}>Default currency</label>
          <select
            id="org-cur"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
            style={obInputStyle}
          >
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div style={obHelperStyle}>Used for deal values and reports. You can override per deal.</div>
        </div>
      </form>
    </OnboardingFrame>
  )
}
