/* Hermetic tests — ImmoScout24 adapter. */

import { describe, it, expect } from 'vitest'
import { validate, splitGermanAddress, toIS24Payload } from './adapter'
import type { DeusPropertyForIS24 } from './types'
import { IS24_VALIDATION_CODES } from './types'

function base(over: Partial<DeusPropertyForIS24> = {}): DeusPropertyForIS24 {
  return {
    id: 'prop_1',
    organizationId: 'org_1',
    listingType: 'sale',
    priceCents: 45_000_000,           // €450,000
    address: 'Friedrichstraße 100',
    city: 'Berlin',
    zipCode: '10117',
    country: 'DE',
    subtype: 'apartment',
    livingAreaSqm: 85,
    lotAreaSqm: undefined,
    bedrooms: 2,
    bathrooms: 1,
    numberOfRooms: null,
    yearBuilt: 1985,
    epcRating: 'C',
    epcExpiresAt: new Date('2030-12-31'),
    description: 'Sanierte Altbauwohnung im Herzen von Mitte.',
    images: ['https://x/1.jpg', 'https://x/2.jpg', 'https://x/3.jpg'],
    virtualTourUrl: undefined,
    ...over,
  }
}

describe('validate()', () => {
  it('accepts a complete DE listing', () => {
    expect(validate(base())).toEqual({ ok: true })
  })

  it('rejects non-DE country', () => {
    const r = validate(base({ country: 'NL' }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe(IS24_VALIDATION_CODES.COUNTRY_NOT_DE)
  })

  it('accepts 0-prefix PLZ (Dresden 01067)', () => {
    expect(validate(base({ zipCode: '01067', city: 'Dresden' }))).toEqual({ ok: true })
  })

  it('rejects 4-digit PLZ', () => {
    const r = validate(base({ zipCode: '1011' }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe(IS24_VALIDATION_CODES.POSTCODE_INVALID)
  })

  it('rejects 6-digit PLZ', () => {
    const r = validate(base({ zipCode: '101170' }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe(IS24_VALIDATION_CODES.POSTCODE_INVALID)
  })

  it('rejects PLZ with letters', () => {
    const r = validate(base({ zipCode: '10117 A' }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe(IS24_VALIDATION_CODES.POSTCODE_INVALID)
  })

  it('rejects missing Energieausweis', () => {
    const r = validate(base({ epcRating: null }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe(IS24_VALIDATION_CODES.ENERGY_CERTIFICATE_REQUIRED)
  })

  it('rejects expired Energieausweis', () => {
    const r = validate(base({ epcExpiresAt: new Date('2020-01-01') }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe(IS24_VALIDATION_CODES.ENERGY_CERTIFICATE_EXPIRED)
  })

  it('rejects zero price', () => {
    const r = validate(base({ priceCents: 0 }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe(IS24_VALIDATION_CODES.PRICE_MISSING)
  })

  it('rejects too-few photos (<3)', () => {
    const r = validate(base({ images: ['a', 'b'] }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe(IS24_VALIDATION_CODES.PHOTOS_TOO_FEW)
  })

  it('rejects too-many photos (>25)', () => {
    const r = validate(base({ images: Array.from({ length: 26 }, (_, i) => `${i}.jpg`) }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe(IS24_VALIDATION_CODES.PHOTOS_TOO_MANY)
  })

  it('accepts exactly 3 photos (boundary)', () => {
    expect(validate(base({ images: ['a', 'b', 'c'] }))).toEqual({ ok: true })
  })

  it('accepts exactly 25 photos (boundary)', () => {
    expect(validate(base({ images: Array.from({ length: 25 }, (_, i) => `${i}.jpg`) }))).toEqual({ ok: true })
  })

  it('rejects empty description', () => {
    const r = validate(base({ description: '' }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe(IS24_VALIDATION_CODES.DESCRIPTION_MISSING)
  })
})

describe('splitGermanAddress()', () => {
  it('handles "Friedrichstraße 100"', () => {
    expect(splitGermanAddress('Friedrichstraße 100')).toEqual({
      street: 'Friedrichstraße', houseNumber: '100',
    })
  })

  it('handles "Unter den Linden 5" (multi-word street)', () => {
    expect(splitGermanAddress('Unter den Linden 5')).toEqual({
      street: 'Unter den Linden', houseNumber: '5',
    })
  })

  it('handles "Schloßallee 12a" (letter suffix)', () => {
    expect(splitGermanAddress('Schloßallee 12a')).toEqual({
      street: 'Schloßallee', houseNumber: '12', houseNumberAddition: 'a',
    })
  })

  it('handles "Mozartstraße 7-9" (range suffix)', () => {
    expect(splitGermanAddress('Mozartstraße 7-9')).toEqual({
      street: 'Mozartstraße', houseNumber: '7', houseNumberAddition: '-9',
    })
  })

  it('handles roman-numeral floor addition', () => {
    expect(splitGermanAddress('Hauptstraße 42 III')).toEqual({
      street: 'Hauptstraße', houseNumber: '42', houseNumberAddition: 'III',
    })
  })

  it('falls back gracefully on unparseable input', () => {
    expect(splitGermanAddress('Just a street name no number')).toEqual({
      street: 'Just a street name no number', houseNumber: '',
    })
  })
})

describe('toIS24Payload()', () => {
  it('maps base property to wire shape', () => {
    const out = toIS24Payload(base())
    expect(out.partnerReference).toBe('prop_1')
    expect(out.marketingType).toBe('KAUF')
    expect(out.realEstateType).toBe('WOHNUNG')
    expect(out.priceCents).toBe(45_000_000)
    expect(out.address.street).toBe('Friedrichstraße')
    expect(out.address.houseNumber).toBe('100')
    expect(out.address.postcode).toBe('10117')
    expect(out.address.country).toBe('DE')
  })

  it('maps listingType=rent to MIETE', () => {
    const out = toIS24Payload(base({ listingType: 'rent' }))
    expect(out.marketingType).toBe('MIETE')
  })

  it('classifies subtypes correctly', () => {
    expect(toIS24Payload(base({ subtype: 'wohnung' })).realEstateType).toBe('WOHNUNG')
    expect(toIS24Payload(base({ subtype: 'gewerbe' })).realEstateType).toBe('GEWERBE')
    expect(toIS24Payload(base({ subtype: 'grundstueck' })).realEstateType).toBe('GRUNDSTUECK')
    expect(toIS24Payload(base({ subtype: 'garage' })).realEstateType).toBe('GARAGE')
    expect(toIS24Payload(base({ subtype: 'mehrfamilienhaus' })).realEstateType).toBe('ANLAGEOBJEKT')
    expect(toIS24Payload(base({ subtype: 'unknown' })).realEstateType).toBe('HAUS')
  })

  it('derives numberOfRooms = bedrooms + 1 when not explicit', () => {
    const out = toIS24Payload(base({ bedrooms: 2, numberOfRooms: null }))
    expect(out.numberOfRooms).toBe(3)
  })

  it('uses explicit numberOfRooms when provided', () => {
    const out = toIS24Payload(base({ bedrooms: 2, numberOfRooms: 5 }))
    expect(out.numberOfRooms).toBe(5)
  })

  it('caps energyClass at A+ when DEUS rating is A++ or higher', () => {
    expect(toIS24Payload(base({ epcRating: 'A++' })).energyCertificate.energyClass).toBe('A+')
    expect(toIS24Payload(base({ epcRating: 'A+++' })).energyCertificate.energyClass).toBe('A+')
    expect(toIS24Payload(base({ epcRating: 'A++++' })).energyCertificate.energyClass).toBe('A+')
  })

  it('preserves single-letter energy grades A-H', () => {
    expect(toIS24Payload(base({ epcRating: 'A' })).energyCertificate.energyClass).toBe('A')
    expect(toIS24Payload(base({ epcRating: 'H' })).energyCertificate.energyClass).toBe('H')
  })

  it('defaults certificate type to VERBRAUCHSAUSWEIS', () => {
    const out = toIS24Payload(base())
    expect(out.energyCertificate.type).toBe('VERBRAUCHSAUSWEIS')
  })

  it('uses explicit certificate type when provided', () => {
    const out = toIS24Payload(base({ energyCertificateType: 'BEDARFSAUSWEIS' }))
    expect(out.energyCertificate.type).toBe('BEDARFSAUSWEIS')
  })

  it('formats expiry as ISO date', () => {
    const out = toIS24Payload(base({ epcExpiresAt: new Date('2030-06-15T14:30:00Z') }))
    expect(out.energyCertificate.expiresAt).toBe('2030-06-15')
  })

  it('maps photos with 1-indexed order', () => {
    const out = toIS24Payload(base({ images: ['a', 'b', 'c'] }))
    expect(out.photos).toEqual([
      { url: 'a', order: 1 },
      { url: 'b', order: 2 },
      { url: 'c', order: 3 },
    ])
  })

  it('omits optional fields when null/undefined', () => {
    const out = toIS24Payload(base({
      livingAreaSqm: undefined,
      lotAreaSqm: undefined,
      yearBuilt: null,
      virtualTourUrl: undefined,
    }))
    expect(out.livingArea).toBeUndefined()
    expect(out.plotArea).toBeUndefined()
    expect(out.yearOfConstruction).toBeUndefined()
    expect(out.virtualTourUrl).toBeUndefined()
  })
})
