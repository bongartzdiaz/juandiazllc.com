'use client'

import { useState, useMemo } from 'react'
import { Topbar } from '@/components/philly/layout/Topbar'
import { useApi } from '@/hooks/philly/useApi'
import { useToast } from '@/hooks/philly/useToast'
import { Users, Save, Info, RotateCcw } from 'lucide-react'
import { SECTIONS } from '@/lib/philly/sections'

/* Bundle BX — operator UI for SCIM group → role/sections mapping.
   Bundle BW shipped the SCIM Groups CRUD on /api/scim/v2/Groups
   and the role-mapping logic that promotes members on add. This
   page lets admins set the role + sections per group without
   editing the DB. Each save triggers an upsert across every
   existing member's Membership row. */

interface ScimGroupRow {
  id: string
  externalId: string | null
  displayName: string
  role: 'admin' | 'manager' | 'viewer' | null
  dashboardSections: string[] | null
  memberCount: number
  createdAt: string
  updatedAt: string
}

const ROLES = ['admin', 'manager', 'viewer'] as const
type Role = typeof ROLES[number]

const titleStyle: React.CSSProperties = {
  fontSize: 22, fontWeight: 700, marginBottom: 4, color: 'var(--txt)',
}
const subStyle: React.CSSProperties = {
  fontSize: 13, color: 'var(--txt2)', marginBottom: 24, maxWidth: 720, lineHeight: 1.55,
}

