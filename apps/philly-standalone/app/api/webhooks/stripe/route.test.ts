/* Stripe webhook handler — hermetic data-sync test.
   ─────────────────────────────────────────────────────────────────
   PRE-LAUNCH-AUDIT surfaced that `app/api/webhooks/stripe/route.ts`
   had ZERO tests. This handler is the ONLY path that mirrors
   Stripe subscription state into our local Subscription table.
   If it silently breaks, customers pay Stripe but the app doesn't
   know — they hit access denials, refund storms, support overload.

   What this suite pins:
     1. Signature verification rejects missing / invalid signatures
     2. Subscription create/update/delete events upsert the row
     3. Missing organizationId metadata is a SKIP not a 500
     4. Unknown event types ack 200 (Stripe stops retrying)
     5. Idempotency — duplicate events converge to same state
     6. Handler exception → 500 (Stripe retries with backoff)

   The handler uses Stripe's `constructEvent(rawBody, sig, secret)`
   to verify + parse. We mock that to either return our test event
   or throw, depending on the scenario.

   Co-located here (instead of in lib/security/) because:
     - cross-org.test.ts is in lib/security/ — that's policy-tested
     - this is integration-of-a-specific-route — local file pattern
       matches app/api/csp-report/sanitize-log-field.test.ts
   ──────────────────────────────────────────────────────────────── */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mock state ────────────────────────────────────────────────

interface SubscriptionRow {
  organizationId: string
  stripeCustomerId: string
  stripeSubscriptionId: string
  stripePriceId: string | null
  plan: string
  status: string
  currentPeriodStart: Date | null
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
  trialEndsAt: Date | null
}

const subscriptionsState: SubscriptionRow[] = []

// What Stripe webhook signature verification should do for the next call.
// 'pass' returns the next-scheduled event; 'fail' throws.
const signatureBehavior = {
  mode: 'pass' as 'pass' | 'fail',
  failureMessage: 'No signatures found matching the expected signature for payload.',
}

// The event the next `constructEvent` call should return (when mode='pass').
let nextEvent: unknown = null

// Whether the next prisma.subscription.upsert should throw — for the
// "handler failure → 500" case.
const upsertBehavior = { failNext: false }

// Plan registry mock — must mirror the real one's logic enough for
// the test to be meaningful. The real `planForStripePriceId` reads
// process.env.STRIPE_PRICE_OPERATOR etc.; we hardcode price→plan here.
const priceToPlan: Record<string, string> = {
  price_test_operator: 'operator',
  price_test_team: 'team',
  price_test_business: 'business',
}

// ── vi.mock the module boundaries ─────────────────────────────

vi.mock('@/lib/philly/billing/stripe', () => ({
  stripe: () => ({
    webhooks: {
      constructEvent: (_rawBody: string, _sig: string, _secret: string) => {
        if (signatureBehavior.mode === 'fail') {
          throw new Error(signatureBehavior.failureMessage)
        }
        return nextEvent
      },
    },
    subscriptions: {
      retrieve: async (id: string) => {
        // For checkout.session.completed — return the same event's sub.
        return (nextEvent as { data?: { object?: unknown } })?.data?.object ?? { id }
      },
    },
  }),
  webhookSecret: () => 'whsec_test_dummy_secret_for_unit_test',
}))

vi.mock('@/lib/philly/billing/plans', () => ({
  planForStripePriceId: (priceId: string) => priceToPlan[priceId] ?? null,
}))

vi.mock('@/lib/philly/auth', () => ({
  getAuthPrisma: () => ({
    subscription: {
      upsert: async (args: {
        where: { organizationId: string }
        create: SubscriptionRow
        update: Partial<SubscriptionRow>
      }) => {
        if (upsertBehavior.failNext) {
          upsertBehavior.failNext = false
          throw new Error('simulated DB failure')
        }
        const idx = subscriptionsState.findIndex(
          (s) => s.organizationId === args.where.organizationId,
        )
        if (idx === -1) {
          subscriptionsState.push(args.create)
          return args.create
        }
        subscriptionsState[idx] = {
          ...subscriptionsState[idx],
          ...args.update,
        } as SubscriptionRow
        return subscriptionsState[idx]
      },
      update: async (args: {
        where: { organizationId: string }
        data: Partial<SubscriptionRow>
      }) => {
        const idx = subscriptionsState.findIndex(
          (s) => s.organizationId === args.where.organizationId,
        )
        if (idx === -1) {
          // Mirror Prisma's NotFoundError shape
          const err: Error & { code?: string } = new Error('Record not found')
          err.code = 'P2025'
          throw err
        }
        subscriptionsState[idx] = { ...subscriptionsState[idx], ...args.data } as SubscriptionRow
        return subscriptionsState[idx]
      },
    },
  }),
}))

