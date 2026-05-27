import type { TemplateContext, SdgData } from './types'
import { formatNumber } from '../currency'
import { escapeHtml } from '../render'

/** SDG alignment — UN Sustainable Development Goals coverage by the
 *  org's portfolio. Critical for philanthropy + CSR tenants;
 *  ignored by real-estate tenants (they'll see "no SDG data" and that's
 *  the correct empty state). */
export function renderSdg(ctx: TemplateContext): string {
  const d = ctx.data as SdgData
  const s = ctx.strings

  let html = `
    <div class="stat-row">
      <div class="stat-card">
        <div class="stat-card__label">${escapeHtml(s.totalProjects ?? 'Total projects')}</div>
        <div class="stat-card__value">${formatNumber(d.totalProjects, ctx.locale)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__label">${escapeHtml(s.sdgsCovered ?? 'SDGs covered')}</div>
        <div class="stat-card__value">${formatNumber(d.sdgCoverage.filter(c => c.projectCount > 0).length, ctx.locale)} / 17</div>
        <div class="stat-card__hint">${escapeHtml(s.outOfSeventeen ?? 'of the 17 UN goals')}</div>
      </div>
    </div>

    <h2>${escapeHtml(s.coverageByGoal ?? 'Coverage by goal')}</h2>
  `

  if (d.sdgCoverage.length === 0 || d.sdgCoverage.every(c => c.projectCount === 0)) {
    html += `<div class="empty-state">${escapeHtml(s.noSdgData ?? 'No SDG data on file. Tag projects with SDGs to populate this report.')}</div>`
    return html
  }

  html += `<table>
    <thead><tr>
      <th>${escapeHtml(s.colGoal ?? 'Goal')}</th>
      <th>${escapeHtml(s.colLabel ?? 'Label')}</th>
      <th class="num">${escapeHtml(s.colProjects ?? 'Projects')}</th>
      <th class="num">${escapeHtml(s.colShare ?? 'Share')}</th>
    </tr></thead>
    <tbody>`
  // Sort by projectCount desc, then by SDG number
  const sorted = [...d.sdgCoverage].sort((a, b) => b.projectCount - a.projectCount || a.sdg - b.sdg)
  for (const c of sorted) {
    const share = d.totalProjects > 0 ? Math.round((c.projectCount / d.totalProjects) * 100) : 0
    html += `<tr>
      <td class="mono">SDG ${c.sdg}</td>
      <td>${escapeHtml(c.label)}</td>
      <td class="num">${formatNumber(c.projectCount, ctx.locale)}</td>
      <td class="num">${share}%</td>
    </tr>`
  }
  html += `</tbody></table>`

  return html
}
