import type { TemplateContext, QuarterlyData } from './types'
import { formatCurrency, formatNumber, utilizationPct } from '../currency'
import { escapeHtml } from '../render'

/** Quarterly impact report — projects status overview + impact metrics +
 *  budget utilization rollup. The cornerstone report most operators run
 *  every 3 months. */
export function renderQuarterly(ctx: TemplateContext): string {
  const d = ctx.data as QuarterlyData
  const s = ctx.strings

  const active = d.projects.filter(p => p.status === 'active').length
  const completed = d.projects.filter(p => p.status === 'completed').length
  const totalBudget = d.projects.reduce((sum, p) => sum + p.budgetCents, 0)
  const totalSpent = d.projects.reduce((sum, p) => sum + p.spentCents, 0)
  const util = utilizationPct(totalSpent, totalBudget)

  let html = `
    <div class="stat-row">
      <div class="stat-card">
        <div class="stat-card__label">${escapeHtml(s.totalProjects ?? 'Total projects')}</div>
        <div class="stat-card__value">${formatNumber(d.projects.length, ctx.locale)}</div>
        <div class="stat-card__hint">${formatNumber(active, ctx.locale)} ${escapeHtml(s.active ?? 'active')} · ${formatNumber(completed, ctx.locale)} ${escapeHtml(s.completed ?? 'completed')}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__label">${escapeHtml(s.totalBudget ?? 'Total budget')}</div>
        <div class="stat-card__value">${formatCurrency(totalBudget, ctx.currency, ctx.locale)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__label">${escapeHtml(s.totalSpent ?? 'Total spent')}</div>
        <div class="stat-card__value">${formatCurrency(totalSpent, ctx.currency, ctx.locale)}</div>
        <div class="stat-card__hint">${util}% ${escapeHtml(s.utilization ?? 'utilization')}</div>
      </div>
    </div>
  `

  // Impact metrics totals
  if (d.metricTotals.length > 0) {
    html += `<h2>${escapeHtml(s.impactTotals ?? 'Impact totals')}</h2>`
    html += `<table>
      <thead><tr>
        <th>${escapeHtml(s.colMetric ?? 'Metric')}</th>
        <th class="num">${escapeHtml(s.colTotal ?? 'Total')}</th>
      </tr></thead>
      <tbody>`
    for (const m of d.metricTotals) {
      html += `<tr>
        <td>${escapeHtml(m.metricType)}</td>
        <td class="num">${formatNumber(m.total, ctx.locale)}</td>
      </tr>`
    }
    html += `</tbody></table>`
  }

  // Per-project breakdown
  html += `<h2>${escapeHtml(s.projectBreakdown ?? 'Project breakdown')}</h2>`
  if (d.projects.length === 0) {
    html += `<div class="empty-state">${escapeHtml(s.noProjects ?? 'No projects in this period.')}</div>`
  } else {
    html += `<table>
      <thead><tr>
        <th>${escapeHtml(s.colProject ?? 'Project')}</th>
        <th>${escapeHtml(s.colStatus ?? 'Status')}</th>
        <th class="num">${escapeHtml(s.colBudget ?? 'Budget')}</th>
        <th class="num">${escapeHtml(s.colSpent ?? 'Spent')}</th>
        <th class="num">${escapeHtml(s.colUtil ?? 'Util.')}</th>
      </tr></thead>
      <tbody>`
    for (const p of d.projects) {
      const pUtil = utilizationPct(p.spentCents, p.budgetCents)
      const badge = pUtil > 100 ? 'badge--bad' : pUtil > 80 ? 'badge--warn' : 'badge--good'
      html += `<tr>
        <td>${escapeHtml(p.title)}</td>
        <td><span class="badge">${escapeHtml(p.status)}</span></td>
        <td class="num">${formatCurrency(p.budgetCents, ctx.currency, ctx.locale)}</td>
        <td class="num">${formatCurrency(p.spentCents, ctx.currency, ctx.locale)}</td>
        <td class="num"><span class="badge ${badge}">${pUtil}%</span></td>
      </tr>`
    }
    html += `</tbody></table>`
  }

  return html
}
