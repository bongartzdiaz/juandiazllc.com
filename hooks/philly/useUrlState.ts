'use client'

/**
 * useUrlState — sync a small bag of filter values with the URL search string.
 *
 * Goals:
 * - Refreshing the page or sharing the URL preserves filters/search/page state.
 * - Empty / default values are dropped from the URL so links stay clean.
 * - Updates use `history.replaceState` so the back button doesn't flood with
 *   keystroke-by-keystroke history entries.
 *
 *   const [state, setState] = useUrlState({ q: '', page: 1, status: '' })
 *   setState({ status: 'active' })          // merge-update
 *   setState(prev => ({ page: prev.page + 1 }))
 */
import { useCallback, useEffect, useRef, useState } from 'react'

type Primitive = string | number | boolean
type StateBag = Record<string, Primitive>

function readFromUrl<T extends StateBag>(defaults: T): T {
  if (typeof window === 'undefined') return defaults
  const params = new URLSearchParams(window.location.search)
  const out = { ...defaults }
  for (const key of Object.keys(defaults)) {
    const raw = params.get(key)
    if (raw === null) continue
    const def = defaults[key]
    if (typeof def === 'number') {
      const n = Number(raw)
      ;(out as StateBag)[key] = Number.isFinite(n) ? n : def
    } else if (typeof def === 'boolean') {
      ;(out as StateBag)[key] = raw === '1' || raw === 'true'
    } else {
      ;(out as StateBag)[key] = raw
    }
  }
  return out
}

function writeToUrl<T extends StateBag>(state: T, defaults: T) {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams(window.location.search)
  for (const key of Object.keys(defaults)) {
    const value = state[key]
    const def = defaults[key]
    const isDefault =
      value === def ||
      (typeof def === 'string' && value === '') ||
      (typeof def === 'number' && Number(value) === Number(def))
    if (isDefault) {
      params.delete(key)
    } else if (typeof value === 'boolean') {
      params.set(key, value ? '1' : '0')
    } else {
      params.set(key, String(value))
    }
  }
  const qs = params.toString()
  const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname
  window.history.replaceState(null, '', url)
}

export function useUrlState<T extends StateBag>(
  defaults: T,
): [T, (patch: Partial<T> | ((prev: T) => Partial<T>)) => void] {
  // Track defaults by reference so callers passing inline literals don't trip
  // the writer effect on every render.
  const defaultsRef = useRef(defaults)
  const [state, setState] = useState<T>(() => readFromUrl(defaults))

  // Keep URL in sync with state.
  useEffect(() => {
    writeToUrl(state, defaultsRef.current)
  }, [state])

  const update = useCallback((patch: Partial<T> | ((prev: T) => Partial<T>)) => {
    setState(prev => {
      const delta = typeof patch === 'function' ? patch(prev) : patch
      return { ...prev, ...delta }
    })
  }, [])

  return [state, update]
}
