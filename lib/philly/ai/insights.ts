/* ---------------------------------------------------------------
   AI Insights engine — rule-based analysis with optional LLM augmentation.

   Safe to run without any API keys (deterministic heuristics). If
   OPENAI_API_KEY or ANTHROPIC_API_KEY is set, the `enhance=true` flag
   layers an LLM-generated narrative on top of the raw signals.
   --------------------------------------------------------------- */

import { getAuthPrisma } from '@/lib/philly/auth'

export type InsightSeverity = 'info' | 'success' | 'warning' | 'critical'
export type InsightCategory =
  | 'pipeline' | 'revenue' | 'productivity' | 'risk'
  | 'opportunity' | 'trend' | 'data-quality'

export interface Insight {
  id: string
  severity: InsightSeverity
  category: InsightCategory
  title: string
  detail: string
  metric?: { label: string; value: string | number }
  action?: { label: string; href: string }
  /** 0–100. Higher means we're more certain this insight matters. */
  confidence: number
}

export interface InsightsReport {
  generatedAt: string
  summary: string
  insights: Insight[]
  /* Raw metric snapshot — useful for charts + LLM context. */
  metrics: {
    contacts: number
    contactsLast7d: number
    contactsNoEmail: number
    projects: number
    projectsActive: number
    projectsStalled: number
    deals: number
    dealsOpen: number
    dealsWon30d: number
    dealsLost30d: number
    openDealValueCents: number
    properties: number
    propertiesAvailable: number
    showingsUpcoming: number
    showingsCompletedNoFeedback: number
    notifications: number
  }
}

const DAY = 24 * 60 * 60 * 1000

function nowIso(): string {
  return new Date().toISOString()
}

