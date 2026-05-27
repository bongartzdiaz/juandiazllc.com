import type { TemplateContext, FinancialData } from './types'
import { formatCurrency, formatNumber, utilizationPct } from '../currency'
import { escapeHtml } from '../render'

/** Financial overview — budget/spent/ROI rollup per project + grand totals.
 *  Used in board-deck quarterly reviews. */
export function renderFinancial(ctx: TemplateContext): string {
  const d = ctx.data as FinancialData
  const s = ctx.strings

  const totalBudget = d.projects.reduce((sum, p) => sum + p.budgetCents, 0)
  const totalSpent = d.projects.reduce((sum, p) => sum + p.spentCents, 0)
  const remaining = totalBudget - totalSpent
  const util = utilizationPct(totalSpent, totalBudget)

  // Bucket the projects by health status — operators want to see "X are
  // at-risk" at a glance.
  let underutilised = 0
  let onTrack = 0
  let overBudget = 0
  for (const p of d.projects) {
    const u = utilizationPct(p.spentCents, p.budgetCents)
    if (u > 100) overBudget++
    else if (u >= 50) onTrack++
    else underutilised++
  }

  let html = `
    <div class="stat-row">
      <div class="stat-card">
        <div class="stat-card__label">${escapeHtml(s.totalBudget ?? 'Total budget')}</div>
        <div class="stat-card__value">${formatCurrency(totalBudget, ctx.currency, ctx.locale)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__label">${escapeHtml(s.totalSpent ?? 'Total spent')}</div>
        <div class="stat-card__value">${formatCurrency(totalSpent, ctx.currency, ctx.locale)}</div>
        <div class="stat-card__hint">${util}% ${escapeHtml(s.utilization ?? 'utilization')}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__label">${escapeHtml(s.remaining ?? 'Remaining')}</div>
        <div class="stat-card__value">${formatCurrency(remaining, ctx.currency, ctx.locale)}</div>
      </div>
    </div>

    <h2>${escapeHtml(s.healthBreakdown ?? 'Portfolio health')}</h2>
    <div class="stat-row">
      <div class="stat-card">
        <div class="stat-card__label">${escapeHtml(s.onTrack ?? 'On track')}</div>
        <div class="stat-card__value">${formatNumber(onTrack, ctx.locale)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__label">${escapeHtml(s.underutilised ?? 'Under-utilised')}</div>
        <div class="stat-card__value">${formatNumber(underutilised, ctx.locale)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__label">${escapeHtml(s.overBudget ?? 'Over budget')}</div>
        <div class="stat-card__value">${formatNumber(overBudget, ctx.locale)}</div>
      </div>
    </div>
  `

  // Per-project table
  html += `<h2>${escapeHtml(s.projectBreakdown ?? 'Per-project breakdown')}</h2>`
  if (d.projects.length === 0) {
    html += `<div class="empty-state">${escapeHtml(s.noProjects ?? 'No projects in this period.')}</div>`
  } else {
    html += `<table>
      <thead><tr>
        <th>${escapeHtml(s.colProject ?? 'Project')}</th>
        <th>${escapeHtml(s.colStatus ?? 'Status')}</th>
        <th class="num">${escapeHtml(s.colBudget ?? 'Budget')}</th>
        <th class="num">${escapeHtml(s.colSpent ?? 'Spent')}</th>
        <th class="num">${escapeHtml(s.colRemaining ?? 'Remaining')}</th>
        <th class="num">${escapeHtml(s.colUtil ?? 'Util.')}</th>
      </tr></thead>
      <tbody>`
    // Sort by spent desc — operators care about the big-spend rows first.
    const sorted = [...d.projects].sort((a, b) => b.spentCents - a.spentCents)
    for (const p of sorted) {
      const u = utilizationPct(p.spentCents, p.budgetCents)
      const badge = u > 100 ? 'badge--bad' : u > 80 ? 'badge--warn' : 'badge--good'
      const rem = p.budgetCents - p.spentCents
      html += `<tr>
        <td>${escapeHtml(p.title)}</td>
        <td><span class="badge">${escapeHtml(p.status)}</span></td>
        <td class="num">${formatCurrency(p.budgetCents, ctx.currency, ctx.locale)}</td>
        <td class="num">${formatCurrency(p.spentCents, ctx.currency, ctx.locale)}</td>
        <td class="num">${formatCurrency(rem, ctx.currency, ctx.locale)}</td>
        <td class="num"><span class="badge ${badge}">${u}%</span></td>
      </tr>`
    }
    html += `</tbody></table>`
  }

  return html
}
