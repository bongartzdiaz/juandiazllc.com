/* GET  /api/reports — list user's reports
   POST /api/reports — generate a new report
   ───────────────────────────────────────────────────────────────────
   Generation uses lib/philly/reports/generator.ts — branded shell +
   per-type templates + org currency. The inline barebones generator
   that used to live in this file was replaced 2026-05-27. */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, jsonError } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { generateReport as buildReportHtml, REPORT_TYPES, type ReportType } from '@/lib/philly/reports/generator'
import { getReportStrings, getReportShellStrings } from '@/lib/philly/reports/strings'

/** Supported UI locales (mirrors i18n/request.ts). The `pai-locale`
 *  cookie holds a bare 2-letter code; unknown values fall back to 'en'. */
const SUPPORTED_LOCALES = ['en', 'nl', 'de', 'es', 'fr'] as const
type UiLocale = (typeof SUPPORTED_LOCALES)[number]

/** Map the 2-letter UI locale to a BCP-47 tag for Intl currency/date
 *  formatting in the generator. */
const INTL_LOCALE: Record<UiLocale, string> = {
  en: 'en-IE', nl: 'nl-NL', de: 'de-DE', es: 'es-ES', fr: 'fr-FR',
}

async function resolveLocale(): Promise<UiLocale> {
  const cookieStore = await cookies()
  const raw = cookieStore.get('pai-locale')?.value
  return (SUPPORTED_LOCALES as readonly string[]).includes(raw ?? '') ? (raw as UiLocale) : 'en'
}

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

  // Resolve the operator's UI language from the pai-locale cookie BEFORE
  // the fire-and-forget runs — cookies() must be read inside the request
  // scope, not from the detached async task.
  const locale = await resolveLocale()

  // Generate report content asynchronously
  void generateAndPersist(report.id, scope.organizationId, body.type as ReportType, body.title.trim(), locale)

  return NextResponse.json({ data: report }, { status: 201 })
}

/** Generate the report HTML via the templated generator + persist
 *  to the Report row. Fire-and-forget — the POST handler returns the
 *  Report row immediately in `generating` status; the UI polls until
 *  status flips to `ready` or `failed`.
 *
 *  i18n: report copy + SDG goal names come from
 *  lib/philly/reports/strings.ts, keyed off the operator's pai-locale
 *  cookie (resolved in the request scope and threaded in here). The
 *  generator stays locale-agnostic — strings are passed in, never
 *  imported into the templates. */
async function generateAndPersist(
  reportId: string,
  organizationId: string,
  type: ReportType,
  title: string,
  locale: UiLocale,
) {
  const prisma = getAuthPrisma()
  try {
    const html = await buildReportHtml({
      type,
      prisma,
      organizationId,
      locale: INTL_LOCALE[locale],
      strings: getReportStrings(locale),
      shellStrings: getReportShellStrings(locale),
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
