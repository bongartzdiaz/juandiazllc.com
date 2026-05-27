/* Shared template input + output types. */

export interface TemplateContext {
  organizationId: string
  /** ISO 4217 from Organization.currency. */
  currency: string
  /** BCP 47 locale tag — drives currency + date formatting. */
  locale: string
  /** Per-report-type strings: title, subtitle template, table headers,
   *  empty-state copy, etc. The route layer pulls these from next-intl
   *  and hands them in so the template stays I/O-pure. */
  strings: Record<string, string>
  /** Pre-fetched data set, shaped per template. Templates declare their
   *  own data type by extending TemplateContext.data. */
  data: unknown
}

/** Every template exports a render(ctx) returning inner HTML
 *  (not the shell — render.ts wraps it). */
export type TemplateRenderer = (ctx: TemplateContext) => string

/** Per-template data interfaces (extended for typing inside each
 *  template file). */
export interface QuarterlyData {
  projects: Array<{
    id: string
    title: string
    status: string
    budgetCents: number
    spentCents: number
  }>
  metricTotals: Array<{ metricType: string; total: number }>
}

export interface FinancialData {
  projects: Array<{
    id: string
    title: string
    budgetCents: number
    spentCents: number
    status: string
  }>
}

export interface SdgData {
  sdgCoverage: Array<{ sdg: number; label: string; projectCount: number }>
  totalProjects: number
}

export interface StakeholderData {
  highlights: string[]
  kpis: Array<{ label: string; value: string; trend?: 'up' | 'down' | 'flat' }>
  topProjects: Array<{ title: string; status: string; impactSummary: string }>
}

export interface PerformanceData {
  monthlyClosed: Array<{ month: string; deals: number; valueCents: number }>
  pipelineByStage: Array<{ stage: string; count: number; valueCents: number }>
}

export interface RegionalData {
  byCountry: Array<{ country: string; projects: number; contacts: number; valueCents: number }>
  byCity: Array<{ city: string; country: string; projects: number; contacts: number }>
}
