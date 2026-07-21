import { describe, it, expect } from 'vitest'
import { deriveCompanyUrl, registrableDomain } from './company-domain'

describe('registrableDomain', () => {
  it('reduces a subdomain to its registrable domain', () => {
    expect(registrableDomain('mail.acmesolar.nl')).toBe('acmesolar.nl')
    expect(registrableDomain('a.b.c.example.com')).toBe('example.com')
  })

  it('keeps three labels for multi-label public suffixes', () => {
    expect(registrableDomain('acme.co.uk')).toBe('acme.co.uk')
    expect(registrableDomain('mail.acme.co.uk')).toBe('acme.co.uk')
    expect(registrableDomain('shop.example.com.au')).toBe('example.com.au')
  })

  it('rejects a bare public suffix', () => {
    expect(registrableDomain('co.uk')).toBeNull()
    expect(registrableDomain('com.au')).toBeNull()
  })

  it('rejects a single label', () => {
    expect(registrableDomain('localhost')).toBeNull()
  })
})

describe('deriveCompanyUrl', () => {
  it('derives an https homepage from a business address', () => {
    const result = deriveCompanyUrl('juan@acmesolar.nl')
    expect(result.url).toBe('https://acmesolar.nl')
    expect(result.domain).toBe('acmesolar.nl')
    expect(result.skipped).toBeUndefined()
  })

  it('strips subdomains so we only ever fetch the homepage', () => {
    expect(deriveCompanyUrl('j@mail.corp.acmesolar.nl').url).toBe('https://acmesolar.nl')
  })

  it('normalises case and surrounding whitespace', () => {
    expect(deriveCompanyUrl('  Juan@AcmeSolar.NL  ').url).toBe('https://acmesolar.nl')
  })

  it('handles a plus-addressed local part', () => {
    expect(deriveCompanyUrl('juan+crm@acmesolar.nl').url).toBe('https://acmesolar.nl')
  })

  it('uses the last @ so a quoted local part cannot smuggle a domain', () => {
    expect(deriveCompanyUrl('"a@evil.com"@acmesolar.nl').url).toBe('https://acmesolar.nl')
  })

  describe('never fetches for consumer mailboxes', () => {
    const consumer = [
      'a@gmail.com',
      'a@outlook.com',
      'a@hotmail.nl',
      'a@icloud.com',
      'a@proton.me',
      'a@ziggo.nl',
      'a@telenet.be',
      'a@gmx.de',
      'a@yahoo.co.uk',
    ]
    it.each(consumer)('skips %s', (email) => {
      const result = deriveCompanyUrl(email)
      expect(result.url).toBeNull()
      expect(result.skipped).toBe('consumer-mailbox')
    })
  })

  describe('never fetches for disposable/relay addresses', () => {
    const disposable = [
      'a@mailinator.com',
      'a@yopmail.com',
      'a@privaterelay.appleid.com',
      'a@duck.com',
    ]
    it.each(disposable)('skips %s', (email) => {
      const result = deriveCompanyUrl(email)
      expect(result.url).toBeNull()
      expect(result.skipped).toBe('disposable')
    })
  })

  it('re-checks after subdomain reduction', () => {
    // Reduces to gmail.com, which must still be refused.
    const result = deriveCompanyUrl('a@mail.gmail.com')
    expect(result.url).toBeNull()
    expect(result.skipped).toBe('consumer-mailbox')
  })

  describe('rejects unusable input', () => {
    it('handles null and undefined', () => {
      expect(deriveCompanyUrl(null).skipped).toBe('no-email')
      expect(deriveCompanyUrl(undefined).skipped).toBe('no-email')
      expect(deriveCompanyUrl('').skipped).toBe('no-email')
    })

    it.each([
      ['no at sign', 'not-an-email'],
      ['empty domain', 'juan@'],
      ['empty local part', '@acmesolar.nl'],
      ['domain without a dot', 'juan@localhost'],
      ['trailing dot', 'juan@acme.'],
      ['leading dot', 'juan@.acme.nl'],
      ['double dot', 'juan@acme..nl'],
      ['space in domain', 'juan@acme solar.nl'],
      ['underscore in domain', 'juan@acme_solar.nl'],
      ['leading hyphen', 'juan@-acme.nl'],
    ])('rejects %s', (_label, email) => {
      const result = deriveCompanyUrl(email)
      expect(result.url).toBeNull()
      expect(result.skipped).toBe('malformed')
    })

    it('rejects an address whose domain is only a public suffix', () => {
      const result = deriveCompanyUrl('juan@co.uk')
      expect(result.url).toBeNull()
      expect(result.skipped).toBe('public-suffix-only')
    })
  })

  it('never produces a path, query, or port', () => {
    const result = deriveCompanyUrl('juan@acmesolar.nl')
    const url = new URL(result.url!)
    expect(url.protocol).toBe('https:')
    expect(url.pathname).toBe('/')
    expect(url.search).toBe('')
    expect(url.port).toBe('')
  })
})
