'use client'

/* Bundle CZ — onboarding wizard.
 * Bundle DD — fully i18n'd via next-intl welcome.* namespace.
 *
 * First-time-tenant setup at /philly/welcome. Three steps:
 *   1. Welcome + plan badge (read from ?plan=)
 *   2. Org name + industry → POST /api/onboarding/create-org
 *   3. Done — link to /philly home + (when STRIPE is configured) a
 *      "Start checkout" button that hits /api/billing/checkout
 *
 * The user must already have a Supabase session (via Bundle CY's
 * /signup flow or via /login). Without one, the create-org POST
 * returns 401 and we redirect to /login?next=/welcome.
 *
 * No <Topbar> here — the welcome page is intentionally chrome-free
 * so the wizard owns the viewport. */

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Building2, Briefcase, Home, Hotel, Zap, Heart, CheckCircle2, ArrowRight, AlertCircle } from 'lucide-react'

const VALID_PLANS = ['operator', 'team', 'business'] as const
type Plan = (typeof VALID_PLANS)[number]

const PLAN_NAMES: Record<Plan, string> = {
  operator: 'Operator',
  team:     'Team',
  business: 'Business',
}

// Industry IDs are stable across locales; labels resolve via t('industries.<id>').
const INDUSTRY_IDS = ['general', 'realestate', 'hospitality', 'energy', 'csr'] as const
type IndustryId = typeof INDUSTRY_IDS[number]
const INDUSTRY_ICONS: Record<IndustryId, typeof Briefcase> = {
  general:     Briefcase,
  realestate:  Home,
  hospitality: Hotel,
  energy:      Zap,
  csr:         Heart,
}

function WelcomeContent() {
  const t = useTranslations('welcome')
  const params = useSearchParams()
  const router = useRouter()

  const planParam = params.get('plan')
  const plan: Plan = (VALID_PLANS as readonly string[]).includes(planParam ?? '')
    ? (planParam as Plan)
    : 'team'

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [orgName, setOrgName] = useState('')
  const [industry, setIndustry] = useState<IndustryId>('general')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ name: string; slug: string } | null>(null)

  const isNewSignup = params.get('new') === '1'

  async function handleCreate() {
    if (busy) return
    if (!orgName.trim()) {
      setError(t('step2.errorEmptyName'))
      return
    }
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/onboarding/create-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: orgName.trim(), industry }),
      })
      if (res.status === 401) {
        router.push('/login?next=/welcome')
        return
      }
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.error ?? t('step2.errorFailed', { status: res.status }))
        return
      }
      setCreated({ name: json.organization.name, slug: json.organization.slug })
      setStep(3)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('step2.errorNetwork'))
    } finally {
      setBusy(false)
    }
  }

  async function startCheckout() {
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      if (!res.ok) {
        alert(t('alerts.stripeNotConfigured', { status: res.status }))
        return
      }
      const json = await res.json()
      if (json.url) window.location.href = json.url
    } catch {
      alert(t('alerts.checkoutNetworkError'))
    }
  }

  return (
    <div className="welcome-wrap">
      <div className="welcome-card">
        <div className="welcome-progress" aria-label={t('stepLabel', { n: step, total: 3 })}>
          {[1, 2, 3].map((n) => (
            <span key={n} className={`welcome-dot ${n <= step ? 'is-on' : ''}`} />
          ))}
        </div>

        {step === 1 && (
          <>
            <div className="welcome-eyebrow">{t('step1.eyebrow')}</div>
            <h1>{t('step1.title')}</h1>
            <p className="welcome-lede">
              {isNewSignup ? t('step1.ledeNew') : t('step1.ledeExisting')}
            </p>
            <div className="welcome-plan-badge">
              <span className="welcome-plan-label">{t('step1.planLabel')}</span>
              <span className="welcome-plan-value">{PLAN_NAMES[plan]}</span>
              {/* Bundle DG — change-plan link removed in standalone:
                  the marketing /pricing page lives on juandiazllc.com
                  and doesn't exist on partner DEUS-SHARED deploys.
                  Partners hosting their own pricing surface can
                  re-add an external link here. */}
            </div>
            <button className="welcome-cta" onClick={() => setStep(2)}>
              <span>{t('step1.cta')}</span>
              <ArrowRight size={16} />
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="welcome-eyebrow">{t('step2.eyebrow')}</div>
            <h1>{t('step2.title')}</h1>
            <p className="welcome-lede">{t('step2.lede')}</p>

            <div className="welcome-field">
              <label htmlFor="orgName">{t('step2.nameLabel')}</label>
              <input
                id="orgName"
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder={t('step2.namePlaceholder')}
                maxLength={120}
                autoFocus
                disabled={busy}
              />
            </div>

            <div className="welcome-field">
              <label>{t('step2.verticalLabel')}</label>
              <div className="welcome-industry-grid">
                {INDUSTRY_IDS.map((id) => {
                  const Icon = INDUSTRY_ICONS[id]
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setIndustry(id)}
                      className={`welcome-industry ${industry === id ? 'is-on' : ''}`}
                      disabled={busy}
                    >
                      <Icon size={18} />
                      <span>{t(`industries.${id}`)}</span>
                    </button>
                  )
                })}
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
                {t('step2.ctaBack')}
              </button>
              <button className="welcome-cta" onClick={handleCreate} disabled={busy}>
                <span>{busy ? t('step2.ctaCreating') : t('step2.ctaCreate')}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}

        {step === 3 && created && (
          <>
            <div className="welcome-eyebrow welcome-eyebrow-success">
              <CheckCircle2 size={14} /> {t('step3.eyebrow')}
            </div>
            <h1>{t('step3.title', { name: created.name })}</h1>
            <p className="welcome-lede">
              {t('step3.lede', { plan: PLAN_NAMES[plan] })}
            </p>

            <div className="welcome-next-steps">
              <Link href="/" className="welcome-cta">
                <span>{t('step3.ctaOpen')}</span>
                <ArrowRight size={16} />
              </Link>
              <button
                className="welcome-cta-secondary"
                onClick={startCheckout}
                disabled={busy}
              >
                <Building2 size={14} /> {t('step3.ctaCheckout')}
              </button>
            </div>

            <p className="welcome-hint">
              {t('step3.workspaceUrlLabel')}: <code>/</code> · {t('step3.slugLabel')}: <code>{created.slug}</code>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default function WelcomePage() {
  return (
    <Suspense fallback={null}>
      <WelcomeContent />
    </Suspense>
  )
}
