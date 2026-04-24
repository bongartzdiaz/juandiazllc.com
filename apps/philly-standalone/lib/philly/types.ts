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

// ── Audit Logs ──

export interface AuditLog {
  id: string
  organizationId: string
  userId: string
  action: 'create' | 'update' | 'delete'
  entity: string
  entityId: string | null
  changes: string // JSON string of { field: { old, new } }
  createdAt: string
  user?: { id: string; name: string; email: string }
}

// ── Paginated Response ──

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// ── API Response Wrapper ──

export interface ApiResponse<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

// ── Deals & Pipelines ──

export interface Pipeline {
  id: string
  organizationId: string
  name: string
  industry: string
  stages: PipelineStage[]
  _count?: { deals: number }
}

export interface PipelineStage {
  id: string
  pipelineId: string
  name: string
  position: number
  color: string
}

export interface Deal {
  id: string
  pipelineId: string
  stageId: string
  contactId: string | null
  projectId: string | null
  ownerId: string | null
  title: string
  valueCents: number
  currency: string
  probability: number
  status: 'open' | 'won' | 'lost'
  expectedClose: string | null
  notes: string
  createdAt: string
  updatedAt: string
  stage?: PipelineStage
  contact?: { id: string; name: string } | null
  owner?: { id: string; name: string } | null
}

// ── Calendar Events ──

export interface CalendarEvent {
  id: string
  organizationId: string
  title: string
  description: string
  startTime: string
  endTime: string
  allDay: boolean
  location: string
  color: string
  attendees?: EventAttendee[]
}

export interface EventAttendee {
  id: string
  eventId: string
  userId: string | null
  email: string
  status: 'pending' | 'accepted' | 'declined'
  user?: { id: string; name: string } | null
}

// ── Notifications ──

export interface Notification {
  id: string
  organizationId: string
  userId: string
  type: 'info' | 'warning' | 'success' | 'error'
  title: string
  message: string
  link: string | null
  read: boolean
  createdAt: string
}

// ── Saved Views ──

export interface SavedView {
  id: string
  organizationId: string
  userId: string | null
  entity: string
  name: string
  filtersJson: string
  columnsJson: string
  sortJson: string
  isDefault: boolean
  isShared: boolean
}

// ── Automation ──

export interface AutomationRule {
  id: string
  organizationId: string
  name: string
  trigger: string
  triggerConfig: string
  actionType: string
  actionConfig: string
  enabled: boolean
  _count?: { automationLogs: number }
}

// ── Templates ──

export interface Template {
  id: string
  organizationId: string
  name: string
  type: string
  subject: string
  body: string
  variables: string
}

// ── Webhooks ──

export interface WebhookConfig {
  id: string
  organizationId: string
  url: string
  events: string
  secret: string
  enabled: boolean
  _count?: { deliveries: number }
}

// ── Documents ──

export interface Document {
  id: string
  organizationId: string
  name: string
  type: string
  mimeType: string
  sizeBytes: number
  url: string
  entityType: string | null
  entityId: string | null
  createdAt: string
}

// ── Real Estate ──

export interface Property {
  id: string
  organizationId: string
  title: string
  type: string
  status: string
  address: string
  city: string
  state: string
  zipCode: string
  country: string
  lat: number | null
  lng: number | null
  priceCents: number
  bedrooms: number | null
  bathrooms: number | null
  sqft: number | null
  yearBuilt: number | null
  description: string
  features: string
  images: string
  _count?: { viewings: number }
}

// ── Hospitality ──

export interface Room {
  id: string
  organizationId: string
  name: string
  type: string
  status: string
  floor: number
  capacity: number
  priceCentsNight: number
  _count?: { reservations: number; housekeeping: number }
}

export interface Reservation {
  id: string
  roomId: string
  guestName: string
  guestEmail: string
  guestPhone: string
  checkIn: string
  checkOut: string
  status: string
  totalCents: number
  room?: { id: string; name: string; type: string }
}

// ── Philanthropy ──

export interface Grant {
  id: string
  organizationId: string
  title: string
  funder: string
  amountCents: number
  status: string
  appliedDate: string | null
  awardedDate: string | null
  startDate: string | null
  endDate: string | null
}

export interface Volunteer {
  id: string
  organizationId: string
  name: string
  email: string
  phone: string
  status: string
  totalHours: number
  _count?: { volunteerLogs: number }
}

