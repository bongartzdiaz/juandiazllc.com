'use client'

import { useEffect, useRef } from 'react'

/* ---------------------------------------------------------------
   useGlobalShortcuts(handlers)
   ---------------------------------------------------------------
   Registers a single keydown listener on window that dispatches to
   the supplied map of handlers. Suppressed automatically when the
   user is typing in an input / textarea / contenteditable so the
   shortcuts don't hijack form fields.

   Supports two-key chords ("g c") with a 1.2s expiry between keys.
   The first key of a chord must be a non-modifier letter that's
   registered as a "leader" — currently only `g` (go-to-page). When
   the leader fires, we wait for a second key and look it up in the
   leader's submap.

   Single-key shortcuts: register them at the top level. e.g.
     useGlobalShortcuts({
       '?': openCheatSheet,
       '/': focusSearch,
       'g c': () => router.push('/contacts'),
     })
   --------------------------------------------------------------- */

type Handler = () => void

interface ShortcutMap {
  [key: string]: Handler
}

const LEADER_TIMEOUT_MS = 1200

function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false
  const tag = t.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (t.isContentEditable) return true
  return false
}

export function useGlobalShortcuts(handlers: ShortcutMap, enabled = true): void {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    if (!enabled) return
    let leader: { key: string; expires: number } | null = null

    const onKey = (e: KeyboardEvent) => {
      // Don't intercept while modifiers are held — those are reserved
      // for OS / palette shortcuts (cmd+K etc).
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (isTypingTarget(e.target)) return

      const key = e.key

      // Resolve leader chord first.
      if (leader && Date.now() < leader.expires) {
        const compound = `${leader.key} ${key.toLowerCase()}`
        leader = null
        const fn = handlersRef.current[compound]
        if (fn) {
          e.preventDefault()
          fn()
        }
        return
      }

      // Plain single-key shortcut?
      const direct = handlersRef.current[key]
      if (direct) {
        e.preventDefault()
        direct()
        return
      }

      // Is this a known leader (first half of a chord)?
      const lk = key.toLowerCase()
      const hasChord = Object.keys(handlersRef.current).some(
        (k) => k.startsWith(`${lk} `),
      )
      if (hasChord) {
        leader = { key: lk, expires: Date.now() + LEADER_TIMEOUT_MS }
        // Don't preventDefault — the leader key alone is a no-op so we
        // let the browser do whatever it would (usually nothing).
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled])
}

export function focusFirstSearchInput(): void {
  if (typeof document === 'undefined') return
  // Search inputs across the dashboard are conventionally placed in
  // toolbars and use placeholder="Search…". This is fragile, but the
  // alternative is per-page wiring and that's a bigger lift.
  const candidates = document.querySelectorAll<HTMLInputElement>(
    'input[type="search"], input[placeholder*="Search" i], input[aria-label*="search" i]',
  )
  for (const el of Array.from(candidates)) {
    if (el.offsetParent !== null) {
      el.focus()
      el.select?.()
      return
    }
  }
}
