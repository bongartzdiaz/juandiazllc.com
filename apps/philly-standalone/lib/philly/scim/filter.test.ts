import { describe, it, expect } from 'vitest'
import { parseScimFilter } from './filter'

describe('parseScimFilter', () => {
  it('returns an empty filter for null/empty input', () => {
    expect(parseScimFilter(null)).toEqual({})
    expect(parseScimFilter('')).toEqual({})
    expect(parseScimFilter('   ')).toEqual({})
  })

  it('parses userName eq', () => {
    expect(parseScimFilter('userName eq "alice@example.com"')).toEqual({
      userName: 'alice@example.com',
    })
  })

  it('parses active eq true / false', () => {
    expect(parseScimFilter('active eq true')).toEqual({ active: true })
    expect(parseScimFilter('active eq false')).toEqual({ active: false })
  })

  it('parses the AND combination', () => {
    expect(parseScimFilter('userName eq "alice@x.com" and active eq true')).toEqual({
      userName: 'alice@x.com',
      active: true,
    })
    // Order shouldn't matter
    expect(parseScimFilter('active eq false and userName eq "x@y.com"')).toEqual({
      userName: 'x@y.com',
      active: false,
    })
  })

  it('case-insensitive on operator + attribute', () => {
    expect(parseScimFilter('USERNAME EQ "x@y.com"')).toEqual({ userName: 'x@y.com' })
    expect(parseScimFilter('userName Eq "x@y.com" AND Active eq TRUE')).toEqual({
      userName: 'x@y.com',
      active: true,
    })
  })

  it('rejects unsupported attributes', () => {
    expect(parseScimFilter('emails eq "x@y.com"')).toBeNull()
  })

  it('parses externalId eq (Bundle BQ)', () => {
    expect(parseScimFilter('externalId eq "okta-00u4abc123"')).toEqual({
      externalId: 'okta-00u4abc123',
    })
    // Combined with active.
    expect(parseScimFilter('externalId eq "okta-x" and active eq false')).toEqual({
      externalId: 'okta-x',
      active: false,
    })
  })

  it('rejects unsupported operators', () => {
    expect(parseScimFilter('userName co "alice"')).toBeNull()
    expect(parseScimFilter('userName sw "alice"')).toBeNull()
  })

  it('rejects bare values without quotes for string attrs', () => {
    expect(parseScimFilter('userName eq alice')).toBeNull()
  })

  it('rejects duplicate clauses', () => {
    expect(parseScimFilter('userName eq "a@x.com" and userName eq "b@x.com"')).toBeNull()
    expect(parseScimFilter('active eq true and active eq false')).toBeNull()
  })

  it('rejects OR combinations', () => {
    expect(parseScimFilter('userName eq "a@x.com" or active eq true')).toBeNull()
  })

  // Bundle CP — the `\s+` alternations in the parser are catastrophic-
  // backtracking shapes; the length cap defangs them before any match
  // runs. Both shape-test (returns null on overlong) and stress-test
  // (parses in linear time on a max-length valid filter).
  it('rejects input above MAX_FILTER_LENGTH (1024) without backtracking', () => {
    const huge = 'a'.repeat(2000)
    const start = performance.now()
    const r = parseScimFilter(huge)
    const elapsedMs = performance.now() - start
    expect(r).toBeNull()
    // Generous bound — under a healthy length cap this should be sub-ms.
    expect(elapsedMs).toBeLessThan(50)
  })

  it('parses a valid filter near the length cap quickly', () => {
    // 1023 chars total — userName + many spaces but well-formed.
    const padding = ' '.repeat(900)
    const filter = `userName eq "alice@example.com"${padding} and active eq true`
    expect(filter.length).toBeLessThanOrEqual(1024)
    const start = performance.now()
    const r = parseScimFilter(filter)
    const elapsedMs = performance.now() - start
    expect(r).toEqual({ userName: 'alice@example.com', active: true })
    expect(elapsedMs).toBeLessThan(50)
  })
})
