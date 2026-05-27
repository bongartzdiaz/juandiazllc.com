import type { TemplateContext, StakeholderData } from './types'
import { escapeHtml } from '../render'

/** Stakeholder summary — executive-deck format. Big KPI cards on top,
 *  curated highlights, top-3 projects with one-line summaries. Designed
 *  to be the report you forward to a board chair without editing. */
export function renderStakeholder(ctx: TemplateContext): string {
  const d = ctx.data as StakeholderData
  const s = ctx.strings

  let html = ''

  // ── Executive KPIs (the deck-cover row) ──
  if (d.kpis.length > 0) {
    html += `<div class="stat-row">`
    for (const k of d.kpis) {
      const trendIcon = k.trend === 'up' ? '▲' : k.trend === 'down' ? '▼' : ''
      const trendClass = k.trend === 'up' ? 'badge--good' : k.trend === 'down' ? 'badge--bad' : ''
      html += `
        <div class="stat-card">
          <div class="stat-card__label">${escapeHtml(k.label)}</div>
          <div class="stat-card__value">${escapeHtml(k.value)}</div>
          ${k.trend ? `<div class="stat-card__hint"><span class="badge ${trendClass}">${trendIcon} ${escapeHtml(k.trend)}</span></div>` : ''}
        </div>`
    }
    html += `</div>`
  }

  // ── Highlights bullet list ──
  html += `<h2>${escapeHtml(s.highlights ?? 'Highlights this period')}</h2>`
  if (d.highlights.length === 0) {
    html += `<div class="empty-state">${escapeHtml(s.noHighlights ?? 'No curated highlights — set them in Settings → Reports.')}</div>`
  } else {
    html += `<ul style="line-height: 1.7; padding-left: 22px; margin: 8px 0 24px;">`
    for (const h of d.highlights) {
      html += `<li>${escapeHtml(h)}</li>`
    }
    html += `</ul>`
  }

  // ── Top projects ──
  if (d.topProjects.length > 0) {
    html += `<h2>${escapeHtml(s.topProjects ?? 'Top projects')}</h2>`
    html += `<table>
      <thead><tr>
        <th>${escapeHtml(s.colProject ?? 'Project')}</th>
        <th>${escapeHtml(s.colStatus ?? 'Status')}</th>
        <th>${escapeHtml(s.colImpact ?? 'Impact summary')}</th>
      </tr></thead>
      <tbody>`
    for (const p of d.topProjects) {
      html += `<tr>
        <td>${escapeHtml(p.title)}</td>
        <td><span class="badge">${escapeHtml(p.status)}</span></td>
        <td>${escapeHtml(p.impactSummary)}</td>
      </tr>`
    }
    html += `</tbody></table>`
  }

  return html
}