export interface DonorProfile {
  id: string
  organizationId: string
  contactId: string | null
  totalGivenCents: number
  lastGiftDate: string | null
  giftCount: number
  avgGiftCents: number
  tier: string
}

// ── Showings ──

export interface Showing {
  id: string
  propertyId: string
  agentId: string
  contactId: string | null
  scheduledAt: string
  duration: number
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  feedback: string
  rating: number | null
  createdAt: string
  property?: { id: string; title: string; address: string }
  agent?: { id: string; name: string }
  contact?: { id: string; name: string } | null
}

// ── Offers ──

export interface Offer {
  id: string
  propertyId: string
  contactId: string
  dealId: string | null
  offerAmountCents: number
  status: 'pending' | 'accepted' | 'rejected' | 'countered' | 'withdrawn' | 'expired'
  offerDate: string
  expiresAt: string | null
  contingencies: string
  notes: string
  createdAt: string
  property?: { id: string; title: string; address: string }
  contact?: { id: string; name: string }
}

// ── Open Houses ──

export interface OpenHouse {
  id: string
  propertyId: string
  hostId: string
  date: string
  startTime: string
  endTime: string
  notes: string
  visitCount: number
  createdAt: string
  property?: { id: string; title: string; address: string }
  host?: { id: string; name: string }
  _count?: { visits: number }
}

export interface OpenHouseVisit {
  id: string
  openHouseId: string
  contactId: string | null
  visitorName: string
  visitorEmail: string
  visitorPhone: string
  notes: string
  createdAt: string
}

// ── Commission Records ──

export interface CommissionRecord {
  id: string
  organizationId: string
  agentId: string
  dealId: string | null
  type: string
  grossCents: number
  splitPct: number
  netCents: number
  status: 'pending' | 'paid' | 'voided'
  notes: string
  createdAt: string
}

// ── Agent Goals ──

export interface AgentGoal {
  id: string
  organizationId: string
  agentId: string
  year: number
  month: number
  dealTarget: number
  volumeTarget: number
  gciTarget: number
  callsTarget: number
  showingsTarget: number
}

// ── Market Snapshots ──

export interface MarketSnapshot {
  id: string
  organizationId: string
  zipCode: string
  year: number
  month: number
  medianPriceCents: number
  avgDaysOnMarket: number
  activeListings: number
  closedSales: number
  newListings: number
  avgPricePerSqft: number
  inventoryMonths: number
}

// ── Drip Campaigns ──

export interface DripCampaign {
  id: string
  organizationId: string
  name: string
  type: string
  status: string
  stepsJson: string
  createdAt: string
  updatedAt: string
}

// ── Leaderboard ──

export interface LeaderboardEntry {
  id: string
  name: string
  role: string
  avatarUrl: string | null
  totalDeals: number
  wonDeals: number
  monthDeals: number
  totalVolumeCents: number
  ytdCommissionCents: number
  conversionRate: number
  goal: AgentGoal | null
}

// ── Reports ──

export interface Report {
  id: string
  userId: string
  title: string
  type: string
  status: 'generating' | 'ready' | 'failed'
  configJson: string
  resultHtml: string | null
  createdAt: string
}

// ── Contact Notes & Activity ──

export interface ContactNote {
  id: string
  contactId: string
  userId: string
  content: string
  createdAt: string
  updatedAt: string
  user?: { id: string; name: string; avatarUrl: string | null }
}

