/* ---------------------------------------------------------------
   Invite-flow helpers — token generation + email dispatch.

   Tokens are 32-byte random base64url strings (43 chars). They live
   in the Invite.token column and are unique-indexed there. We do not
   hash them — they're single-use, expire in 7 days, and revoked on
   accept; brute-forcing is bounded by db-level uniqueness lookup.
   --------------------------------------------------------------- */

import { randomBytes } from 'crypto'
import { logger } from '@/lib/philly/logger'

/** 7 days from issue — long enough for vacation, short enough to limit blast. */
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

/** Cryptographic token, URL-safe, 43 chars. */
export function generateInviteToken(): string {
  return randomBytes(32).toString('base64url')
}

/** Default expiry timestamp for a fresh invite. */
export function defaultInviteExpiry(): Date {
  return new Date(Date.now() + INVITE_TTL_MS)
}

interface InviteEmailParams {
  to: string
  inviterName: string
  organizationName: string
  acceptUrl: string
  expiresAt: Date
}

/**
 * Sends the invite email via Resend.
 *
 * Reads RESEND_API_KEY + INVITE_FROM_EMAIL from env. If either is unset,
 * logs the would-be email and returns ok=false so dev still works without
 * mail credentials wired (the API route writes the Invite row regardless).
 */
export async function sendInviteEmail(p: InviteEmailParams): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.INVITE_FROM_EMAIL || 'noreply@lucen.ai'

  if (!apiKey) {
    logger.warn('[invite] RESEND_API_KEY not set — skipping email send', { to: p.to })
    return { ok: false, error: 'email-disabled' }
  }

  const subject = `You're invited to ${p.organizationName} on DEUS`
  const html = renderInviteHtml(p)
  const text = renderInviteText(p)

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `DEUS <${from}>`,
        to: [p.to],
        subject,
        html,
        text,
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      logger.error('[invite] resend send failed', { to: p.to, status: res.status, body: body.slice(0, 200) })
      return { ok: false, error: `resend-${res.status}` }
    }
    return { ok: true }
  } catch (err) {
    logger.error('[invite] resend send threw', { to: p.to, err: err instanceof Error ? err.message : 'unknown' })
    return { ok: false, error: 'resend-throw' }
  }
}

function renderInviteText(p: InviteEmailParams): string {
  const expiry = p.expiresAt.toISOString().slice(0, 10)
  return `Hi,

${p.inviterName} invited you to join ${p.organizationName} on DEUS.

Accept the invite (link expires ${expiry}):
${p.acceptUrl}

If you weren't expecting this, ignore the email — the link expires automatically.

— DEUS by LucenAI`
}

function renderInviteHtml(p: InviteEmailParams): string {
  const expiry = p.expiresAt.toISOString().slice(0, 10)
  // Plain HTML, no styles that break in Outlook. Subject and body in sync with text version.
  return `<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111;max-width:560px;margin:24px auto;padding:0 16px;">
  <p>Hi,</p>
  <p><strong>${escapeHtml(p.inviterName)}</strong> invited you to join <strong>${escapeHtml(p.organizationName)}</strong> on DEUS.</p>
  <p><a href="${escapeAttr(p.acceptUrl)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;">Accept invite</a></p>
  <p style="color:#666;font-size:13px;">Or paste this link: ${escapeHtml(p.acceptUrl)}</p>
  <p style="color:#666;font-size:13px;">The link expires on ${expiry}. If you weren't expecting this, ignore the email — the link expires automatically.</p>
  <p style="color:#999;font-size:12px;margin-top:32px;">— DEUS by LucenAI</p>
</body></html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttr(s: string): string {
  return escapeHtml(s)
}
