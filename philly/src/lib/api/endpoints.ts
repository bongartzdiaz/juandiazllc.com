/* ---------------------------------------------------------------
   Endpoint Configuration — Philly Dashboard
   Central registry of every backend path. Paths are relative to
   the API client base URL (`/api`).
   --------------------------------------------------------------- */

export const ENDPOINTS = {
  auth: {
    me: '/me',
  },
  projects: {
    list: '/projects',
    detail: (id: string) => `/projects/${id}`,
    bulk: '/projects/bulk',
  },
  contacts: {
    list: '/contacts',
    detail: (id: string) => `/contacts/${id}`,
    notes: (id: string) => `/contacts/${id}/notes`,
    activity: (id: string) => `/contacts/${id}/activity`,
    bulk: '/contacts/bulk',
  },
  kanban: {
    boards: '/kanban/boards',
    cards: '/kanban/cards',
    card: (id: string) => `/kanban/cards/${id}`,
  },
  impact: {
    aggregate: '/impact',
  },
  audit: {
    list: '/audit',
  },
  pipelines: {
    list: '/pipelines',
  },
  deals: {
    list: '/deals',
  },
  calendar: {
    list: '/calendar',
    detail: (id: string) => `/calendar/${id}`,
  },
  notifications: {
    list: '/notifications',
    markRead: (id: string) => `/notifications/${id}/read`,
    markAllRead: '/notifications/mark-all-read',
  },
  views: {
    list: '/views',
  },
  reports: {
    list: '/reports',
  },
  automations: {
    list: '/automations',
  },
  templates: {
    list: '/templates',
  },
  webhooks: {
    list: '/webhooks',
    detail: (id: string) => `/webhooks/${id}`,
  },
  documents: {
    list: '/documents',
  },
  properties: {
    list: '/properties',
    taxonomy: '/properties/taxonomy',
  },
  rooms: {
    list: '/rooms',
  },
  reservations: {
    list: '/reservations',
  },
  grants: {
    list: '/grants',
  },
  volunteers: {
    list: '/volunteers',
  },
  offers: {
    list: '/offers',
  },
  showings: {
    list: '/showings',
    detail: (id: string) => `/showings/${id}`,
  },
  openHouses: {
    list: '/open-houses',
  },
  commissions: {
    list: '/commissions',
  },
  agentGoals: {
    list: '/agent-goals',
  },
  marketData: {
    list: '/market-data',
  },
  dripCampaigns: {
    list: '/drip-campaigns',
  },
  leaderboard: {
    list: '/leaderboard',
  },
  mlsFeeds: {
    list: '/mls-feeds',
  },
  listingAlerts: {
    list: '/listing-alerts',
  },
  inbox: {
    list: '/inbox',
    messages: (id: string) => `/inbox/${id}/messages`,
  },
  leadScores: {
    list: '/lead-scores',
  },
  scoringRules: {
    list: '/scoring-rules',
  },
  leadRouting: {
    list: '/lead-routing',
  },
  calls: {
    list: '/calls',
  },
  dialerLists: {
    list: '/dialer-lists',
  },
  actionPlans: {
    list: '/action-plans',
  },
  transactions: {
    list: '/transactions',
  },
  eSignatures: {
    list: '/e-signatures',
  },
  referrals: {
    list: '/referrals',
  },
  soi: {
    list: '/soi',
  },
  cma: {
    list: '/cma',
  },
  clientPortal: {
    list: '/client-portal',
  },
  email: {
    accounts: '/email/accounts',
    send: '/email/send',
  },
  sms: {
    list: '/sms',
  },
  integrations: {
    list: '/integrations',
  },
  pages: {
    list: '/pages',
    detail: (idOrSlug: string) => `/pages/${idOrSlug}`,
  },
  ai: {
    insights: '/ai/insights',
    score: '/ai/score',
    query: '/ai/query',
  },
  philanthropy: {
    donorScores: '/philanthropy/donor-scores',
  },
  hospitality: {
    quote: '/hospitality/quote',
  },
  apiKeys: {
    list: '/api-keys',
    detail: (id: string) => `/api-keys/${id}`,
  },
  integrationsAdvanced: {
    catalog: '/integrations/catalog',
    test: (id: string) => `/integrations/${id}/test`,
    oauth: (provider: string) => `/integrations/oauth/${provider}`,
  },
} as const

/* Derived helper types */
export type EndpointGroup = keyof typeof ENDPOINTS
