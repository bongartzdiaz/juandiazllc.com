import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import crypto from 'node:crypto'
import type Stripe from 'stripe'
import {
  isHandledEvent,
  HANDLED_EVENTS,
  resolveOrganizationId,
  invoiceSubscriptionId,
  verifyWebhook,
} from './webhook'
import { __resetStripeCache } from './client'

const ORIGINAL_ENV = { ...process.env }
beforeEach(() => {
  process.env = { ...ORIGINAL_ENV, STRIPE_SECRET_KEY: 'sk_test_dummy' }
  __resetStripeCache()
})
afterEach(() => {
  vi.restoreAllMocks()
})

/** Build a real Stripe-style signed payload with the same scheme
 *  Stripe uses (`t=…,v1=…`). The Stripe SDK verifies our HMAC, so by
 *  signing with the test secret + testing both happy + tampered we
 *  exercise the same code path Stripe verification will hit in prod. */
function signPayload(payload: string, secret: string, timestamp = Math.floor(Date.now() / 1000)) {
  const signedPayload = `${timestamp}.${payload}`
  const sig = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex')
  return { header: `t=${timestamp},v1=${sig}`, timestamp }
}

describe('isHandledEvent / HANDLED_EVENTS', () => {
  it('lists exactly the 5 critical events', () => {
    expect(HANDLED_EVENTS).toEqual([
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.payment_failed',
      'invoice.paid',
    ])
  })

  it('isHandledEvent narrows to the union type', () => {
    expect(isHandledEvent('customer.subscription.created')).toBe(true)
    expect(isHandledEvent('checkout.session.completed')).toBe(false)
    expect(isHandledEvent('foo.bar')).toBe(false)
  })
})

describe('verifyWebhook', () => {
  const SECRET = 'whsec_test_abc'
  const payload = JSON.stringify({ id: 'evt_test', type: 'invoice.paid' })

  it('verifies a properly-signed payload', () => {
    const { header } = signPayload(payload, SECRET)
    const result = verifyWebhook(payload, header, SECRET)
    expect(result.ok).toBe(true)
    expect(result.event?.id).toBe('evt_test')
  })

  it('rejects when signature header is missing', () => {
    const result = verifyWebhook(payload, null, SECRET)
    expect(result.ok).toBe(false)
    expect(result.error).toBe('missing_signature')
  })

  it('rejects when secret is missing', () => {
    const { header } = signPayload(payload, SECRET)
    const result = verifyWebhook(payload, header, null)
    expect(result.ok).toBe(false)
    expect(result.error).toBe('missing_secret')
  })

  it('rejects a payload signed with a different secret', () => {
    const { header } = signPayload(payload, 'whsec_evil_xyz')
    const result = verifyWebhook(payload, header, SECRET)
    expect(result.ok).toBe(false)
    expect(result.error).toBe('invalid_signature')
  })

  it('rejects a tampered payload (signature was for the original)', () => {
    const { header } = signPayload(payload, SECRET)
    const tampered = payload.replace('"invoice.paid"', '"customer.subscription.created"')
    const result = verifyWebhook(tampered, header, SECRET)
    expect(result.ok).toBe(false)
    expect(result.error).toBe('invalid_signature')
  })

  it('rejects an expired timestamp (5-min default tolerance)', () => {
    const oldTimestamp = Math.floor(Date.now() / 1000) - 600 // 10 min ago
    const { header } = signPayload(payload, SECRET, oldTimestamp)
    const result = verifyWebhook(payload, header, SECRET)
    expect(result.ok).toBe(false)
    expect(result.error).toBe('invalid_signature')
  })
})

describe('resolveOrganizationId', () => {
  function fakeSub(metadata: Record<string, string>, customerMeta?: Record<string, string>): Stripe.Subscription {
    const customer = customerMeta
      ? ({ id: 'cus_x', metadata: customerMeta } as unknown as Stripe.Customer)
      : ('cus_x' as unknown as Stripe.Subscription['customer'])
    return {
      id: 'sub_x',
      metadata,
      customer,
    } as unknown as Stripe.Subscription
  }

  it('returns the id from sub.metadata.organizationId when present', () => {
    expect(resolveOrganizationId(fakeSub({ organizationId: 'org_42' }))).toBe('org_42')
  })

  it('falls back to customer.metadata.organizationId when sub metadata is empty and customer is expanded', () => {
    expect(resolveOrganizationId(fakeSub({}, { organizationId: 'org_99' }))).toBe('org_99')
  })

  it('returns null when sub metadata is empty and customer is just a string id', () => {
    expect(resolveOrganizationId(fakeSub({}))).toBeNull()
  })
})

describe('invoiceSubscriptionId', () => {
  it('extracts the id when subscription is a string', () => {
    const inv = { subscription: 'sub_abc' } as unknown as Stripe.Invoice
    expect(invoiceSubscriptionId(inv)).toBe('sub_abc')
  })

  it('extracts the id when subscription is an object', () => {
    const inv = { subscription: { id: 'sub_xyz' } } as unknown as Stripe.Invoice
    expect(invoiceSubscriptionId(inv)).toBe('sub_xyz')
  })

  it('returns null for one-off invoices (no subscription)', () => {
    const inv = { subscription: null } as unknown as Stripe.Invoice
    expect(invoiceSubscriptionId(inv)).toBeNull()
  })

  it('returns null when subscription field is absent', () => {
    const inv = {} as unknown as Stripe.Invoice
    expect(invoiceSubscriptionId(inv)).toBeNull()
  })
})
