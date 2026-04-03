// Shared Recharts configuration for consistent, theme-aware charts
// Ported from HMB dashboard pattern

import type { CSSProperties } from 'react'

export function getChartColors(theme: string) {
  const isDark = theme === 'dark'
  return {
    grid: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    tick: isDark ? '#7A8DA3' : '#94A3B8',
    green: isDark ? '#34D399' : '#059669',
    blue: isDark ? '#2DD4BF' : '#0D7377',
    orange: isDark ? '#FBBF24' : '#D97706',
    red: isDark ? '#F87171' : '#DC2626',
    yellow: isDark ? '#EAB308' : '#CA8A04',
    purple: isDark ? '#A78BFA' : '#7C3AED',
  }
}

export const tooltipStyle: CSSProperties = {
  background: 'var(--panel)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
  boxShadow: 'var(--shadow)',
}

export function tickProps(tickColor?: string) {
  return {
    fill: tickColor || 'var(--txt3)',
    fontSize: 11,
    fontFamily: "var(--font-jet-mono), 'JetBrains Mono', monospace",
  }
}

export const axisProps = {
  axisLine: false,
  tickLine: false,
} as const

// Format EUR currency for chart tooltips
export function formatChartEur(value: number): string {
  if (value >= 1000000) return `\u20AC${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `\u20AC${(value / 1000).toFixed(0)}K`
  return `\u20AC${value}`
}

// Format percentage for chart tooltips
export function formatChartPct(value: number): string {
  return `${value}%`
}
