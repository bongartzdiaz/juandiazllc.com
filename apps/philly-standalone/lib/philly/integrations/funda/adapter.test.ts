/* Hermetic tests — Funda adapter (lib/philly/integrations/funda/adapter.ts).
   ──────────────────────────────────────────────────────────────────
   Pin the contract today so when Funda partner-API access lands, we
   only have to wire up the HTTP client — the payload shape + every
   validation rule is already nailed down.

   Three sections:
     1. validate() — every FUNDA_VALIDATION_CODES branch
     2. splitDutchAddress() — common Dutch address formats
     3. toFundaPayload() — DEUS → wire shape, round-trips correctly */

import { describe, it, expect } from 'vitest'
import {
  validate,
  splitDutchAddress,
  toFundaPayload,
} from './adapter'
import type { DeusPropertyForFunda } from './types'
import { FUNDA_VALIDATION_CODES } from './types'

function base(over: Partial<DeusPropertyForFunda> = {}): DeusPropertyForFunda {
  return {
    id: 'prop_1',
    organizationId: 'org_1',
    listingType: 'sale',
    priceCents: 47_500_000,           // €475,000
    address: 'Damrak 70',
    city: 'Amsterdam',
    zipCode: '1012 LM',
    country: 'NL',
    subtype: 'apartment',
    livingAreaSqm: 85,
    lotAreaSqm: undefined,
    bedrooms: 3,
    bathrooms: 1,
    yearBuilt: 1890,
    epcRating: 'C',
    epcExpiresAt: new Date('2030-12-31'),
    description: 'Beautifully renovated apartment in the historic centre.',
    images: ['https://cdn/x/1.jpg', 'https://cdn/x/2.jpg', 'https://cdn/x/3.jpg', 'https://cdn/x/4.jpg'],
    virtualTourUrl: undefined,
    ...over,
  }
}