function fmtMoney(cents: number): string {
  return `€${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

/** Pull all the signal data we need from Prisma in a single pass. */
async function gather(organizationId: string) {
  const prisma = getAuthPrisma()
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * DAY)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY)

  const [
    contacts,
    contactsLast7d,
    contactsNoEmail,
    projects,
    projectsActive,
    projectsStalled,
    deals,
    dealsOpen,
    dealsWon30d,
    dealsLost30d,
    openDealValueAgg,
    properties,
    propertiesAvailable,
    showingsUpcoming,
    showingsCompletedNoFeedback,
    notifications,
  ] = await Promise.all([
    prisma.contact.count({ where: { organizationId } }),
    prisma.contact.count({ where: { organizationId, createdAt: { gte: sevenDaysAgo } } }),
    prisma.contact.count({ where: { organizationId, email: '' } }),
    prisma.project.count({ where: { organizationId } }),
    prisma.project.count({ where: { organizationId, status: 'active' } }),
    prisma.project.count({
      where: { organizationId, status: 'active', updatedAt: { lt: thirtyDaysAgo } },
    }),
    prisma.deal.count({ where: { pipeline: { organizationId } } }).catch(() => 0),
    prisma.deal.count({ where: { pipeline: { organizationId }, status: 'open' } }).catch(() => 0),
    prisma.deal.count({
      where: { pipeline: { organizationId }, status: 'won', updatedAt: { gte: thirtyDaysAgo } },
    }).catch(() => 0),
    prisma.deal.count({
      where: { pipeline: { organizationId }, status: 'lost', updatedAt: { gte: thirtyDaysAgo } },
    }).catch(() => 0),
    prisma.deal.aggregate({
      where: { pipeline: { organizationId }, status: 'open' },
      _sum: { valueCents: true },
    }).catch(() => ({ _sum: { valueCents: 0 } })),
    prisma.property.count({ where: { organizationId } }).catch(() => 0),
    prisma.property.count({ where: { organizationId, status: 'available' } }).catch(() => 0),
    prisma.showing.count({
      where: { property: { organizationId }, date: { gte: now }, status: 'scheduled' },
    }).catch(() => 0),
    prisma.showing.count({
      where: {
        property: { organizationId },
        status: 'completed',
        feedback: '',
      },
    }).catch(() => 0),
    prisma.notification.count({ where: { organizationId, read: false } }).catch(() => 0),
  ])

  return {
    contacts, contactsLast7d, contactsNoEmail,
    projects, projectsActive, projectsStalled,
    deals, dealsOpen, dealsWon30d, dealsLost30d,
    openDealValueCents: openDealValueAgg._sum.valueCents ?? 0,
    properties, propertiesAvailable, showingsUpcoming, showingsCompletedNoFeedback,
    notifications,
  }
}

/** Rule-based insight generator. Pure function of the signal snapshot. */
function deriveInsights(m: Awaited<ReturnType<typeof gather>>): Insight[] {
  const out: Insight[] = []

  // ── Pipeline health ──
  if (m.dealsOpen > 0 && m.openDealValueCents > 0) {
    out.push({
      id: 'pipeline-value',
      severity: 'info',
      category: 'pipeline',
      title: `${fmtMoney(m.openDealValueCents)} in open pipeline`,
      detail: `${m.dealsOpen} open deal${m.dealsOpen === 1 ? '' : 's'} across all pipelines. Average value ${fmtMoney(m.openDealValueCents / Math.max(1, m.dealsOpen))}.`,
      metric: { label: 'Open value', value: fmtMoney(m.openDealValueCents) },
      action: { label: 'View deals', href: '/deals' },
      confidence: 95,
    })
  }

  if (m.dealsWon30d > 0 || m.dealsLost30d > 0) {
    const total = m.dealsWon30d + m.dealsLost30d
    const winRate = total > 0 ? Math.round((m.dealsWon30d / total) * 100) : 0
    out.push({
      id: 'pipeline-winrate',
      severity: winRate >= 50 ? 'success' : winRate >= 30 ? 'info' : 'warning',
      category: 'pipeline',
      title: `${winRate}% win rate over last 30 days`,
      detail: `${m.dealsWon30d} won, ${m.dealsLost30d} lost. ${
        winRate < 30 ? 'Consider reviewing lost-deal reasons to spot a pattern.' :
        winRate >= 50 ? 'Strong conversion — your qualification is working.' :
        'Healthy baseline. Look for bottlenecks in the mid-stages.'
      }`,
      metric: { label: 'Win rate', value: `${winRate}%` },
      action: { label: 'Open pipeline', href: '/deals' },
      confidence: total >= 5 ? 90 : 60,
    })
  }

  // ── Stalled projects ──
  if (m.projectsStalled > 0) {
    out.push({
      id: 'projects-stalled',
      severity: m.projectsStalled >= 3 ? 'warning' : 'info',
      category: 'risk',
      title: `${m.projectsStalled} active project${m.projectsStalled === 1 ? '' : 's'} not updated in 30 days`,
      detail: 'Either close them out or bump status to keep the dashboard honest. Stale data erodes trust fast.',
      metric: { label: 'Stalled', value: m.projectsStalled },
      action: { label: 'Review projects', href: '/projects' },
      confidence: 85,
    })
  }

  // ── Growth signals ──
  if (m.contactsLast7d >= 5) {
    const pct = m.contacts > 0 ? Math.round((m.contactsLast7d / m.contacts) * 100) : 0
    out.push({
      id: 'contacts-growth',
      severity: 'success',
      category: 'opportunity',
      title: `${m.contactsLast7d} new contacts this week`,
      detail: `That's +${pct}% of your total contact base in 7 days. Make sure intake routing and follow-up assignments can keep up.`,
      metric: { label: 'New contacts', value: m.contactsLast7d },
      action: { label: 'View contacts', href: '/contacts' },
      confidence: 90,
    })
  } else if (m.contacts > 20 && m.contactsLast7d === 0) {
    out.push({
      id: 'contacts-flat',
      severity: 'warning',
      category: 'opportunity',
      title: 'No new contacts in the last 7 days',
      detail: 'Lead sources may be dry. Check campaign status, referral channels, and inbound forms.',
      confidence: 75,
    })
  }

  // ── Data quality ──
  if (m.contacts > 0 && m.contactsNoEmail > 0) {
    const pct = Math.round((m.contactsNoEmail / m.contacts) * 100)
    if (pct >= 20) {
      out.push({
        id: 'contacts-no-email',
        severity: pct >= 40 ? 'warning' : 'info',
        category: 'data-quality',
        title: `${pct}% of contacts missing email`,
        detail: `${m.contactsNoEmail} contacts can't be reached via email campaigns. Enrich or archive them.`,
        metric: { label: 'No email', value: m.contactsNoEmail },
        action: { label: 'Filter contacts', href: '/contacts' },
        confidence: 95,
      })
    }
  }

  // ── Real estate signals ──
  if (m.propertiesAvailable > 0 && m.showingsUpcoming === 0) {
    out.push({
      id: 're-no-showings',
      severity: 'warning',
      category: 'opportunity',
      title: `${m.propertiesAvailable} available listing${m.propertiesAvailable === 1 ? '' : 's'}, 0 showings booked`,
      detail: 'Listings without upcoming showings rarely convert. Push a mailing burst or drop price on slow-movers.',
      action: { label: 'Open listings', href: '/properties' },
      confidence: 80,
    })
  } else if (m.showingsUpcoming >= 5) {
    out.push({
      id: 're-showings-busy',
      severity: 'info',
      category: 'productivity',
      title: `${m.showingsUpcoming} showings scheduled`,
      detail: 'Heavy viewing week. Make sure confirmation SMS and follow-up templates are loaded.',
      metric: { label: 'Upcoming', value: m.showingsUpcoming },
      action: { label: 'View schedule', href: '/showings' },
      confidence: 90,
    })
  }

  if (m.showingsCompletedNoFeedback >= 3) {
    out.push({
      id: 're-feedback-missing',
      severity: 'warning',
      category: 'data-quality',
      title: `${m.showingsCompletedNoFeedback} completed showings without feedback`,
      detail: 'Feedback is the best signal for re-targeting. Add a post-showing prompt to the flow.',
      action: { label: 'Review showings', href: '/showings' },
      confidence: 85,
    })
  }

  // ── Baseline positive if we have nothing to warn about ──
  if (out.length === 0) {
    out.push({
      id: 'baseline-calm',
      severity: 'success',
      category: 'trend',
      title: 'All systems calm',
      detail: "No anomalies detected in the last 30 days. Good moment to invest in content, campaigns, or outreach.",
      confidence: 70,
    })
  }

  // Sort: severity then confidence
  const sevOrder: Record<InsightSeverity, number> = { critical: 0, warning: 1, info: 2, success: 3 }
  return out.sort((a, b) => {
    const sev = sevOrder[a.severity] - sevOrder[b.severity]
    return sev !== 0 ? sev : b.confidence - a.confidence
  })
}

function summarize(insights: Insight[]): string {
  const critical = insights.filter(i => i.severity === 'critical').length
  const warnings = insights.filter(i => i.severity === 'warning').length
  const wins = insights.filter(i => i.severity === 'success').length

  if (critical > 0) return `${critical} critical issue${critical === 1 ? '' : 's'} need attention right now.`
  if (warnings >= 3) return `${warnings} items to review — mostly health and data-quality signals.`
  if (warnings > 0) return `${warnings} warning${warnings === 1 ? '' : 's'} worth a quick check, otherwise healthy.`
  if (wins >= 3) return 'Strong week across the board — good momentum.'
  return 'Organization looks healthy. Minor observations only.'
}

export async function generateInsights(organizationId: string): Promise<InsightsReport> {
  const metrics = await gather(organizationId)
  const insights = deriveInsights(metrics)
  return {
    generatedAt: nowIso(),
    summary: summarize(insights),
    insights,
    metrics,
  }
}
