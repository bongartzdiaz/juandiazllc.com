// ── Shared types for all API integrations ──

export type Market = 'NL' | 'BE'
export type CampaignStatus = 'goed' | 'ok' | 'testfase' | 'slecht'
export type ChatStatus = 'gekwalificeerd' | 'wachtend' | 'handoff' | 'afgerond' | 'afgevallen'

// ── Meta Ads ──

export interface MetaCampaign {
  id: string
  name: string
  funnel: string
  status: CampaignStatus
  market: Market
  spend: number
  budget: number
  impressions: number
  clicks: number
  ctr: number        // percentage as decimal (e.g. 2.4)
  cpl: number | null // null = te weinig data
  leads: number
}

export interface MetaDailyStats {
  date: string       // 'YYYY-MM-DD'
  label: string      // display label e.g. '1/3'
  spend: number
  leads: number
  impressions: number
  clicks: number
}

export interface MetaAdsData {
  campaigns: MetaCampaign[]
  daily: MetaDailyStats[]
  totals: {
    spend: number
    leads: number
    impressions: number
    clicks: number
    avgCpl: number
    avgCtr: number
  }
}

// ── Google Ads ──

export type GoogleCampaignType = 'Search' | 'Display' | 'PMax' | 'Video'

export interface GoogleCampaign {
  id: string
  name: string
  type: GoogleCampaignType
  status: CampaignStatus
  market: Market
  spend: number
  impressions: number
  clicks: number
  ctr: number
  cpc: number
  conversions: number
  cpa: number | null
}

export interface GoogleKeyword {
  keyword: string
  clicks: number
  cpc: number
  conversions: number
  cpa: number | null
}

export interface GoogleDailyStats {
  date: string
  label: string
  spend: number
  conversions: number
}

export interface GoogleAdsData {
  campaigns: GoogleCampaign[]
  keywords: GoogleKeyword[]
  daily: GoogleDailyStats[]
  totals: {
    spend: number
    conversions: number
    clicks: number
    impressions: number
    avgCpa: number
    avgCtr: number
  }
}

// ── DM Champ (Chatbot) ──

export interface ChatConversation {
  id: string
  naam: string
  status: ChatStatus
  berichten: number
  duur: string
  onderwerp: string
  tijdstip: string
  datum: string // ISO date string for period filtering
}

export interface ChatDailyStats {
  date: string
  label: string
  gesprekken: number
  gekwalificeerd: number
}

export interface ChatResponseTime {
  date: string
  label: string
  sec: number
}

export interface ChatbotData {
  conversations: ChatConversation[]
  daily: ChatDailyStats[]
  responseTime: ChatResponseTime[]
  totals: {
    gesprekken: number
    gekwalificeerd: number
    conversieRate: number
    gemReactietijd: number
    wachtendOpHandoff: number
  }
}

// ── GoHighLevel (Sales / CRM) ──

export type PipelineStage = 'website_lead' | 'chatbot' | 'telefoon' | 'buitendienst' | 'sale'

export interface GhlContact {
  id: string
  naam: string
  email: string
  telefoon: string
  bron: string        // e.g. 'Meta F1', 'Google Search'
  stage: PipelineStage
  waarde: number      // deal value
  aangemaakt: string  // ISO date
  laatsteActiviteit: string
}

export interface GhlPipelineStep {
  stage: PipelineStage
  label: string
  value: number
  description: string
}

export interface GhlDailyStats {
  date: string
  label: string
  leads: number
  afspraken: number
  deals: number
}

export interface SalesData {
  pipeline: GhlPipelineStep[]
  contacts: GhlContact[]
  daily: GhlDailyStats[]
  totals: {
    leads: number
    afspraken: number
    deals: number
    omzet: number
    conversieRate: number // lead → sale
  }
}

// ── Dashboard (combined) ──

export interface DashboardKpis {
  leadsVandaag: number
  leadsDelta: number     // percentage vs gisteren
  cplMeta: number
  cplDelta: number
  chatbotConversie: number
  chatbotDelta: number
  afsprakenWeek: number
  afsprakenDoel: number
  salesMaand: number
  salesDoel: number
}

export interface GoalTargets {
  leads: number
  afspraken: number
  deals: number
  omzet: number
}

// ── API response wrapper ──

export interface ApiResponse<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}
