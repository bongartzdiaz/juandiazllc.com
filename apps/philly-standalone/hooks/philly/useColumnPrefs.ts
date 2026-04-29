'use client'

import { useState, useEffect, useCallback } from 'react'

/* ---------------------------------------------------------------
   useColumnPrefs(storageKey, defaults)
   ---------------------------------------------------------------
   localStorage-backed column visibility prefs for list-view tables.
   Returns:
     visible: Set<string> of column ids the user has chosen to show
     toggle(id): flip one column
     setAll(ids): replace the set wholesale
     reset(): drop the override and return to defaults

   Persistence is per-browser, per-table (storageKey). When the
   user lands on this page on a new browser, we pull the defaults.
   We don't sync to the SavedView API for now — column choice is a
   workstation pref, not a shared filter.
   --------------------------------------------------------------- */

export interface UseColumnPrefsReturn {
  visible: Set<string>
  toggle: (id: string) => void
  setAll: (ids: string[]) => void
  reset: () => void
  isOverridden: boolean
}

function readStorage(key: string): string[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

function writeStorage(key: string, ids: string[] | null): void {
  if (typeof window === 'undefined') return
  try {
    if (ids === null) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, JSON.stringify(ids))
    }
  } catch {
    // Quota exceeded / private mode — silent. The next render will
    // simply fall back to defaults on this browser.
  }
}

export function useColumnPrefs(storageKey: string, defaults: string[]): UseColumnPrefsReturn {
  // SSR-safe: start with defaults. We hydrate from localStorage in
  // an effect to avoid a hydration mismatch.
  const [visible, setVisible] = useState<Set<string>>(() => new Set(defaults))
  const [hydrated, setHydrated] = useState(false)
  const [isOverridden, setIsOverridden] = useState(false)

  useEffect(() => {
    const stored = readStorage(storageKey)
    if (stored) {
      setVisible(new Set(stored))
      setIsOverridden(true)
    }
    setHydrated(true)
  }, [storageKey])

  const toggle = useCallback((id: string) => {
    setVisible((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      const arr = Array.from(next)
      writeStorage(storageKey, arr)
      setIsOverridden(true)
      return next
    })
  }, [storageKey])

  const setAll = useCallback((ids: string[]) => {
    const next = new Set(ids)
    writeStorage(storageKey, ids)
    setIsOverridden(true)
    setVisible(next)
  }, [storageKey])

  const reset = useCallback(() => {
    writeStorage(storageKey, null)
    setIsOverridden(false)
    setVisible(new Set(defaults))
  // defaults is captured by reference — pages pass a stable array,
  // so this is fine. eslint-disable for the dep linter.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  // Suppress reading prefs before hydration to avoid SSR mismatch.
  void hydrated
  return { visible, toggle, setAll, reset, isOverridden }
}
