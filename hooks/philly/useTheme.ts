'use client'
import { useState, useEffect, useCallback } from 'react'

type Theme = 'light' | 'dark'

export function useTheme() {
  // Initial value should match what the boot script in app/layout.tsx
  // wrote to data-theme synchronously, so we don't override the user's
  // preference for one render and cause a flash.
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    // Prefer the attribute already set by the boot script — it accounts
    // for both localStorage and the OS preference.
    const fromAttr = document.documentElement.getAttribute('data-theme') as Theme | null
    const saved = (localStorage.getItem('pai-theme') as Theme | null)
    const initial: Theme = fromAttr === 'dark' || fromAttr === 'light'
      ? fromAttr
      : (saved === 'dark' || saved === 'light' ? saved : 'light')
    if (initial !== theme) setTheme(initial)
    // ensure attribute reflects state in case it diverged
    document.documentElement.setAttribute('data-theme', initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const apply = useCallback((t: Theme) => {
    setTheme(t)
    document.documentElement.setAttribute('data-theme', t)
    try { localStorage.setItem('pai-theme', t) } catch { /* ignore quota errors */ }
  }, [])

  const toggle = useCallback(() => {
    apply(theme === 'light' ? 'dark' : 'light')
  }, [theme, apply])

  return { theme, toggle, isDark: theme === 'dark' }
}
