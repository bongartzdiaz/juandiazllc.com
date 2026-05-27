/* ImmoScout24 Importschnittstelle — TypeScript wire format.
   ──────────────────────────────────────────────────────────────────
   Sibling to lib/philly/integrations/funda/types.ts. Same scaffold-
   before-credentials philosophy: shape locked + tested today so
   wire-up is fast when ImmoScout24 partner access lands.

   ## ImmoScout24-specific differences vs Funda

   - Market: Germany (PLZ = 5 digits, 0-prefix allowed)
   - Energieausweis: A+ through H (no A++++ ladder; older DIN scale).
     Two TYPES of certificate exist (Bedarfsausweis = demand-based,
     Verbrauchsausweis = consumption-based) — we surface both.
   - `Vermarktungsart` (marketing type): KAUF (buy), MIETE (rent),
     PACHT (lease), ERBPACHT (heritable lease), WG_ZIMMER (shared room).
   - `Objektart`: WOHNUNG (apartment), HAUS (house), GEWERBE (commercial),
     GRUNDSTUECK (plot), ANLAGEOBJEKT (investment), GARAGE.
   - Min photos: 3 (Funda requires 4); max: 25 (Funda 30).
   - REST + legacy XML import API both exist; we target REST only.

   ## Verification status

   - Energie A+/A/B/C/D/E/F/G/H scale: VERIFIED from EnEV 2014
   - PLZ regex: VERIFIED from Deutsche Post specification
   - Listing payload field names: PARTIALLY VERIFIED — matches public
     IS24-XML schema field names, but the REST API may have moved to
     camelCase. Adjust at wire-up time.
   - Webhook event shape: GUESSED — mirrors the Funda + Immoweb
     conventions and we'll align at wire-up time.
   --------------------------------------------------------------- */

/** ─── Property listing payload (outbound: DEUS → IS24) ─── */

export interface IS24ListingPayload {
  /** Stable external reference owned by us — IS24 echoes this back. */
  partnerReference: string

  /** KAUF | MIETE | PACHT | ERBPACHT | WG_ZIMMER */
  marketingType: 'KAUF' | 'MIETE' | 'PACHT' | 'ERBPACHT' | 'WG_ZIMMER'

  /** WOHNUNG | HAUS | GEWERBE | GRUNDSTUECK | ANLAGEOBJEKT | GARAGE */
  realEstateType: 'WOHNUNG' | 'HAUS' | 'GEWERBE' | 'GRUNDSTUECK' | 'ANLAGEOBJEKT' | 'GARAGE'

  /** Subtype refines realEstateType. E.g. WOHNUNG → ETAGE/PENTHOUSE/MAISONETTE. */
  subtype?: string

  /** Asking price in cents. IS24 displays as EUR. */
  priceCents: number

  /** Price kind — `FIXED` is most common; `AUKTION` and `VHB` (verhandlungsbasis) exist. */
  priceMode?: 'FIXED' | 'AUKTION' | 'VHB' | 'ON_REQUEST'

  /** Address — IS24 validates PLZ against Deutsche-Post database. */
  address: {
    street: string
    houseNumber: string
    /** German PLZ — 5 digits, can start with 0 (e.g. "01067" Dresden). */
    postcode: string
    city: string
    country: 'DE'
  }

  /** Wohnfläche (living area) in m². */
  livingArea?: number
  /** Grundstücksfläche (lot area) in m². For houses. */
  plotArea?: number
  /** Nutzfläche (usable area, separate from living) in m². */
  usableArea?: number

  numberOfRooms?: number       // Zimmer
  numberOfBedrooms?: number
  numberOfBathrooms?: number
  numberOfFloors?: number       // Etagenanzahl
  yearOfConstruction?: number   // Baujahr

  /** Energieausweis — REQUIRED for residential under EnEV 2014. */
  energyCertificate: {
    /**
     * Certificate type. Bedarfsausweis = calculated from building's
     * thermal performance; Verbrauchsausweis = based on actual
     * consumption history.
     */
    type: 'BEDARFSAUSWEIS' | 'VERBRAUCHSAUSWEIS'
    /** Letter grade A+ through H per EnEV 2014. */
    energyClass: 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H'
    /** Optional kWh/(m²·a) value — required if certificate predates
     *  letter-grade introduction. */
    energyValue?: number
    /** Year the certificate was issued. */
    creationYear?: number
    /** ISO date of expiry (Energieausweis valid 10 years). */
    expiresAt?: string
  }

