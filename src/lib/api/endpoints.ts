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
  },
  documents: {
    list: '/documents',
  },
  properties: {
    list: '/properties',
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
} as const

/* Derived helper types */
export type EndpointGroup = keyof typeof ENDPOINTS
