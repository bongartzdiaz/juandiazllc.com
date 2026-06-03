import { describe, it, expect } from 'vitest'
import { formatActivityFeed } from './dashboard-activity'

describe('formatActivityFeed', () => {
  it('returns [] for null/undefined', () => {
    expect(formatActivityFeed(null)).toEqual([])
    expect(formatActivityFeed(undefined)).toEqual([])
  })

  it('maps action verbs and humanizes entity names', () => {
    const out = formatActivityFeed([
      { action: 'create', entity: 'contact', at: new Date().toISOString() },
      { action: 'update', entity: 'calendarEvent', at: new Date().toISOString() },
      { action: 'delete', entity: 'deal', at: new Date().toISOString() },
    ])
    expect(out.map((o) => o.text)).toEqual([
      'Created contact',
      'Updated calendar event',
      'Deleted deal',
    ])
    expect(out.every((o) => typeof o.time === 'string' && o.time.length > 0)).toBe(true)
  })

  it('falls back to a capitalized action for unknown verbs', () => {
    const [item] = formatActivityFeed([
      { action: 'archive', entity: 'project', at: new Date().toISOString() },
    ])
    expect(item.text).toBe('Archive project')
  })
})
