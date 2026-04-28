import { describe, it, expect } from 'vitest'
import { checkIpAllowlist, isAllowlistOpen, parseCidr, parseIp } from './ip-allowlist'

describe('isAllowlistOpen', () => {
  it('treats null/undefined/empty/whitespace as open', () => {
    expect(isAllowlistOpen(null)).toBe(true)
    expect(isAllowlistOpen(undefined)).toBe(true)
    expect(isAllowlistOpen('')).toBe(true)
    expect(isAllowlistOpen('   ')).toBe(true)
  })
  it('treats any non-empty value as restricted', () => {
    expect(isAllowlistOpen('10.0.0.0/8')).toBe(false)
    expect(isAllowlistOpen('10.0.0.0/8,2001:db8::/32')).toBe(false)
  })
})

describe('parseIp', () => {
  it('parses IPv4', () => {
    const ip = parseIp('192.168.1.1')
    expect(ip?.family).toBe(4)
    expect(ip?.value).toBe(BigInt(0xc0a80101))
  })
  it('rejects out-of-range octets', () => {
    expect(parseIp('256.0.0.1')).toBeNull()
    expect(parseIp('1.2.3')).toBeNull()
    expect(parseIp('1.2.3.4.5')).toBeNull()
  })
  it('parses full IPv6', () => {
    const ip = parseIp('2001:db8:85a3:0000:0000:8a2e:0370:7334')
    expect(ip?.family).toBe(6)
  })
  it('parses :: shorthand', () => {
    const ip = parseIp('::1')
    expect(ip?.family).toBe(6)
    expect(ip?.value).toBe(1n)
  })
  it('parses IPv4-mapped IPv6 to v4', () => {
    const ip = parseIp('::ffff:10.0.0.1')
    expect(ip?.family).toBe(4)
  })
  it('strips zone identifiers', () => {
    expect(parseIp('fe80::1%eth0')).not.toBeNull()
  })
  it('rejects double "::"', () => {
    expect(parseIp('1::2::3')).toBeNull()
  })
})

describe('parseCidr', () => {
  it('treats single IP as /32 (v4)', () => {
    const r = parseCidr('192.168.1.1')
    expect(r?.prefix).toBe(32)
    expect(r?.family).toBe(4)
  })
  it('treats single IP as /128 (v6)', () => {
    const r = parseCidr('2001:db8::1')
    expect(r?.prefix).toBe(128)
  })
  it('rejects invalid prefix', () => {
    expect(parseCidr('10.0.0.0/40')).toBeNull()
    expect(parseCidr('10.0.0.0/-1')).toBeNull()
    expect(parseCidr('::1/130')).toBeNull()
  })
  it('normalises host bits to network', () => {
    const r = parseCidr('10.0.0.5/24')
    const expected = parseCidr('10.0.0.0/24')
    expect(r?.network).toBe(expected?.network)
  })
})

describe('checkIpAllowlist', () => {
  it('allows everything when allowlist is null/empty', () => {
    expect(checkIpAllowlist('1.2.3.4', null).ok).toBe(true)
    expect(checkIpAllowlist('1.2.3.4', '').ok).toBe(true)
    expect(checkIpAllowlist('::1', null).ok).toBe(true)
  })

  it('blocks an IP not in any range', () => {
    const r = checkIpAllowlist('8.8.8.8', '10.0.0.0/8, 192.168.0.0/16')
    expect(r.ok).toBe(false)
    expect(r.validRanges).toBe(2)
    expect(r.invalid).toEqual([])
  })

  it('allows an IP inside a range', () => {
    expect(checkIpAllowlist('10.5.6.7', '10.0.0.0/8').ok).toBe(true)
    expect(checkIpAllowlist('192.168.1.42', '192.168.1.0/24').ok).toBe(true)
  })

  it('allows a single-IP entry', () => {
    expect(checkIpAllowlist('203.0.113.5', '203.0.113.5').ok).toBe(true)
    expect(checkIpAllowlist('203.0.113.6', '203.0.113.5').ok).toBe(false)
  })

  it('matches IPv6 ranges', () => {
    expect(checkIpAllowlist('2001:db8::1234', '2001:db8::/32').ok).toBe(true)
    expect(checkIpAllowlist('2001:db9::1', '2001:db8::/32').ok).toBe(false)
  })

  it('does not auto-trust loopback or RFC1918', () => {
    // Caller asked for a strict 8.8.8.8/32 only — 127.0.0.1 must NOT pass.
    expect(checkIpAllowlist('127.0.0.1', '8.8.8.8/32').ok).toBe(false)
    expect(checkIpAllowlist('10.0.0.1', '8.8.8.8/32').ok).toBe(false)
  })

  it('treats invalid entries as non-fatal — surfaces them but evaluates the rest', () => {
    const r = checkIpAllowlist('10.5.6.7', 'garbage, 10.0.0.0/8')
    expect(r.ok).toBe(true)
    expect(r.invalid).toEqual(['garbage'])
    expect(r.validRanges).toBe(1)
  })

  it('mismatched family never matches', () => {
    expect(checkIpAllowlist('10.0.0.1', '2001:db8::/32').ok).toBe(false)
    expect(checkIpAllowlist('::1', '10.0.0.0/8').ok).toBe(false)
  })

  it('takes the first entry of a comma-separated x-forwarded-for-style input', () => {
    // Common gotcha: caller passes the full XFF chain. We only care
    // about the first hop (the actual client) — enforce by trimming
    // before calling. Document by example.
    const xff = '203.0.113.7, 10.0.0.1'
    const clientIp = xff.split(',')[0].trim()
    expect(checkIpAllowlist(clientIp, '203.0.113.0/24').ok).toBe(true)
  })

  it('rejects an unparseable IP', () => {
    expect(checkIpAllowlist('not-an-ip', '0.0.0.0/0').ok).toBe(false)
  })
})
