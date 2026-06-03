'use client'

/* QuickStartCards — post-wizard "what's next" surface.
 *
 * Shows up on the dashboard for orgs that have FINISHED the onboarding
 * wizard but still have empty primary surfaces. Three cards target the
 * highest-leverage actions in DEUS:
 *   1. Connect a calendar  → meetings show up on contact pages
 *   2. Import contacts     → CRM has data to act on
 *   3. Invite teammates    → others can use the workspace
 *
 * Each card shows a "done" state when its check passes. When all three
 * are green, the whole component dismisses itself permanently in
 * localStorage (no nag once they're set up).
 *
 * Read-only fetches — no mutations from this component, just
 * navigation. Failed fetches render the unchecked state silently so a
 * single API hiccup doesn't hide useful CTAs.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Check, Calendar, Users, UserPlus, X, ArrowRight } from 'lucide-react'

const DISMISS_KEY = 'deus-quickstart-dismissed'

interface QuickStartChecks {
  calendarConnected: boolean
  hasContacts: boolean
  hasTeammates: boolean
  loading: boolean
  error: boolean
}

interface OnboardingState {
  step: string
  bannerActive: boolean
}

export function QuickStartCards() {
  const t = useTranslations('quickStart')
  const [hidden, setHidden] = useState(false)
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null)
  const [checks, setChecks] = useState<QuickStartChecks>({
    calendarConnected: false,
    hasContacts: false,
    hasTeammates: false,
    loading: true,
    error: false,
  })

  // Permanent local dismiss check first — saves all network calls if
  // the user clicked X on a previous visit.
  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') setHidden(true)
    } catch {
      /* localStorage may be blocked; fall through */
    }
  }, [])

  // Fetch onboarding state — only show this if the wizard is done. We
  // don't want to compete with ResumeBanner on the same dashboard.
  useEffect(() => {
    if (hidden) return
    fetch('/philly/api/onboarding/state')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const data = j?.data as OnboardingState | undefined
        // ResumeBanner shows when bannerActive=true; we show when it's
        // explicitly NOT active AND the step is 'done'. If either field
        // is missing, default to false (don't fight ResumeBanner).
        setOnboardingDone(Boolean(data && !data.bannerActive && data.step === 'done'))
      })
      .catch(() => setOnboardingDone(false))
  }, [hidden])

  // Fetch the three readiness signals in parallel. Any individual
  // failure flips that check's `unchecked` state — we err on the side
  // of showing the CTA rather than silently marking it done.
  useEffect(() => {
    if (hidden || !onboardingDone) return

    // Calendar connections — { data: { connections: [{ status, ... }] } }
    const calendar = fetch('/philly/api/calendar/connections')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const conns = (j?.data?.connections ?? []) as Array<{ status: string }>
        return conns.some((c) => c.status === 'active')
      })
      .catch(() => false)

    // Contacts — paginatedResponse envelope: { data: T[], pagination }
    const contacts = fetch('/philly/api/contacts?limit=1')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const items = (Array.isArray(j?.data) ? j.data : []) as unknown[]
        return items.length > 0
      })
      .catch(() => false)

    // Users — { users: [...] }. Any user beyond the requesting one means
    // a teammate exists. Endpoint failure → false (show CTA, fail-open
    // toward "user might want to invite someone").
    const teammates = fetch('/philly/api/users')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const items = (j?.users ?? []) as unknown[]
        return items.length > 1
      })
      .catch(() => false)

    Promise.all([calendar, contacts, teammates])
      .then(([calendarConnected, hasContacts, hasTeammates]) => {
        setChecks({
          calendarConnected,
          hasContacts,
          hasTeammates,
          loading: false,
          error: false,
        })
      })
      .catch(() => {
        setChecks((c) => ({ ...c, loading: false, error: true }))
      })
  }, [hidden, onboardingDone])

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* noop */
    }
    setHidden(true)
  }

  if (hidden) return null
  if (onboardingDone !== true) return null
  if (checks.loading) return null

  const allDone = checks.calendarConnected && checks.hasContacts && checks.hasTeammates
  if (allDone) {
    // Mark dismissed permanently — they're set up.
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* noop */
    }
    return null
  }

  return (
    <section
      aria-label={t('title')}
      aria-live="polite"
      style={{
        margin: '0 0 24px',
        padding: 20,
        borderRadius: 12,
        background: 'linear-gradient(180deg, rgba(14,107,68,0.05), rgba(14,107,68,0.01))',
        border: '1px solid rgba(14,107,68,0.18)',
        position: 'relative',
      }}
    >
      <button
        type="button"
        aria-label={t('dismiss')}
        onClick={dismiss}
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          padding: 6,
          borderRadius: 6,
          border: 'none',
          background: 'transparent',
          color: 'inherit',
          cursor: 'pointer',
          opacity: 0.5,
        }}
      >
        <X size={16} />
      </button>
      <header style={{ marginBottom: 16 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600 }}>{t('title')}</h2>
        <p style={{ margin: 0, fontSize: 13, opacity: 0.7 }}>{t('subtitle')}</p>
      </header>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
        }}
      >
        <Card
          icon={<Calendar size={18} />}
          title={t('calendar.title')}
          description={t('calendar.description')}
          done={checks.calendarConnected}
          doneLabel={t('doneLabel')}
          href="/philly/settings/integrations"
          ctaLabel={t('calendar.cta')}
        />
        <Card
          icon={<Users size={18} />}
          title={t('contacts.title')}
          description={t('contacts.description')}
          done={checks.hasContacts}
          doneLabel={t('doneLabel')}
          href="/philly/contacts"
          ctaLabel={t('contacts.cta')}
        />
        <Card
          icon={<UserPlus size={18} />}
          title={t('team.title')}
          description={t('team.description')}
          done={checks.hasTeammates}
          doneLabel={t('doneLabel')}
          href="/philly/settings/team"
          ctaLabel={t('team.cta')}
        />
      </div>
    </section>
  )
}

function Card({
  icon,
  title,
  description,
  done,
  doneLabel,
  href,
  ctaLabel,
}: {
  icon: React.ReactNode
  title: string
  description: string
  done: boolean
  doneLabel: string
  href: string
  ctaLabel: string
}) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 10,
        background: done ? 'rgba(14,107,68,0.08)' : 'var(--surface-1, white)',
        border: `1px solid ${done ? 'rgba(14,107,68,0.35)' : 'var(--bd, #e5e7eb)'}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        opacity: done ? 0.85 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          aria-hidden
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: done ? 'var(--g, #0E6B44)' : 'var(--surface-2, rgba(0,0,0,0.05))',
            color: done ? 'white' : 'inherit',
          }}
        >
          {done ? <Check size={16} /> : icon}
        </span>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{title}</span>
      </div>
      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, opacity: 0.75, flex: 1 }}>
        {description}
      </p>
      {done ? (
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--g, #0E6B44)' }}>{doneLabel}</div>
      ) : (
        <Link
          href={href}
          style={{
            fontSize: 13,
            fontWeight: 500,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {ctaLabel} <ArrowRight size={14} />
        </Link>
      )}
    </div>
  )
}