vi.mock('@/lib/philly/logger', () => ({
  logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
}))

// Safe to import the route AFTER mocks are declared.
import { POST } from '@/app/api/webhooks/stripe/route'

// ── Helpers ────────────────────────────────────────────────────

function makeReq(body: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(
    new Request('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      body,
      headers: {
        'stripe-signature': 't=123,v1=abc',
        'content-type': 'application/json',
        ...headers,
      },
    }),
  )
}

function subscriptionEvent(
  type: string,
  overrides: Partial<{
    organizationId: string
    subId: string
    customerId: string
    priceId: string
    status: string
    cancelAtPeriodEnd: boolean
    trialEnd: number | null
    periodStart: number
    periodEnd: number
  }> = {},
) {
  const orgId = overrides.organizationId ?? 'org-test'
  const priceId = overrides.priceId ?? 'price_test_team'
  return {
    id: `evt_${Math.random().toString(36).slice(2, 10)}`,
    type,
    data: {
      object: {
        id: overrides.subId ?? 'sub_test_123',
        customer: overrides.customerId ?? 'cus_test_456',
        status: overrides.status ?? 'active',
        cancel_at_period_end: overrides.cancelAtPeriodEnd ?? false,
        trial_end: overrides.trialEnd ?? null,
        metadata: { organizationId: orgId },
        items: {
          data: [
            {
              price: { id: priceId },
              current_period_start: overrides.periodStart ?? 1_700_000_000,
              current_period_end: overrides.periodEnd ?? 1_702_592_000,
            },
          ],
        },
      },
    },
  }
}

// ── Tests ──────────────────────────────────────────────────────

beforeEach(() => {
  subscriptionsState.length = 0
  signatureBehavior.mode = 'pass'
  signatureBehavior.failureMessage = 'default'
  upsertBehavior.failNext = false
  nextEvent = null
})

