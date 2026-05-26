/* WhatsApp Business click-to-chat helpers.
   ──────────────────────────────────────────────────────────────────
   Uses the public wa.me deep-link — no API key, no Meta verification,
   no per-message cost. Opens WhatsApp on desktop (web or app) or
   mobile (app) with a pre-filled message.

   Why this matters for EU real estate (per memory/competitor_whise.md):
   WhatsApp is the PRIMARY buyer-agent communication channel in NL/DE/BE/ES
   — NOT email, NOT SMS. Whise has no WhatsApp integration; DEUS shipping
   click-to-chat alone makes us feel native to BE/FR/NL agents.

   Future upgrade path: WhatsApp Business Platform API for actual
   API-driven send + receive (requires Meta verification, ~$30/mo,
   business-account onboarding). Click-to-chat is the MVP that proves
   the use case is real before paying for the heavy infrastructure. */

export interface WhatsAppTemplate {
  /** Stable identifier — used as the i18n key suffix. */
  id: 'open-house-followup' | 'viewing-confirmation' | 'offer-update' | 'document-request' | 'intro'
  /** Description for the dropdown (i18n'd by the UI). */
  i18nKey: string
}

/**
 * The 5 high-value templates a BE real-estate agent uses daily.
 * Adding new templates is a 3-step change:
 *   1. Add the id to WhatsAppTemplate union above
 *   2. Add an entry here
 *   3. Add the body string in messages/{locale}.json under whatsapp.templates.{id}
 */
export const WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  { id: 'open-house-followup', i18nKey: 'whatsapp.templates.open-house-followup' },
  { id: 'viewing-confirmation', i18nKey: 'whatsapp.templates.viewing-confirmation' },
  { id: 'offer-update', i18nKey: 'whatsapp.templates.offer-update' },
  { id: 'document-request', i18nKey: 'whatsapp.templates.document-request' },
  { id: 'intro', i18nKey: 'whatsapp.templates.intro' },
]

/**
 * Normalize a phone number into the digits-only international format
 * that wa.me requires (no '+', no spaces, no dashes, no parens).
 *
 * Returns null if the phone can't be normalized — UI should disable
 * the WhatsApp button when this is null.
 *
 * Accepts these common input formats:
 *   "+32 475 12 34 56"   → "32475123456"
 *   "0032 475 12 34 56"  → "32475123456"
 *   "32475123456"        → "32475123456" (already good)
 *   "0475 12 34 56"      → null (no country code — ambiguous; UI shows error)
 *   "(212) 555-0100"     → null (US format without country code)
 *
 * Rationale: wa.me requires an unambiguous international number.
 * Guessing the country code from a local number is failure-mode-rich
 * (Belgian agent's contact list may include NL, FR, DE numbers).
 * Better to require the user to store the country code than to guess wrong.
 */
export function normalizePhoneForWhatsApp(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null

  // Strip everything except digits and a leading '+'.
  const cleaned = trimmed.replace(/[^\d+]/g, '')

  // Detect explicit international indicator.
  const hasIntlIndicator = cleaned.startsWith('+') || cleaned.startsWith('00')

  // Cases:
  //   '+32475123456'   → '32475123456' (explicit '+')
  //   '0032475123456'  → '32475123456' (explicit '00')
  //   '32475123456'    → only accept if ≥ 11 digits (likely international)
  //   '0475123456'     → reject (local-only, leading 0)
  //   '2125550100'     → reject (10 digits, no indicator, ambiguous)
  let digits: string
  if (cleaned.startsWith('+')) {
    digits = cleaned.slice(1)
  } else if (cleaned.startsWith('00')) {
    digits = cleaned.slice(2)
  } else {
    digits = cleaned
  }

  // Belgian-style local numbers start with 0 (e.g., 0475...) — reject
  // when we don't have an explicit international indicator stripped above.
  if (digits.startsWith('0')) return null

  // Reject obviously-invalid lengths. Country codes are 1-3 digits;
  // national numbers are 6-12 digits → total 7-15 digits per E.164.
  if (digits.length < 7 || digits.length > 15) return null

  // Without an explicit international indicator, require ≥ 11 digits.
  // 10-digit numbers are ambiguous: could be US local (212-555-0100) or
  // Belgian-with-implicit-32-prefix (32475123456 truncated). 11+ digits
  // are unlikely to be national numbers in any country we serve, so
  // we accept them as international.
  if (!hasIntlIndicator && digits.length < 11) return null

  return digits
}

/**
 * Build a wa.me deep-link with the pre-filled message.
 *
 * Format: https://wa.me/{intlDigits}?text={urlEncodedMessage}
 * Both the desktop WhatsApp Web app and the mobile WhatsApp app
 * handle this URL identically.
 *
 * Returns null when the phone can't be normalized — caller MUST
 * handle this (disable the button, show an error).
 */
export function buildWhatsAppLink(phone: string | null | undefined, message: string): string | null {
  const digits = normalizePhoneForWhatsApp(phone)
  if (!digits) return null
  const text = encodeURIComponent(message)
  return `https://wa.me/${digits}?text=${text}`
}
