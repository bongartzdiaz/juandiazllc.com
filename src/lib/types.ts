// ── Philly Dashboard CRM Types ──

// ── Enums & Literal Types ──

export type ProjectStatus = 'planned' | 'active' | 'completed' | 'paused'
export type ContactType = 'partner' | 'beneficiary' | 'stakeholder' | 'donor'
export type ImpactMetricType = 'co2_kg' | 'people_helped' | 'trees_planted' | 'money_donated' | 'water_liters' | 'energy_kwh' | 'custom'
export type KanbanCardPriority = 'low' | 'medium' | 'high' | 'urgent'

// UN Sustainable Development Goals (1-17)
export type SDGGoal = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17

// ── Projects ──

export interface Project {
  id: string
  title: string
  description: string
  status: ProjectStatus
  category: string
  startDate: string
  endDate: string | null
  budgetCents: number
  spentCents: number
  sdgGoals: SDGGoal[]
  organizationId: string
  createdAt: string
  updatedAt: string
}

export interface ProjectMilestone {
  id: string
  projectId: string
  title: string
  dueDate: string
  completedAt: string | null
  status: 'pending' | 'completed' | 'overdue'
}

// ── Contacts ──

export interface Contact {
  id: string
  name: string
  email: string
  phone: string
  type: ContactType
  company: string
  notes: string
  avatarUrl: string | null
  organizationId: string
  createdAt: string
}

// Join table linking contacts to projects with a role
export interface ContactProject {
  contactId: string
  projectId: string
  role: string
}

// ── Impact Metrics ──

export interface ImpactMetric {
  id: string
  projectId: string
  metricType: ImpactMetricType
  value: number
  unit: string
  date: string
  notes: string
}

// Aggregated impact totals across all projects
export interface ImpactSummary {
  totalCO2Kg: number
  totalPeopleHelped: number
  totalTreesPlanted: number
  totalMoneyDonated: number
  totalProjects: number
  activeProjects: number
  sdgCoverage: SDGGoal[]
}

// Daily breakdown for impact charts
export interface ImpactDailyStats {
  date: string
  label: string
  co2Kg: number
  peopleHelped: number
  moneyDonated: number
}

// ── Kanban Board ──

export interface KanbanBoard {
  id: string
  title: string
  organizationId: string
  columns: KanbanColumn[]
}

export interface KanbanColumn {
  id: string
  boardId: string
  title: string
  position: number
  color: string
  cards: KanbanCard[]
}

export interface KanbanCard {
  id: string
  columnId: string
  projectId: string | null
  title: string
  description: string
  position: number
  assigneeId: string | null
  assigneeName: string | null
  priority: KanbanCardPriority
  dueDate: string | null
}

// ── Dashboard Widgets ──

export type WidgetType = 'impact-kpi' | 'projects-list' | 'impact-chart' | 'recent-activity' | 'goals' | 'alerts' | 'sdg-grid' | 'kanban-mini'

export interface DashboardWidget {
  id: string
  type: WidgetType
  title: string
  position: { x: number; y: number; w: number; h: number }
  config?: Record<string, unknown>
}

export interface DashboardLayout {
  id: string
  userId: string
  widgets: DashboardWidget[]
  updatedAt: string
}

// ── Organization ──

export interface Organization {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  industry: string
  createdAt: string
}

// ── User ──

export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'manager' | 'viewer'
  organizationId: string
  locale: 'en' | 'nl'
  avatarUrl: string | null
}

// ── API Response Wrapper ──

export interface ApiResponse<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

// ── Page Builder ──

export type PageBlockType = 'text' | 'table' | 'chart' | 'embed' | 'kanban' | 'image'

export interface PageBlock {
  id: string
  pageId: string
  type: PageBlockType
  content: string // JSON string
  position: number
}

export interface CustomPage {
  id: string
  organizationId: string
  title: string
  slug: string
  createdBy: string
  blocks: PageBlock[]
  createdAt: string
  updatedAt: string
}
