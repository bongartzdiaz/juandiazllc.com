/* /settings/billing — subscription overview + upgrade CTAs.
   ──────────────────────────────────────────────────────────────────
   2026-05-26: built to fix the dead-link from PR-4's client-admin
   features page ("Upgrade to enable" CTA pointed here but the page
   didn't exist → 404).

   Shows:
     - Current plan + status (active/trial/past_due/cancelled)
     - Plan card for each of the 3 tiers — current plan highlighted,
       upgrade CTAs on the others
     - Each CTA POSTs to /api/billing/checkout which Stripe handles
     - Falls back gracefully when Stripe isn't configured (the
       endpoint returns 503; we show an info banner)

   Future expansion:
     - Invoice history (Stripe Customer Portal link)
     - Plan downgrades with prorated credit warning
     - Multi-currency display
*/

'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/philly/layout/Topbar'
import { useApi } from '@/hooks/philly/useApi'
import { useToast } from '@/hooks/philly/useToast'
import { ListLoading, ListError } from '@/components/philly/ui/ListStates'
import { Check, ArrowRight, Info, Sparkles, Crown, Building } from 'lucide-react'

interface SubscriptionRow {
  plan: 'operator' | 'team' | 'business'
  status: string
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}

interface MeResponse {
  data: {
    user: { id: string; email: string; role: string }
    organization: {
      id: string
      name: string
      subscription: SubscriptionRow | null
    }
  }
}

const PLAN_ORDER = ['operator', 'team', 'business'] as const
type PlanSlug = (typeof PLAN_ORDER)[number]

const PLAN_PRICES_EUR: Record<PlanSlug, number> = {
  operator: 49,
  team: 199,
  business: 599,
}

const PLAN_ICONS: Record<PlanSlug, typeof Sparkles> = {
  operator: Sparkles,
  team: Crown,
  business: Building,
}

