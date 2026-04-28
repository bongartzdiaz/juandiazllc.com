'use client'

/* Topbar org-switcher (Bundle G).
   ────────────────────────────────────────────────────────────────
   Renders nothing when the user has 0 or 1 memberships — single-
   org tenants never see the control. With ≥2 memberships, shows
   a small pill with the current org's name; clicking opens a
   dropdown with the full list. Selecting one POSTs to
   /api/me/active-org and reloads so every server-rendered route
   picks up the new active scope. */

import { useEffect, useState, useRef, useCallback } from 'react'
import { Building2, Check, ChevronDown } from 'lucide-react'

interface OrgEntry {
  id: string
  name: string
  slug: string
  role: string
}

interface OrgList {
  activeOrganizationId: string
  organizations: OrgEntry[]
}

export function OrgSwitcher() {
  const [data, setData] = useState<OrgList | null>(null)
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/me/orgs', { cache: 'no-store' })
      if (!res.ok) return
      const json = (await res.json()) as OrgList
      setData(json)
    } catch {
      // Silent — the switcher is non-essential UI; if the request
      // fails the user just doesn't see the control.
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Close on outside click — modal pattern.
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const switchTo = async (orgId: string) => {
    if (switching || orgId === data?.activeOrganizationId) {
      setOpen(false)
      return
    }
    setSwitching(orgId)
    try {
      const res = await fetch('/api/me/active-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: orgId }),
      })
      if (!res.ok) throw new Error(await res.text().catch(() => 'switch failed'))
      // Reload the page so server-rendered routes (and the auth
      // resolution that happens on next request) pick up the new
      // active org. SWR caches in memory will be reset.
      window.location.reload()
    } catch {
      setSwitching(null)
      // Surface the error visually — silent failure here would
      // leave the user confused why they're still in the wrong org.
      alert('Could not switch organization. Try again or sign out and back in.')
    }
  }

  // Single-org tenants don't need a switcher.
  if (!data || data.organizations.length < 2) return null

  const active = data.organizations.find((o) => o.id === data.activeOrganizationId) ?? data.organizations[0]

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Switch organization"
        aria-expanded={open}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          borderRadius: 8,
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          color: 'var(--txt2)',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
          maxWidth: 220,
        }}
      >
        <Building2 size={13} aria-hidden="true" />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {active.name}
        </span>
        <ChevronDown size={12} aria-hidden="true" />
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            minWidth: 240,
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            boxShadow: 'var(--shadow-md)',
            padding: 4,
            zIndex: 50,
          }}
        >
          <div
            style={{
              padding: '8px 12px 4px',
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--txt3)',
            }}
          >
            Switch organization
          </div>
          {data.organizations.map((o) => {
            const isActive = o.id === data.activeOrganizationId
            const isSwitching = switching === o.id
            return (
              <button
                key={o.id}
                role="menuitem"
                onClick={() => void switchTo(o.id)}
                disabled={isSwitching}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 6,
                  background: 'transparent',
                  border: 'none',
                  textAlign: 'left',
                  fontSize: 12.5,
                  fontWeight: isActive ? 600 : 500,
                  color: 'var(--txt)',
                  cursor: isSwitching ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {o.name}
                </span>
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: 'var(--txt3)',
                  }}
                >
                  {o.role}
                </span>
                {isActive && <Check size={12} aria-label="Current" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
