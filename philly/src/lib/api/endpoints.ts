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
  },
  contacts: {
    list: '/contacts',
    detail: (id: string) => `/contacts/${id}`,
  },
  kanban: {
    boards: '/kanban/boards',
    cards: '/kanban/cards',
    card: (id: string) => `/kanban/cards/${id}`,
  },
  impact: {
    aggregate: '/impact',
  },
} as const

/* Derived helper types */
export type EndpointGroup = keyof typeof ENDPOINTS