export default function ScimGroupsPage() {
  const { addToast } = useToast()
  const groupsQuery = useApi<{ data: ScimGroupRow[] }>('/admin/scim-groups')
  const groups = groupsQuery.data?.data ?? []

  // Per-row draft state — keyed by group id.
  const [draft, setDraft] = useState<Record<string, { role: Role | null; sections: string[] | null }>>({})
  const [busyId, setBusyId] = useState<string | null>(null)

  const sectionOptions = useMemo(() => SECTIONS.map((s) => s.slug), [])

  function getDraft(g: ScimGroupRow) {
    return draft[g.id] ?? { role: g.role, sections: g.dashboardSections }
  }

  function setRole(g: ScimGroupRow, role: Role | null) {
    setDraft((prev) => ({ ...prev, [g.id]: { ...getDraft(g), role } }))
  }

  function toggleSection(g: ScimGroupRow, slug: string) {
    const cur = getDraft(g)
    const sections = cur.sections === null
      ? [slug]
      : cur.sections.includes(slug)
        ? cur.sections.filter((s) => s !== slug)
        : [...cur.sections, slug]
    setDraft((prev) => ({ ...prev, [g.id]: { ...cur, sections } }))
  }

  function clearSectionsOverride(g: ScimGroupRow) {
    setDraft((prev) => ({ ...prev, [g.id]: { ...getDraft(g), sections: null } }))
  }

  function discardDraft(g: ScimGroupRow) {
    setDraft((prev) => {
      const next = { ...prev }
      delete next[g.id]
      return next
    })
  }

  async function save(g: ScimGroupRow) {
    if (busyId) return
    setBusyId(g.id)
    const cur = getDraft(g)
    try {
      const res = await fetch(`/api/admin/scim-groups/${g.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: cur.role, dashboardSections: cur.sections }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        addToast(json?.error ?? `Update failed (${res.status})`, 'error')
        return
      }
      const updated = json.data?.membersUpdated ?? 0
      addToast(
        updated > 0
          ? `Saved — ${updated} existing member${updated === 1 ? '' : 's'} updated`
          : 'Saved',
        'success',
      )
      discardDraft(g)
      groupsQuery.refetch()
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Network error', 'error')
    } finally {
      setBusyId(null)
    }
  }

  function isDirty(g: ScimGroupRow) {
    const d = draft[g.id]
    if (!d) return false
    if (d.role !== g.role) return true
    const a = d.sections, b = g.dashboardSections
    if (a === null && b === null) return false
    if (a === null || b === null) return true
    if (a.length !== b.length) return true
    const setA = new Set(a)
    return !b.every((s) => setA.has(s))
  }

  return (
    <>
      <Topbar title="SCIM groups" sub="Map IdP groups to platform roles + dashboard sections" />

      <div style={{ padding: '24px 32px', maxWidth: 1080 }}>
        <h1 style={titleStyle}>SCIM groups</h1>
        <p style={subStyle}>
          When an IdP (Okta, Azure AD, etc.) provisions a user via{' '}
          <code style={{ fontFamily: 'var(--font-red-hat-mono), monospace', fontSize: 12 }}>
            PATCH /api/scim/v2/Groups/{'<id>'}
          </code>
          , the new member&apos;s organization-membership is upserted to the role and
          dashboard sections you set below. Removing a member never auto-reverts —
          if you need to demote a user, do it manually from{' '}
          <code style={{ fontFamily: 'var(--font-red-hat-mono), monospace', fontSize: 12 }}>
            /settings/users
          </code>
          .
        </p>

        <div
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '12px 14px', borderRadius: 10,
            background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
            marginBottom: 24, fontSize: 12.5, color: 'var(--accent-txt)', lineHeight: 1.55,
          }}
        >
          <Info size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            <b>Role</b> sets <code>Membership.role</code>; leave it on <i>none</i> to skip the
            role mapping entirely.{' '}
            <b>Sections</b> override the per-user dashboard allow-list — choose
            <i> custom</i> to pick specific surfaces, or <i>full access</i> to clear the
            override (members fall back to their personal sections).
          </span>
        </div>

        {groupsQuery.loading && (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>
            Loading…
          </div>
        )}

        {groupsQuery.error && (
          <div
            style={{
              padding: '14px 16px', borderRadius: 10,
              background: 'var(--r-bg)', border: '1px solid var(--r-border)',
              color: 'var(--r-txt)', fontSize: 13,
            }}
          >
            {groupsQuery.error}
          </div>
        )}

        {!groupsQuery.loading && groups.length === 0 && (
          <div
            style={{
              padding: 32, textAlign: 'center',
              background: 'var(--panel)', border: '1px solid var(--border)',
              borderRadius: 12, color: 'var(--txt3)', fontSize: 13,
            }}
          >
            No SCIM groups yet. Once your IdP provisions a group via{' '}
            <code style={{ fontFamily: 'var(--font-red-hat-mono), monospace', fontSize: 12 }}>
              POST /api/scim/v2/Groups
            </code>
            , it will appear here.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {groups.map((g) => {
            const d = getDraft(g)
            const dirty = isDirty(g)
            const customSections = d.sections !== null
            return (
              <div
                key={g.id}
                style={{
                  padding: 18, borderRadius: 12,
                  background: 'var(--panel)',
                  border: dirty ? '1px solid var(--accent)' : '1px solid var(--border)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <div
                    style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Users size={16} color="var(--accent)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--txt)' }}>
                      {g.displayName}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--txt3)', marginTop: 2 }}>
                      {g.memberCount} member{g.memberCount === 1 ? '' : 's'}
                      {g.externalId ? (
                        <>
                          {' · '}
                          <code style={{ fontFamily: 'var(--font-red-hat-mono), monospace' }}>
                            {g.externalId}
                          </code>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14 }}>
                  {/* Role select */}
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--txt2)', marginBottom: 5 }}>
                      Role
                    </div>
                    <select
                      value={d.role ?? ''}
                      onChange={(e) => setRole(g, e.target.value === '' ? null : e.target.value as Role)}
                      style={{
                        width: '100%', padding: '8px 10px', borderRadius: 8,
                        border: '1px solid var(--border)', background: 'var(--bg2)',
                        fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
                      }}
                    >
                      <option value="">— none (skip role mapping) —</option>
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  {/* Sections picker */}
                  <div>
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      marginBottom: 5,
                    }}>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--txt2)' }}>
                        Dashboard sections
                      </span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => clearSectionsOverride(g)}
                          disabled={d.sections === null}
                          style={{
                            fontSize: 11, padding: '3px 8px', borderRadius: 6,
                            border: '1px solid var(--border)',
                            background: d.sections === null ? 'var(--bg2)' : 'var(--panel)',
                            color: d.sections === null ? 'var(--accent)' : 'var(--txt2)',
                            cursor: d.sections === null ? 'default' : 'pointer',
                            fontFamily: 'inherit',
                          }}
                        >
                          Full access
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (d.sections === null) {
                              setDraft((prev) => ({ ...prev, [g.id]: { ...d, sections: [] } }))
                            }
                          }}
                          disabled={d.sections !== null}
                          style={{
                            fontSize: 11, padding: '3px 8px', borderRadius: 6,
                            border: '1px solid var(--border)',
                            background: d.sections !== null ? 'var(--bg2)' : 'var(--panel)',
                            color: d.sections !== null ? 'var(--accent)' : 'var(--txt2)',
                            cursor: d.sections !== null ? 'default' : 'pointer',
                            fontFamily: 'inherit',
                          }}
                        >
                          Custom
                        </button>
                      </div>
                    </div>
                    {customSections ? (
                      <div
                        style={{
                          maxHeight: 120, overflowY: 'auto',
                          border: '1px solid var(--border)', borderRadius: 8,
                          background: 'var(--bg2)', padding: 8,
                          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4,
                        }}
                      >
                        {sectionOptions.map((slug) => {
                          const checked = d.sections!.includes(slug)
                          return (
                            <label
                              key={slug}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                fontSize: 11, color: 'var(--txt2)',
                                padding: '2px 4px', borderRadius: 4, cursor: 'pointer',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleSection(g, slug)}
                                style={{ accentColor: 'var(--accent)' }}
                              />
                              <span style={{ fontFamily: 'var(--font-red-hat-mono), monospace' }}>
                                {slug}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    ) : (
                      <div style={{
                        fontSize: 12, padding: '8px 12px', borderRadius: 8,
                        border: '1px dashed var(--border)', color: 'var(--txt3)',
                        background: 'var(--bg2)',
                      }}>
                        Members keep their personal section allow-list (User.dashboardSections).
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer actions */}
                {dirty && (
                  <div style={{
                    display: 'flex', justifyContent: 'flex-end',
                    gap: 8, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)',
                  }}>
                    <button
                      type="button"
                      onClick={() => discardDraft(g)}
                      disabled={busyId === g.id}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                        background: 'var(--bg2)', color: 'var(--txt2)',
                        border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      <RotateCcw size={11} />
                      Discard
                    </button>
                    <button
                      type="button"
                      onClick={() => save(g)}
                      disabled={busyId === g.id}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 700,
                        background: 'var(--accent)', color: '#fff',
                        border: 'none', cursor: busyId === g.id ? 'default' : 'pointer',
                        opacity: busyId === g.id ? 0.7 : 1,
                        fontFamily: 'inherit',
                      }}
                    >
                      <Save size={11} />
                      {busyId === g.id ? 'Saving…' : `Save (${g.memberCount} member${g.memberCount === 1 ? '' : 's'})`}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
