'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'

/* ── Types ──────────────────────────────────────────── */

export type UnitSystem = 'metric' | 'imperial'
export type Currency = 'EUR' | 'USD' | 'GBP' | 'CHF' | 'SEK' | 'NOK' | 'DKK' | 'PLN' | 'CZK' | 'HUF'

/* ── Constants ──────────────────────────────────────── */

export const CURRENCIES: { code: Currency; symbol: string; name: string }[] = [
  { code: 'EUR', symbol: '\u20AC', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'GBP', symbol: '\u00A3', name: 'British Pound' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
  { code: 'PLN', symbol: 'z\u0142', name: 'Polish Zloty' },
  { code: 'CZK', symbol: 'K\u010D', name: 'Czech Koruna' },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint' },
]

const VALID_UNITS: UnitSystem[] = ['metric', 'imperial']
const VALID_CURRENCIES: Currency[] = CURRENCIES.map(c => c.code)

/* ── Cookie / localStorage helpers ──────────────────── */

const UNITS_COOKIE = 'pai-units'
const UNITS_LS = 'pai-units'
const CURRENCY_COOKIE = 'pai-currency'
const CURRENCY_LS = 'pai-currency'

function setCookie(name: string, value: string, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${value};expires=${expires};path=/;SameSite=Lax`
}

function getCookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match?.[1]
}

/* ── Conversion constants ───────────────────────────── */

const SQM_TO_SQFT = 10.7639
const KM_TO_MI = 0.621371
const KG_TO_LBS = 2.20462

/* ── Locale map for Intl.NumberFormat ───────────────── */

const CURRENCY_LOCALE: Record<Currency, string> = {
  EUR: 'nl-NL',
  USD: 'en-US',
  GBP: 'en-GB',
  CHF: 'de-CH',
  SEK: 'sv-SE',
  NOK: 'nb-NO',
  DKK: 'da-DK',
  PLN: 'pl-PL',
  CZK: 'cs-CZ',
  HUF: 'hu-HU',
}

/* ── Hook ───────────────────────────────────────────── */

export function useUnits() {
  const [units, setUnitsState] = useState<UnitSystem>('metric')
  const [currency, setCurrencyState] = useState<Currency>('EUR')

  /* Hydrate from cookie / localStorage on mount */
  useEffect(() => {
    const savedUnits = (getCookie(UNITS_COOKIE) || localStorage.getItem(UNITS_LS)) as string | null
    if (savedUnits && VALID_UNITS.includes(savedUnits as UnitSystem)) {
      setUnitsState(savedUnits as UnitSystem)
    }

    const savedCurrency = (getCookie(CURRENCY_COOKIE) || localStorage.getItem(CURRENCY_LS)) as string | null
    if (savedCurrency && VALID_CURRENCIES.includes(savedCurrency as Currency)) {
      setCurrencyState(savedCurrency as Currency)
    }
  }, [])

  /* Setters that persist to cookie + localStorage */
  const setUnits = useCallback((u: UnitSystem) => {
    setUnitsState(u)
    localStorage.setItem(UNITS_LS, u)
    setCookie(UNITS_COOKIE, u)
  }, [])

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c)
    localStorage.setItem(CURRENCY_LS, c)
    setCookie(CURRENCY_COOKIE, c)
  }, [])

  /* Derived */
  const isMetric = units === 'metric'

  const currencySymbol = useMemo(
    () => CURRENCIES.find(c => c.code === currency)?.symbol ?? currency,
    [currency],
  )

  /* ── Conversion helpers ───────────────────────────── */

  const formatArea = useCallback((sqMeters: number): string => {
    if (isMetric) {
      return `${sqMeters.toLocaleString(undefined, { maximumFractionDigits: 1 })} m\u00B2`
    }
    const sqft = sqMeters * SQM_TO_SQFT
    return `${sqft.toLocaleString(undefined, { maximumFractionDigits: 0 })} sqft`
  }, [isMetric])

  const formatDistance = useCallback((km: number): string => {
    if (isMetric) {
      return `${km.toLocaleString(undefined, { maximumFractionDigits: 1 })} km`
    }
    const mi = km * KM_TO_MI
    return `${mi.toLocaleString(undefined, { maximumFractionDigits: 1 })} mi`
  }, [isMetric])

  const formatTemperature = useCallback((celsius: number): string => {
    if (isMetric) {
      return `${Math.round(celsius)}\u00B0C`
    }
    const f = celsius * 9 / 5 + 32
    return `${Math.round(f)}\u00B0F`
  }, [isMetric])

  const formatWeight = useCallback((kg: number): string => {
    if (isMetric) {
      return `${kg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg`
    }
    const lbs = kg * KG_TO_LBS
    return `${lbs.toLocaleString(undefined, { maximumFractionDigits: 1 })} lbs`
  }, [isMetric])

  const formatCurrency = useCallback((amount: number): string => {
    const locale = CURRENCY_LOCALE[currency] ?? 'en-US'
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }, [currency])

  return {
    units,
    setUnits,
    currency,
    setCurrency,
    currencySymbol,
    isMetric,
    formatArea,
    formatDistance,
    formatTemperature,
    formatWeight,
    formatCurrency,
  }
}
