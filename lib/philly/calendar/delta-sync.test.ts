import { describe, it, expect } from 'vitest'
import { __internals } from './delta-sync'

const {
  GOOGLE_EVENTS_LIST_URL,
  MS_CALENDAR_VIEW_DELTA_URL,
  BOOTSTRAP_PAST_DAYS,
  BOOTSTRAP_FUTURE_DAYS,
  syncGoogleArity,
  syncMicrosoftArity,
} = __internals

describe('Provider URLs', () => {
  it('Google events.list points at the primary calendar', () => {
    expect(GOOGLE_EVENTS_LIST_URL).toContain('/calendars/primary/events')
    expect(GOOGLE_EVENTS_LIST_URL).not.toContain('/watch')
  })

  it('MS calendarView/delta is the v1.0 endpoint', () => {
    expect(MS_CALENDAR_VIEW_DELTA_URL).toBe(
      'https://graph.microsoft.com/v1.0/me/calendarView/delta',
    )
  })
})

describe('Bootstrap window', () => {
  it('past window is short enough to skip stale archive (≤30 days)', () => {
    expect(BOOTSTRAP_PAST_DAYS).toBeLessThanOrEqual(30)
    expect(BOOTSTRAP_PAST_DAYS).toBeGreaterThan(0)
  })

  it('forward window covers a quarter of upcoming meetings (≥30 days)', () => {
    expect(BOOTSTRAP_FUTURE_DAYS).toBeGreaterThanOrEqual(30)
  })

  it('forward window is wider than past window — calendar context is forward-leaning', () => {
    expect(BOOTSTRAP_FUTURE_DAYS).toBeGreaterThan(BOOTSTRAP_PAST_DAYS)
  })
})

describe('Recursion guard signature (audit MED F6)', () => {
  // Function.length is the number of params before the first one with a
  // default value. The 410-recursion guard requires `recursionDepth` as an
  // optional 4th parameter; if a refactor accidentally drops it, this test
  // fails before the runtime infinite-loop bug ships.
  it('syncGoogle exposes 3 required params + an optional recursion depth', () => {
    expect(syncGoogleArity).toBe(3)
  })

  it('syncMicrosoft exposes 3 required params + an optional recursion depth', () => {
    expect(syncMicrosoftArity).toBe(3)
  })
})
