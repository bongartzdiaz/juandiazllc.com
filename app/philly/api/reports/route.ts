/* GET  /api/reports — list user's reports
   POST /api/reports — generate a new report */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, jsonError } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { page, limit, skip } = parsePagination(req)
  const prisma = getAuthPrisma()

  const where = { userId: scope.userId }
  const [reports, total] = await Promise.all([
    // org-scope-lint-ok: Report rows are per-user; scoped to the caller's own userId (tighter than org)
    prisma.report.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.report.count({ where }),
  ])

  return paginatedResponse(reports, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  let body: { title?: string; type?: string; configJson?: string }
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  if (!body.title?.trim()) return jsonError('title is required', 400)
  if (!body.type) return jsonError('type is required', 400)

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
  generateReport(report.id, scope.organizationId, body.type)

  return NextResponse.json({ data: report }, { status: 201 })
}

async function generateReport(reportId: string, orgId: string, type: string) {
  try {
    const prisma = getAuthPrisma()

    // Gather data based on report type
    let html = '<div style="font-family: system-ui; padding: 24px;">'

    if (type === 'quarterly' || type === 'impact') {
      const projects = await prisma.project.findMany({
        where: { organizationId: orgId },
        include: { milestones: true, _count: { select: { impactMetrics: true } } },
      })

      const metrics = await prisma.impactMetric.findMany({
        where: { project: { organizationId: orgId } },
      })

      const totals: Record<string, number> = {}
      for (const m of metrics) {
        totals[m.metricType] = (totals[m.metricType] ?? 0) + m.value
      }

      html += `<h1>${type === 'quarterly' ? 'Quarterly' : 'Impact'} Report</h1>`
      html += `<p>Generated: ${new Date().toLocaleDateString()}</p>`
      html += `<h2>Projects Overview</h2>`
      html += `<p>Total: ${projects.length} | Active: ${projects.filter((p: any) => p.status === 'active').length} | Completed: ${projects.filter((p: any) => p.status === 'completed').length}</p>`
      html += `<h2>Impact Totals</h2><table border="1" cellpadding="8" style="border-collapse: collapse;">`
      html += `<tr><th>Metric</th><th>Total</th></tr>`
      for (const [k, v] of Object.entries(totals)) {
        html += `<tr><td>${k}</td><td>${v.toLocaleString()}</td></tr>`
      }
      html += `</table>`
    } else if (type === 'financial') {
      const projects = await prisma.project.findMany({
        where: { organizationId: orgId },
        select: { title: true, budgetCents: true, spentCents: true, status: true },
      })

      const totalBudget = projects.reduce((s: any, p: any) => s + p.budgetCents, 0)
      const totalSpent = projects.reduce((s: any, p: any) => s + p.spentCents, 0)

      html += `<h1>Financial Report</h1>`
      html += `<p>Total Budget: $${(totalBudget / 100).toLocaleString()} | Total Spent: $${(totalSpent / 100).toLocaleString()} | Utilization: ${totalBudget ? Math.round((totalSpent / totalBudget) * 100) : 0}%</p>`
      html += `<table border="1" cellpadding="8" style="border-collapse: collapse;"><tr><th>Project</th><th>Budget</th><th>Spent</th><th>%</th></tr>`
      for (const p of projects) {
        html += `<tr><td>${p.title}</td><td>$${(p.budgetCents / 100).toLocaleString()}</td><td>$${(p.spentCents / 100).toLocaleString()}</td><td>${p.budgetCents ? Math.round((p.spentCents / p.budgetCents) * 100) : 0}%</td></tr>`
      }
      html += `</table>`
    } else {
      html += `<h1>${type} Report</h1><p>Report type "${type}" generated successfully.</p>`
    }

    html += '</div>'

    await prisma.report.update({
      where: { id: reportId },
      data: { status: 'ready', resultHtml: html },
    })
  } catch (err) {
    const prisma = getAuthPrisma()
    await prisma.report.update({
      where: { id: reportId },
      data: { status: 'failed' },
    }).catch(() => {})
    console.error('[report] Generation failed:', err)
  }
}
