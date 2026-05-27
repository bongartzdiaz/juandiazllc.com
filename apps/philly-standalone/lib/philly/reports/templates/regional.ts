import type { TemplateContext, RegionalData } from './types'
import { formatCurrency, formatNumber } from '../currency'
import { escapeHtml } from '../render'

/** Regional breakdown — geographic distribution of portfolio. Designed
 *  for tenants operating across multiple countries (EU rollout target).
 *  When the portfolio is single-country, the by-city table is still useful. */
export function renderRegional(ctx: TemplateContext): string {
  const d = ctx.data as RegionalData
  const s = ctx.strings

  const totalProjects = d.byCountry.reduce((sum, c) => sum + c.projects, 0)
  const totalContacts = d.byCountry.reduce((sum, c) => sum + c.contacts, 0)
  const totalValue = d.byCountry.reduce((sum, c) => sum + c.valueCents, 0)

  let html = `
    <div class="stat-row">
      <div class="stat-card">
        <div class="stat-card__label">${escapeHtml(s.countries ?? 'Countries')}</div>
        <div class="stat-card__value">${formatNumber(d.byCountry.length, ctx.locale)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__label">${escapeHtml(s.cities ?? 'Cities')}</div>
        <div class="stat-card__value">${formatNumber(d.byCity.length, ctx.locale)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__label">${escapeHtml(s.totalValue ?? 'Total value')}</div>
        <div class="stat-card__value">${formatCurrency(totalValue, ctx.currency, ctx.locale)}</div>
      </div>
    </div>

    <h2>${escapeHtml(s.byCountry ?? 'By country')}</h2>
  `

  if (d.byCountry.length === 0) {
    html += `<div class="empty-state">${escapeHtml(s.noRegionalData ?? 'No regional data on file. Tag projects with country/city to populate.')}</div>`
    return html
  }

  // ── By country ──
  html += `<table>
    <thead><tr>
      <th>${escapeHtml(s.colCountry ?? 'Country')}</th>
      <th class="num">${escapeHtml(s.colProjects ?? 'Projects')}</th>
      <th class="num">${escapeHtml(s.colContacts ?? 'Contacts')}</th>
      <th class="num">${escapeHtml(s.colValue ?? 'Value')}</th>
      <th class="num">${escapeHtml(s.colShare ?? 'Share')}</th>
    </tr></thead>
    <tbody>`
  const sortedCountries = [...d.byCountry].sort((a, b) => b.valueCents - a.valueCents)
  for (const c of sortedCountries) {
    const share = totalValue > 0 ? Math.round((c.valueCents / totalValue) * 100) : 0
    html += `<tr>
      <td>${escapeHtml(c.country)}</td>
      <td class="num">${formatNumber(c.projects, ctx.locale)}</td>
      <td class="num">${formatNumber(c.contacts, ctx.locale)}</td>
      <td class="num">${formatCurrency(c.valueCents, ctx.currency, ctx.locale)}</td>
      <td class="num">${share}%</td>
    </tr>`
  }
  html += `</tbody></table>`

  // ── By city ──
  if (d.byCity.length > 0) {
    html += `<h2>${escapeHtml(s.byCity ?? 'By city')}</h2>`
    html += `<table>
      <thead><tr>
        <th>${escapeHtml(s.colCity ?? 'City')}</th>
        <th>${escapeHtml(s.colCountry ?? 'Country')}</th>
        <th class="num">${escapeHtml(s.colProjects ?? 'Projects')}</th>
        <th class="num">${escapeHtml(s.colContacts ?? 'Contacts')}</th>
      </tr></thead>
      <tbody>`
    const sortedCities = [...d.byCity].sort((a, b) => b.projects - a.projects)
    for (const c of sortedCities.slice(0, 30)) {  // cap at top-30 to keep report readable
      html += `<tr>
        <td>${escapeHtml(c.city)}</td>
        <td>${escapeHtml(c.country)}</td>
        <td class="num">${formatNumber(c.projects, ctx.locale)}</td>
        <td class="num">${formatNumber(c.contacts, ctx.locale)}</td>
      </tr>`
    }
    html += `</tbody></table>`
    if (d.byCity.length > 30) {
      html += `<p style="font-size: 11.5px; color: var(--deus-muted); margin-top: -16px;">
        ${escapeHtml((s.cityRowsCappedAt ?? '+ {n} more cities').replace('{n}', String(d.byCity.length - 30)))}
      </p>`
    }
  }

  return html
}
