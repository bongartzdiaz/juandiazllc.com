'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, X } from 'lucide-react'

interface State {
  step: string
  bannerActive: boolean
  completedAt: string | null
}

const DISMISS_KEY = 'deus-onboarding-banner-dismissed-at'
const ONE_DAY_MS = 24 * 60 * 60 * 1000

/**
 * Soft banner shown on /philly when the org hasn't finished onboarding.
 * Dismissable for 24h via localStorage. Re-appears the next day until
 * the wizard is complete.
 *
 * Renders nothing for non-admins, completed orgs, or recently-dismissed.
 */
export function ResumeBanner() {
  const [state, setState] = useState<State | null>(null)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    // Local dismiss check first — saves the network call when freshly hidden.
    try {
      const raw = localStorage.getItem(DISMISS_KEY)
      if (raw) {
        const dismissedAt = parseInt(raw, 10)
        if (!isNaN(dismissedAt) && Date.now() - dismissedAt < ONE_DAY_MS) {
          setHidden(true)
          return
        }
      }
    } catch { /* localStorage may be blocked; fall through */ }

    fetch('/philly/api/onboarding/state')
      .then(r => r.ok ? r.json() : null)
      .then(j => {
        if (j?.data) setState(j.data as State)
      })
      .catch(() => { /* silent — banner is decoration */ })
  }, [])

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch { /* */ }
    setHidden(true)
  }

  if (hidden || !state) return null
  if (!state.bannerActive) return null

  // Step ordinal (1..5) — done is filtered by bannerActive
  const stepOrdinal: Record<string, number> = {
    welcome: 0, org: 1, team: 2, contacts: 3, calendar: 4,
  }
  const completed = stepOrdinal[state.step] ?? 0

  return (
    <div
      role="region"
      aria-label="Onboarding progress"
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px', margin: '0 0 16px',
        background: 'var(--accent-bg, rgba(59,130,246,0.08))',
        border: '1px solid var(--accent)',
        borderRadius: 10, fontSize: 13,
      }}
    >
      <div style={{ flex: 1, lineHeight: 1.4 }}>
        <strong style={{ fontWeight: 600 }}>Finish your DEUS setup</strong>
        <span style={{ color: 'var(--txt2)' }}>
          {' '}— you&apos;re {completed} of 5 steps in. Resume to invite your team and import contacts.
        </span>
      </div>
      <Link
        href="/philly/onboarding"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '6px 12px', borderRadius: 6, fontSize: 12,
          fontWeight: 600, background: 'var(--accent)', color: '#fff',
          textDecoration: 'none', whiteSpace: 'nowrap',
        }}
      >
        Resume setup
        <ArrowRight size={12} />
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Hide for today"
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--txt3)', padding: 4, borderRadius: 4,
          display: 'flex', alignItems: 'center',
        }}
      >
        <X size={14} />
      </button>
    </div>
  )
}
