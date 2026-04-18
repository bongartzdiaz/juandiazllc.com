'use client'

import { useState, useCallback, useRef } from 'react'
import type { WidgetId, WidgetConfig } from '@/lib/philly/dashboard-layout'
import { getOrderedWidgets, saveWidgetOrder, resetWidgetOrder, reorderWidgets } from '@/lib/philly/dashboard-layout'

export function useDashboardLayout(industry: string, defaults: WidgetConfig[]) {
  const [editMode, setEditMode] = useState(false)
  const [widgets, setWidgets] = useState<WidgetConfig[]>(() =>
    getOrderedWidgets(industry, defaults)
  )
  const [dropTarget, setDropTarget] = useState<WidgetId | null>(null)
  const dragRef = useRef<WidgetId | null>(null)

  const toggleEdit = useCallback(() => setEditMode(v => !v), [])

  const reset = useCallback(() => {
    resetWidgetOrder(industry)
    setWidgets(defaults)
  }, [industry, defaults])

  const dragHandlers = useCallback((widgetId: WidgetId) => {
    const widget = widgets.find(w => w.id === widgetId)
    if (!editMode || !widget || widget.locked) return {}

    return {
      draggable: true,
      onDragStart: (e: React.DragEvent) => {
        dragRef.current = widgetId
        e.dataTransfer.effectAllowed = 'move'
        if (e.currentTarget instanceof HTMLElement) {
          e.currentTarget.style.opacity = '0.5'
        }
      },
      onDragEnd: (e: React.DragEvent) => {
        dragRef.current = null
        setDropTarget(null)
        if (e.currentTarget instanceof HTMLElement) {
          e.currentTarget.style.opacity = '1'
        }
      },
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault()
        if (dragRef.current && dragRef.current !== widgetId) {
          setDropTarget(widgetId)
        }
      },
      onDragLeave: () => {
        if (dropTarget === widgetId) setDropTarget(null)
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault()
        if (!dragRef.current) return
        setWidgets(prev => {
          const next = reorderWidgets(prev, dragRef.current!, widgetId)
          saveWidgetOrder(industry, next.map(w => w.id))
          return next
        })
        setDropTarget(null)
        dragRef.current = null
      },
    }
  }, [editMode, widgets, dropTarget, industry])

  const fullWidgets = widgets.filter(w => w.zone === 'full')
  const mainWidgets = widgets.filter(w => w.zone === 'main')
  const sidebarWidgets = widgets.filter(w => w.zone === 'sidebar')
  const bottomLeftWidgets = widgets.filter(w => w.zone === 'bottom-left')
  const bottomRightWidgets = widgets.filter(w => w.zone === 'bottom-right')

  return {
    editMode, toggleEdit, reset,
    widgets, fullWidgets, mainWidgets, sidebarWidgets,
    bottomLeftWidgets, bottomRightWidgets,
    dragHandlers, dropTarget,
  }
}
