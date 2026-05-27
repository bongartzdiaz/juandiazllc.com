/* Funda lead-ingestor — Funda webhook payload → DEUS Contact + Lead.
   ──────────────────────────────────────────────────────────────────
   Pure function. Takes a parsed FundaLeadWebhook + a "ports" object
   (the things it needs from the outside world) and returns a
   structured ingest plan that the caller can execute against Prisma.

   The "ports" pattern lets the unit test inject in-memory fakes for
   contact-lookup + audit-log without spinning up Prisma. Same pattern
   as lib/philly/automation/engine.ts.

   ## When this gets called

   Today: nowhere — this is scaffolding for when Funda webhooks land.

   Tomorrow: the generic receiver at app/api/webhooks/inbound/[provider]
   dispatches by provider name. When `provider === 'funda'`, parse JSON
   body as FundaLeadWebhook and call ingestFundaLead. The receiver does
   HMAC validation; this function does business logic.
   --------------------------------------------------------------- */

import type { FundaLeadWebhook } from './types'

/** Outcome of ingest — caller writes to Prisma based on this. */
export type IngestOutcome =
  | {
      action: 'ignored'
      reason:
        | 'duplicate_event'
        | 'unknown_listing'
        | 'invalid_payload'
      detail?: string
    }
  | {
      action: 'created_contact'
      contact: {
        name: string
        email: string
        phone: string
        notes: string
        leadSource: 'funda'
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

/**
 * Ports the ingestor needs. Production passes real Prisma queries;
 * tests pass in-memory stubs.
 */
export interface IngestPorts {
  /** Has this Funda event ID already been ingested? */
  hasSeenEvent: (eventId: string) => Promise<boolean>
  /** Resolve a Funda listingId / partnerReference to a DEUS Property.id. */
  findPropertyByPortalRef: (
    portal: 'funda',
    externalId: string,
    partnerReference: string,
  ) => Promise<string | null>
  /** Find an existing Contact for this org by email (blind-indexed). */
  findContactByEmail: (organizationId: string, email: string) => Promise<{ id: string } | null>
  /** The org this webhook belongs to (resolved upstream from URL token). */
  organizationId: string
}

/** Translate a Funda lead-webhook event into an ingest plan. */
export async function ingestFundaLead(
  event: FundaLeadWebhook,
  ports: IngestPorts,
): Promise<IngestOutcome> {
  if (!event.eventId || !event.contact?.email) {
    return { action: 'ignored', reason: 'invalid_payload', detail: 'missing eventId or contact.email' }
  }

  // Idempotency — Funda may retry on our 4xx/5xx.
  if (await ports.hasSeenEvent(event.eventId)) {
    return { action: 'ignored', reason: 'duplicate_event' }
  }

  // Resolve listing → Property. If we can't, still ingest the contact
  // but unlinked — the operator can manually attach it from the audit
  // log. Better than dropping a real lead on the floor.
  const propertyId = await ports.findPropertyByPortalRef(
    'funda',
    event.listingId,
    event.partnerReference,
  )

  // Compose the human-readable note. Funda doesn't structure these into
  // separate fields, so we flatten timeline + financing + message into
  // one note that surfaces in the Contact's quickview.
  const noteLines: string[] = []
  noteLines.push(`Lead via Funda (${event.leadType}) on ${event.receivedAt}`)
  if (event.contact.message?.trim()) {
    noteLines.push('')
    noteLines.push(event.contact.message.trim())
  }
  if (event.contact.timeline) {
    noteLines.push('')
    noteLines.push(`Timeline: ${event.contact.timeline}`)
  }
  if (event.contact.financingStatus) {
    noteLines.push(`Financing: ${event.contact.financingStatus}`)
  }
  const note = noteLines.join('\n')

  // Check for existing contact by email (dedup across portals — a lead
  // who pinged us before on Immoweb should land on the same Contact row).
  const existing = await ports.findContactByEmail(ports.organizationId, event.contact.email)
  if (existing) {
    return {
      action: 'updated_existing_contact',
      contactId: existing.id,
      newNote: note,
      sourceEventId: event.eventId,
    }
  }

  return {
    action: 'created_contact',
    contact: {
      name: event.contact.fullName.trim() || 'Anonymous Funda lead',
      email: event.contact.email.trim(),
      phone: (event.contact.phone ?? '').trim(),
      notes: note,
      leadSource: 'funda',
      preferredMethod: event.contact.preferredMethod ?? 'email',
    },
    linkedPropertyId: propertyId,
    sourceEventId: event.eventId,
  }
}
