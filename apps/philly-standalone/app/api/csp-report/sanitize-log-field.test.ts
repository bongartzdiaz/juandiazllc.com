import { describe, it, expect } from 'vitest'
import { sanitizeLogField } from './route'

/* Bundle CS — unit tests for the log-injection guard added in
 * Bundle CP. CSP report payloads come from arbitrary user agents;
 * a hostile page can supply CR/LF in directive/blockedUri/documentUri
 * to forge log lines that the operator's aggregator would mistake
 * for separate records.
 *
 * Test strings use String.fromCharCode() so the source file stays
 * plain ASCII — git would otherwise treat literal control bytes as
 * binary and block line-level review (Bundle CR review issue #7). */

const NUL = String.fromCharCode(0x00)
const BEL = String.fromCharCode(0x07)
const LF = String.fromCharCode(0x0a)
const CR = String.fromCharCode(0x0d)
const ESC = String.fromCharCode(0x1b)
const DEL = String.fromCharCode(0x7f)

describe('sanitizeLogField — Bundle CP guard', () => {
  it('passes plain ASCII through unchanged', () => {
    expect(sanitizeLogField('script-src', 64)).toBe('script-src')
    expect(sanitizeLogField('https://example.com/path', 64)).toBe('https://example.com/path')
  })

  it('strips LF (the primary log-forging character)', () => {
    expect(sanitizeLogField('foo' + LF + 'bar', 64)).toBe('foo bar')
  })

  it('strips CR', () => {
    expect(sanitizeLogField('foo' + CR + 'bar', 64)).toBe('foo bar')
  })

  it('strips a CRLF + forged log entry', () => {
    expect(sanitizeLogField('foo' + CR + LF + 'FAKE LINE', 64)).toBe('foo  FAKE LINE')
  })

  it('strips ANSI escape sequences', () => {
    expect(sanitizeLogField('foo' + ESC + '[31mRED' + ESC + '[0m', 64)).toBe('foo [31mRED [0m')
  })

  it('strips BEL / NUL / DEL', () => {
    expect(sanitizeLogField('foo' + BEL + 'bar', 64)).toBe('foo bar')
    expect(sanitizeLogField('foo' + NUL + 'bar', 64)).toBe('foo bar')
    expect(sanitizeLogField('foo' + DEL + 'bar', 64)).toBe('foo bar')
  })

  it('truncates to maxLen', () => {
    expect(sanitizeLogField('a'.repeat(100), 10)).toBe('aaaaaaaaaa')
  })

  it('coerces non-strings via String()', () => {
    expect(sanitizeLogField(42, 16)).toBe('42')
    expect(sanitizeLogField(null, 16)).toBe('null')
    expect(sanitizeLogField(undefined, 16)).toBe('undefined')
  })

  it('preserves printable Unicode (Latin-1 / emoji / CJK)', () => {
    expect(sanitizeLogField('café 日本 🌍', 64)).toBe('café 日本 🌍')
  })
})
