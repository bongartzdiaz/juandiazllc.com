/* Funda Partner API — TypeScript wire format.
   ──────────────────────────────────────────────────────────────────
   This file is the source-of-truth for what we send to / receive from
   Funda. Production-grade fields are based on the publicly documented
   Funda Partner specification (NVM/VBO partner programme). Fields
   marked `// TODO` await verification once Juan's NVM membership grants
   real API access — the shape is plausible-but-unverified.

   ## Why this file exists before credentials

   The integration is task #12 in the launch playbook. It's blocked on
   Funda granting partner API access (NVM/VBO membership prerequisite).
   Once that lands, we don't want the integration to be a green-field
   2-week build — we want a 2-day wire-up of an already-tested adapter.

   This typing layer + the mock server let us write hermetic tests
   today and bind to real Funda responses tomorrow with a single PR.

   ## What's verified vs guessed

   - Auth model (OAuth2 client_credentials): VERIFIED from public docs
   - Listing payload field names: PARTIALLY VERIFIED — matches NVM-XML
     export schema; Funda has moved to JSON but field names are kept
   - Webhook event shape: GUESSED — Funda doesn't publish webhook docs
     publicly, so we mirror the Immoweb / ImmoScout24 conventions and
     adjust at wire-up time
   --------------------------------------------------------------- */

/** ─── Property listing payload (outbound: DEUS → Funda) ─── */

export interface FundaListingPayload {
  /** Stable external reference owned by us — Funda echoes this back
   *  so we can correlate webhook events to our Property row. */
  partnerReference: string

  /** sale | rent — Funda calls these `koop` (buy) and `huur` (rent)
   *  in their UI but the API uses English literals. */
  listingType: 'sale' | 'rent'

  /** Asking price in cents (we send cents; Funda displays as € N.NNN). */
  priceCents: number

  /**
   * Price kind. Most listings use `fixed`; auction / on-request /
   * conditional listings exist. Default `fixed`.
   */
  priceKind?: 'fixed' | 'auction' | 'on_request' | 'kosten_koper' | 'vrij_op_naam'

  /** Address — Funda validates against Dutch postcode database. */
  address: {
    street: string
    houseNumber: string
    houseNumberAddition?: string
    postalCode: string  // "1011 AB" format (with space, uppercase letters)
    city: string
    country: 'NL'       // Funda is NL-only by definition
  }

  /** Property classification — drives Funda's search filters. */
  classification: {
    type: 'house' | 'apartment' | 'parking' | 'building_lot' | 'land' | 'commercial'
    /** subtype refines `type`. E.g. type=house → subtype=detached/semi/terraced/villa. */
    subtype?: string
  }

  /** Living space in square metres. Funda's flagship search filter. */
  livingArea?: number
  /** Lot/plot area in m². For houses with gardens. */
  lotArea?: number
  /** Other space (storage, garage etc.) in m². */
  otherSpace?: number

  bedrooms?: number
  bathrooms?: number
  yearBuilt?: number
  numberOfFloors?: number

  /**
   * Energielabel (energy certificate). EPBD-mandatory. Funda rejects
   * listings without it. Grades A++++ through G in 2025 NL revision.
   */
  energyLabel: 'A++++' | 'A+++' | 'A++' | 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
  /** Certificate expiry — Funda warns if within 90 days. */
  energyLabelExpiresAt?: string  // ISO 8601 date

  /** Marketing copy. Dutch only. */
  description: string

  /**
   * Photos — Funda requires minimum 4, recommended 8-15, hard cap 30.
   * First photo becomes the search-results thumbnail.
   */
  photos: FundaPhoto[]

  /** Optional 360° virtual tour URL — Matterport, Giraffe, etc. */
  virtualTourUrl?: string

  /** Public listing URL once published — Funda assigns this. */
  // (no field — see FundaPublishResponse)
}

export interface FundaPhoto {
  /** Publicly fetchable URL — Funda downloads and re-hosts; we don't
   *  serve photos to end users from our own CDN once published. */
  url: string
  /** Display order; 1-indexed. Position 1 = thumbnail. */
  order: number
  /** Optional caption shown under the photo in the gallery. */
  caption?: string
}

/** ─── Publish response (inbound: Funda → DEUS) ─── */

export interface FundaPublishResponse {
  /** Funda's listing ID — surfaces in URLs like funda.nl/koop/<city>/<id>. */
  listingId: string
  /** Public-facing URL once Funda has indexed (can be delayed 5-30 min). */
  publicUrl?: string
  /** Status after publish — Funda may queue for moderation. */
  status: 'live' | 'pending_review' | 'rejected'
  /** If rejected, why. */
  rejectionReason?: string
}

/** ─── Validation error codes (raised before any API call) ─── */

export const FUNDA_VALIDATION_CODES = {
  EPC_REQUIRED: 'FUNDA_EPC_REQUIRED',
  EPC_EXPIRED: 'FUNDA_EPC_EXPIRED',
  POSTAL_CODE_INVALID: 'FUNDA_POSTAL_CODE_INVALID',
  COUNTRY_NOT_NL: 'FUNDA_COUNTRY_NOT_NL',
  PRICE_MISSING: 'FUNDA_PRICE_MISSING',
  PHOTOS_TOO_FEW: 'FUNDA_PHOTOS_TOO_FEW',
  PHOTOS_TOO_MANY: 'FUNDA_PHOTOS_TOO_MANY',
  DESCRIPTION_MISSING: 'FUNDA_DESCRIPTION_MISSING',
  ADDRESS_INCOMPLETE: 'FUNDA_ADDRESS_INCOMPLETE',
} as const

export type FundaValidationCode = (typeof FUNDA_VALIDATION_CODES)[keyof typeof FUNDA_VALIDATION_CODES]

/** ─── Lead webhook (inbound: Funda → DEUS) ─── */

export interface FundaLeadWebhook {
  /** Webhook event ID — use for idempotency, Funda may retry. */
  eventId: string
  /** ISO timestamp when the lead landed at Funda. */
  receivedAt: string
  /** Our partnerReference echoed back. */
  partnerReference: string
  /** Funda's listing ID. */
  listingId: string
  /** Lead type — Funda distinguishes brochure-request from contact-request from viewing-booking. */
  leadType: 'contact_request' | 'brochure_request' | 'viewing_request' | 'callback_request'
  /** Lead details — Funda only forwards what the prospect filled in. */
  contact: {
    fullName: string
    email: string
    phone?: string
    preferredMethod?: 'email' | 'phone'
    message?: string
    /** Optional buyer-readiness signals Funda collects. */
    financingStatus?: 'pre_approved' | 'in_progress' | 'unknown'
    timeline?: 'asap' | '3_months' | '6_months' | 'just_looking'
  }
}

/** ─── Outbound DEUS Property shape (input to the adapter) ─── */

export interface DeusPropertyForFunda {
  /** Stable DEUS Property.id — becomes partnerReference. */
  id: string
  organizationId: string
  listingType: 'sale' | 'rent'
  priceCents: number
  // Address fields — adapter splits the DEUS `address` string into
  // street + houseNumber where possible, but if the caller can
  // pre-split, it skips the heuristic.
  address: string
  city: string
  zipCode: string
  country: string
  subtype: string
  livingAreaSqm?: number
  lotAreaSqm?: number
  bedrooms?: number | null
  bathrooms?: number | null
  yearBuilt?: number | null
  epcRating?: string | null
  epcExpiresAt?: Date | null
  description: string
  images: string[]
  virtualTourUrl?: string
}
