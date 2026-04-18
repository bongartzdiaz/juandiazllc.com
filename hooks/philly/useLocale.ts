'use client'
import { useState, useEffect, useCallback } from 'react'

export type Locale = 'en' | 'nl'

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
    const saved = (getCookie(COOKIE_NAME) || localStorage.getItem(LS_KEY)) as Locale | null
    if (saved && (saved === 'en' || saved === 'nl')) {
      setLocale(saved)
    }
  }, [])

  const switchLocale = useCallback((l: Locale) => {
    setLocale(l)
    localStorage.setItem(LS_KEY, l)
    setCookie(COOKIE_NAME, l)
    // Reload to let next-intl server config pick up the new cookie
    window.location.reload()
  }, [])

  const toggle = useCallback(() => {
    switchLocale(locale === 'en' ? 'nl' : 'en')
  }, [locale, switchLocale])

  return { locale, switchLocale, toggle, isNL: locale === 'nl' }
}
