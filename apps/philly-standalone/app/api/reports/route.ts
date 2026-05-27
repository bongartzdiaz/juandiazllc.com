/* GET  /api/reports — list user's reports
   POST /api/reports — generate a new report
   ───────────────────────────────────────────────────────────────────
   Generation uses lib/philly/reports/generator.ts — branded shell +
   per-type templates + org currency. The inline barebones generator
   that used to live in this file was replaced 2026-05-27. */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, jsonError } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { generateReport as buildReportHtml, REPORT_TYPES, type ReportType } from '@/lib/philly/reports/generator'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { page, limit, skip } = parsePagination(req)
  const prisma = getAuthPrisma()

  const where = { userId: scope.userId }
  const [reports, total] = await Promise.all([
    prisma.report.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.report.count({ where }),
  ])

  return paginatedResponse(reports, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`reports.create:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  let body: { title?: string; type?: string; configJson?: string }
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  if (!body.title?.trim()) return jsonError('title is required', 400)
  if (!body.type) return jsonError('type is required', 400)
  // Validate against the closed set of report types — protects against
  // typos in stale UI clients + means the generator dispatch is total.
  if (!REPORT_TYPES.includes(body.type as ReportType)) {
    return jsonError(`Unknown report type: ${body.type}`, 400)
  }

  const prisma = getAuthPrisma()

  // Create report in "generating" status
  const report = await prisma.report.create({
    data: {
      userId: scope.userId,
      organizationId: scope.organizationId,
      title: body.title.trim(),
      type: body.type,
      configJson: body.configJson ?? '{}',
      status: 'generating',
    },
  })

  // Generate report content asynchronously
  void generateAndPersist(report.id, scope.organizationId, body.type as ReportType, body.title.trim())

  return NextResponse.json({ data: report }, { status: 201 })
}

/** Generate the report HTML via the templated generator + persist
 *  to the Report row. Fire-and-forget — the POST handler returns the
 *  Report row immediately in `generating` status; the UI polls until
 *  status flips to `ready` or `failed`.
 *
 *  i18n: strings are passed in from a server-side next-intl resolver
 *  per report type. For now we use English defaults baked into the
 *  templates; a future PR wires the Acceptlanguage / org default locale
 *  via next-intl's server-side getTranslations(). */
async function generateAndPersist(
  reportId: string,
  organizationId: string,
  type: ReportType,
  title: string,
) {
  const prisma = getAuthPrisma()
  try {
    // English strings inline — non-blocking on the i18n wire-up. Each
    // template falls back to these keys if a string is missing.
    const strings: Record<string, string> = {
      // common
      totalProjects: 'Total projects', totalBudget: 'Total budget',
      totalSpent: 'Total spent', remaining: 'Remaining', utilization: 'Utilization',
      active: 'active', completed: 'completed',
      projectBreakdown: 'Project breakdown', noProjects: 'No projects in this period.',
      impactTotals: 'Impact totals',
      colProject: 'Project', colStatus: 'Status', colBudget: 'Budget',
      colSpent: 'Spent', colUtil: 'Util.', colRemaining: 'Remaining',
      colMetric: 'Metric', colTotal: 'Total',
      // financial extras
      healthBreakdown: 'Portfolio health', onTrack: 'On track',
      underutilised: 'Under-utilised', overBudget: 'Over budget',
      // sdg
      sdgsCovered: 'SDGs covered', outOfSeventeen: 'of the 17 UN goals',
      coverageByGoal: 'Coverage by goal', noSdgData: 'No SDG data on file. Tag projects with SDGs to populate this report.',
      colGoal: 'Goal', colLabel: 'Label', colProjects: 'Projects', colShare: 'Share',
      // stakeholder
      highlights: 'Highlights this period', noHighlights: 'No curated highlights — set them in Settings → Reports.',
      topProjects: 'Top projects', colImpact: 'Impact summary',
      // performance
      dealsClosed: 'Deals closed', totalValue: 'Total value', avgDeal: 'Avg deal size',
      monthlyTrend: 'Monthly trend', noClosedDeals: 'No closed deals in this period.',
      colMonth: 'Month', colDeals: 'Deals', colValue: 'Value', colTrend: 'Trend',
      pipelineByStage: 'Pipeline by stage', colStage: 'Stage', colCount: 'Count',
      // regional
      countries: 'Countries', cities: 'Cities', byCountry: 'By country',
      byCity: 'By city', colCountry: 'Country', colCity: 'City', colContacts: 'Contacts',
      noRegionalData: 'No regional data on file. Tag projects with country/city to populate.',
      cityRowsCappedAt: '+ {n} more cities',
    }
    const shellStrings = { footer: 'Generated by DEUS · Confidential' }

    const html = await buildReportHtml({
      type,
      prisma,
      organizationId,
      locale: 'en-IE',
      strings,
      shellStrings,
      title,
    })

    await prisma.report.update({
      where: { id: reportId },
      data: { status: 'ready', resultHtml: html },
    })
  } catch (err) {
    await prisma.report.update({
      where: { id: reportId },
      data: { status: 'failed' },
    }).catch(() => {})
    console.error('[report] Generation failed:', err)
  }
}
