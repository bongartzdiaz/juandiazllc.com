import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  formatCurrency,
  formatCurrencyDecimal,
  formatNum,
  formatPct,
  formatCompact,
  formatImpactValue,
  getImpactLabel,
  getProjectStatusColor,
  getProjectStatusBg,
  getSDGColor,
  goalColor,
  goalTextColor,
  stagger,
  getPriorityColor,
  getContactTypeLabel,
  timeAgo,
} from './utils'

describe('currency formatters', () => {
  it('formatCurrency uses 0 fraction digits and converts cents → units', () => {
    // 123_456 cents → 1234.56 → rounded to 1235 (no fraction digits)
    expect(formatCurrency(123_456, 'en-US')).toMatch(/€1,235/)
  })

  it('formatCurrencyDecimal preserves 2 fraction digits', () => {
    expect(formatCurrencyDecimal(123_456, 'en-US')).toMatch(/€1,234\.56/)
  })

  it('formatCurrency honours an alternate currency code', () => {
    // 100_000 cents → $1,000.00 → rounded to $1,000
    expect(formatCurrency(100_000, 'en-US', 'USD')).toMatch(/\$1,000/)
  })

  it('formatCurrency on round amounts has no decimal artefacts', () => {
    expect(formatCurrency(50_000, 'en-US')).toMatch(/€500$/)
  })
})

describe('number formatters', () => {
  it('formatNum localises thousands separators', () => {
    expect(formatNum(1_234_567, 'en-US')).toBe('1,234,567')
  })

  it('formatPct renders one decimal', () => {
    expect(formatPct(42.5)).toBe('42.5%')
    expect(formatPct(100)).toBe('100.0%')
  })

  it('formatCompact handles M / K / single', () => {
    expect(formatCompact(2_500_000)).toBe('2.5M')
    expect(formatCompact(15_500)).toBe('15.5K')
    expect(formatCompact(800)).toBe('800')
    expect(formatCompact(0)).toBe('0')
  })
})

describe('formatImpactValue', () => {
  it('renders co2 in tonnes above 1000kg', () => {
    expect(formatImpactValue(2500, 'co2_kg')).toBe('2.5t')
    expect(formatImpactValue(750, 'co2_kg')).toBe('750kg')
  })

  it('renders water in kL above 1000L', () => {
    expect(formatImpactValue(5500, 'water_liters')).toBe('5.5kL')
    expect(formatImpactValue(800, 'water_liters')).toBe('800L')
  })

  it('renders energy in MWh above 1000kWh', () => {
    expect(formatImpactValue(2000, 'energy_kwh')).toBe('2.0MWh')
    expect(formatImpactValue(500, 'energy_kwh')).toBe('500kWh')
  })

  it('uses formatCompact for people / trees', () => {
    expect(formatImpactValue(1500, 'people_helped')).toBe('1.5K')
    expect(formatImpactValue(1500, 'trees_planted')).toBe('1.5K')
  })

  it('renders money_donated as currency (value is dollars/euros)', () => {
    expect(formatImpactValue(1234, 'money_donated')).toMatch(/€1,234/)
  })

  it('falls back to formatNum for unknown types', () => {
    expect(formatImpactValue(98765, 'unknown_metric')).toBe('98,765')
  })
})

describe('getImpactLabel', () => {
  it('returns known labels', () => {
    expect(getImpactLabel('co2_kg')).toBe('CO2 Reduced')
    expect(getImpactLabel('people_helped')).toBe('People Helped')
  })

  it('falls back to the raw type for unknown keys', () => {
    expect(getImpactLabel('foo_bar')).toBe('foo_bar')
  })
})

describe('project + priority status colors', () => {
  it('getProjectStatusColor maps active/completed/paused/planned', () => {
    expect(getProjectStatusColor('active')).toBe('var(--g)')
    expect(getProjectStatusColor('completed')).toBe('var(--b)')
    expect(getProjectStatusColor('paused')).toBe('var(--y)')
    expect(getProjectStatusColor('planned')).toBe('var(--txt3)')
    expect(getProjectStatusColor('unknown')).toBe('var(--txt3)')
  })

  it('getProjectStatusBg maps the same statuses', () => {
    expect(getProjectStatusBg('active')).toBe('var(--g-bg)')
    expect(getProjectStatusBg('completed')).toBe('var(--b-bg)')
    expect(getProjectStatusBg('unknown')).toBe('var(--bg2)')
  })

  it('getPriorityColor maps urgent/high/medium/low and falls back', () => {
    expect(getPriorityColor('urgent')).toBe('var(--r)')
    expect(getPriorityColor('high')).toBe('var(--o)')
    expect(getPriorityColor('medium')).toBe('var(--y)')
    expect(getPriorityColor('low')).toBe('var(--g)')
    expect(getPriorityColor('???')).toBe('var(--txt3)')
  })
})

describe('SDG colours', () => {
  it('returns the official UN color for goals 1..17', () => {
    expect(getSDGColor(1)).toBe('#E5243B')
    expect(getSDGColor(17)).toBe('#19486A')
  })

  it('falls back to grey for out-of-range goals', () => {
    expect(getSDGColor(0)).toBe('#666')
    expect(getSDGColor(99)).toBe('#666')
  })
})

describe('goal threshold colors', () => {
  it('goalColor: ≥85 green, ≥60 yellow, else red', () => {
    expect(goalColor(95)).toBe('var(--g)')
    expect(goalColor(85)).toBe('var(--g)')
    expect(goalColor(72)).toBe('var(--y)')
    expect(goalColor(60)).toBe('var(--y)')
    expect(goalColor(40)).toBe('var(--r)')
  })

  it('goalTextColor mirrors the same buckets', () => {
    expect(goalTextColor(95)).toBe('var(--g-txt)')
    expect(goalTextColor(70)).toBe('var(--y-txt)')
    expect(goalTextColor(20)).toBe('var(--r-txt)')
  })
})

describe('stagger', () => {
  it('returns animationDelay = base + i*step', () => {
    expect(stagger(0)).toEqual({ animationDelay: '80ms' })
    expect(stagger(3)).toEqual({ animationDelay: '305ms' })
    expect(stagger(2, 100, 50)).toEqual({ animationDelay: '200ms' })
  })
})

describe('getContactTypeLabel', () => {
  it('returns the friendly label for known types', () => {
    expect(getContactTypeLabel('partner')).toBe('Partner')
    expect(getContactTypeLabel('donor')).toBe('Donor')
  })

  it('falls back to the raw value for unknown types', () => {
    expect(getContactTypeLabel('vendor')).toBe('vendor')
  })
})

describe('timeAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-29T12:00:00Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('< 60s returns "just now"', () => {
    expect(timeAgo('2026-04-29T11:59:30Z')).toBe('just now')
  })

  it('minutes', () => {
    expect(timeAgo('2026-04-29T11:55:00Z')).toBe('5m ago')
  })

  it('hours', () => {
    expect(timeAgo('2026-04-29T09:00:00Z')).toBe('3h ago')
  })

  it('days', () => {
    expect(timeAgo('2026-04-26T12:00:00Z')).toBe('3d ago')
  })

  it('over a week → locale date', () => {
    const out = timeAgo('2026-04-01T12:00:00Z')
    expect(out).not.toMatch(/ago|now/)
    // Locale string contains digits
    expect(out).toMatch(/\d/)
  })
})
