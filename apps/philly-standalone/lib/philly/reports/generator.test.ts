/* Hermetic tests — report templates + currency formatter + shell.
   ──────────────────────────────────────────────────────────────────
   Pure-render path only. No Prisma. Each test passes fixture data
   shaped per template + expected i18n strings + asserts on the
   resulting HTML.

   ## Why we don't snapshot

   Snapshot tests break on every cosmetic CSS tweak. We assert on
   specific markers (a number, a localised label, a CSS class) so the
   test still passes when we restyle the shell, but fails when actual
   behavior changes (a number renders wrong, a row is missing). */

import { describe, it, expect } from 'vitest'
import { formatCurrency, formatNumber, utilizationPct } from './currency'
import { renderShell, escapeHtml } from './render'
import { renderForType } from './generator'
import type { TemplateContext } from './templates/types'

function ctx(over: Partial<TemplateContext> = {}): TemplateContext {
  return {
    organizationId: 'org_1',
    currency: 'EUR',
    locale: 'en-IE',
    strings: {},
    data: {},
    ...over,
  }
}

describe('formatCurrency()', () => {
  it('formats EUR with 2 decimals + €', () => {
    expect(formatCurrency(123456, 'EUR', 'en-IE')).toMatch(/€1,234\.56/)
  })

  it('formats USD with $', () => {
    expect(formatCurrency(123456, 'USD', 'en-US')).toMatch(/\$1,234\.56/)
  })

  it('formats zero-decimal currencies without decimals (JPY)', () => {
    const out = formatCurrency(1500, 'JPY', 'en-US')
    expect(out).toContain('¥1,500')
    expect(out).not.toContain('.')
  })

  it('handles negative amounts', () => {
    const out = formatCurrency(-12345, 'EUR', 'en-IE')
    expect(out).toMatch(/-€123\.45|€-123\.45/)
  })

  it('defaults to EUR on invalid currency code', () => {
    expect(formatCurrency(12345, 'XX!', 'en-IE')).toMatch(/€/)
  })

  it('handles NaN and infinite values gracefully', () => {
    expect(formatCurrency(NaN, 'EUR')).toMatch(/€0\.00/)
    expect(formatCurrency(Infinity, 'EUR')).toMatch(/€0\.00/)
  })

  it('rounds half-cents up', () => {
    // 100.5 cents → 101 → €1.01
    expect(formatCurrency(100.5, 'EUR', 'en-IE')).toMatch(/€1\.01/)
  })

  it('respects locale-specific thousand separators', () => {
    const de = formatCurrency(123456, 'EUR', 'de-DE')
    expect(de).toMatch(/1\.234,56\s?€|€\s?1\.234,56/)
  })
})

describe('utilizationPct()', () => {
  it('returns 0 (not NaN) when budget is 0', () => {
    expect(utilizationPct(100, 0)).toBe(0)
  })

  it('rounds to nearest percent', () => {
    expect(utilizationPct(33, 100)).toBe(33)
    expect(utilizationPct(335, 1000)).toBe(34)  // 33.5% → 34%
  })

  it('handles overspend (>100%)', () => {
    expect(utilizationPct(150, 100)).toBe(150)
  })
})

describe('escapeHtml()', () => {
  it('escapes all 5 dangerous chars', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
  })

  it('escapes apostrophes', () => {
    expect(escapeHtml("Bob's house")).toBe('Bob&#39;s house')
  })

  it('escapes ampersands', () => {
    expect(escapeHtml('A & B Holdings')).toBe('A &amp; B Holdings')
  })
})

describe('renderShell()', () => {
  const baseShell = {
    title: 'Quarterly Impact',
    orgName: 'Acme Holdings',
    orgLogoUrl: null,
    generatedAt: new Date('2026-05-27T12:00:00Z'),
    innerHtml: '<h2>Hello</h2>',
    footerText: 'Confidential · DEUS',
  }

  it('includes title + org name + footer', () => {
    const html = renderShell(baseShell)
    expect(html).toContain('Quarterly Impact')
    expect(html).toContain('Acme Holdings')
    expect(html).toContain('Confidential · DEUS')
    expect(html).toContain('<h2>Hello</h2>')
  })

  it('escapes org name (XSS guard)', () => {
    const html = renderShell({ ...baseShell, orgName: '<script>alert(1)</script>' })
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>alert(1)</script>')
  })

  it('renders DEUS wordmark when logoUrl is null', () => {
    const html = renderShell(baseShell)
    expect(html).toContain('class="report-header__brand">DEUS')
  })

  it('renders an <img> when logoUrl is set', () => {
    const html = renderShell({ ...baseShell, orgLogoUrl: 'https://x/logo.png' })
    expect(html).toMatch(/<img class="report-header__logo" src="https:\/\/x\/logo\.png"/)
  })

  it('includes generated date in footer (ISO yyyy-mm-dd)', () => {
    const html = renderShell(baseShell)
    expect(html).toContain('2026-05-27')
  })

  it('renders optional subtitle', () => {
    const html = renderShell({ ...baseShell, subtitle: 'Q2 2026' })
    expect(html).toContain('Q2 2026')
  })
})