describe('POST /api/webhooks/stripe — data-sync invariants', () => {
  describe('signature verification', () => {
    it('rejects request without stripe-signature header → 400', async () => {
      const req = new NextRequest(
        new Request('http://localhost/api/webhooks/stripe', {
          method: 'POST',
          body: '{}',
          headers: { 'content-type': 'application/json' },
        }),
      )
      const res = await POST(req)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toMatch(/signature/i)
      // No DB write should occur
      expect(subscriptionsState).toHaveLength(0)
    })

    it('rejects request with invalid signature → 400', async () => {
      signatureBehavior.mode = 'fail'
      const res = await POST(makeReq('{"fake":"event"}'))
      expect(res.status).toBe(400)
      expect((await res.json()).error).toMatch(/signature/i)
      expect(subscriptionsState).toHaveLength(0)
    })
  })

  describe('customer.subscription.created — first paid signup path', () => {
    it('upserts a new Subscription row with the right plan + status', async () => {
      nextEvent = subscriptionEvent('customer.subscription.created', {
        organizationId: 'org-aaa',
        subId: 'sub_aaa',
        priceId: 'price_test_team',
        status: 'active',
      })
      const res = await POST(makeReq(JSON.stringify(nextEvent)))
      expect(res.status).toBe(200)
      expect(subscriptionsState).toHaveLength(1)
      const row = subscriptionsState[0]
      expect(row.organizationId).toBe('org-aaa')
      expect(row.stripeSubscriptionId).toBe('sub_aaa')
      expect(row.stripePriceId).toBe('price_test_team')
      expect(row.plan).toBe('team')
      expect(row.status).toBe('active')
      expect(row.currentPeriodStart).toBeInstanceOf(Date)
      expect(row.currentPeriodEnd).toBeInstanceOf(Date)
    })

    it('skips (no row) when subscription has no organizationId metadata', async () => {
      const evt = subscriptionEvent('customer.subscription.created')
      // Strip metadata
      ;(evt.data.object as { metadata: unknown }).metadata = {}
      nextEvent = evt
      const res = await POST(makeReq(JSON.stringify(evt)))
      expect(res.status).toBe(200) // still 200 — we don't want Stripe retries
      expect(subscriptionsState).toHaveLength(0)
    })

    it('upserts with default plan when priceId does not map to a known plan', async () => {
      nextEvent = subscriptionEvent('customer.subscription.created', {
        organizationId: 'org-bbb',
        priceId: 'price_unknown_xyz',
      })
      const res = await POST(makeReq(JSON.stringify(nextEvent)))
      expect(res.status).toBe(200)
      expect(subscriptionsState).toHaveLength(1)
      // Per route.ts comment: falls back to 'operator' if no plan match
      // and no metadata.plan hint.
      expect(subscriptionsState[0].plan).toBe('operator')
    })
  })

  describe('customer.subscription.updated — plan / status changes', () => {
    it('updates existing row in place (idempotent upsert by organizationId)', async () => {
      // Seed initial state with create event
      nextEvent = subscriptionEvent('customer.subscription.created', {
        organizationId: 'org-ccc',
        priceId: 'price_test_operator',
      })
      await POST(makeReq(JSON.stringify(nextEvent)))
      expect(subscriptionsState).toHaveLength(1)
      expect(subscriptionsState[0].plan).toBe('operator')

      // Now an upgrade event
      nextEvent = subscriptionEvent('customer.subscription.updated', {
        organizationId: 'org-ccc',
        priceId: 'price_test_business',
        status: 'active',
      })
      const res = await POST(makeReq(JSON.stringify(nextEvent)))
      expect(res.status).toBe(200)
      // Same row, updated
      expect(subscriptionsState).toHaveLength(1)
      expect(subscriptionsState[0].plan).toBe('business')
      expect(subscriptionsState[0].stripePriceId).toBe('price_test_business')
    })

    it('idempotency — same event delivered twice converges to one row', async () => {
      nextEvent = subscriptionEvent('customer.subscription.updated', {
        organizationId: 'org-ddd',
        status: 'past_due',
      })
      await POST(makeReq(JSON.stringify(nextEvent)))
      // Stripe's retry — identical event
      nextEvent = subscriptionEvent('customer.subscription.updated', {
        organizationId: 'org-ddd',
        status: 'past_due',
      })
      await POST(makeReq(JSON.stringify(nextEvent)))
      // Exactly one row (not duplicated)
      expect(subscriptionsState.filter((s) => s.organizationId === 'org-ddd')).toHaveLength(1)
      expect(subscriptionsState[0].status).toBe('past_due')
    })
  })

  describe('customer.subscription.deleted — cancellation', () => {
    it("marks an existing row's status='canceled' + cancelAtPeriodEnd=true", async () => {
      nextEvent = subscriptionEvent('customer.subscription.created', {
        organizationId: 'org-eee',
        status: 'active',
      })
      await POST(makeReq(JSON.stringify(nextEvent)))
      expect(subscriptionsState[0].status).toBe('active')

      nextEvent = subscriptionEvent('customer.subscription.deleted', {
        organizationId: 'org-eee',
      })
      const res = await POST(makeReq(JSON.stringify(nextEvent)))
      expect(res.status).toBe(200)
      expect(subscriptionsState[0].status).toBe('canceled')
      expect(subscriptionsState[0].cancelAtPeriodEnd).toBe(true)
    })

    it('does NOT throw when deleted event arrives for unknown organizationId', async () => {
      // No prior create — just the delete. Handler should NOT 500.
      nextEvent = subscriptionEvent('customer.subscription.deleted', {
        organizationId: 'org-never-existed',
      })
      const res = await POST(makeReq(JSON.stringify(nextEvent)))
      // Route catches the .update() throw and logs; returns 200.
      // (Reading the route: handler awaits .update().catch(err => log)
      //  — so the outer try/catch sees no error.)
      expect(res.status).toBe(200)
    })
  })

  describe('unknown event type — Stripe-stops-retrying contract', () => {
    it('returns 200 for events we do not handle', async () => {
      nextEvent = {
        id: 'evt_some_new_stripe_thing',
        type: 'customer.discount.created',
        data: { object: {} },
      }
      const res = await POST(makeReq(JSON.stringify(nextEvent)))
      expect(res.status).toBe(200)
      // No DB write
      expect(subscriptionsState).toHaveLength(0)
    })
  })

  describe('handler exception — Stripe-must-retry contract', () => {
    it('returns 500 when the upsert throws (so Stripe retries with backoff)', async () => {
      upsertBehavior.failNext = true
      nextEvent = subscriptionEvent('customer.subscription.created', {
        organizationId: 'org-fff',
      })
      const res = await POST(makeReq(JSON.stringify(nextEvent)))
      expect(res.status).toBe(500)
      expect(subscriptionsState).toHaveLength(0) // upsert threw before persist
    })
  })
})
