export const formatEuro = (n: number) =>
  new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

export const formatEuro2 = (n: number) =>
  new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

export const formatNum = (n: number) =>
  new Intl.NumberFormat('nl-NL').format(n)

export const formatPct = (n: number) => `${n.toFixed(1)}%`

export const getCplStatus = (cpl: number | null, spend: number): 'testfase' | 'goed' | 'ok' | 'slecht' => {
  if (spend < 50 || cpl === null || cpl === 0) return 'testfase'
  if (cpl < 15) return 'goed'
  if (cpl < 25) return 'ok'
  return 'slecht'
}

export const goalColor = (pct: number) =>
  pct >= 85 ? 'var(--g)' : pct >= 60 ? 'var(--y)' : 'var(--r)'

export const goalTextColor = (pct: number) =>
  pct >= 85 ? 'var(--g-txt)' : pct >= 60 ? 'var(--y-txt)' : 'var(--r-txt)'

export const stagger = (i: number, base = 80, step = 75) =>
  ({ animationDelay: `${base + i * step}ms` })

// API base URL — uses Next.js basePath automatically
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/hmb-dashboard'
export const API_BASE = `${basePath}/api`
