// Drag-and-drop dashboard layout system (ported from HMB)
// Pure CSS Grid + native HTML Drag API — zero external dependencies

export type WidgetId =
  | 'journey' | 'kpi-strip'
  // CSR
  | 'csr-impact-chart' | 'csr-activity' | 'csr-projects' | 'csr-sdg' | 'csr-sdg-donut' | 'csr-forecast'
  // Real Estate
  | 're-revenue-chart' | 're-listings-chart' | 're-properties' | 're-activity' | 're-donut' | 're-forecast'
  // Hospitality
  | 'hos-revenue-chart' | 'hos-occ-chart' | 'hos-rooms' | 'hos-activity' | 'hos-gauge' | 'hos-reviews'

export interface WidgetConfig {
  id: WidgetId
  label: string
  zone: 'full' | 'main' | 'sidebar' | 'bottom-left' | 'bottom-right'
  locked?: boolean
}

const STORAGE_PREFIX = 'pai-layout-'

export function saveWidgetOrder(industry: string, order: WidgetId[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`${STORAGE_PREFIX}${industry}`, JSON.stringify(order))
  }
}

export function loadWidgetOrder(industry: string): WidgetId[] | null {
  if (typeof window === 'undefined') return null
  try {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}${industry}`)
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

export function resetWidgetOrder(industry: string): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(`${STORAGE_PREFIX}${industry}`)
  }
}

export function reorderWidgets(current: WidgetConfig[], dragId: WidgetId, dropId: WidgetId): WidgetConfig[] {
  const dragWidget = current.find(w => w.id === dragId)
  const dropWidget = current.find(w => w.id === dropId)
  if (!dragWidget || !dropWidget) return current
  // Only allow reorder within same zone
  if (dragWidget.zone !== dropWidget.zone) return current
  if (dragWidget.locked || dropWidget.locked) return current

  const next = [...current]
  const dragIdx = next.findIndex(w => w.id === dragId)
  const dropIdx = next.findIndex(w => w.id === dropId)
  const [removed] = next.splice(dragIdx, 1)
  next.splice(dropIdx, 0, removed)
  return next
}

// Default layouts per industry
export const CSR_WIDGETS: WidgetConfig[] = [
  { id: 'journey', label: 'Impact Journey', zone: 'full', locked: true },
  { id: 'kpi-strip', label: 'KPI Cards', zone: 'full', locked: true },
  { id: 'csr-impact-chart', label: 'Impact Overview', zone: 'main' },
  { id: 'csr-activity', label: 'Recent Activity', zone: 'sidebar' },
  { id: 'csr-projects', label: 'Projects', zone: 'main' },
  { id: 'csr-sdg', label: 'SDG Coverage', zone: 'sidebar' },
  { id: 'csr-sdg-donut', label: 'SDG Distribution', zone: 'bottom-left' },
  { id: 'csr-forecast', label: 'Impact Forecast', zone: 'bottom-right' },
]

export const RE_WIDGETS: WidgetConfig[] = [
  { id: 'journey', label: 'Sales Pipeline', zone: 'full', locked: true },
  { id: 'kpi-strip', label: 'KPI Cards', zone: 'full', locked: true },
  { id: 're-revenue-chart', label: 'Revenue & Closings', zone: 'bottom-left' },
  { id: 're-listings-chart', label: 'Listings vs Closings', zone: 'bottom-right' },
  { id: 're-properties', label: 'Properties', zone: 'main' },
  { id: 're-activity', label: 'Recent Activity', zone: 'sidebar' },
  { id: 're-donut', label: 'Revenue by Type', zone: 'bottom-left' },
  { id: 're-forecast', label: 'Revenue Forecast', zone: 'bottom-right' },
]

export const HOS_WIDGETS: WidgetConfig[] = [
  { id: 'journey', label: 'Guest Journey', zone: 'full', locked: true },
  { id: 'kpi-strip', label: 'KPI Cards', zone: 'full', locked: true },
  { id: 'hos-revenue-chart', label: 'Revenue Breakdown', zone: 'bottom-left' },
  { id: 'hos-occ-chart', label: 'Occupancy Trend', zone: 'bottom-right' },
  { id: 'hos-rooms', label: 'Rooms & Venues', zone: 'main' },
  { id: 'hos-activity', label: 'Recent Activity', zone: 'sidebar' },
  { id: 'hos-gauge', label: 'Occupancy Gauge', zone: 'bottom-left' },
  { id: 'hos-reviews', label: 'Guest Reviews', zone: 'bottom-right' },
]

export function getOrderedWidgets(industry: string, defaults: WidgetConfig[]): WidgetConfig[] {
  const saved = loadWidgetOrder(industry)
  if (!saved) return defaults
  const ordered: WidgetConfig[] = []
  for (const id of saved) {
    const w = defaults.find(d => d.id === id)
    if (w) ordered.push(w)
  }
  // Add any new widgets not in saved order
  for (const w of defaults) {
    if (!ordered.find(o => o.id === w.id)) ordered.push(w)
  }
  return ordered
}
