/* External calendar event persistence — Bundle D4a.
 *
 * The provider returns rich event payloads on the delta-sync call. This
 * module decides which subset is safe to persist (Art. 9 minimal),
 * filters by CRM-contact intersection, and upserts SyncedCalendarEvent
 * rows.
 *
 * Privacy-by-design rules (matches HubSpot / Pipedrive convention):
 *   1. ONLY events whose attendee list intersects with at least one CRM
 *      Contact in the same organization are persisted. Personal
 *      appointments without any CRM contact are counted but never
 *      stored.
 *   2. NEVER store the description field — too high a risk of leaking
 *      Art. 9 special-category data (medical, legal, religious).
 *   3. Only persist attendee emails that resolve to a CRM Contact;
 *      non-matching attendees are dropped entirely.
 *   4. Honour the org-level `redactSyncedTitles` toggle: when true,
 *      title + location are stored as SHA-256 + "(redacted)" instead
 *      of verbatim.
 *
 * The module is provider-agnostic — call sites in delta-sync.ts
 * normalise Google + Microsoft payloads to a common shape (NormalisedEvent)
 * before calling persistEvents().
 */

import crypto from 'crypto'
import { getAuthPrisma } from '@/lib/philly/auth'

/** Common shape across Google + Microsoft. Provider-specific normalisers
 *  in delta-sync.ts produce this from the raw provider response. */
export interface NormalisedEvent {
  externalId: string
  title: string
  // Description from the provider — will NEVER be persisted, but is part
  // of the input shape because future Art. 9 controls (e.g. heuristic
  // redaction) may need to inspect it.
  description: string
  location: string
  htmlLink: string
  start: Date
  end: Date
  allDay: boolean
  /** Lowercased emails of all attendees. Filtered against CRM contacts
   *  before any subset reaches the database. */
  attendeeEmails: string[]
  /** True if the provider says the event is cancelled / removed. */
  cancelled: boolean
}

export interface PersistInput {
  connectionId: string
  organizationId: string
  userId: string
  provider: 'google' | 'microsoft'
  events: NormalisedEvent[]
}

export interface PersistResult {
  /** Events that arrived from the provider in this batch. */
  inputCount: number
  /** Events persisted (created or updated). */
  persisted: number
  /** Events skipped because no attendee matched a CRM Contact. */
  skippedNoMatch: number
  /** Events soft-marked cancelled (provider deleted them). */
  cancelled: number
}

/**
 * Persist a batch of normalised events. Idempotent — same input twice
 * produces the same DB state. Tolerates partial failures (one bad row
 * doesn't block the batch).
 */
export async function persistEvents(input: PersistInput): Promise<PersistResult> {
  const result: PersistResult = {
    inputCount: input.events.length,
    persisted: 0,
    skippedNoMatch: 0,
    cancelled: 0,
  }
  if (input.events.length === 0) return result

  const prisma = getAuthPrisma()

  // Build the contact-email index ONCE per batch. Lowercase normalised.
  // Org-scoped — we never match a contact from a different organization
  // even if the email collides.
  const allAttendeeEmails = new Set<string>()
  for (const ev of input.events) {
    for (const email of ev.attendeeEmails) {
      if (email) allAttendeeEmails.add(email.toLowerCase())
    }
  }

  let contactEmails = new Set<string>()
  if (allAttendeeEmails.size > 0) {
    const matches = await prisma.contact.findMany({
      where: {
        organizationId: input.organizationId,
        email: { in: Array.from(allAttendeeEmails) },
      },
      select: { email: true },
    })
    contactEmails = new Set(
      matches
        .map((m) => (m.email ?? '').toLowerCase())
        .filter((e) => e.length > 0),
    )
  }

  // Read the org's redaction setting once.
  const org = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: { redactSyncedTitles: true },
  })
  const redact = Boolean(org?.redactSyncedTitles)

  for (const ev of input.events) {
    const matches = filterMatchedAttendees(ev.attendeeEmails, contactEmails)

    // Cancelled events: if the row exists, mark cancelled. If it doesn't,
    // skip — we never had it.
    if (ev.cancelled) {
      const existing = await prisma.syncedCalendarEvent.findUnique({
        where: {
          connectionId_externalId: {
            connectionId: input.connectionId,
            externalId: ev.externalId,
          },
        },
        select: { id: true },
      })
      if (existing) {
        await prisma.syncedCalendarEvent.update({
          where: { id: existing.id },
          data: { cancelledAt: new Date() },
        })
        result.cancelled++
      }
      continue
    }

    // Privacy filter — no CRM contact, no persistence.
    if (matches.length === 0) {
      result.skippedNoMatch++
      continue
    }

    const title = redact ? redactedLabel(ev.title) : ev.title.slice(0, 500)
    const location = redact ? redactedLabel(ev.location) : ev.location.slice(0, 500)

    await prisma.syncedCalendarEvent.upsert({
      where: {
        connectionId_externalId: {
          connectionId: input.connectionId,
          externalId: ev.externalId,
        },
      },
      create: {
        connectionId: input.connectionId,
        organizationId: input.organizationId,
        userId: input.userId,
        provider: input.provider,
        externalId: ev.externalId,
        title,
        location,
        htmlLink: ev.htmlLink.slice(0, 2000),
        startTime: ev.start,
        endTime: ev.end,
        allDay: ev.allDay,
        matchedEmails: matches.join(','),
      },
      update: {
        title,
        location,
        htmlLink: ev.htmlLink.slice(0, 2000),
        startTime: ev.start,
        endTime: ev.end,
        allDay: ev.allDay,
        matchedEmails: matches.join(','),
        cancelledAt: null, // un-cancel if a previously cancelled event was restored
      },
    })
    result.persisted++
  }

  return result
}

