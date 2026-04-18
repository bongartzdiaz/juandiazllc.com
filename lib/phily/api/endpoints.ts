/* ---------------------------------------------------------------
   Endpoint Configuration — Philly Dashboard
   Central registry of every backend path, grouped by integration.
   --------------------------------------------------------------- */

export const ENDPOINTS = {
  crm: {
    contacts: '/crm/contacts',
    pipelines: '/crm/pipelines',
    deals: '/crm/deals',
    activities: '/crm/activities',
  },
  ads: {
    campaigns: '/ads/campaigns',
    daily: '/ads/daily',
    spend: '/ads/spend',
  },
  analytics: {
    kpis: '/analytics/kpis',
    funnel: '/analytics/funnel',
    forecast: '/analytics/forecast',
    sources: '/analytics/sources',
  },
  bookings: {
    rooms: '/bookings/rooms',
    reservations: '/bookings/reservations',
    availability: '/bookings/availability',
  },
  projects: {
    list: '/projects',
    impact: '/projects/impact',
    milestones: '/projects/milestones',
  },
} as const

/* Derived helper types */
export type EndpointGroup = keyof typeof ENDPOINTS
export type EndpointPath<G extends EndpointGroup> =
  (typeof ENDPOINTS)[G][keyof (typeof ENDPOINTS)[G]]
