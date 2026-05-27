/* Report generator — entry point.
   ──────────────────────────────────────────────────────────────────
   Replaces the inline barebones HTML generator that lived in
   app/api/reports/route.ts. Six templates, one dispatcher, branded
   shell, currency-aware, hermetic-testable.

   ## Flow

   1. Caller (the /api/reports POST handler) calls generateReport(...)
      with org-scoped Prisma + the type literal + the active locale.
   2. We load the Organization for currency + name + logoUrl.
   3. Per-type data loader queries Prisma scoped to organizationId.
   4. Dispatcher picks the template, hands it (data + strings + ctx).
   5. renderShell() wraps the inner HTML in the branded outer.

   The function is split into `loadData` + `renderForType` so tests can
   exercise either path independently.

   ## Why I/O is separated from rendering

   Rendering is pure. Tests pass fixture data + strings; templates
   produce deterministic HTML. The Prisma I/O happens only in
   `loadData`, which the tests don't exercise (covered by route-level
   integration tests). This makes template work cheap to iterate on
   without docker-compose-spinning a test DB.
   --------------------------------------------------------------- */

import type { PrismaClient } from '@prisma/client'
import { renderShell } from './render'
import { renderQuarterly } from './templates/quarterly'
import { renderFinancial } from './templates/financial'
import { renderSdg } from './templates/sdg'
import { renderStakeholder } from './templates/stakeholder'
import { renderPerformance } from './templates/performance'
import { renderRegional } from './templates/regional'
import type {
  TemplateContext,
  QuarterlyData,
  FinancialData,
  SdgData,
  StakeholderData,
  PerformanceData,
  RegionalData,
} from './templates/types'

export const REPORT_TYPES = [
  'quarterly',
  'financial',
  'sdg',
  'stakeholder',
  'performance',
  'regional',
] as const

export type ReportType = (typeof REPORT_TYPES)[number]

export interface GenerateReportInput {
  type: ReportType
  /** Org-scoped Prisma — caller is responsible for using `getAuthPrisma()`
   *  + the route's `scope.organizationId`. We don't accept arbitrary
   *  Prisma to avoid accidentally leaking cross-org data. */
  prisma: PrismaClient
  organizationId: string
  /** Active locale for currency/date formatting + i18n strings. */
  locale: string
  /** i18n strings for this report type — caller pulls from next-intl's
   *  reports.templates.<type>.* namespace and passes them in. The
   *  template gracefully falls back to English placeholders if a key
   *  is missing, but that's a build smell to fix. */
  strings: Record<string, string>
  /** Shell-level strings: footer copy etc. */
  shellStrings: { footer: string }
}

/** Load per-type data from Prisma. Each branch returns the shape the
 *  matching template expects. */
