import { describe, it, expect } from 'vitest'
import { parseCsv, neutralizeFormula, suggestMapping } from './csv-parse'

describe('neutralizeFormula', () => {
  it('prefixes formula sentinels with a single quote', () => {
    expect(neutralizeFormula('=SUM(A1:A9)')).toBe(`'=SUM(A1:A9)`)
    expect(neutralizeFormula('+1234')).toBe(`'+1234`)
    expect(neutralizeFormula('-cmd|calc.exe')).toBe(`'-cmd|calc.exe`)
    expect(neutralizeFormula('@import')).toBe(`'@import`)
  })

  it('passes safe values through unchanged', () => {
    expect(neutralizeFormula('hello')).toBe('hello')
    expect(neutralizeFormula('foo@bar.com')).toBe('foo@bar.com') // @ inside, not at start
    expect(neutralizeFormula('')).toBe('')
  })
})

describe('parseCsv', () => {
  it('parses a simple CSV', () => {
    const text = 'name,email\nAlice,alice@example.com\nBob,bob@example.com\n'
    const r = parseCsv(text)
    expect(r.columns).toEqual(['name', 'email'])
    expect(r.rows).toHaveLength(2)
    expect(r.rows[0]).toEqual({ name: 'Alice', email: 'alice@example.com' })
  })

  it('handles quoted fields with commas', () => {
    const text = 'name,company\nAlice,"Acme, Inc."\n'
    const r = parseCsv(text)
    expect(r.rows[0]?.company).toBe('Acme, Inc.')
  })

  it('handles escaped quotes inside quoted fields', () => {
    const text = 'name,quote\nAlice,"She said ""hi"""\n'
    const r = parseCsv(text)
    expect(r.rows[0]?.quote).toBe('She said "hi"')
  })

  it('strips Windows carriage returns', () => {
    const text = 'name\r\nAlice\r\n'
    const r = parseCsv(text)
    expect(r.rows[0]?.name).toBe('Alice')
  })

  it('skips blank lines without complaint', () => {
    const text = 'name\nAlice\n\nBob\n'
    const r = parseCsv(text)
    expect(r.rows.map(x => x.name)).toEqual(['Alice', 'Bob'])
  })

  it('reports rows with mismatched column counts as errors, not crashes', () => {
    const text = 'name,email\nAlice,alice@example.com,extra\nBob,bob@example.com\n'
    const r = parseCsv(text)
    expect(r.errors).toHaveLength(1)
    expect(r.errors[0]?.line).toBe(2)
    expect(r.rows.map(x => x.name)).toEqual(['Bob'])
  })

  it('reports unterminated quotes', () => {
    const text = 'name,note\nAlice,"unclosed\n'
    const r = parseCsv(text)
    expect(r.errors.some(e => e.reason.includes('Unterminated'))).toBe(true)
  })

  it('neutralizes formula injection on import — defense against CSV-injection in re-export', () => {
    const text = 'name,email\n=SUM(A1:A9),alice@example.com\n'
    const r = parseCsv(text)
    expect(r.rows[0]?.name).toBe(`'=SUM(A1:A9)`)
  })

  it('returns empty result on empty input', () => {
    expect(parseCsv('').rows).toHaveLength(0)
  })
})

describe('suggestMapping', () => {
  it('matches common header variants to DEUS fields', () => {
    const m = suggestMapping(['Full Name', 'Email Address', 'Phone', 'Company', 'Notes'])
    expect(m['Full Name']).toBe('name')
    expect(m['Email Address']).toBe('email')
    expect(m['Phone']).toBe('phone')
    expect(m['Company']).toBe('company')
    expect(m['Notes']).toBe('notes')
  })

  it('falls back to skip for unknown headers — explicit-opt-in by user', () => {
    const m = suggestMapping(['favourite-cheese', 'department-id'])
    expect(m['favourite-cheese']).toBe('skip')
    expect(m['department-id']).toBe('skip')
  })

  it('handles snake_case + dashed variants', () => {
    const m = suggestMapping(['full_name', 'lead-source', 'lead_status'])
    expect(m['full_name']).toBe('name')
    expect(m['lead-source']).toBe('leadSource')
    expect(m['lead_status']).toBe('leadStatus')
  })

  it('is case-insensitive', () => {
    const m = suggestMapping(['NAME', 'EMAIL', 'PHONE'])
    expect(m['NAME']).toBe('name')
    expect(m['EMAIL']).toBe('email')
    expect(m['PHONE']).toBe('phone')
  })
})
