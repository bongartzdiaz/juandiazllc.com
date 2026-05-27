/* Hermetic tests — Funda lead-ingestor.
   ──────────────────────────────────────────────────────────────────
   Tests the pure ingestor function with in-memory port stubs. No
   Prisma, no network. Pins the contract for what a Funda webhook
   becomes after parsing — the wire-up PR connects this to the real
   /api/webhooks/inbound receiver. */

import { describe, it, expect } from 'vitest'
import { ingestFundaLead, type IngestPorts } from './lead-ingestor'
import type { FundaLeadWebhook } from './types'

function event(over: Partial<FundaLeadWebhook> = {}): FundaLeadWebhook {
  return {
    eventId: 'ev_abc',
    receivedAt: '2026-05-27T10:00:00Z',
    partnerReference: 'prop_42',
    listingId: 'funda-prop_42-1700',
    leadType: 'contact_request',
    contact: {
      fullName: 'Alice Bakker',
      email: 'alice@example.com',
      phone: '+31612345678',
      preferredMethod: 'email',
      message: 'Hi, I would like to schedule a viewing.',
      timeline: 'asap',
      financingStatus: 'pre_approved',
    },
    ...over,
  }
}

function ports(over: Partial<IngestPorts> = {}): IngestPorts {
  return {
    organizationId: 'org_1',
    hasSeenEvent: async () => false,
    findPropertyByPortalRef: async () => 'prop_42',
    findContactByEmail: async () => null,
    ...over,
  }
}

describe('ingestFundaLead — happy path', () => {
  it('creates a contact when email is unknown', async () => {
    const r = await ingestFundaLead(event(), ports())
    expect(r.action).toBe('created_contact')
    if (r.action === 'created_contact') {
      expect(r.contact.name).toBe('Alice Bakker')
      expect(r.contact.email).toBe('alice@example.com')
      expect(r.contact.phone).toBe('+31612345678')
      expect(r.contact.leadSource).toBe('funda')
      expect(r.contact.preferredMethod).toBe('email')
      expect(r.linkedPropertyId).toBe('prop_42')
      expect(r.sourceEventId).toBe('ev_abc')
    }
  })

  it('flattens message + timeline + financing into a single note', async () => {
    const r = await ingestFundaLead(event(), ports())
    if (r.action === 'created_contact') {
      expect(r.contact.notes).toContain('Lead via Funda (contact_request)')
      expect(r.contact.notes).toContain('Hi, I would like to schedule a viewing.')
      expect(r.contact.notes).toContain('Timeline: asap')
      expect(r.contact.notes).toContain('Financing: pre_approved')
    }
  })

  it('uses phone preferredMethod when prospect picked phone', async () => {
    const e = event()
    e.contact.preferredMethod = 'phone'
    const r = await ingestFundaLead(e, ports())
    if (r.action === 'created_contact') {
      expect(r.contact.preferredMethod).toBe('phone')
    }
  })
})

describe('ingestFundaLead — dedup against existing contact', () => {
  it('returns updated_existing_contact when email already exists in this org', async () => {
    const r = await ingestFundaLead(
      event(),
      ports({ findContactByEmail: async () => ({ id: 'contact_xyz' }) }),
    )
    expect(r.action).toBe('updated_existing_contact')
    if (r.action === 'updated_existing_contact') {
      expect(r.contactId).toBe('contact_xyz')
      expect(r.newNote).toContain('Lead via Funda (contact_request)')
      expect(r.sourceEventId).toBe('ev_abc')
    }
  })
})

describe('ingestFundaLead — idempotency', () => {
  it('returns ignored:duplicate_event when eventId already seen', async () => {
    const r = await ingestFundaLead(event(), ports({ hasSeenEvent: async () => true }))
    expect(r.action).toBe('ignored')
    if (r.action === 'ignored') expect(r.reason).toBe('duplicate_event')
  })
})

describe('ingestFundaLead — missing property is non-fatal', () => {
  it('still creates a contact even when the listing is unknown', async () => {
    const r = await ingestFundaLead(
      event(),
      ports({ findPropertyByPortalRef: async () => null }),
    )
    expect(r.action).toBe('created_contact')
    if (r.action === 'created_contact') {
      expect(r.linkedPropertyId).toBeNull()
      // Operator still sees the lead in the Contacts list with leadSource=funda
      expect(r.contact.leadSource).toBe('funda')
    }
  })
})

describe('ingestFundaLead — invalid payloads', () => {
  it('rejects when eventId is missing', async () => {
    const e = event()
    e.eventId = ''
    const r = await ingestFundaLead(e, ports())
    expect(r.action).toBe('ignored')
    if (r.action === 'ignored') expect(r.reason).toBe('invalid_payload')
  })

  it('rejects when contact.email is missing', async () => {
    const e = event()
    e.contact.email = ''
    const r = await ingestFundaLead(e, ports())
    expect(r.action).toBe('ignored')
    if (r.action === 'ignored') expect(r.reason).toBe('invalid_payload')
  })

  it('handles missing fullName by falling back to a placeholder', async () => {
    const e = event()
    e.contact.fullName = ''
    const r = await ingestFundaLead(e, ports())
    if (r.action === 'created_contact') {
      expect(r.contact.name).toBe('Anonymous Funda lead')
    }
  })

  it('handles missing phone (some prospects skip it)', async () => {
    const e = event()
    delete e.contact.phone
    const r = await ingestFundaLead(e, ports())
    if (r.action === 'created_contact') {
      expect(r.contact.phone).toBe('')
    }
  })
})

describe('ingestFundaLead — lead-type coverage', () => {
  it('mentions the lead type in the note for brochure_request', async () => {
    const r = await ingestFundaLead(event({ leadType: 'brochure_request' }), ports())
    if (r.action === 'created_contact') {
      expect(r.contact.notes).toContain('(brochure_request)')
    }
  })

  it('handles viewing_request', async () => {
    const r = await ingestFundaLead(event({ leadType: 'viewing_request' }), ports())
    if (r.action === 'created_contact') {
      expect(r.contact.notes).toContain('(viewing_request)')
    }
  })
})
