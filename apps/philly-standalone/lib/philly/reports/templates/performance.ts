import type { TemplateContext, PerformanceData } from './types'
import { formatCurrency, formatNumber } from '../currency'
import { escapeHtml } from '../render'

/** Performance trends — YoY revenue / deal closure analysis. Designed
 *  for sales reviews. Uses sparkline-style ASCII bars in tables because
 *  HTML reports need to be print-friendly + don't get to use canvas. */
export function renderPerformance(ctx: TemplateContext): string {
  const d = ctx.data as PerformanceData
  const s = ctx.strings

  // Aggregate totals across the period
  const totalDeals = d.monthlyClosed.reduce((sum, m) => sum + m.deals, 0)
  const totalValue = d.monthlyClosed.reduce((sum, m) => sum + m.valueCents, 0)
  const avgDeal = totalDeals > 0 ? Math.round(totalValue / totalDeals) : 0

  // Find the peak month for proportional bar widths.
  const maxValue = d.monthlyClosed.reduce((m, x) => Math.max(m, x.valueCents), 0)

  let html = `
    <div class="stat-row">
      <div class="stat-card">
        <div class="stat-card__label">${escapeHtml(s.dealsClosed ?? 'Deals closed')}</div>
        <div class="stat-card__value">${formatNumber(totalDeals, ctx.locale)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__label">${escapeHtml(s.totalValue ?? 'Total value')}</div>
        <div class="stat-card__value">${formatCurrency(totalValue, ctx.currency, ctx.locale)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__label">${escapeHtml(s.avgDeal ?? 'Avg deal size')}</div>
        <div class="stat-card__value">${formatCurrency(avgDeal, ctx.currency, ctx.locale)}</div>
      </div>
    </div>
  `

  // Monthly closed-deals table with proportional bars
  html += `<h2>${escapeHtml(s.monthlyTrend ?? 'Monthly trend')}</h2>`
  if (d.monthlyClosed.length === 0) {
    html += `<div class="empty-state">${escapeHtml(s.noClosedDeals ?? 'No closed deals in this period.')}</div>`
  } else {
    html += `<table>
      <thead><tr>
        <th>${escapeHtml(s.colMonth ?? 'Month')}</th>
        <th class="num">${escapeHtml(s.colDeals ?? 'Deals')}</th>
        <th class="num">${escapeHtml(s.colValue ?? 'Value')}</th>
        <th style="width: 30%">${escapeHtml(s.colTrend ?? 'Trend')}</th>
      </tr></thead>
      <tbody>`
    for (const m of d.monthlyClosed) {
      const pct = maxValue > 0 ? Math.round((m.valueCents / maxValue) * 100) : 0
      const bar = `<div style="background: var(--deus-soft); border-radius: 4px; overflow: hidden;">
        <div style="width: ${pct}%; height: 12px; background: var(--deus-accent);"></div>
      </div>`
      html += `<tr>
        <td class="mono">${escapeHtml(m.month)}</td>
        <td class="num">${formatNumber(m.deals, ctx.locale)}</td>
        <td class="num">${formatCurrency(m.valueCents, ctx.currency, ctx.locale)}</td>
        <td>${bar}</td>
      </tr>`
    }
    html += `</tbody></table>`
  }

  // Pipeline-by-stage breakdown
  if (d.pipelineByStage.length > 0) {
    html += `<h2>${escapeHtml(s.pipelineByStage ?? 'Pipeline by stage')}</h2>`
    html += `<table>
      <thead><tr>
        <th>${escapeHtml(s.colStage ?? 'Stage')}</th>
        <th class="num">${escapeHtml(s.colCount ?? 'Count')}</th>
        <th class="num">${escapeHtml(s.colValue ?? 'Value')}</th>
      </tr></thead>
      <tbody>`
    for (const stage of d.pipelineByStage) {
      html += `<tr>
        <td>${escapeHtml(stage.stage)}</td>
        <td class="num">${formatNumber(stage.count, ctx.locale)}</td>
        <td class="num">${formatCurrency(stage.valueCents, ctx.currency, ctx.locale)}</td>
      </tr>`
    }
    html += `</tbody></table>`
  }

  return html
}