/** Lowercase + intersect attendee emails against the CRM-contact set.
 *  Returns deduplicated, sorted matches — sorted so the matchedEmails
 *  string is stable across re-syncs (otherwise upsert noise on every
 *  delta-fetch). */
export function filterMatchedAttendees(
  attendeeEmails: string[],
  contactEmails: Set<string>,
): string[] {
  const matched = new Set<string>()
  for (const email of attendeeEmails) {
    const lower = (email ?? '').toLowerCase()
    if (lower && contactEmails.has(lower)) matched.add(lower)
  }
  return Array.from(matched).sort()
}

/** Turn a verbatim title / location into "(redacted) sha256:abc12345…"
 *  — keeps a stable identifier for change detection without storing the
 *  plaintext. The hash is short (8 hex chars / 32 bits) — enough for
 *  duplicate-detection within a user's calendar without enabling
 *  cross-user dictionary attacks. */
export function redactedLabel(plaintext: string): string {
  if (!plaintext) return '(redacted)'
  const hash = crypto
    .createHash('sha256')
    .update(plaintext)
    .digest('hex')
    .slice(0, 8)
  return `(redacted) ${hash}`
}

export const __internals = { redactedLabel }

// ── Retention prune ─────────────────────────────────────────────────────

const DEFAULT_EVENT_RETENTION_DAYS = 14
const MIN_EVENT_RETENTION_DAYS = 1

/** Resolve retention window in days from env override or default.
 *  Env: SYNCED_EVENT_RETENTION_DAYS. Floored at MIN to prevent typo-wipe. */
export function syncedEventRetentionDays(override?: number): number {
  if (typeof override === 'number' && Number.isFinite(override)) {
    return Math.max(MIN_EVENT_RETENTION_DAYS, Math.floor(override))
  }
  const raw = process.env.SYNCED_EVENT_RETENTION_DAYS
  if (!raw) return DEFAULT_EVENT_RETENTION_DAYS
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n < MIN_EVENT_RETENTION_DAYS) return DEFAULT_EVENT_RETENTION_DAYS
  return n
}

/** Hard-delete SyncedCalendarEvent rows whose endTime is older than cutoff.
 *
 *  Retention rationale: the live calendar feed is the source of truth.
 *  We persist a 14-day rolling window for activity-trail surfaces (deal
 *  detail, contact timeline). Older events are reconstructed by re-syncing
 *  on demand if needed. Storage limitation per GDPR Art. 5(1)(e).
 *
 *  Optional org scope for admin-triggered runs (defense-in-depth).
 */
export async function pruneStaleSyncedEvents(opts: {
  cutoff: Date
  organizationId?: string
}): Promise<{ deleted: number }> {
  const prisma = getAuthPrisma()
  const where: Record<string, unknown> = {
    endTime: { lt: opts.cutoff },
  }
  if (opts.organizationId) where.organizationId = opts.organizationId
  const { count } = await prisma.syncedCalendarEvent.deleteMany({ where })
  return { deleted: count }
}
