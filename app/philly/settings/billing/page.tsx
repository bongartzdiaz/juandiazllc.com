'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Topbar } from '@/components/philly/layout/Topbar'
import {
  CreditCard, AlertCircle, CheckCircle2, Sparkles, ArrowUpRight, Clock,
} from 'lucide-react'

interface SubscriptionData {
  plan: string
  status: 'trialing' | 'active' | 'past_due' | 'unpaid' | 'canceled' | 'incomplete' | 'incomplete_expired'
  seatCount: number
  currentPeriodEnd: string | null
  cancelAt: string | null
  createdAt: string
}

interface SeatStatus {
  usersUsed: number
  invitesPending: number
  used: number
  limit: number
  available: number
}

interface ApiResp {
  data: { subscription: SubscriptionData | null; seats: SeatStatus }
}

interface PlanCard {
  key: 'starter' | 'professional'
  label: string
  price: string
  blurb: string
  features: readonly string[]
  highlighted: boolean
}

const PLANS: readonly PlanCard[] = [
  {
    key: 'starter',
    label: 'Starter',
    price: '€49',
    blurb: 'Pipeline + contacts + invites for small teams.',
    features: ['Pipeline + deals', 'Contacts + companies', 'Up to 10 seats'],
    highlighted: false,
  },
  {
    key: 'professional',
    label: 'Professional',
    price: '€79',
    blurb: 'Plus AI insights, audit log, automations.',
    features: ['Everything in Starter', 'AI scoring', 'Audit log', 'Automations'],
    highlighted: true,
  },
]

const sectionStyle: React.CSSProperties = {
  background: 'var(--panel)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: 20,
  marginBottom: 16,
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 14, fontWeight: 600, marginBottom: 4, color: 'var(--txt)',
}

const sectionSubStyle: React.CSSProperties = {
  fontSize: 12, color: 'var(--txt3)', marginBottom: 16,
}

export default function BillingSettings() {
  const params = useSearchParams()
  const [data, setData] = useState<ApiResp['data'] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    if (params.get('canceled') === '1') {
      setErrorMsg('Checkout was canceled. No card was charged.')
    }
    if (params.get('session_id')) {
      setSuccessMsg(
        'Subscription started. It may take a moment for the status to refresh below.',
      )
    }
  }, [params])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/philly/api/billing/subscription', { cache: 'no-store' })
        if (!res.ok) {
          if (!cancelled) setErrorMsg(`Failed to load billing (${res.status})`)
          return
        }
        const json: ApiResp = await res.json()
        if (!cancelled) setData(json.data)
      } catch {
        if (!cancelled) setErrorMsg('Network error loading billing.')
      }
    })()
    return () => { cancelled = true }
  }, [])

  const startCheckout = async (plan: 'starter' | 'professional') => {
    setBusy(plan)
    setErrorMsg(null)
    try {
      const res = await fetch('/philly/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const json = await res.json() as { data?: { url: string }; error?: string }
      if (!res.ok || !json.data?.url) {
        setErrorMsg(json.error ?? `Checkout failed (${res.status})`)
        setBusy(null)
        return
      }
      window.location.href = json.data.url
    } catch {
      setErrorMsg('Network error starting checkout.')
      setBusy(null)
    }
  }

  const openPortal = async () => {
    setBusy('portal')
    setErrorMsg(null)
    try {
      const res = await fetch('/philly/api/billing/portal', { method: 'POST' })
      const json = await res.json() as { data?: { url: string }; error?: string }
      if (!res.ok || !json.data?.url) {
        setErrorMsg(json.error ?? `Portal failed (${res.status})`)
        setBusy(null)
        return
      }
      window.location.href = json.data.url
    } catch {
      setErrorMsg('Network error opening portal.')
      setBusy(null)
    }
  }

  return (
    <>
      <Topbar title="Billing" sub="Manage your plan, seats, payment methods, and invoices" />
      <main style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>

        {errorMsg && (
          <div role="alert" style={{ ...flashStyle, color: 'var(--err)' }}>
            <AlertCircle size={14} aria-hidden /> {errorMsg}
          </div>
        )}
        {successMsg && (
          <div role="status" style={{ ...flashStyle, color: 'var(--ok)' }}>
            <CheckCircle2 size={14} aria-hidden /> {successMsg}
          </div>
        )}

        <CurrentPlanSection data={data} onPortal={openPortal} portalBusy={busy === 'portal'} />

        {(!data?.subscription ||
          data.subscription.status === 'canceled' ||
          data.subscription.status === 'incomplete_expired') && (
          <UpgradeSection startCheckout={startCheckout} busyKey={busy} />
        )}
      </main>
    </>
  )
}