  /** Description — German. */
  description: string

  /**
   * Photos — IS24 requires minimum 3, recommended 8-15, cap 25.
   * First photo becomes search-results thumbnail.
   */
  photos: IS24Photo[]

  /** Optional 360° tour URL. */
  virtualTourUrl?: string
}

export interface IS24Photo {
  url: string
  order: number   // 1-indexed; position 1 = thumbnail
  caption?: string
}

/** ─── Publish response (inbound: IS24 → DEUS) ─── */

export interface IS24PublishResponse {
  /** IS24's expose ID (Exposé-Nummer in their UI). */
  exposeId: string
  /** Public-facing URL once indexed. */
  publicUrl?: string
  /** Status after publish. */
  status: 'PUBLISHED' | 'PENDING_REVIEW' | 'REJECTED'
  /** If rejected, why. */
  rejectionReason?: string
}

/** ─── Validation error codes ─── */

export const IS24_VALIDATION_CODES = {
  ENERGY_CERTIFICATE_REQUIRED: 'IS24_ENERGY_CERTIFICATE_REQUIRED',
  ENERGY_CERTIFICATE_EXPIRED: 'IS24_ENERGY_CERTIFICATE_EXPIRED',
  POSTCODE_INVALID: 'IS24_POSTCODE_INVALID',
  COUNTRY_NOT_DE: 'IS24_COUNTRY_NOT_DE',
  PRICE_MISSING: 'IS24_PRICE_MISSING',
  PHOTOS_TOO_FEW: 'IS24_PHOTOS_TOO_FEW',
  PHOTOS_TOO_MANY: 'IS24_PHOTOS_TOO_MANY',
  DESCRIPTION_MISSING: 'IS24_DESCRIPTION_MISSING',
  ADDRESS_INCOMPLETE: 'IS24_ADDRESS_INCOMPLETE',
} as const

export type IS24ValidationCode = (typeof IS24_VALIDATION_CODES)[keyof typeof IS24_VALIDATION_CODES]

/** ─── Lead webhook (inbound: IS24 → DEUS) ─── */

export interface IS24LeadWebhook {
  /** Webhook event ID — use for idempotency. */
  eventId: string
  receivedAt: string
  partnerReference: string
  exposeId: string
  /** ImmoScout24 distinguishes more lead types than Funda: */
  leadType: 'CONTACT' | 'VIEWING' | 'BROCHURE' | 'CALLBACK' | 'FINANCING'
  contact: {
    salutation?: 'Herr' | 'Frau' | 'Divers'
    firstName: string
    lastName: string
    email: string
    phone?: string
    /** Optional buyer-readiness signals. */
    moveInDate?: string
    financingConfirmed?: boolean
    /** Free-text message from the prospect. */
    message?: string
    preferredContactTime?: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'ANY'
  }
}

/** ─── Outbound DEUS Property shape (adapter input) ─── */

export interface DeusPropertyForIS24 {
  id: string
  organizationId: string
  /** Maps to marketingType KAUF/MIETE — DEUS uses 'sale'/'rent'. */
  listingType: 'sale' | 'rent'
  priceCents: number
  address: string
  city: string
  zipCode: string
  country: string
  subtype: string
  livingAreaSqm?: number
  lotAreaSqm?: number
  bedrooms?: number | null
  bathrooms?: number | null
  /** DEUS uses bedrooms; IS24 wants total Zimmer (rooms incl. living).
   *  If null we derive as bedrooms + 1 (heuristic). */
  numberOfRooms?: number | null
  yearBuilt?: number | null
  epcRating?: string | null
  epcExpiresAt?: Date | null
  /** Optional — if operator specified the certificate type. Default
   *  to VERBRAUCHSAUSWEIS (consumption-based) since that's more common
   *  for resale listings. */
  energyCertificateType?: 'BEDARFSAUSWEIS' | 'VERBRAUCHSAUSWEIS'
  description: string
  images: string[]
  virtualTourUrl?: string
}