describe('validate()', () => {
  it('accepts a complete NL listing', () => {
    expect(validate(base())).toEqual({ ok: true })
  })

  it('rejects non-NL country', () => {
    const r = validate(base({ country: 'BE' }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe(FUNDA_VALIDATION_CODES.COUNTRY_NOT_NL)
  })

  it('rejects zero price', () => {
    const r = validate(base({ priceCents: 0 }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe(FUNDA_VALIDATION_CODES.PRICE_MISSING)
  })

  it('rejects empty address', () => {
    const r = validate(base({ address: '   ' }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe(FUNDA_VALIDATION_CODES.ADDRESS_INCOMPLETE)
  })

  it('rejects invalid postcode format', () => {
    // "1012LM" without space → still valid (regex allows). But "12 LM"
    // (only 2 digits) → invalid.
    const r = validate(base({ zipCode: '12 LM' }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe(FUNDA_VALIDATION_CODES.POSTAL_CODE_INVALID)
  })

  it('accepts postcode without space', () => {
    expect(validate(base({ zipCode: '1012LM' }))).toEqual({ ok: true })
  })

  it('accepts postcode with lowercase letters (we uppercase before validating)', () => {
    expect(validate(base({ zipCode: '1012 lm' }))).toEqual({ ok: true })
  })

  it('rejects 0000-prefix postcodes (NL postcodes never start with 0)', () => {
    const r = validate(base({ zipCode: '0123 AB' }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe(FUNDA_VALIDATION_CODES.POSTAL_CODE_INVALID)
  })

  it('rejects missing energielabel — EPBD-mandatory', () => {
    const r = validate(base({ epcRating: null }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe(FUNDA_VALIDATION_CODES.EPC_REQUIRED)
  })

  it('rejects expired energielabel', () => {
    const r = validate(base({ epcExpiresAt: new Date('2020-01-01') }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe(FUNDA_VALIDATION_CODES.EPC_EXPIRED)
  })

  it('allows no expiry date — assumes certificate still valid', () => {
    expect(validate(base({ epcExpiresAt: null }))).toEqual({ ok: true })
  })

  it('rejects empty description', () => {
    const r = validate(base({ description: '' }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe(FUNDA_VALIDATION_CODES.DESCRIPTION_MISSING)
  })

  it('rejects too-few photos', () => {
    const r = validate(base({ images: ['a.jpg', 'b.jpg'] }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe(FUNDA_VALIDATION_CODES.PHOTOS_TOO_FEW)
  })

  it('rejects too-many photos (>30)', () => {
    const r = validate(base({ images: Array.from({ length: 31 }, (_, i) => `${i}.jpg`) }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe(FUNDA_VALIDATION_CODES.PHOTOS_TOO_MANY)
  })

  it('accepts exactly 4 photos (boundary)', () => {
    expect(validate(base({ images: ['a', 'b', 'c', 'd'] }))).toEqual({ ok: true })
  })

  it('accepts exactly 30 photos (boundary)', () => {
    expect(validate(base({ images: Array.from({ length: 30 }, (_, i) => `${i}.jpg`) }))).toEqual({ ok: true })
  })
})

describe('splitDutchAddress()', () => {
  it('handles simple street + number', () => {
    expect(splitDutchAddress('Damrak 70')).toEqual({ street: 'Damrak', houseNumber: '70' })
  })

  it('handles multi-word street', () => {
    expect(splitDutchAddress('Burgemeester de Vlugtlaan 122')).toEqual({
      street: 'Burgemeester de Vlugtlaan',
      houseNumber: '122',
    })
  })

  it('handles addition with letter suffix (no separator)', () => {
    expect(splitDutchAddress('Damrak 70A')).toEqual({
      street: 'Damrak',
      houseNumber: '70',
      houseNumberAddition: 'A',
    })
  })

  it('handles addition with letter suffix and space', () => {
    expect(splitDutchAddress('Damrak 70 II')).toEqual({
      street: 'Damrak',
      houseNumber: '70',
      houseNumberAddition: 'II',
    })
  })

  it('handles addition with hs/bg suffix (huisnummer-toevoeging Amsterdam-style)', () => {
    expect(splitDutchAddress('Prinsengracht 263 hs')).toEqual({
      street: 'Prinsengracht',
      houseNumber: '263',
      houseNumberAddition: 'hs',
    })
  })

  it('falls back gracefully on unparseable input', () => {
    expect(splitDutchAddress('Just a street name no number')).toEqual({
      street: 'Just a street name no number',
      houseNumber: '',
    })
  })

  it('trims whitespace', () => {
    expect(splitDutchAddress('   Damrak 70   ')).toEqual({ street: 'Damrak', houseNumber: '70' })
  })
})

describe('toFundaPayload()', () => {
  it('maps base property to wire shape', () => {
    const out = toFundaPayload(base())
    expect(out.partnerReference).toBe('prop_1')
    expect(out.listingType).toBe('sale')
    expect(out.priceCents).toBe(47_500_000)
    expect(out.priceKind).toBe('fixed')
    expect(out.address).toEqual({
      street: 'Damrak',
      houseNumber: '70',
      postalCode: '1012 LM',
      city: 'Amsterdam',
      country: 'NL',
    })
  })

  it('uppercases postcode and trims', () => {
    const out = toFundaPayload(base({ zipCode: '  1012 lm  ' }))
    expect(out.address.postalCode).toBe('1012 LM')
  })

  it('classifies apartment subtype correctly', () => {
    const out = toFundaPayload(base({ subtype: 'apartment' }))
    expect(out.classification.type).toBe('apartment')
    expect(out.classification.subtype).toBe('apartment')
  })

  it('classifies Dutch synonyms', () => {
    expect(toFundaPayload(base({ subtype: 'appartement' })).classification.type).toBe('apartment')
    expect(toFundaPayload(base({ subtype: 'penthouse' })).classification.type).toBe('apartment')
    expect(toFundaPayload(base({ subtype: 'kantoor' })).classification.type).toBe('commercial')
    expect(toFundaPayload(base({ subtype: 'bouwgrond' })).classification.type).toBe('building_lot')
    expect(toFundaPayload(base({ subtype: 'parking' })).classification.type).toBe('parking')
  })

  it('falls back to house for unknown subtype', () => {
    expect(toFundaPayload(base({ subtype: 'unknown' })).classification.type).toBe('house')
    expect(toFundaPayload(base({ subtype: '' })).classification.type).toBe('house')
  })

  it('maps photos with 1-indexed order', () => {
    const out = toFundaPayload(base({ images: ['https://x/a.jpg', 'https://x/b.jpg', 'https://x/c.jpg', 'https://x/d.jpg'] }))
    expect(out.photos).toEqual([
      { url: 'https://x/a.jpg', order: 1 },
      { url: 'https://x/b.jpg', order: 2 },
      { url: 'https://x/c.jpg', order: 3 },
      { url: 'https://x/d.jpg', order: 4 },
    ])
  })

  it('passes through energielabel verbatim', () => {
    expect(toFundaPayload(base({ epcRating: 'A++++' })).energyLabel).toBe('A++++')
    expect(toFundaPayload(base({ epcRating: 'G' })).energyLabel).toBe('G')
  })

  it('formats epcExpiresAt as ISO date (no time component)', () => {
    const out = toFundaPayload(base({ epcExpiresAt: new Date('2030-06-15T14:30:00Z') }))
    expect(out.energyLabelExpiresAt).toBe('2030-06-15')
  })

  it('omits energyLabelExpiresAt when expiry is null', () => {
    const out = toFundaPayload(base({ epcExpiresAt: null }))
    expect(out.energyLabelExpiresAt).toBeUndefined()
  })

  it('omits optional fields when null/undefined', () => {
    const out = toFundaPayload(base({
      livingAreaSqm: undefined,
      lotAreaSqm: undefined,
      bedrooms: null,
      bathrooms: null,
      yearBuilt: null,
      virtualTourUrl: undefined,
    }))
    expect(out.livingArea).toBeUndefined()
    expect(out.lotArea).toBeUndefined()
    expect(out.bedrooms).toBeUndefined()
    expect(out.bathrooms).toBeUndefined()
    expect(out.yearBuilt).toBeUndefined()
    expect(out.virtualTourUrl).toBeUndefined()
  })

  it('includes virtualTourUrl when present', () => {
    const out = toFundaPayload(base({ virtualTourUrl: 'https://my.matterport.com/show/?m=abc' }))
    expect(out.virtualTourUrl).toBe('https://my.matterport.com/show/?m=abc')
  })

  it('uses Property.id as partnerReference (idempotency anchor)', () => {
    const out = toFundaPayload(base({ id: 'prop_42' }))
    expect(out.partnerReference).toBe('prop_42')
  })
})
