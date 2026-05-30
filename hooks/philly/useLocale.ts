'use client'
import { useState, useEffect, useCallback } from 'react'

// Full supported set — must stay in sync with i18n/philly/request.ts
// SUPPORTED_LOCALES and messages/*.json. Widened from en|nl (LOC-01) so the
// already-translated DE/ES message files are reachable from the in-app picker.
export type Locale = 'en' | 'nl' | 'de' | 'es'

const SUPPORTED: readonly Locale[] = ['en', 'nl', 'de', 'es']
const isLocale = (v: string | null | undefined): v is Locale =>
  v != null && (SUPPORTED as readonly string[]).includes(v)

const COOKIE_NAME = 'pai-locale'
const LS_KEY = 'pai-locale'

function setCookie(name: string, value: string, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${value};expires=${expires};path=/;SameSite=Lax`
}

function getCookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match?.[1]
}

export function useLocale() {
  const [locale, setLocale] = useState<Locale>('en')

  useEffect(() => {
    const saved = getCookie(COOKIE_NAME) || localStorage.getItem(LS_KEY)
    if (isLocale(saved)) {
      setLocale(saved)
    }
  }, [])

  const switchLocale = useCallback((l: Locale) => {
    if (!isLocale(l)) return
    setLocale(l)
    localStorage.setItem(LS_KEY, l)
    setCookie(COOKIE_NAME, l)
    // Reload to let next-intl server config pick up the new cookie
    window.location.reload()
  }, [])

  // Kept for backwards-compat (cycles en<->nl); UI now uses a full picker.
  const toggle = useCallback(() => {
    switchLocale(locale === 'en' ? 'nl' : 'en')
  }, [locale, switchLocale])

  return { locale, switchLocale, toggle, isNL: locale === 'nl' }
}
