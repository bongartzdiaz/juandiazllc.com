/* ---------------------------------------------------------------
   DSAR coverage for the marketing store.

   The CRM lives in MariaDB behind Prisma; the public marketing forms
   write to Supabase Postgres (`public.leads`, `public.subscribers`).
   Two stores, one data subject — so both Art. 15 (access) and Art. 17
   (erasure) have to reach across both, or we would be answering legal
   requests from half the picture.

   Identity axis differs between the stores. The CRM keys on
   `userId`/`organizationId`; marketing submissions are anonymous at
   write time and key only on the **email address** the visitor typed.
   That means:

     - Matching is by lowercased email, exact. We deliberately do not
       fuzzy-match (no plus-address stripping, no domain matching) —
       over-matching would return or delete another person's data,
       which is worse than under-matching.
     - A submission made with a different address than the account
       email will not be found. That is correct: we have no basis to
       link them.

   Reads and writes here use the service-role client, which bypasses
   RLS by design — these tables are insert-only for the public roles
   (see docs/db/2026-07-21-rls-lead-capture-fix.md).
   --------------------------------------------------------------- */

import { createServiceClient } from '@/lib/supabase/service'
import { logger } from '@/lib/philly/logger'

export interface MarketingArchive {
  /** False when the marketing store could not be reached at all. */
  available: boolean
  leads: unknown[]
  subscribers: unknown[]
  /** Set when `available` is false — surfaced in the DSAR manifest. */
  error?: string
}

export interface MarketingPurgeResult {
  available: boolean
  leadsDeleted: number
  subscribersDeleted: number
  error?: string
}

/** Lowercase, de-duplicate, drop blanks. */
export function normaliseEmails(emails: ReadonlyArray<string | null | undefined>): string[] {
  const seen = new Set<string>()
  for (const raw of emails) {
    const email = raw?.trim().toLowerCase()
    if (email) seen.add(email)
  }
  return [...seen]
}

/**
 * Everything the marketing store holds for these addresses.
 *
 * Never throws: a DSAR export must still be deliverable if Supabase is
 * unreachable. The failure is reported through `available` + `error`
 * so the manifest can say so out loud rather than silently returning
 * an incomplete archive.
 */
export async function fetchMarketingData(
  emails: ReadonlyArray<string | null | undefined>,
): Promise<MarketingArchive> {
  const targets = normaliseEmails(emails)
  if (targets.length === 0) {
    return { available: true, leads: [], subscribers: [] }
  }

  try {
    const supabase = createServiceClient()

    const [leadsRes, subsRes] = await Promise.all([
      supabase
        .from('leads')
        .select('id, name, email, company, sector, message, source, created_at')
        .in('email', targets)
        .order('created_at', { ascending: true }),
      supabase
        .from('subscribers')
        .select('id, email, source, created_at')
        .in('email', targets)
        .order('created_at', { ascending: true }),
    ])

    if (leadsRes.error || subsRes.error) {
      const message = leadsRes.error?.message ?? subsRes.error?.message ?? 'unknown error'
      logger.error('[dsar-marketing] query failed', { err: message })
      return { available: false, leads: [], subscribers: [], error: message }
    }

    return {
      available: true,
      leads: leadsRes.data ?? [],
      subscribers: subsRes.data ?? [],
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error('[dsar-marketing] store unreachable', { err: message })
    return { available: false, leads: [], subscribers: [], error: message }
  }
}

/**
 * Hard-delete marketing rows for these addresses (Art. 17).
 *
 * Unlike the CRM purge there is no soft-delete window here: a lead row
 * is a form submission, not an account, so there is nothing to restore
 * and no referential integrity to preserve.
 *
 * Returns `available: false` rather than throwing when the store is
 * unreachable — the caller must treat that as "erasure incomplete" and
 * retry, never as success.
 */
export async function purgeMarketingData(
  emails: ReadonlyArray<string | null | undefined>,
): Promise<MarketingPurgeResult> {
  const targets = normaliseEmails(emails)
  if (targets.length === 0) {
    return { available: true, leadsDeleted: 0, subscribersDeleted: 0 }
  }

  try {
    const supabase = createServiceClient()

    const [leadsRes, subsRes] = await Promise.all([
      supabase.from('leads').delete().in('email', targets).select('id'),
      supabase.from('subscribers').delete().in('email', targets).select('id'),
    ])

    if (leadsRes.error || subsRes.error) {
      const message = leadsRes.error?.message ?? subsRes.error?.message ?? 'unknown error'
      logger.error('[dsar-marketing] purge failed', { err: message })
      return {
        available: false,
        leadsDeleted: leadsRes.data?.length ?? 0,
        subscribersDeleted: subsRes.data?.length ?? 0,
        error: message,
      }
    }

    return {
      available: true,
      leadsDeleted: leadsRes.data?.length ?? 0,
      subscribersDeleted: subsRes.data?.length ?? 0,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error('[dsar-marketing] store unreachable on purge', { err: message })
    return { available: false, leadsDeleted: 0, subscribersDeleted: 0, error: message }
  }
}