async function loadData(input: GenerateReportInput): Promise<unknown> {
  const { prisma, organizationId, type } = input

  switch (type) {
    case 'quarterly': {
      const [projects, metrics] = await Promise.all([
        prisma.project.findMany({
          where: { organizationId },
          select: { id: true, title: true, status: true, budgetCents: true, spentCents: true },
        }),
        prisma.impactMetric.findMany({
          where: { project: { organizationId } },
          select: { metricType: true, value: true },
        }),
      ])
      const totalsMap = new Map<string, number>()
      for (const m of metrics) totalsMap.set(m.metricType, (totalsMap.get(m.metricType) ?? 0) + m.value)
      const metricTotals = [...totalsMap.entries()].map(([metricType, total]) => ({ metricType, total }))
      const data: QuarterlyData = { projects, metricTotals }
      return data
    }

    case 'financial': {
      const projects = await prisma.project.findMany({
        where: { organizationId },
        select: { id: true, title: true, budgetCents: true, spentCents: true, status: true },
      })
      const data: FinancialData = { projects }
      return data
    }

    case 'sdg': {
      // Project.sdgGoals is a Json column with an array of SDG numbers
      // (1-17). Defensive parse per row — Prisma may hand back a string
      // or an already-parsed array depending on the MariaDB version.
      const projects = await prisma.project.findMany({
        where: { organizationId },
        select: { sdgGoals: true },
      })
      // 17 UN SDGs — labels stay in the generator since they're stable.
      const SDG_LABELS: Record<number, string> = {
        1: 'No poverty', 2: 'Zero hunger', 3: 'Good health & well-being',
        4: 'Quality education', 5: 'Gender equality', 6: 'Clean water & sanitation',
        7: 'Affordable & clean energy', 8: 'Decent work & economic growth',
        9: 'Industry, innovation & infrastructure', 10: 'Reduced inequalities',
        11: 'Sustainable cities & communities', 12: 'Responsible consumption',
        13: 'Climate action', 14: 'Life below water', 15: 'Life on land',
        16: 'Peace, justice & strong institutions', 17: 'Partnerships for the goals',
      }
      const counts = new Map<number, number>()
      for (const p of projects) {
        let arr: number[] = []
        const raw = (p as { sdgGoals?: unknown }).sdgGoals
        if (Array.isArray(raw)) {
          arr = raw.filter((n): n is number => typeof n === 'number')
        } else if (typeof raw === 'string') {
          try {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed)) arr = parsed.filter((n): n is number => typeof n === 'number')
          } catch { /* leave empty */ }
        }
        for (const n of arr) counts.set(n, (counts.get(n) ?? 0) + 1)
      }
      const sdgCoverage = Array.from({ length: 17 }, (_, i) => {
        const sdg = i + 1
        return { sdg, label: SDG_LABELS[sdg] ?? `SDG ${sdg}`, projectCount: counts.get(sdg) ?? 0 }
      })
      const data: SdgData = { sdgCoverage, totalProjects: projects.length }
      return data
    }

    case 'stakeholder': {
      // Curated highlights — for now empty (operators set via Settings
      // UI in a future PR). KPIs derived from project + deal totals.
      //
      // Deal isn't directly org-scoped — it lives under Pipeline. We
      // filter through `pipeline: { organizationId }` to stay isolated.
      const [projects, deals] = await Promise.all([
        prisma.project.findMany({
          where: { organizationId },
          select: { id: true, title: true, status: true, budgetCents: true, spentCents: true, sdgGoals: true },
        }),
        prisma.deal.findMany({
          where: { pipeline: { organizationId }, status: 'won' },
          select: { valueCents: true },
        }),
      ])
      const activeCount = projects.filter(p => p.status === 'active').length
      const completedCount = projects.filter(p => p.status === 'completed').length
      const wonValue = deals.reduce((s, d) => s + d.valueCents, 0)
      const totalSpent = projects.reduce((s, p) => s + p.spentCents, 0)

      const kpis = [
        { label: 'Active projects', value: String(activeCount), trend: 'flat' as const },
        { label: 'Completed projects', value: String(completedCount), trend: 'up' as const },
        { label: 'Deals won', value: String(deals.length), trend: 'up' as const },
      ]
      const topProjects = projects
        .filter(p => p.status === 'active' || p.status === 'completed')
        .slice(0, 3)
        .map(p => ({
          title: p.title,
          status: p.status,
          impactSummary: `Budget ${(p.budgetCents / 100).toLocaleString()} · Spent ${(p.spentCents / 100).toLocaleString()}`,
        }))
      void wonValue; void totalSpent
      const data: StakeholderData = {
        highlights: [],  // populated by a future Settings → Reports highlights UI
        kpis,
        topProjects,
      }
      return data
    }

    case 'performance': {
      // Monthly deal closure for the trailing 12 months.
      //
      // Deal model:
      //   - Lives under Pipeline → filter via `pipeline: { organizationId }`
      //   - `actualClose` (DateTime?) is the close date, not `closedAt`
      //   - `status` ∈ {'open', 'won', 'lost'} (no 'pending')
      //   - `stageId` references PipelineStage (not Stage)
      const now = new Date()
      const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)
      const [closedDeals, stages, openDeals] = await Promise.all([
        prisma.deal.findMany({
          where: {
            pipeline: { organizationId },
            status: 'won',
            actualClose: { gte: twelveMonthsAgo },
          },
          select: { actualClose: true, valueCents: true },
        }),
        prisma.pipelineStage.findMany({
          where: { pipeline: { organizationId } },
          select: { id: true, name: true, position: true },
        }),
        prisma.deal.findMany({
          where: { pipeline: { organizationId }, status: 'open' },
          select: { stageId: true, valueCents: true },
        }),
      ])
      // Group closed deals by year-month
      const monthMap = new Map<string, { deals: number; valueCents: number }>()
      for (const d of closedDeals) {
        if (!d.actualClose) continue
        const key = `${d.actualClose.getFullYear()}-${String(d.actualClose.getMonth() + 1).padStart(2, '0')}`
        const m = monthMap.get(key) ?? { deals: 0, valueCents: 0 }
        m.deals++
        m.valueCents += d.valueCents
        monthMap.set(key, m)
      }
      const monthlyClosed = [...monthMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, v]) => ({ month, deals: v.deals, valueCents: v.valueCents }))

      // Pipeline by stage — Open deals only, since closed ones already
      // appear in monthlyClosed.
      const stageMap = new Map<string, { name: string; count: number; valueCents: number }>()
      for (const s of stages) stageMap.set(s.id, { name: s.name, count: 0, valueCents: 0 })
      for (const d of openDeals) {
        const entry = stageMap.get(d.stageId)
        if (!entry) continue
        entry.count++
        entry.valueCents += d.valueCents
      }
      const pipelineByStage = [...stageMap.values()]
        .filter(s => s.count > 0)
        .map(s => ({ stage: s.name, count: s.count, valueCents: s.valueCents }))
        .sort((a, b) => b.valueCents - a.valueCents)

      const data: PerformanceData = { monthlyClosed, pipelineByStage }
      return data
    }

    case 'regional': {
      // Project has no geo columns, so the regional report pivots on
      // Property (real-estate tenants) instead. Property's address +
      // city + country fields are the source. Value rolls up
      // priceCents per country, contacts is left at 0 today (Contact
      // also has no geo column — extend later via Contact.city if
      // operators want a deeper map).
      const properties = await prisma.property.findMany({
        where: { organizationId },
        select: { city: true, country: true, priceCents: true },
      })
      const countryMap = new Map<string, { projects: number; contacts: number; valueCents: number }>()
      const cityMap = new Map<string, { city: string; country: string; projects: number; contacts: number }>()
      for (const p of properties) {
        const country = (p.country ?? '').trim() || 'Unknown'
        const city = (p.city ?? '').trim() || 'Unknown'
        const c = countryMap.get(country) ?? { projects: 0, contacts: 0, valueCents: 0 }
        c.projects++  // "projects" label kept for template parity; actually properties here
        c.valueCents += p.priceCents
        countryMap.set(country, c)
        const cityKey = `${city}|${country}`
        const ct = cityMap.get(cityKey) ?? { city, country, projects: 0, contacts: 0 }
        ct.projects++
        cityMap.set(cityKey, ct)
      }
      const byCountry = [...countryMap.entries()].map(([country, v]) => ({
        country, projects: v.projects, contacts: v.contacts, valueCents: v.valueCents,
      }))
      const byCity = [...cityMap.values()]
      const data: RegionalData = { byCountry, byCity }
      return data
    }
  }
}

