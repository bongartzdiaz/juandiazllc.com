'use client'
import { useState, useEffect, useCallback } from 'react'

/* ---------------------------------------------------------------
   useSettings — Global dashboard settings stored in localStorage
   --------------------------------------------------------------- */

const STORAGE_KEY = 'pai-settings'

export type Market = 'NL' | 'BE' | 'US' | 'UK'

export interface Settings {
  /** Polling interval in ms for API hooks. */
  syncInterval: number
  /** Active market/locale. */
  market: Market
  /** Display currency (always EUR). */
  currency: string
  /**
   * Saved API keys per integration.
   * Shape: { [integrationId]: { [fieldName]: value } }
   * e.g. { crm: { apiKey: '...', domain: '...' } }
   */
  apiKeys: Record<string, Record<string, string>>
}

const DEFAULTS: Settings = {
  syncInterval: 60000,
  market: 'NL',
  currency: 'EUR',
  apiKeys: {},
}

function load(): Settings {
  if (typeof window === 'undefined') return { ...DEFAULTS }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch { /* corrupted — reset */ }
  return { ...DEFAULTS }
}

function persist(s: Settings) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS)

  useEffect(() => {
    setSettings(load())
  }, [])

  const updateSetting = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value }
        persist(next)
        return next
      })
    },
    [],
  )

  /**
   * Check whether an integration has all required fields filled.
   * Pass the integration id and (optionally) an array of required field names.
   * If no requiredFields are provided it returns true when at least one field exists.
   */
  const isApiConnected = useCallback(
    (apiId: string, requiredFields?: string[]): boolean => {
      const entry = settings.apiKeys[apiId]
      if (!entry) return false

      if (requiredFields && requiredFields.length > 0) {
        return requiredFields.every(
          (f) => typeof entry[f] === 'string' && entry[f].trim().length > 0,
        )
      }

      return Object.values(entry).some(
        (v) => typeof v === 'string' && v.trim().length > 0,
      )
    },
    [settings.apiKeys],
  )

  return {
    settings,
    updateSetting,
    syncInterval: settings.syncInterval,
    market: settings.market,
    currency: settings.currency,
    apiKeys: settings.apiKeys,
    isApiConnected,
  }
}
