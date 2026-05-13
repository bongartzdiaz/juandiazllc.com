'use client'

/* Bundle CZ — onboarding wizard.
 *
 * First-time-tenant setup at /philly/welcome. Three steps:
 *   1. Welcome + plan badge (read from ?plan=)
 *   2. Org name + industry → POST /philly/api/onboarding/create-org
 *   3. Done — link to /philly home + (when STRIPE is configured) a
 *      "Start checkout" button that hits /api/billing/checkout
 *
 * The user must already have a Supabase session (via Bundle CY's
 * /signup flow or via /login). Without one, the create-org POST
 * returns 401 and we redirect to /login?next=/philly/welcome.
 *
 * No <Topbar> here — the welcome page is intentionally chrome-free
 * so the wizard owns the viewport. */

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2, Briefcase, Home, Hotel, Zap, Heart, CheckCircle2, ArrowRight, AlertCircle } from 'lucide-react'

const VALID_PLANS = ['operator', 'team', 'business'] as const
type Plan = (typeof VALID_PLANS)[number]

const PLAN_NAMES: Record<Plan, string> = {
  operator: 'Operator',
  team:     'Team',
  business: 'Business',
}

const INDUSTRIES = [
  { id: 'general',      label: 'General',            icon: Briefcase },
  { id: 'realestate',   label: 'Real estate',        icon: Home },
  { id: 'hospitality',  label: 'Hospitality',        icon: Hotel },
  { id: 'energy',       label: 'Energy',             icon: Zap },
  { id: 'csr',          label: 'Impact / CSR',       icon: Heart },
] as const
type IndustryId = typeof INDUSTRIES[number]['id']

function WelcomeContent() {
  const params = useSearchParams()
  const router = useRouter()

  const planParam = params.get('plan')
  const plan: Plan = (VALID_PLANS as readonly string[]).includes(planParam ?? '')
    ? (planParam as Plan)
    : 'team'

  // Step 1: welcome, 2: org-form, 3: done.
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [orgName, setOrgName] = useState('')
  const [industry, setIndustry] = useState<IndustryId>('general')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ name: string; slug: string } | null>(null)

  // Bundle CZ — if the user got here directly (no Supabase session)
  // we still let the page render the friendly UI; the POST will return
  // 401 and we'll redirect to /login at that point.
  const isNewSignup = params.get('new') === '1'

  async function handleCreate() {
    if (busy) return
    if (!orgName.trim()) {
      setError('Please enter a workspace name.')
      return
    }
    setBusy(true); setError(null)
    try {
      const res = await fetch('/philly/api/onboarding/create-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: orgName.trim(), industry }),
      })
      if (res.status === 401) {
        router.push('/login?next=/philly/welcome')
        return
      }
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.error ?? `Failed (${res.status}) — try again.`)
        return
      }
      setCreated({ name: json.organization.name, slug: json.organization.slug })
      setStep(3)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="welcome-wrap">
      <div className="welcome-card">
        <div className="welcome-progress" aria-label={`Step ${step} of 3`}>
          {[1, 2, 3].map((n) => (
            <span key={n} className={`welcome-dot ${n <= step ? 'is-on' : ''}`} />
          ))}
        </div>

        {step === 1 && (
          <>
            <div className="welcome-eyebrow">Welcome</div>
            <h1>Let's set up your workspace.</h1>
            <p className="welcome-lede">
              {isNewSignup
                ? "Two minutes and you're in. We'll create your workspace, then start your 14-day trial."
                : "Looks like you don't have an organization yet — let's fix that."}
            </p>
            <div className="welcome-plan-badge">
              <span className="welcome-plan-label">Selected plan</span>
              <span className="welcome-plan-value">{PLAN_NAMES[plan]}</span>
              <Link href="/pricing" className="welcome-plan-change">Change</Link>
            </div>
            <button className="welcome-cta" onClick={() => setStep(2)}>
              <span>Get started</span>
              <ArrowRight size={16} />
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="welcome-eyebrow">Your workspace</div>
            <h1>Name + vertical</h1>
            <p className="welcome-lede">
              You can change both later under /philly/settings. The vertical hides modules
              you won't use — pick the one closest to your day-to-day.
            </p>

            <div className="welcome-field">
              <label htmlFor="orgName">Workspace name</label>
              <input
                id="orgName"
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Acme Energie BV"
                maxLength={120}
                autoFocus
                disabled={busy}
              />
            </div>

            <div className="welcome-field">
              <label>Vertical</label>
              <div className="welcome-industry-grid">
                {INDUSTRIES.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setIndustry(id)}
                    className={`welcome-industry ${industry === id ? 'is-on' : ''}`}
                    disabled={busy}
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="welcome-error" role="alert">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            <div className="welcome-actions">
              <button className="welcome-cta-secondary" onClick={() => setStep(1)} disabled={busy}>
                Back
              </button>
              <button className="welcome-cta" onClick={handleCreate} disabled={busy}>
                <span>{busy ? 'Creating…' : 'Create workspace'}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}

        {step === 3 && created && (
          <>
            <div className="welcome-eyebrow welcome-eyebrow-success">
              <CheckCircle2 size={14} /> Workspace ready
            </div>
            <h1>{created.name} is live.</h1>
            <p className="welcome-lede">
              You're signed in as admin. Your 14-day {PLAN_NAMES[plan]} trial just started —
              no card required. Wire up Stripe Checkout when you're ready to keep going past day 14.
            </p>

            <div className="welcome-next-steps">
              <Link href="/philly" className="welcome-cta">
                <span>Open dashboard</span>
                <ArrowRight size={16} />
              </Link>
              <button
                className="welcome-cta-secondary"
                onClick={() => startCheckout(plan)}
                disabled={busy}
              >
                <Building2 size={14} /> Start Stripe checkout
              </button>
            </div>

            <p className="welcome-hint">
              Workspace URL: <code>/philly</code> · Slug: <code>{created.slug}</code>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

async function startCheckout(plan: Plan) {
  try {
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    })
    if (!res.ok) {
      alert(`Stripe checkout not configured on this deployment yet (${res.status}). You can keep using the trial; ops will wire the price IDs.`)
      return
    }
    const json = await res.json()
    if (json.url) window.location.href = json.url
  } catch {
    alert('Network error starting checkout. Try again from /philly/settings.')
  }
}

export default function WelcomePage() {
  return (
    <Suspense fallback={null}>
      <WelcomeContent />
    </Suspense>
  )
}
