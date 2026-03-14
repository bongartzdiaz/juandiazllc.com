'use client'

import { useState, useEffect, useCallback } from 'react'
import { API_BASE } from '@/lib/utils'

export interface Appointment {
  id: string
  naam: string
  telefoon: string
  stad: string
  type: 'Eerste bezoek' | 'Opvolgbezoek'
  status: 'bevestigd' | 'wachtend' | 'afgerond' | 'geannuleerd'
  datum: string
  tijd: string
  notities: string
}

interface AgendaData {
  appointments: Appointment[]
}

export function useAgenda() {
  const [data, setData] = useState<AgendaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/agenda`)
      if (res.ok) {
        const json = await res.json()
        if (json.error) {
          setError(json.error)
        } else {
          setData(json)
        }
      } else {
        setError('Agenda API niet bereikbaar')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fout bij laden agenda data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { data, loading, error, refetch: load }
}