const TEMPLATES: Record<ReportType, (ctx: TemplateContext) => string> = {
  quarterly: renderQuarterly,
  financial: renderFinancial,
  sdg: renderSdg,
  stakeholder: renderStakeholder,
  performance: renderPerformance,
  regional: renderRegional,
}

/** Render a report against ALREADY-LOADED data + strings. Pure — perfect
 *  for hermetic tests that don't want to touch Prisma. */
export function renderForType(
  type: ReportType,
  ctx: TemplateContext,
): string {
  return TEMPLATES[type](ctx)
}

/** Full I/O path — used by the route handler.
 *  Loads org metadata, loads template data, renders, wraps. */
export async function generateReport(input: GenerateReportInput & {
  /** Title shown in the report header. Caller localises via i18n. */
  title: string
  /** Optional subtitle (e.g. "Q2 2026"). */
  subtitle?: string
}): Promise<string> {
  const org = await input.prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: { name: true, logoUrl: true, currency: true },
  })
  if (!org) throw new Error(`Organization ${input.organizationId} not found`)

  const data = await loadData(input)
  const ctx: TemplateContext = {
    organizationId: input.organizationId,
    currency: org.currency ?? 'EUR',
    locale: input.locale,
    strings: input.strings,
    data,
  }
  const inner = renderForType(input.type, ctx)
  return renderShell({
    title: input.title,
    subtitle: input.subtitle,
    orgName: org.name,
    orgLogoUrl: org.logoUrl,
    generatedAt: new Date(),
    innerHtml: inner,
    footerText: input.shellStrings.footer,
  })
}