function CurrentPlanSection({
  data, onPortal, portalBusy,
}: {
  data: ApiResp['data'] | null
  onPortal: () => void
  portalBusy: boolean
}) {
  if (!data) {
    return (
      <section style={sectionStyle}>
        <div style={sectionTitleStyle}>Current plan</div>
        <div style={sectionSubStyle}>Loading…</div>
      </section>
    )
  }

  const { subscription: sub, seats } = data
  const onFreeTier = !sub || sub.status === 'canceled' || sub.status === 'incomplete_expired'

  return (
    <section style={sectionStyle}>
      <div style={sectionTitleStyle}>Current plan</div>
      <div style={sectionSubStyle}>
        {onFreeTier
          ? 'Free tier — no active subscription.'
          : sub.status === 'past_due' || sub.status === 'unpaid'
            ? 'Payment failed — please update your card to keep your subscription active.'
            : 'Active subscription — manage payment method and invoices below.'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <Stat label="Plan" value={onFreeTier ? 'Free' : capitalize(sub.plan)} />
        <Stat
          label="Seats"
          value={`${seats.used} / ${seats.limit}`}
          sub={`${seats.usersUsed} active · ${seats.invitesPending} pending`}
        />
        <Stat
          label={onFreeTier ? 'Status' : 'Renews'}
          value={
            onFreeTier
              ? 'No subscription'
              : sub.currentPeriodEnd
                ? new Date(sub.currentPeriodEnd).toLocaleDateString()
                : '—'
          }
          sub={!onFreeTier ? statusLabel(sub.status) : undefined}
        />
      </div>

      {!onFreeTier && (
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={onPortal}
            disabled={portalBusy}
            style={{
              ...buttonPrimaryStyle,
              opacity: portalBusy ? 0.6 : 1,
            }}
          >
            <CreditCard size={14} aria-hidden /> Manage subscription
            <ArrowUpRight size={14} aria-hidden style={{ marginLeft: 4 }} />
          </button>
        </div>
      )}

      {sub?.cancelAt && (
        <div style={{
          marginTop: 12, padding: '8px 12px', borderRadius: 6,
          background: 'var(--bg2)', fontSize: 12, color: 'var(--txt2)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Clock size={14} aria-hidden />
          Subscription cancels on {new Date(sub.cancelAt).toLocaleDateString()}.
          You&apos;ll keep access until then.
        </div>
      )}
    </section>
  )
}

function UpgradeSection({
  startCheckout, busyKey,
}: {
  startCheckout: (plan: 'starter' | 'professional') => void
  busyKey: string | null
}) {
  return (
    <section style={sectionStyle}>
      <div style={sectionTitleStyle}>Upgrade</div>
      <div style={sectionSubStyle}>14-day free trial on every plan. Cancel from the customer portal anytime.</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {PLANS.map((p) => (
          <div
            key={p.key}
            style={{
              padding: 20, borderRadius: 12,
              border: p.highlighted ? '2px solid var(--accent)' : '1px solid var(--border)',
              background: 'var(--bg2)',
              position: 'relative',
            }}
          >
            {p.highlighted && (
              <div style={{
                position: 'absolute', top: -10, right: 16,
                background: 'var(--accent)', color: 'var(--bg)',
                padding: '2px 8px', borderRadius: 12,
                fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}>
                <Sparkles size={10} style={{ display: 'inline', marginRight: 4 }} />
                Recommended
              </div>
            )}

            <div style={{ fontSize: 12, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {p.label}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
              <span style={{ fontSize: 28, fontWeight: 700 }}>{p.price}</span>
              <span style={{ fontSize: 13, color: 'var(--txt2)' }}>/seat/mo</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--txt2)', margin: '8px 0 16px' }}>{p.blurb}</p>

            <ul style={{ margin: '0 0 16px', paddingLeft: 18, fontSize: 13, lineHeight: 1.7 }}>
              {p.features.map((f) => (<li key={f}>{f}</li>))}
            </ul>

            <button
              type="button"
              onClick={() => startCheckout(p.key)}
              disabled={busyKey === p.key}
              style={{
                ...buttonPrimaryStyle,
                width: '100%', justifyContent: 'center',
                opacity: busyKey === p.key ? 0.6 : 1,
              }}
            >
              Start free trial
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--txt2)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function statusLabel(s: SubscriptionData['status']): string {
  switch (s) {
    case 'trialing':           return 'Trial'
    case 'active':             return 'Active'
    case 'past_due':           return 'Past due'
    case 'unpaid':             return 'Unpaid'
    case 'canceled':           return 'Canceled'
    case 'incomplete':         return 'Incomplete'
    case 'incomplete_expired': return 'Expired'
  }
}

function capitalize(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const flashStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
  padding: '8px 12px', borderRadius: 6, fontSize: 12, lineHeight: 1.4,
  background: 'var(--bg2)', border: '1px solid var(--border)',
}

const buttonPrimaryStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 14px', borderRadius: 6,
  background: 'var(--accent)', color: 'var(--bg)',
  border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
