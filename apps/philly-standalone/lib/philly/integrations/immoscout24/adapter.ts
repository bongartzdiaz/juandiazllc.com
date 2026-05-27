/* ImmoScout24 adapter — DEUS Property → IS24 payload.
   ──────────────────────────────────────────────────────────────────
   Pure functions, no I/O. Tested via adapter.test.ts.

   Mirrors the Funda adapter shape:
     1. validate(deusProperty)  — checks portal requirements
     2. toIS24Payload(...)      — DEUS shape → IS24 wire shape

   ## DE-specific bits vs Funda

   - PLZ regex allows 0-prefix (Dresden 01067 etc.)
   - Energieausweis is more structured: type + class + value
   - Min photos = 3 (Funda 4), max = 25 (Funda 30)
   - `numberOfRooms` heuristic: DEUS stores bedrooms; IS24 wants
     total Zimmer (typically bedrooms + 1 for the living room).
   --------------------------------------------------------------- */

import {
  IS24_VALIDATION_CODES,
  type IS24ListingPayload,
  type IS24Photo,
  type IS24ValidationCode,
  type DeusPropertyForIS24,
} from './types'

/** ─── Validation ─── */

export interface ValidationFailure {
  ok: false
  code: IS24ValidationCode
  message: string
}
export interface ValidationSuccess {
  ok: true
}
export type ValidationResult = ValidationSuccess | ValidationFailure

const MIN_PHOTOS = 3
const MAX_PHOTOS = 25
// German PLZ: exactly 5 digits. Can start with 0 (Dresden 01067,
// Leipzig 04103, etc.) — unlike NL postcodes.
const DE_POSTCODE = /^[0-9]{5}$/

export function validate(p: DeusPropertyForIS24): ValidationResult {
  if (p.country && p.country.toUpperCase() !== 'DE') {
    return {
      ok: false,
      code: IS24_VALIDATION_CODES.COUNTRY_NOT_DE,
      message: `ImmoScout24 only accepts DE listings (got country: "${p.country}").`,
    }
  }

  if (!p.priceCents || p.priceCents <= 0) {
    return {
      ok: false,
      code: IS24_VALIDATION_CODES.PRICE_MISSING,
      message: 'Asking price is required for ImmoScout24 listings.',
    }
  }

  if (!p.address?.trim() || !p.city?.trim() || !p.zipCode?.trim()) {
    return {
      ok: false,
      code: IS24_VALIDATION_CODES.ADDRESS_INCOMPLETE,
      message: 'Straße, Stadt und PLZ sind alle erforderlich.',
    }
  }

  if (!DE_POSTCODE.test(p.zipCode.trim())) {
    return {
      ok: false,
      code: IS24_VALIDATION_CODES.POSTCODE_INVALID,
      message: `PLZ "${p.zipCode}" ist keine gültige deutsche Postleitzahl (erwartet 5 Ziffern).`,
    }
  }

  if (!p.epcRating || p.epcRating.trim() === '') {
    return {
      ok: false,
      code: IS24_VALIDATION_CODES.ENERGY_CERTIFICATE_REQUIRED,
      message: 'ImmoScout24 verlangt einen Energieausweis (EnEV 2014).',
    }
  }

  if (p.epcExpiresAt && p.epcExpiresAt.getTime() < Date.now()) {
    return {
      ok: false,
      code: IS24_VALIDATION_CODES.ENERGY_CERTIFICATE_EXPIRED,
      message: `Energieausweis abgelaufen am ${p.epcExpiresAt.toISOString().slice(0, 10)}. Erneuern Sie ihn vor der Veröffentlichung.`,
    }
  }

  if (!p.description?.trim()) {
    return {
      ok: false,
      code: IS24_VALIDATION_CODES.DESCRIPTION_MISSING,
      message: 'Eine Objektbeschreibung ist erforderlich.',
    }
  }

  const photoCount = p.images?.length ?? 0
  if (photoCount < MIN_PHOTOS) {
    return {
      ok: false,
      code: IS24_VALIDATION_CODES.PHOTOS_TOO_FEW,
      message: `Mindestens ${MIN_PHOTOS} Fotos erforderlich (vorhanden: ${photoCount}).`,
    }
  }
  if (photoCount > MAX_PHOTOS) {
    return {
      ok: false,
      code: IS24_VALIDATION_CODES.PHOTOS_TOO_MANY,
      message: `Maximal ${MAX_PHOTOS} Fotos erlaubt (vorhanden: ${photoCount}).`,
    }
  }

  return { ok: true }
}

