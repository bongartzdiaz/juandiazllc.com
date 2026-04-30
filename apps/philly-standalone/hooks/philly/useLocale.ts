'use client'
import { useState, useEffect, useCallback } from 'react'

/* Bundle AW — extended from { en, nl } to all four supported
   locales. The dashboard now matches the marketing site's locale
   coverage (en + nl + de + es). next-intl middleware reads the
   `pai-locale` cookie; switchLocale writes it + reloads so the
   server picks it up on next render. */
export type Locale = 'en' | 'nl' | 'de' | 'es'

export const SUPPORTED_LOCALES: readonly Locale[] = ['en', 'nl', 'de', 'es']

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  nl: 'Nederlands',
  de: 'Deutsch',
  es: 'Español',
}

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

function isLocale(s: string | null | undefined): s is Locale {
  return s != null && (SUPPORTED_LOCALES as readonly string[]).includes(s)
}

export function useLocale() {
  const [locale, setLocale] = useState<Locale>('en')

  useEffect(() => {
    const saved = getCookie(COOKIE_NAME) ?? localStorage.getItem(LS_KEY)
    if (isLocale(saved)) setLocale(saved)
  }, [])

  const switchLocale = useCallback((l: Locale) => {
    setLocale(l)
    localStorage.setItem(LS_KEY, l)
    setCookie(COOKIE_NAME, l)
    // Reload to let next-intl server config pick up the new cookie
    window.location.reload()
  }, [])

  /** Cycle through the four supported locales in declared order. */
  const toggle = useCallback(() => {
    const idx = SUPPORTED_LOCALES.indexOf(locale)
    const next = SUPPORTED_LOCALES[(idx + 1) % SUPPORTED_LOCALES.length]
    switchLocale(next)
  }, [locale, switchLocale])

  return { locale, switchLocale, toggle, isNL: locale === 'nl' }
}
