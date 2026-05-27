/* Funda adapter — DEUS Property → Funda payload.
   ──────────────────────────────────────────────────────────────────
   Pure functions, no I/O. Tested via adapter.test.ts.

   Two stages:
     1. validate(deusProperty)  — checks portal requirements without
                                  calling Funda. Fails fast on missing
                                  EPC, wrong country, no photos, etc.
     2. toFundaPayload(...)     — maps DEUS shape → Funda wire shape.
                                  Assumes validate passed.

   Keeping these as exported functions (rather than methods on a class)
   makes them trivial to unit test and reuse from the webhook receiver
   for the reverse mapping (Funda lead → DEUS Contact).
   --------------------------------------------------------------- */

import {
  FUNDA_VALIDATION_CODES,
  type FundaListingPayload,
  type FundaPhoto,
  type FundaValidationCode,
  type DeusPropertyForFunda,
} from './types'

/** ─── Validation ─── */

export interface ValidationFailure {
  ok: false
  code: FundaValidationCode
  message: string
}
export interface ValidationSuccess {
  ok: true
}
export type ValidationResult = ValidationSuccess | ValidationFailure

const MIN_PHOTOS = 4
const MAX_PHOTOS = 30
// Funda postal code format: 4 digits + optional space + 2 uppercase letters.
// "1011 AB" canonical; "1011AB" also accepted but normalised on send.
const NL_POSTAL_CODE = /^[1-9][0-9]{3}\s?[A-Z]{2}$/

export function validate(p: DeusPropertyForFunda): ValidationResult {
  // Country gate — Funda is NL-only.
  if (p.country && p.country.toUpperCase() !== 'NL') {
    return {
      ok: false,
      code: FUNDA_VALIDATION_CODES.COUNTRY_NOT_NL,
      message: `Funda only accepts NL listings (got country: "${p.country}").`,
    }
  }

  if (!p.priceCents || p.priceCents <= 0) {
    return {
      ok: false,
      code: FUNDA_VALIDATION_CODES.PRICE_MISSING,
      message: 'Asking price is required for Funda listings.',
    }
  }

  if (!p.address?.trim() || !p.city?.trim() || !p.zipCode?.trim()) {
    return {
      ok: false,
      code: FUNDA_VALIDATION_CODES.ADDRESS_INCOMPLETE,
      message: 'Address, city and postal code are all required.',
    }
  }

  if (!NL_POSTAL_CODE.test(p.zipCode.toUpperCase().trim())) {
    return {
      ok: false,
      code: FUNDA_VALIDATION_CODES.POSTAL_CODE_INVALID,
      message: `Postal code "${p.zipCode}" is not a valid NL postcode (expect 1234 AB format).`,
    }
  }

  if (!p.epcRating || p.epcRating.trim() === '') {
    return {
      ok: false,
      code: FUNDA_VALIDATION_CODES.EPC_REQUIRED,
      message: 'Funda requires energielabel (EPC rating). Mandatory under EPBD.',
    }
  }

  if (p.epcExpiresAt && p.epcExpiresAt.getTime() < Date.now()) {
    return {
      ok: false,
      code: FUNDA_VALIDATION_CODES.EPC_EXPIRED,
      message: `EPC expired on ${p.epcExpiresAt.toISOString().slice(0, 10)}. Renew before publishing.`,
    }
  }

  if (!p.description?.trim()) {
    return {
      ok: false,
      code: FUNDA_VALIDATION_CODES.DESCRIPTION_MISSING,
      message: 'Description is required for Funda listings.',
    }
  }

  const photoCount = p.images?.length ?? 0
  if (photoCount < MIN_PHOTOS) {
    return {
      ok: false,
      code: FUNDA_VALIDATION_CODES.PHOTOS_TOO_FEW,
      message: `At least ${MIN_PHOTOS} photos required (got ${photoCount}).`,
    }
  }
  if (photoCount > MAX_PHOTOS) {
    return {
      ok: false,
      code: FUNDA_VALIDATION_CODES.PHOTOS_TOO_MANY,
      message: `Maximum ${MAX_PHOTOS} photos allowed (got ${photoCount}). Trim before publishing.`,
    }
  }

  return { ok: true }
}

