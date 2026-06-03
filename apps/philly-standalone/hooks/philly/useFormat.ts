'use client'

import { useMemo } from 'react'
import { useLocale } from './useLocale'

/* LOC-03 — locale-bound formatters for the client UI.
 *
 * The problem this solves: ~140 call-sites format money/numbers/dates with
 * either a hardcoded `$` symbol or native `.toLocaleString()` /
 * `.toLocaleDateString()` with NO locale arg — so they render in the
 * browser's default locale (often en-US, `$`, MM/DD/YYYY) regardless of the
 * user's chosen DEUS locale. For a EUR-native EU product that's a visible
 * correctness bug.
 *
 * `useFormat()` reads the active locale once (from the pai-locale cookie via
 * useLocale) and returns formatters already bound to the right BCP-47 tag +
 * EUR default — so call-sites pass only the value:
 *
 *     const fmt = useFormat()
 *     fmt.currency(450000, { cents: true })   // "€4.500" (nl) / "€4,500" (en)
 *     fmt.compactCurrency(437000)             // "€437K"
 *     fmt.number(1234)                        // "1.234" / "1,234"
 *     fmt.date(iso)                           // "3 jun 2026" / "Jun 3, 2026"
 */

// Map our 5 app locales to a BCP-47 tag that renders € correctly. `en` →
// en-IE (English + euro) rather than en-US so the English UI still shows €.
const BCP47: Record<string, string> = {
  en: 'en-IE',
  nl: 'nl-NL',
  de: 'de-DE',
  es: 'es-ES',
  fr: 'fr-FR',
}

export interface MoneyOptions {
  /** Treat the input as integer cents (divide by 100). Default false. */
  cents?: boolean
  /** ISO 4217 code. Default 'EUR'. */
  currency?: string
}

export function useFormat() {
  const { locale } = useLocale()

  return useMemo(() => {
    const bcp = BCP47[locale] ?? 'en-IE'
    const toNum = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

    const currency = (amount: number, opts: MoneyOptions = {}) => {
      const val = opts.cents ? toNum(amount) / 100 : toNum(amount)
      return new Intl.NumberFormat(bcp, {
        style: 'currency',
        currency: opts.currency ?? 'EUR',
        maximumFractionDigits: 0,
      }).format(val)
    }

    /** Compact currency, e.g. "€437K" / "€1,2 mln". Locale-aware. */
    const compactCurrency = (amount: number, opts: MoneyOptions = {}) => {
      const val = opts.cents ? toNum(amount) / 100 : toNum(amount)
      return new Intl.NumberFormat(bcp, {
        style: 'currency',
        currency: opts.currency ?? 'EUR',
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(val)
    }

    const number = (n: number) => new Intl.NumberFormat(bcp).format(toNum(n))

    /** Compact number, e.g. "437K" / "1,2 mln". */
    const compact = (n: number) =>
      new Intl.NumberFormat(bcp, { notation: 'compact', maximumFractionDigits: 1 }).format(toNum(n))

    /** Percent. Pass a whole-number percentage (50 → "50%"). */
    const percent = (whole: number, fractionDigits = 0) =>
      new Intl.NumberFormat(bcp, {
        style: 'percent',
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      }).format(toNum(whole) / 100)

    const date = (d: string | number | Date) =>
      new Intl.DateTimeFormat(bcp, { dateStyle: 'medium' }).format(new Date(d))

    const dateTime = (d: string | number | Date) =>
      new Intl.DateTimeFormat(bcp, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d))

    return { locale, bcp, currency, compactCurrency, number, compact, percent, date, dateTime }
  }, [locale])
}
