'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { usePathname } from 'next/navigation'

export type RealtimeEventType =
  | 'entity.created' | 'entity.updated' | 'entity.deleted'
  | 'notification' | 'presence.join' | 'presence.leave'
  | 'presence.heartbeat' | 'custom' | 'ready' | 'ping'

export interface RealtimeMessage {
  type: RealtimeEventType
  entity?: string
  entityId?: string
  orgId?: string
  userId?: string
  name?: string
  path?: string
  channel?: string
  data?: unknown
}

type Handler = (msg: RealtimeMessage) => void

/**
 * Opens a single SSE connection to /api/realtime and fans out events
 * to registered handlers. Auto-reconnects with exponential backoff.
 */
export function useRealtime(handler?: Handler, deps: React.DependencyList = []) {
  const pathname = usePathname()
  const [connected, setConnected] = useState(false)
  const handlerRef = useRef<Handler | undefined>(handler)

  // keep the latest handler without reconnecting the stream
  useEffect(() => { handlerRef.current = handler }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return

    let es: EventSource | null = null
    let retry = 1000
    let stopped = false
    let retryTimer: ReturnType<typeof setTimeout> | null = null

    const connect = () => {
      if (stopped) return
      // Tear down any prior connection before opening a new one
      if (es && es.readyState !== EventSource.CLOSED) {
        try { es.close() } catch { /* ignore */ }
      }
      const q = pathname ? `?path=${encodeURIComponent(pathname)}` : ''
      es = new EventSource(`/philly/api/realtime${q}`)

      es.onopen = () => {
        setConnected(true)
        retry = 1000 // reset backoff
      }

      es.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as RealtimeMessage
          if (handlerRef.current) handlerRef.current(msg)
        } catch { /* ignore malformed frames */ }
      }

      es.onerror = () => {
        setConnected(false)
        try { es?.close() } catch { /* ignore */ }
        if (stopped) return
        const delay = Math.min(retry, 20_000)
        retry *= 2
        if (retryTimer) clearTimeout(retryTimer)
        retryTimer = setTimeout(connect, delay)
      }
    }

    // When the tab becomes visible after being hidden, browsers may have
    // suspended the EventSource. If we're disconnected, reconnect immediately
    // instead of waiting out the exponential backoff.
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return
      if (!es || es.readyState === EventSource.CLOSED) {
        retry = 1000
        if (retryTimer) {
          clearTimeout(retryTimer)
          retryTimer = null
        }
        connect()
      }
    }

    // Network coming back online — try reconnecting right away too.
    const onOnline = () => {
      if (!es || es.readyState === EventSource.CLOSED) {
        retry = 1000
        if (retryTimer) {
          clearTimeout(retryTimer)
          retryTimer = null
        }
        connect()
      }
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('online', onOnline)

    connect()

    return () => {
      stopped = true
      if (retryTimer) clearTimeout(retryTimer)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('online', onOnline)
      es?.close()
      setConnected(false)
    }
  }, [pathname])

  return { connected }
}

/**
 * Subscribe to entity-change events. Fires `onChange` whenever any row
 * for the given entity is created/updated/deleted in this org.
 */
export function useEntitySubscription(
  entity: string,
  onChange: (msg: RealtimeMessage) => void,
) {
  const cb = useCallback((msg: RealtimeMessage) => {
    if (!msg.type.startsWith('entity.')) return
    if (msg.entity !== entity) return
    onChange(msg)
  }, [entity, onChange])

  return useRealtime(cb, [entity, onChange])
}

/**
 * Presence hook: returns the list of active users in this org.
 * Backfills via REST, then updates live from SSE.
 */
export interface PresenceUser {
  userId: string
  name?: string
  path?: string
}

export function usePresence() {
  const [users, setUsers] = useState<PresenceUser[]>([])

  useEffect(() => {
    fetch('/philly/api/realtime/presence')
      .then(r => r.json())
      .then(j => Array.isArray(j.data) ? setUsers(j.data) : null)
      .catch(() => {})
  }, [])

  useRealtime((msg) => {
    if (msg.type === 'presence.join' && msg.userId) {
      setUsers(prev => {
        if (prev.some(u => u.userId === msg.userId)) {
          return prev.map(u => u.userId === msg.userId ? { ...u, name: msg.name, path: msg.path } : u)
        }
        return [...prev, { userId: msg.userId!, name: msg.name, path: msg.path }]
      })
    } else if (msg.type === 'presence.heartbeat' && msg.userId) {
      setUsers(prev => {
        if (!prev.some(u => u.userId === msg.userId)) {
          return [...prev, { userId: msg.userId!, name: msg.name, path: msg.path }]
        }
        return prev.map(u => u.userId === msg.userId ? { ...u, name: msg.name, path: msg.path } : u)
      })
    } else if (msg.type === 'presence.leave' && msg.userId) {
      setUsers(prev => prev.filter(u => u.userId !== msg.userId))
    }
  }, [])

  return users
}
