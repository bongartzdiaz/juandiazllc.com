/* Hermetic tests — ImmoScout24 lead-ingestor. */

import { describe, it, expect } from 'vitest'
import { ingestIS24Lead, type IngestPorts } from './lead-ingestor'
import type { IS24LeadWebhook } from './types'

function event(over: Partial<IS24LeadWebhook> = {}): IS24LeadWebhook {
  return {
    eventId: 'ev_abc',
    receivedAt: '2026-05-27T10:00:00Z',
    partnerReference: 'prop_42',
    exposeId: 'is24-prop_42-1700',
    leadType: 'CONTACT',
    contact: {
      salutation: 'Herr',
      firstName: 'Hans',
      lastName: 'Müller',
      email: 'hans@example.de',
      phone: '+49301234567',
      message: 'Ich möchte eine Besichtigung vereinbaren.',
      preferredContactTime: 'EVENING',
      moveInDate: '2026-09-01',
      financingConfirmed: true,
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

describe('ingestIS24Lead — happy path', () => {
  it('creates contact with full German name (salutation + first + last)', async () => {
    const r = await ingestIS24Lead(event(), ports())
    expect(r.action).toBe('created_contact')
    if (r.action === 'created_contact') {
      expect(r.contact.name).toBe('Herr Hans Müller')
      expect(r.contact.email).toBe('hans@example.de')
      expect(r.contact.leadSource).toBe('immoscout24')
      expect(r.contact.preferredMethod).toBe('email')
      expect(r.linkedPropertyId).toBe('prop_42')
    }
  })

  it('builds name without salutation when missing', async () => {
    const e = event()
    delete e.contact.salutation
    const r = await ingestIS24Lead(e, ports())
    if (r.action === 'created_contact') {
      expect(r.contact.name).toBe('Hans Müller')
    }
  })

  it('CALLBACK lead-type sets preferredMethod to phone', async () => {
    const r = await ingestIS24Lead(event({ leadType: 'CALLBACK' }), ports())
    if (r.action === 'created_contact') {
      expect(r.contact.preferredMethod).toBe('phone')
    }
  })

  it('flattens message + preferred-contact-time + move-in into note', async () => {
    const r = await ingestIS24Lead(event(), ports())
    if (r.action === 'created_contact') {
      expect(r.contact.notes).toContain('Lead via ImmoScout24 (CONTACT)')
      expect(r.contact.notes).toContain('Ich möchte eine Besichtigung vereinbaren.')
      expect(r.contact.notes).toContain('EVENING')
      expect(r.contact.notes).toContain('Move-in date: 2026-09-01')
      expect(r.contact.notes).toContain('Financing confirmed: yes')
    }
  })

  it('omits preferred-contact-time from note when ANY', async () => {
    const e = event()
    e.contact.preferredContactTime = 'ANY'
    const r = await ingestIS24Lead(e, ports())
    if (r.action === 'created_contact') {
      expect(r.contact.notes).not.toContain('Preferred contact time')
    }
  })
})

describe('ingestIS24Lead — dedup', () => {
  it('returns updated_existing_contact when email exists', async () => {
    const r = await ingestIS24Lead(
      event(),
      ports({ findContactByEmail: async () => ({ id: 'contact_xyz' }) }),
    )
    expect(r.action).toBe('updated_existing_contact')
    if (r.action === 'updated_existing_contact') {
      expect(r.contactId).toBe('contact_xyz')
      expect(r.newNote).toContain('Lead via ImmoScout24')
    }
  })
})

describe('ingestIS24Lead — idempotency', () => {
  it('returns ignored:duplicate_event when eventId already seen', async () => {
    const r = await ingestIS24Lead(event(), ports({ hasSeenEvent: async () => true }))
    expect(r.action).toBe('ignored')
    if (r.action === 'ignored') expect(r.reason).toBe('duplicate_event')
  })
})

describe('ingestIS24Lead — missing property non-fatal', () => {
  it('still creates contact when listing unknown', async () => {
    const r = await ingestIS24Lead(
      event(),
      ports({ findPropertyByPortalRef: async () => null }),
    )
    expect(r.action).toBe('created_contact')
    if (r.action === 'created_contact') {
      expect(r.linkedPropertyId).toBeNull()
      expect(r.contact.leadSource).toBe('immoscout24')
    }
  })
})

describe('ingestIS24Lead — invalid payloads', () => {
  it('rejects empty eventId', async () => {
    const e = event()
    e.eventId = ''
    const r = await ingestIS24Lead(e, ports())
    if (r.action === 'ignored') expect(r.reason).toBe('invalid_payload')
  })

  it('rejects missing email', async () => {
    const e = event()
    e.contact.email = ''
    const r = await ingestIS24Lead(e, ports())
    if (r.action === 'ignored') expect(r.reason).toBe('invalid_payload')
  })

  it('handles missing names with placeholder', async () => {
    const e = event()
    e.contact.firstName = ''
    e.contact.lastName = ''
    delete e.contact.salutation
    const r = await ingestIS24Lead(e, ports())
    if (r.action === 'created_contact') {
      expect(r.contact.name).toBe('Anonymous ImmoScout24 lead')
    }
  })
})

describe('ingestIS24Lead — lead-type coverage', () => {
  it('handles VIEWING type', async () => {
    const r = await ingestIS24Lead(event({ leadType: 'VIEWING' }), ports())
    if (r.action === 'created_contact') {
      expect(r.contact.notes).toContain('(VIEWING)')
    }
  })

  it('handles BROCHURE type', async () => {
    const r = await ingestIS24Lead(event({ leadType: 'BROCHURE' }), ports())
    if (r.action === 'created_contact') {
      expect(r.contact.notes).toContain('(BROCHURE)')
    }
  })

  it('handles FINANCING type', async () => {
    const r = await ingestIS24Lead(event({ leadType: 'FINANCING' }), ports())
    if (r.action === 'created_contact') {
      expect(r.contact.notes).toContain('(FINANCING)')
    }
  })
})