/** ─── Address splitting heuristic ─── */
//
// DEUS stores `address` as a free-text single line. Funda needs a
// structured (street, houseNumber, addition). This heuristic handles
// the common Dutch formats:
//
//   "Damrak 70"                  → { street: "Damrak", houseNumber: "70" }
//   "Damrak 70-A"                → { street: "Damrak", houseNumber: "70", addition: "A" }
//   "Damrak 70 II"               → { street: "Damrak", houseNumber: "70", addition: "II" }
//   "Prinsengracht 263 hs"       → { street: "Prinsengracht", houseNumber: "263", addition: "hs" }
//   "Burgemeester de Vlugtlaan 122 III"
//       → { street: "Burgemeester de Vlugtlaan", houseNumber: "122", addition: "III" }
//
// Falls back to street=address, houseNumber="" if it can't find a
// digit-leading token. Caller should validate the result if exactness
// matters.
export function splitDutchAddress(address: string): {
  street: string
  houseNumber: string
  houseNumberAddition?: string
} {
  const trimmed = address.trim()
  // Match: "<street words> <number>[<addition>]"
  // House number = digits, optionally followed by letters/roman/hs/bg/etc.
  const m = /^(.+?)\s+(\d+)\s*([A-Za-z][A-Za-z0-9\-]*)?$/.exec(trimmed)
  if (!m) {
    return { street: trimmed, houseNumber: '' }
  }
  const [, street, houseNumber, addition] = m
  return {
    street: street.trim(),
    houseNumber,
    ...(addition ? { houseNumberAddition: addition } : {}),
  }
}

/** ─── Mapper ─── */

export function toFundaPayload(p: DeusPropertyForFunda): FundaListingPayload {
  const { street, houseNumber, houseNumberAddition } = splitDutchAddress(p.address)

  const photos: FundaPhoto[] = p.images.map((url, i) => ({
    url,
    order: i + 1,
  }))

  // Funda accepts energielabel grades A++++ through G. DEUS stored
  // values follow the same scale, so we pass through. The validator
  // already ensured this isn't empty.
  const energyLabel = (p.epcRating ?? '').trim() as FundaListingPayload['energyLabel']

  return {
    partnerReference: p.id,
    listingType: p.listingType,
    priceCents: p.priceCents,
    priceKind: 'fixed',
    address: {
      street,
      houseNumber,
      ...(houseNumberAddition ? { houseNumberAddition } : {}),
      postalCode: p.zipCode.toUpperCase().trim(),
      city: p.city.trim(),
      country: 'NL',
    },
    classification: {
      // Heuristic — DEUS `subtype` is free-text; we map the common
      // Dutch terms. Anything we don't recognise falls back to 'house'
      // since that's Funda's most permissive bucket.
      type: classifyType(p.subtype),
      subtype: p.subtype || undefined,
    },
    ...(p.livingAreaSqm ? { livingArea: p.livingAreaSqm } : {}),
    ...(p.lotAreaSqm ? { lotArea: p.lotAreaSqm } : {}),
    ...(p.bedrooms != null ? { bedrooms: p.bedrooms } : {}),
    ...(p.bathrooms != null ? { bathrooms: p.bathrooms } : {}),
    ...(p.yearBuilt != null ? { yearBuilt: p.yearBuilt } : {}),
    energyLabel,
    ...(p.epcExpiresAt ? { energyLabelExpiresAt: p.epcExpiresAt.toISOString().slice(0, 10) } : {}),
    description: p.description,
    photos,
    ...(p.virtualTourUrl ? { virtualTourUrl: p.virtualTourUrl } : {}),
  }
}

function classifyType(subtype: string): FundaListingPayload['classification']['type'] {
  const s = subtype.toLowerCase()
  if (/(apartment|appartement|flat|penthouse|maisonette|studio)/.test(s)) return 'apartment'
  if (/(parking|garage|stallingsplaats)/.test(s)) return 'parking'
  if (/(bouwgrond|building.?lot)/.test(s)) return 'building_lot'
  if (/(land|plot|grond)/.test(s)) return 'land'
  if (/(office|kantoor|commercial|winkel|bedrijf)/.test(s)) return 'commercial'
  return 'house'
}
