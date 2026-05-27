/* Currency formatting for reports.
   ──────────────────────────────────────────────────────────────────
   Pure function — wraps Intl.NumberFormat with our cents convention.
   Used by every report template + the portal publish payload.

   Why this exists rather than inline `Intl.NumberFormat(...)`:
     - The cents → major-unit conversion is project-wide (we store all
       money as cents to avoid float drift). Centralising it means no
       template forgets to divide by 100.
     - Some currencies (JPY, KRW, ISK) have zero minor units. The
       formatter handles this correctly via `minimumFractionDigits: 0`
       on those codes — but only if we tell it to. This helper bakes
       that in.
     - We need deterministic locale-aware output for hermetic tests.
   --------------------------------------------------------------- */

const ZERO_DECIMAL_CURRENCIES = new Set([
  'JPY', 'KRW', 'ISK', 'CLP', 'PYG', 'UGX', 'VND', 'XAF', 'XOF', 'XPF',
])

const VALID_CURRENCY_RE = /^[A-Z]{3}$/

/**
 * Format cents as a localised currency string.
 *
 * @param cents   integer amount in the currency's minor unit (or major
 *                unit for zero-decimal currencies). Negative values
 *                render with locale-appropriate minus sign.
 * @param currency ISO 4217 code. Falls back to EUR on invalid input
 *                so a misconfigured tenant never crashes the report.
 * @param locale  BCP 47 tag. Default 'en-IE' (English + €).
 */
export function formatCurrency(
  cents: number,
  currency: string = 'EUR',
  locale: string = 'en-IE',
): string {
  // Defensive coercion — keep reports rendering even when upstream data
  // is mildly wrong (string number, null, NaN).
  const c = Number.isFinite(cents) ? Math.round(cents) : 0
  const code = VALID_CURRENCY_RE.test(currency) ? currency : 'EUR'
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(code)
  const amount = isZeroDecimal ? c : c / 100
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: isZeroDecimal ? 0 : 2,
      maximumFractionDigits: isZeroDecimal ? 0 : 2,
    }).format(amount)
  } catch {
    // Unknown currency code that passed our regex but Intl can't render
    // (extremely rare — ISO 4217 codes are stable). Fall back to raw.
    return `${code} ${amount.toFixed(isZeroDecimal ? 0 : 2)}`
  }
}

/** Format a plain integer (no currency) — used for counts, percentages
 *  in tables that report multiple unrelated metrics. */
export function formatNumber(value: number, locale: string = 'en-IE'): string {
  const n = Number.isFinite(value) ? value : 0
  try {
    return new Intl.NumberFormat(locale).format(n)
  } catch {
    return String(n)
  }
}

/** Compute utilization percentage from cents-based budget/spent.
 *  Returns 0 (not NaN) when budget is zero — useful for "Utilization: 0%"
 *  cells in tables. */
export function utilizationPct(spentCents: number, budgetCents: number): number {
  if (!budgetCents || budgetCents <= 0) return 0
  return Math.round((spentCents / budgetCents) * 100)
}
