'use client'

import { useState } from 'react'
import { Bookmark, BookmarkPlus, Check, Trash2, Users, X } from 'lucide-react'
import { useSavedViews, type SavedView } from '@/hooks/philly/useSavedViews'

/* Bundle AA — saved-views chip bar, rendered above the list/grid
   on contacts / deals / properties. Lets a user persist the
   current filter+view combination as a named view, switch back
   to it later, and (optionally) share it with the org.

   The bar is intentionally low-chrome: a row of chips, a
   "Save current" button, and an inline rename/delete menu on
   hover. All persistence flows through useSavedViews(). */

interface Props {
  entity: 'contacts' | 'deals' | 'properties' | (string & {})
  /** Current filter object — what gets persisted on "Save current". */
  currentFilters: Record<string, unknown>
  /** Apply a saved view's filters to the page. Implementer decides
      what subset of fields it knows about — unknown keys are ignored. */
  onApply: (view: SavedView) => void
  /** Optional: whether the user is admin/manager (controls "Share with org"). */
  canShare?: boolean
  /** Active view id (if any), to render its chip in active state. */
  activeId?: string | null
}

export function SavedViewsBar({ entity, currentFilters, onApply, canShare = true, activeId }: Props) {
  const { views, loading, saveCurrent, deleteView } = useSavedViews(entity)
  const [saving, setSaving] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draftShared, setDraftShared] = useState(false)

  const handleSave = async () => {
    const name = draftName.trim()
    if (!name) return
    const created = await saveCurrent(name, currentFilters, draftShared)
    if (created) {
      setSaving(false)
      setDraftName('')
      setDraftShared(false)
    }
  }

  if (loading && views.length === 0 && !saving) {
    // Render a stable-height placeholder so the page doesn't reflow
    // when views finally arrive.
    return <div style={{ height: 34, marginBottom: 10 }} />
  }

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        marginBottom: 10, flexWrap: 'wrap',
        fontSize: 12,
      }}
    >
      <Bookmark size={13} color="var(--txt3)" />
      <span style={{ fontSize: 11, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '.06em', marginRight: 4 }}>
        Views
      </span>

      {views.length === 0 && !saving && (
        <span style={{ fontSize: 11.5, color: 'var(--txt3)', fontStyle: 'italic' }}>
          No saved views yet — save your current filters as one
        </span>
      )}

      {views.map((v) => (
        <ViewChip
          key={v.id}
          view={v}
          active={activeId === v.id}
          onApply={() => onApply(v)}
          onDelete={() => deleteView(v.id)}
        />
      ))}

      {saving ? (
        <div
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'var(--panel)', border: '1px solid var(--accent)',
            borderRadius: 7, padding: '2px 4px 2px 10px',
          }}
        >
          <input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') { setSaving(false); setDraftName('') }
            }}
            placeholder="Name this view…"
            style={{
              width: 160, fontSize: 12, border: 'none', background: 'transparent',
              outline: 'none', color: 'var(--txt)', fontFamily: 'inherit',
            }}
          />
          {canShare && (
            <label
              title="Make this view available to everyone in the org"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 11, color: 'var(--txt2)', cursor: 'pointer',
                padding: '2px 6px', borderRadius: 5,
                background: draftShared ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'transparent',
              }}
            >
              <input
                type="checkbox"
                checked={draftShared}
                onChange={(e) => setDraftShared(e.target.checked)}
                style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
              <Users size={10} />
            </label>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!draftName.trim()}
            aria-label="Save view"
            style={{
              width: 24, height: 24, padding: 0, borderRadius: 5,
              background: 'var(--accent)', color: '#fff',
              border: 'none', cursor: draftName.trim() ? 'pointer' : 'default',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              opacity: draftName.trim() ? 1 : 0.5,
            }}
          >
            <Check size={12} />
          </button>
          <button
            type="button"
            onClick={() => { setSaving(false); setDraftName('') }}
            aria-label="Cancel"
            style={{
              width: 24, height: 24, padding: 0, borderRadius: 5,
              background: 'transparent', color: 'var(--txt3)',
              border: 'none', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setSaving(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 7, fontSize: 11.5, fontWeight: 600,
            background: 'transparent', color: 'var(--txt2)',
            border: '1px dashed var(--border)', cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <BookmarkPlus size={11} /> Save current
        </button>
      )}
    </div>
  )
}

function ViewChip({
  view, active, onApply, onDelete,
}: {
  view: SavedView
  active: boolean
  onApply: () => void
  onDelete: () => void
}) {
  const [hover, setHover] = useState(false)
  return (
    <span
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 4px 2px 10px',
        borderRadius: 7,
        background: active ? 'var(--accent)' : 'var(--bg2)',
        color: active ? '#fff' : 'var(--txt)',
        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
        fontSize: 11.5, fontWeight: 500,
      }}
    >
      <button
        type="button"
        onClick={onApply}
        style={{
          background: 'none', border: 'none', padding: 0,
          color: 'inherit', cursor: 'pointer', fontFamily: 'inherit',
          fontSize: 'inherit', fontWeight: 'inherit',
          display: 'inline-flex', alignItems: 'center', gap: 5,
        }}
      >
        {view.isShared && <Users size={10} aria-label="Shared with org" />}
        {view.name}
      </button>
      <button
        type="button"
        aria-label={`Delete view ${view.name}`}
        onClick={(e) => { e.stopPropagation(); if (confirm(`Delete view "${view.name}"?`)) onDelete() }}
        style={{
          width: 18, height: 18, padding: 0, borderRadius: 4,
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: active ? '#fff' : 'var(--txt3)',
          display: hover ? 'inline-flex' : 'none',
          alignItems: 'center', justifyContent: 'center',
          opacity: 0.85,
        }}
      >
        <Trash2 size={10} />
      </button>
    </span>
  )
}