export default function BillingPage() {
  const t = useTranslations('billing')
  const { addToast } = useToast()
  const meQuery = useApi<MeResponse>('/me')
  const [busy, setBusy] = useState<PlanSlug | null>(null)

  const currentPlan = (meQuery.data?.data.organization.subscription?.plan ?? null) as PlanSlug | null
  const subscriptionStatus = meQuery.data?.data.organization.subscription?.status ?? null

  async function startCheckout(plan: PlanSlug) {
    if (busy) return
    setBusy(plan)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.status === 503) {
        addToast(t('toasts.notConfigured'), 'warning')
        return
      }
      if (!res.ok) {
        addToast(json?.error ?? t('toasts.checkoutFailed', { status: res.status }), 'error')
        return
      }
      if (json?.url) {
        window.location.href = json.url as string
        return
      }
      addToast(t('toasts.unexpectedResponse'), 'error')
    } catch (err) {
      addToast(err instanceof Error ? err.message : t('toasts.networkError'), 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <Topbar title={t('title')} sub={t('subtitle')} />
      <div style={{ padding: '24px 32px', maxWidth: 1000 }}>
        {meQuery.error && (
          <div style={{ marginBottom: 24 }}>
            <ListError onRetry={meQuery.refetch} message={meQuery.error} />
          </div>
        )}

        {!meQuery.error && meQuery.loading && !meQuery.data && (
          <div style={{ marginBottom: 24 }}>
            <ListLoading />
          </div>
        )}

        {/* Current subscription status banner */}
        {currentPlan && (
          <div
            style={{
              background: 'var(--accent-bg)',
              border: '1px solid var(--accent-border)',
              borderRadius: 12,
              padding: '14px 18px',
              marginBottom: 24,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              color: 'var(--accent-txt)',
              fontSize: 13,
            }}
          >
            <Info size={16} aria-hidden="true" />
            <span style={{ flex: 1 }}>
              {t('currentPlanBanner', {
                plan: t(`plans.${currentPlan}.name`),
                status: t(`statuses.${normalizeStatus(subscriptionStatus)}`),
              })}
            </span>
          </div>
        )}

        {!currentPlan && !meQuery.loading && (
          <div
            style={{
              background: 'var(--y-bg)',
              border: '1px solid var(--y-border)',
              borderRadius: 12,
              padding: '14px 18px',
              marginBottom: 24,
              color: 'var(--y-txt)',
              fontSize: 13,
            }}
          >
            {t('noSubscriptionBanner')}
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 14,
          }}
        >
          {PLAN_ORDER.map(plan => {
            const Icon = PLAN_ICONS[plan]
            const isCurrent = currentPlan === plan
            const features = (t.raw(`plans.${plan}.features`) as unknown) as string[]
            return (
              <div
                key={plan}
                style={{
                  background: 'var(--panel)',
                  border: `2px solid ${isCurrent ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 14,
                  padding: '22px 22px 24px',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {isCurrent && (
                  <div
                    style={{
                      position: 'absolute',
                      top: -10,
                      left: 18,
                      background: 'var(--accent)',
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: 5,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {t('currentBadge')}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <Icon size={20} color="var(--accent)" aria-hidden="true" />
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--txt)' }}>
                    {t(`plans.${plan}.name`)}
                  </h3>
                </div>

                <div style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 32, fontWeight: 700, color: 'var(--txt)' }}>
                    €{PLAN_PRICES_EUR[plan]}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--txt2)' }}>
                    {' / '}
                    {t('perMonth')}
                  </span>
                </div>

                <p
                  style={{
                    margin: '4px 0 16px 0',
                    fontSize: 12,
                    color: 'var(--txt2)',
                    lineHeight: 1.55,
                  }}
                >
                  {t(`plans.${plan}.tagline`)}
                </p>

                <ul
                  style={{
                    margin: 0,
                    padding: 0,
                    listStyle: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    flex: 1,
                  }}
                >
                  {features.map((feat, i) => (
                    <li
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        fontSize: 12.5,
                        color: 'var(--txt)',
                        lineHeight: 1.5,
                      }}
                    >
                      <Check
                        size={13}
                        color="var(--g-txt)"
                        style={{ marginTop: 3, flexShrink: 0 }}
                        aria-hidden="true"
                      />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <div style={{ marginTop: 18 }}>
                  {isCurrent ? (
                    <button
                      type="button"
                      disabled
                      style={{
                        ...ctaSecondaryStyle,
                        opacity: 0.5,
                        cursor: 'not-allowed',
                      }}
                    >
                      {t('ctaCurrent')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startCheckout(plan)}
                      disabled={busy !== null}
                      style={{
                        ...ctaPrimaryStyle,
                        opacity: busy ? 0.6 : 1,
                        cursor: busy ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {busy === plan ? (
                        t('ctaLoading')
                      ) : (
                        <>
                          {planUpgradeOrSwitch(currentPlan, plan, t)}
                          <ArrowRight size={13} aria-hidden="true" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <p
          style={{
            marginTop: 24,
            fontSize: 12,
            color: 'var(--txt3)',
            textAlign: 'center',
            lineHeight: 1.55,
          }}
        >
          {t('vatNote')}
          <br />
          {t('cancelAnytimeNote')}
        </p>
      </div>
    </>
  )
}

function normalizeStatus(s: string | null): 'active' | 'trialing' | 'past_due' | 'cancelled' | 'unknown' {
  if (s === 'active' || s === 'trialing' || s === 'past_due' || s === 'cancelled') return s
  return 'unknown'
}

function planUpgradeOrSwitch(
  current: PlanSlug | null,
  target: PlanSlug,
  t: ReturnType<typeof useTranslations>,
): string {
  if (current == null) return t('ctaStart')
  const order = PLAN_ORDER.indexOf(target) - PLAN_ORDER.indexOf(current)
  if (order > 0) return t('ctaUpgrade')
  if (order < 0) return t('ctaDowngrade')
  return t('ctaSwitch')
}

const ctaPrimaryStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  width: '100%',
  padding: '10px 14px',
  borderRadius: 9,
  background: 'var(--accent)',
  color: '#fff',
  border: 'none',
  fontSize: 13,
  fontWeight: 700,
  fontFamily: 'inherit',
}

const ctaSecondaryStyle: React.CSSProperties = {
  ...ctaPrimaryStyle,
  background: 'var(--bg2)',
  color: 'var(--txt2)',
  border: '1px solid var(--border)',
}
