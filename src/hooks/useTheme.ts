'use client'
import { useState, useEffect, useCallback } from 'react'

type Theme = 'light' | 'dark'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const saved = (localStorage.getItem('hmb-theme') as Theme) ?? 'light'
    apply(saved)
  }, [])

  const apply = (t: Theme) => {
    setTheme(t)
    document.documentElement.setAttribute('data-theme', t)
    localStorage.setItem('hmb-theme', t)
  }

  const toggle = useCallback(() => {
    apply(theme === 'light' ? 'dark' : 'light')
  }, [theme])

  return { theme, toggle, isDark: theme === 'dark' }
}
