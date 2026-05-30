import { describe, it, expect } from 'vitest'
import { isBlockedIp, validateWebhookUrlSync, UnsafeWebhookUrlError } from './ssrf-guard'

describe('isBlockedIp', () => {
  it('blocks loopback', () => {
    expect(isBlockedIp('127.0.0.1')).toBe(true)
    expect(isBlockedIp('127.5.5.5')).toBe(true)
    expect(isBlockedIp('::1')).toBe(true)
  })
  it('blocks cloud metadata + link-local', () => {
    expect(isBlockedIp('169.254.169.254')).toBe(true)
    expect(isBlockedIp('169.254.0.1')).toBe(true)
    expect(isBlockedIp('fe80::1')).toBe(true)
  })
  it('blocks RFC1918 private ranges', () => {
    expect(isBlockedIp('10.0.0.1')).toBe(true)
    expect(isBlockedIp('172.16.0.1')).toBe(true)
    expect(isBlockedIp('172.31.255.255')).toBe(true)
    expect(isBlockedIp('192.168.1.1')).toBe(true)
    expect(isBlockedIp('fd00::1')).toBe(true)
  })
  it('blocks CGNAT, multicast, unspecified', () => {
    expect(isBlockedIp('100.64.0.1')).toBe(true)
    expect(isBlockedIp('224.0.0.1')).toBe(true)
    expect(isBlockedIp('0.0.0.0')).toBe(true)
  })
  it('blocks IPv4-mapped IPv6 of a private address', () => {
    expect(isBlockedIp('::ffff:127.0.0.1')).toBe(true)
    expect(isBlockedIp('::ffff:10.0.0.1')).toBe(true)
  })
  it('allows public addresses', () => {
    expect(isBlockedIp('8.8.8.8')).toBe(false)
    expect(isBlockedIp('1.1.1.1')).toBe(false)
    expect(isBlockedIp('172.32.0.1')).toBe(false) // just outside 172.16/12
    expect(isBlockedIp('100.63.0.1')).toBe(false) // just outside CGNAT
    expect(isBlockedIp('2606:4700:4700::1111')).toBe(false) // public IPv6
  })
  it('fails closed on non-IP input', () => {
    expect(isBlockedIp('not-an-ip')).toBe(true)
  })
})

describe('validateWebhookUrlSync', () => {
  it('rejects non-https', () => {
    expect(() => validateWebhookUrlSync('http://example.com/hook')).toThrow(UnsafeWebhookUrlError)
    expect(() => validateWebhookUrlSync('ftp://example.com')).toThrow(UnsafeWebhookUrlError)
  })
  it('rejects malformed URLs', () => {
    expect(() => validateWebhookUrlSync('not a url')).toThrow(UnsafeWebhookUrlError)
  })
  it('rejects internal hostnames', () => {
    expect(() => validateWebhookUrlSync('https://localhost/hook')).toThrow(UnsafeWebhookUrlError)
    expect(() => validateWebhookUrlSync('https://foo.local/hook')).toThrow(UnsafeWebhookUrlError)
    expect(() => validateWebhookUrlSync('https://svc.internal/hook')).toThrow(UnsafeWebhookUrlError)
    expect(() => validateWebhookUrlSync('https://metadata.google.internal/')).toThrow(UnsafeWebhookUrlError)
  })
  it('rejects literal private/metadata IPs', () => {
    expect(() => validateWebhookUrlSync('https://169.254.169.254/latest/meta-data')).toThrow(UnsafeWebhookUrlError)
    expect(() => validateWebhookUrlSync('https://127.0.0.1:8080/')).toThrow(UnsafeWebhookUrlError)
    expect(() => validateWebhookUrlSync('https://10.1.2.3/')).toThrow(UnsafeWebhookUrlError)
    expect(() => validateWebhookUrlSync('https://[::1]/')).toThrow(UnsafeWebhookUrlError)
  })
  it('accepts a public https URL (returns hostname)', () => {
    expect(validateWebhookUrlSync('https://hooks.example.com/abc')).toBe('hooks.example.com')
    expect(validateWebhookUrlSync('https://8.8.8.8/hook')).toBe('8.8.8.8')
  })
})