describe('renderForType — quarterly', () => {
  it('shows stat cards for total/active/completed', () => {
    const html = renderForType('quarterly', ctx({
      data: {
        projects: [
          { id: 'p1', title: 'A', status: 'active', budgetCents: 100000, spentCents: 50000 },
          { id: 'p2', title: 'B', status: 'completed', budgetCents: 200000, spentCents: 180000 },
        ],
        metricTotals: [{ metricType: 'people_helped', total: 1500 }],
      },
      strings: { totalProjects: 'Total projects', active: 'active', completed: 'completed' },
    }))
    expect(html).toMatch(/Total projects/)
    expect(html).toMatch(/people_helped/)
    // Both budgets rendered as €
    expect(html).toMatch(/€/)
  })

  it('renders empty state when no projects', () => {
    const html = renderForType('quarterly', ctx({
      data: { projects: [], metricTotals: [] },
      strings: { noProjects: 'No projects in this period.' },
    }))
    expect(html).toContain('No projects in this period.')
  })

  it('marks 100%+ utilization as bad badge', () => {
    const html = renderForType('quarterly', ctx({
      data: {
        projects: [{ id: 'p1', title: 'Over', status: 'active', budgetCents: 100000, spentCents: 150000 }],
        metricTotals: [],
      },
      strings: {},
    }))
    expect(html).toContain('badge--bad')
    expect(html).toContain('150%')
  })

  it('escapes project titles', () => {
    const html = renderForType('quarterly', ctx({
      data: {
        projects: [{ id: 'p1', title: '<script>x</script>', status: 'active', budgetCents: 0, spentCents: 0 }],
        metricTotals: [],
      },
      strings: {},
    }))
    expect(html).not.toContain('<script>x</script>')
    expect(html).toContain('&lt;script&gt;x&lt;/script&gt;')
  })
})

describe('renderForType — financial', () => {
  it('shows on-track / underutilised / over-budget bucket counts', () => {
    const html = renderForType('financial', ctx({
      data: {
        projects: [
          { id: 'p1', title: 'OK',   budgetCents: 1000_00, spentCents: 700_00, status: 'active' },
          { id: 'p2', title: 'Low',  budgetCents: 1000_00, spentCents: 200_00, status: 'active' },
          { id: 'p3', title: 'Over', budgetCents: 1000_00, spentCents: 1500_00, status: 'active' },
        ],
      },
      strings: { onTrack: 'On track', underutilised: 'Under-utilised', overBudget: 'Over budget' },
    }))
    expect(html).toContain('On track')
    expect(html).toContain('Under-utilised')
    expect(html).toContain('Over budget')
  })

  it('sorts projects by spent desc', () => {
    const html = renderForType('financial', ctx({
      data: {
        projects: [
          { id: 'p1', title: 'Small', budgetCents: 100, spentCents: 50, status: 'active' },
          { id: 'p2', title: 'Big',   budgetCents: 1000, spentCents: 900, status: 'active' },
        ],
      },
      strings: {},
    }))
    const bigIdx = html.indexOf('Big')
    const smallIdx = html.indexOf('Small')
    expect(bigIdx).toBeGreaterThan(-1)
    expect(smallIdx).toBeGreaterThan(-1)
    expect(bigIdx).toBeLessThan(smallIdx)  // Big comes first
  })
})

describe('renderForType — sdg', () => {
  it('renders empty state when no SDGs tagged', () => {
    const html = renderForType('sdg', ctx({
      data: {
        totalProjects: 5,
        sdgCoverage: Array.from({ length: 17 }, (_, i) => ({ sdg: i + 1, label: '', projectCount: 0 })),
      },
      strings: { noSdgData: 'No SDG data on file.' },
    }))
    expect(html).toContain('No SDG data on file.')
  })

  it('counts coverage out of 17', () => {
    const html = renderForType('sdg', ctx({
      data: {
        totalProjects: 4,
        sdgCoverage: [
          { sdg: 1, label: 'No poverty', projectCount: 2 },
          { sdg: 4, label: 'Quality education', projectCount: 3 },
          ...Array.from({ length: 15 }, (_, i) => ({ sdg: i + 3, label: 'x', projectCount: 0 })),
        ],
      },
      strings: {},
    }))
    expect(html).toMatch(/2 \/ 17/)
  })

  it('shows percentage share per goal', () => {
    const html = renderForType('sdg', ctx({
      data: {
        totalProjects: 4,
        sdgCoverage: [{ sdg: 1, label: 'No poverty', projectCount: 2 }],
      },
      strings: {},
    }))
    expect(html).toContain('50%')
  })
})

