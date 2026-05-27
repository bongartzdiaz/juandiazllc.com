/* ImmoScout24 lead-ingestor — IS24 webhook payload → DEUS Contact + Lead.
   ──────────────────────────────────────────────────────────────────
   Sibling of lib/philly/integrations/funda/lead-ingestor.ts.

   ## IS24-specific differences vs Funda

   - Contact name split into firstName + lastName (Funda flat fullName).
   - Salutation present ("Herr"/"Frau"/"Divers") — surfaced in the note.
   - leadType vocabulary differs: CONTACT, VIEWING, BROCHURE, CALLBACK,
     FINANCING (Funda's are contact_request, viewing_request, etc.).
   - Prospect can specify preferredContactTime (MORNING/AFTERNOON/EVENING).
   --------------------------------------------------------------- */

import type { IS24LeadWebhook } from './types'

export type IngestOutcome =
  | {
      action: 'ignored'
      reason: 'duplicate_event' | 'unknown_listing' | 'invalid_payload'
      detail?: string
    }
  | {
      action: 'created_contact'
      contact: {
        name: string
        email: string
        phone: string
        notes: string
        leadSource: 'immoscout24'
        preferredMethod: 'email' | 'phone' | 'whatsapp'
      }
      linkedPropertyId: string | null
      sourceEventId: string
    }
  | {
      action: 'updated_existing_contact'
      contactId: string
      newNote: string
      sourceEventId: string
    }

export interface IngestPorts {
  hasSeenEvent: (eventId: string) => Promise<boolean>
  findPropertyByPortalRef: (
    portal: 'immoscout24',
    externalId: string,
    partnerReference: string,
  ) => Promise<string | null>
  findContactByEmail: (organizationId: string, email: string) => Promise<{ id: string } | null>
  organizationId: string
}

export async function ingestIS24Lead(
  event: IS24LeadWebhook,
  ports: IngestPorts,
): Promise<IngestOutcome> {
  if (!event.eventId || !event.contact?.email) {
    return { action: 'ignored', reason: 'invalid_payload', detail: 'missing eventId or contact.email' }
  }

  if (await ports.hasSeenEvent(event.eventId)) {
    return { action: 'ignored', reason: 'duplicate_event' }
  }

  const propertyId = await ports.findPropertyByPortalRef(
    'immoscout24',
    event.exposeId,
    event.partnerReference,
  )

  // Compose human-readable note
  const noteLines: string[] = []
  noteLines.push(`Lead via ImmoScout24 (${event.leadType}) on ${event.receivedAt}`)
  if (event.contact.message?.trim()) {
    noteLines.push('')
    noteLines.push(event.contact.message.trim())
  }
  if (event.contact.preferredContactTime && event.contact.preferredContactTime !== 'ANY') {
    noteLines.push('')
    noteLines.push(`Preferred contact time: ${event.contact.preferredContactTime}`)
  }
  if (event.contact.moveInDate) {
    noteLines.push(`Move-in date: ${event.contact.moveInDate}`)
  }
  if (event.contact.financingConfirmed === true) {
    noteLines.push('Financing confirmed: yes')
  }
  const note = noteLines.join('\n')

  // Build full name from firstName + lastName + optional salutation
  const fullName = [
    event.contact.salutation,
    event.contact.firstName.trim(),
    event.contact.lastName.trim(),
  ].filter(Boolean).join(' ').trim() || 'Anonymous ImmoScout24 lead'

  // Dedup against existing contact by email
  const existing = await ports.findContactByEmail(ports.organizationId, event.contact.email)
  if (existing) {
    return {
      action: 'updated_existing_contact',
      contactId: existing.id,
      newNote: note,
      sourceEventId: event.eventId,
    }
  }

  // CALLBACK lead → phone is the preferred contact method
  const preferredMethod: 'email' | 'phone' | 'whatsapp' =
    event.leadType === 'CALLBACK' ? 'phone' : 'email'

  return {
    action: 'created_contact',
    contact: {
      name: fullName,
      email: event.contact.email.trim(),
      phone: (event.contact.phone ?? '').trim(),
      notes: note,
      leadSource: 'immoscout24',
      preferredMethod,
    },
    linkedPropertyId: propertyId,
    sourceEventId: event.eventId,
  }
}