export interface Activity {
  id: string
  contactId: string | null
  userId: string | null
  type: string
  title: string
  description: string
  metadata: string
  createdAt: string
  user?: { id: string; name: string }
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

// ── MLS/IDX ──

export interface MlsFeed {
  id: string
  organizationId: string
  name: string
  provider: string
  apiUrl: string
  lastSyncAt: string | null
  syncInterval: number
  status: string
  totalImported: number
  errorLog: string
  createdAt: string
  updatedAt: string
}

export interface ListingAlert {
  id: string
  organizationId: string
  contactId: string
  name: string
  criteria: string
  frequency: string
  channel: string
  enabled: boolean
  lastSentAt: string | null
  matchCount: number
  createdAt: string
  updatedAt: string
}

// ── Inbox / Conversations ──

export interface Conversation {
  id: string
  organizationId: string
  contactId: string
  channel: string
  subject: string
  status: string
  assignedTo: string | null
  lastMessageAt: string | null
  unreadCount: number
  createdAt: string
  messages?: ChatMessage[]
}

export interface ChatMessage {
  id: string
  conversationId: string
  direction: string
  channel: string
  fromAddress: string
  toAddress: string
  subject: string
  body: string
  bodyHtml: string
  status: string
  readAt: string | null
  createdAt: string
}

// ── Lead Scoring ──

export interface LeadScore {
  id: string
  organizationId: string
  contactId: string
  score: number
  grade: string
  behaviorScore: number
  demographicScore: number
  lastActivity: string | null
  scoreHistory: string
  createdAt: string
  updatedAt: string
}

export interface ScoringRule {
  id: string
  organizationId: string
  name: string
  event: string
  points: number
  decay: boolean
  decayDays: number
  enabled: boolean
  createdAt: string
}

// ── Lead Routing ──

export interface LeadRoutingRule {
  id: string
  organizationId: string
  name: string
  strategy: string
  criteria: string
  agentPool: string
  currentIndex: number
  enabled: boolean
  assignedCount: number
  createdAt: string
  updatedAt: string
}

// ── Call Tracking ──

export interface CallLog {
  id: string
  organizationId: string
  agentId: string
  contactId: string | null
  direction: string
  phoneNumber: string
  status: string
  duration: number
  outcome: string
  notes: string
  recordingUrl: string
  disposition: string
  callbackAt: string | null
  startedAt: string
  endedAt: string | null
  createdAt: string
}

export interface DialerList {
  id: string
  organizationId: string
  name: string
  contactIds: string
  totalContacts: number
  dialedCount: number
  connectedCount: number
  status: string
  assignedTo: string | null
  createdAt: string
  updatedAt: string
}

// ── Action Plans ──

export interface ActionPlan {
  id: string
  organizationId: string
  name: string
  description: string
  triggerEvent: string
  stepsJson: string
  status: string
  enrolledCount: number
  completedCount: number
  createdAt: string
  updatedAt: string
  _count?: { enrollments: number }
}

export interface ActionPlanEnrollment {
  id: string
  planId: string
  contactId: string
  currentStep: number
  status: string
  startedAt: string
  completedAt: string | null
  nextActionAt: string | null
}

// ── Transactions & E-Signatures ──

export interface Transaction {
  id: string
  organizationId: string
  dealId: string | null
  propertyId: string | null
  type: string
  status: string
  closingDate: string | null
  contractDate: string | null
  escrowNumber: string
  titleCompany: string
  buyerAgentId: string | null
  sellerAgentId: string | null
  buyerContactId: string | null
  sellerContactId: string | null
  salePrice: number
  earnestMoney: number
  notes: string
  checklistJson: string
  createdAt: string
  updatedAt: string
  _count?: { signatures: number }
}

export interface ESignatureRequest {
  id: string
  transactionId: string
  documentName: string
  signerName: string
  signerEmail: string
  status: string
  sentAt: string | null
  viewedAt: string | null
  signedAt: string | null
  externalId: string
  provider: string
  createdAt: string
}

// ── SOI / Referrals ──

export interface Referral {
  id: string
  organizationId: string
  referrerId: string
  referredId: string
  dealId: string | null
  status: string
  commissionPct: number
  commissionCents: number
  notes: string
  referredAt: string
  convertedAt: string | null
  createdAt: string
}

export interface SoiCategory {
  id: string
  organizationId: string
  name: string
  touchFrequency: number
  color: string
  contactCount: number
  createdAt: string
}

// ── CMA Reports ──

export interface CmaReport {
  id: string
  organizationId: string
  agentId: string
  contactId: string | null
  propertyId: string | null
  subjectAddress: string
  subjectCity: string
  subjectZip: string
  subjectBeds: number | null
  subjectBaths: number | null
  subjectSqft: number | null
  estimatedValue: number
  comparablesJson: string
  adjustmentsJson: string
  reportHtml: string
  status: string
  sentAt: string | null
  createdAt: string
  updatedAt: string
}

// ── Client Portal ──

export interface ClientPortalAccess {
  id: string
  organizationId: string
  contactId: string
  token: string
  permissions: string
  enabled: boolean
  lastLoginAt: string | null
  expiresAt: string | null
  createdAt: string
}