describe('renderForType — stakeholder', () => {
  it('renders KPI cards', () => {
    const html = renderForType('stakeholder', ctx({
      data: {
        kpis: [
          { label: 'Active', value: '12', trend: 'up' },
          { label: 'Won', value: '5', trend: 'up' },
        ],
        highlights: ['Q2 was record-breaking'],
        topProjects: [],
      },
      strings: { highlights: 'Highlights' },
    }))
    expect(html).toContain('Active')
    expect(html).toContain('12')
    expect(html).toContain('Q2 was record-breaking')
  })

  it('shows empty highlight state when list is empty', () => {
    const html = renderForType('stakeholder', ctx({
      data: { kpis: [], highlights: [], topProjects: [] },
      strings: { noHighlights: 'Set highlights in Settings.' },
    }))
    expect(html).toContain('Set highlights in Settings.')
  })
})

describe('renderForType — performance', () => {
  it('renders monthly trend rows with proportional bars', () => {
    const html = renderForType('performance', ctx({
      data: {
        monthlyClosed: [
          { month: '2026-01', deals: 2, valueCents: 100000 },
          { month: '2026-02', deals: 5, valueCents: 500000 },
        ],
        pipelineByStage: [],
      },
      strings: {},
    }))
    expect(html).toContain('2026-01')
    expect(html).toContain('2026-02')
    // The max-value month gets width: 100%
    expect(html).toMatch(/width:\s*100%/)
  })

  it('computes avg deal correctly', () => {
    const html = renderForType('performance', ctx({
      data: {
        monthlyClosed: [{ month: '2026-01', deals: 4, valueCents: 400000 }],
        pipelineByStage: [],
      },
      strings: { avgDeal: 'Avg deal size' },
    }))
    expect(html).toContain('Avg deal size')
    // 400000 / 4 = 100000 cents = €1,000
    expect(html).toMatch(/€1,000\.00|€\s?1,000\.00/)
  })

  it('handles zero deals (no /0)', () => {
    const html = renderForType('performance', ctx({
      data: { monthlyClosed: [], pipelineByStage: [] },
      strings: { noClosedDeals: 'No closed deals.' },
    }))
    expect(html).toContain('No closed deals.')
  })
})

describe('renderForType — regional', () => {
  it('renders countries sorted by value desc', () => {
    const html = renderForType('regional', ctx({
      data: {
        byCountry: [
          { country: 'Belgium', projects: 1, contacts: 5, valueCents: 100000 },
          { country: 'Germany', projects: 3, contacts: 12, valueCents: 500000 },
          { country: 'Spain', projects: 2, contacts: 8, valueCents: 300000 },
        ],
        byCity: [],
      },
      strings: {},
    }))
    const deIdx = html.indexOf('Germany')
    const esIdx = html.indexOf('Spain')
    const beIdx = html.indexOf('Belgium')
    expect(deIdx).toBeLessThan(esIdx)
    expect(esIdx).toBeLessThan(beIdx)
  })

  it('shows share percentage per country', () => {
    const html = renderForType('regional', ctx({
      data: {
        byCountry: [
          { country: 'Belgium', projects: 1, contacts: 5, valueCents: 100000 },
          { country: 'Germany', projects: 3, contacts: 12, valueCents: 100000 },
        ],
        byCity: [],
      },
      strings: {},
    }))
    expect(html).toContain('50%')  // each country contributes 50% of total value
  })

  it('caps city rows at 30 and shows count of remainder', () => {
    const data = {
      byCountry: [{ country: 'NL', projects: 50, contacts: 0, valueCents: 0 }],
      byCity: Array.from({ length: 50 }, (_, i) => ({
        city: `City${i}`, country: 'NL', projects: 1, contacts: 0,
      })),
    }
    const html = renderForType('regional', ctx({
      data,
      strings: { cityRowsCappedAt: '+ {n} more cities' },
    }))
    expect(html).toContain('+ 20 more cities')
  })

  it('shows empty state when no regional data', () => {
    const html = renderForType('regional', ctx({
      data: { byCountry: [], byCity: [] },
      strings: { noRegionalData: 'No regional data.' },
    }))
    expect(html).toContain('No regional data.')
  })
})

describe('formatNumber()', () => {
  it('uses locale thousand separators', () => {
    expect(formatNumber(1234567, 'en-US')).toBe('1,234,567')
    expect(formatNumber(1234567, 'de-DE')).toBe('1.234.567')
    expect(formatNumber(1234567, 'fr-FR')).toMatch(/1\s?234\s?567|1\.234\.567/)
  })

  it('handles NaN', () => {
    expect(formatNumber(NaN, 'en-IE')).toBe('0')
  })
})
