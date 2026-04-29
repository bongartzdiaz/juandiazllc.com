'use client'

import { useCallback } from 'react'
import { useApi } from './useApi'
import { useToast } from './useToast'

/* ---------------------------------------------------------------
   useSavedViews(entity)
   ---------------------------------------------------------------
   Wrapper around the /api/views endpoint that gives a list page
   four operations:

     - views: SavedView[] — current user's own + shared org views
     - saveCurrent(name, filters, isShared): create
     - rename(id, name): patch the name
     - deleteView(id): remove

   `filters` is any serialisable object (`Record<string, unknown>`).
   The server stores it as a JSON string under filtersJson; this hook
   parses it back automatically so callers see plain objects.

   Used by Bundle AA on contacts / deals / properties list pages.
   --------------------------------------------------------------- */

export interface SavedView {
  id: string
  name: string
  entity: string
  filters: Record<string, unknown>
  columns: string[]
  sort: Record<string, unknown>
  isShared: boolean
  isDefault: boolean
  userId: string | null
  createdAt: string
}

interface ApiSavedView {
  id: string
  name: string
  entity: string
  filtersJson: string
  columnsJson: string
  sortJson: string
  isShared: boolean
  isDefault: boolean
  userId: string | null
  createdAt: string
}

function parseView(v: ApiSavedView): SavedView {
  const safeParse = <T>(raw: string, fallback: T): T => {
    try { return JSON.parse(raw) as T } catch { return fallback }
  }
  return {
    id: v.id,
    name: v.name,
    entity: v.entity,
    filters: safeParse<Record<string, unknown>>(v.filtersJson, {}),
    columns: safeParse<string[]>(v.columnsJson, []),
    sort: safeParse<Record<string, unknown>>(v.sortJson, {}),
    isShared: v.isShared,
    isDefault: v.isDefault,
    userId: v.userId,
    createdAt: v.createdAt,
  }
}

export interface UseSavedViewsReturn {
  views: SavedView[]
  loading: boolean
  saveCurrent: (name: string, filters: Record<string, unknown>, isShared?: boolean) => Promise<SavedView | null>
  rename: (id: string, name: string) => Promise<boolean>
  deleteView: (id: string) => Promise<boolean>
  refetch: () => void
}

export function useSavedViews(entity: string): UseSavedViewsReturn {
  const { addToast } = useToast()
  const query = useApi<{ data: ApiSavedView[] }>(`/views?entity=${encodeURIComponent(entity)}`)
  const views = (query.data?.data ?? []).map(parseView)

  const saveCurrent = useCallback(
    async (name: string, filters: Record<string, unknown>, isShared = false): Promise<SavedView | null> => {
      try {
        const res = await fetch('/api/views', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entity,
            name,
            filtersJson: JSON.stringify(filters),
            isShared,
          }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json?.error ?? `Failed (${res.status})`)
        addToast(`Saved view "${name}"`, 'success')
        query.refetch()
        return parseView(json.data)
      } catch (e: unknown) {
        addToast(e instanceof Error ? e.message : 'Failed to save view', 'error')
        return null
      }
    },
    [entity, addToast, query],
  )

  const rename = useCallback(async (id: string, name: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/views/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error ?? `Failed (${res.status})`)
      }
      query.refetch()
      return true
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Rename failed', 'error')
      return false
    }
  }, [addToast, query])

  const deleteView = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/views/${id}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error ?? `Failed (${res.status})`)
      }
      addToast('View deleted', 'success')
      query.refetch()
      return true
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Delete failed', 'error')
      return false
    }
  }, [addToast, query])

  return {
    views,
    loading: query.loading,
    saveCurrent,
    rename,
    deleteView,
    refetch: query.refetch,
  }
}
