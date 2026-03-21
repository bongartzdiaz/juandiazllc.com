// Format currency with locale awareness
export const formatCurrency = (cents: number, locale = 'en-US', currency = 'USD') =>
  new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(cents / 100)

export const formatCurrencyDecimal = (cents: number, locale = 'en-US', currency = 'USD') =>
  new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100)

export const formatNum = (n: number, locale = 'en-US') =>
  new Intl.NumberFormat(locale).format(n)

export const formatPct = (n: number) => `${n.toFixed(1)}%`

export const formatCompact = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

// Impact metric formatting
export const formatImpactValue = (value: number, type: string): string => {
  switch (type) {
    case 'co2_kg': return value >= 1000 ? `${(value / 1000).toFixed(1)}t` : `${Math.round(value)}kg`
    case 'people_helped': return formatCompact(value)
    case 'trees_planted': return formatCompact(value)
    case 'money_donated': return formatCurrency(value * 100)
    case 'water_liters': return value >= 1000 ? `${(value / 1000).toFixed(1)}kL` : `${Math.round(value)}L`
    case 'energy_kwh': return value >= 1000 ? `${(value / 1000).toFixed(1)}MWh` : `${Math.round(value)}kWh`
    default: return formatNum(value)
  }
}

// Impact metric labels
export const getImpactLabel = (type: string): string => {
  const labels: Record<string, string> = {
    co2_kg: 'CO2 Reduced',
    people_helped: 'People Helped',
    trees_planted: 'Trees Planted',
    money_donated: 'Money Donated',
    water_liters: 'Water Saved',
    energy_kwh: 'Energy Saved',
  }
  return labels[type] || type
}

// Project status colors
export const getProjectStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'var(--g)'
    case 'completed': return 'var(--b)'
    case 'paused': return 'var(--y)'
    case 'planned': return 'var(--txt3)'
    default: return 'var(--txt3)'
  }
}

export const getProjectStatusBg = (status: string) => {
  switch (status) {
    case 'active': return 'var(--g-bg)'
    case 'completed': return 'var(--b-bg)'
    case 'paused': return 'var(--y-bg)'
    case 'planned': return 'var(--bg2)'
    default: return 'var(--bg2)'
  }
}

// SDG goal colors (official UN colors)
const SDG_COLORS = [
  '#E5243B', '#DDA63A', '#4C9F38', '#C5192D', '#FF3A21',
  '#26BDE2', '#FCC30B', '#A21942', '#FD6925', '#DD1367',
  '#FD9D24', '#BF8B2E', '#3F7E44', '#0A97D9', '#56C02B',
  '#00689D', '#19486A',
]

export const getSDGColor = (goal: number): string => SDG_COLORS[goal - 1] || '#666'

// Goal progress color
export const goalColor = (pct: number) =>
  pct >= 85 ? 'var(--g)' : pct >= 60 ? 'var(--y)' : 'var(--r)'

export const goalTextColor = (pct: number) =>
  pct >= 85 ? 'var(--g-txt)' : pct >= 60 ? 'var(--y-txt)' : 'var(--r-txt)'

// Animation stagger
export const stagger = (i: number, base = 80, step = 75) =>
  ({ animationDelay: `${base + i * step}ms` })

// Priority colors
export const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'var(--r)'
    case 'high': return 'var(--o)'
    case 'medium': return 'var(--y)'
    case 'low': return 'var(--g)'
    default: return 'var(--txt3)'
  }
}

// Contact type labels
export const getContactTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    partner: 'Partner',
    beneficiary: 'Beneficiary',
    stakeholder: 'Stakeholder',
    donor: 'Donor',
  }
  return labels[type] || type
}

// Relative time
export const timeAgo = (date: string): string => {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(date).toLocaleDateString()
}