/** ─── Address splitting heuristic (German conventions) ─── */
//
// German addresses follow "Straße Hausnummer[zusatz]" — the addition
// can be a letter (12a), a roman numeral (12 II), or compound (12/3).
//
//   "Friedrichstraße 100"        → { street: "Friedrichstraße", houseNumber: "100" }
//   "Unter den Linden 5"         → { street: "Unter den Linden", houseNumber: "5" }
//   "Schloßallee 12a"            → { street: "Schloßallee", houseNumber: "12", addition: "a" }
//   "Mozartstraße 7-9"           → { street: "Mozartstraße", houseNumber: "7", addition: "-9" }
//
// Same defensive fallback as Funda: returns street=address,
// houseNumber="" if no digit-leading token is found.
export function splitGermanAddress(address: string): {
  street: string
  houseNumber: string
  houseNumberAddition?: string
} {
  const trimmed = address.trim()
  // Match: "<street words> <number>[<addition>]"
  // Addition can be letter, roman, or compound (12-9, 12/3).
  const m = /^(.+?)\s+(\d+)\s*([A-Za-z]|[-/]\d+|[IVXivx]+)?$/.exec(trimmed)
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

export function toIS24Payload(p: DeusPropertyForIS24): IS24ListingPayload {
  const { street, houseNumber, houseNumberAddition } = splitGermanAddress(p.address)

  const photos: IS24Photo[] = p.images.map((url, i) => ({ url, order: i + 1 }))

  // DEUS stores grades A++++ → G (NL scale, broader). IS24 grades are
  // A+ → H. We pass through but cap any DEUS-side A++/A+++/A++++ down
  // to "A+" since that's the highest IS24 accepts.
  const rawGrade = (p.epcRating ?? '').trim()
  const energyClass: IS24ListingPayload['energyCertificate']['energyClass'] = (
    rawGrade.startsWith('A+') ? 'A+' : (rawGrade as IS24ListingPayload['energyCertificate']['energyClass'])
  )

  // Heuristic — DEUS bedrooms → IS24 Zimmer = bedrooms + 1 (assume one
  // living room). Operator can override via `numberOfRooms`.
  const rooms = p.numberOfRooms ?? (p.bedrooms != null ? p.bedrooms + 1 : undefined)

  return {
    partnerReference: p.id,
    marketingType: p.listingType === 'rent' ? 'MIETE' : 'KAUF',
    realEstateType: classifyRealEstateType(p.subtype),
    subtype: p.subtype || undefined,
    priceCents: p.priceCents,
    priceMode: 'FIXED',
    address: {
      street,
      houseNumber,
      ...(houseNumberAddition ? {} : {}),  // IS24 schema flattens addition
      postcode: p.zipCode.trim(),
      city: p.city.trim(),
      country: 'DE',
    },
    ...(p.livingAreaSqm ? { livingArea: p.livingAreaSqm } : {}),
    ...(p.lotAreaSqm ? { plotArea: p.lotAreaSqm } : {}),
    ...(rooms != null ? { numberOfRooms: rooms } : {}),
    ...(p.bedrooms != null ? { numberOfBedrooms: p.bedrooms } : {}),
    ...(p.bathrooms != null ? { numberOfBathrooms: p.bathrooms } : {}),
    ...(p.yearBuilt != null ? { yearOfConstruction: p.yearBuilt } : {}),
    energyCertificate: {
      type: p.energyCertificateType ?? 'VERBRAUCHSAUSWEIS',
      energyClass,
      ...(p.epcExpiresAt ? { expiresAt: p.epcExpiresAt.toISOString().slice(0, 10) } : {}),
    },
    description: p.description,
    photos,
    ...(p.virtualTourUrl ? { virtualTourUrl: p.virtualTourUrl } : {}),
  }
}

function classifyRealEstateType(subtype: string): IS24ListingPayload['realEstateType'] {
  const s = subtype.toLowerCase()
  if (/(apartment|appartement|wohnung|penthouse|etagenwohnung|maisonette|studio)/.test(s)) return 'WOHNUNG'
  if (/(garage|stellplatz|tiefgarage)/.test(s)) return 'GARAGE'
  if (/(grundstueck|grundstück|building.?lot|plot|land)/.test(s)) return 'GRUNDSTUECK'
  if (/(gewerbe|office|kantoor|commercial|büro|buero|laden)/.test(s)) return 'GEWERBE'
  if (/(anlage|investment|mehrfamilien)/.test(s)) return 'ANLAGEOBJEKT'
  return 'HAUS'
}
