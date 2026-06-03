/* Format the dashboard's live recent-activity feed.

   /api/dashboard/summary returns audit rows as { action, entity, at } (ISO).
   The dashboard renders { text, time } items, so this maps the structured
   audit data into that display shape — replacing the old hand-written
   demo strings ("Milestone completed: 500 trees planted"). */

import { timeAgo } from './utils'

export interface ActivityRow {
  action: string
  entity: string
  at: string
}

export interface ActivityItem {
  text: string
  time: string
}

const ACTION_LABEL: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
}

/** camelCase / PascalCase entity name → spaced lowercase ("calendarEvent" →
 *  "calendar event"), so the feed reads naturally. */
function humanizeEntity(entity: string): string {
  return entity
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .trim()
}

export function formatActivityFeed(rows: ActivityRow[] | undefined | null): ActivityItem[] {
  return (rows ?? []).map((r) => {
    const verb = ACTION_LABEL[r.action] ?? r.action.charAt(0).toUpperCase() + r.action.slice(1)
    return {
      text: `${verb} ${humanizeEntity(r.entity)}`.trim(),
      time: timeAgo(r.at),
    }
  })
}
