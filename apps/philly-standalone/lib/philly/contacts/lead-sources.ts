/* Canonical list of Contact.leadSource values.
   ──────────────────────────────────────────────────────────────────
   Single source of truth — every dropdown, filter, validation schema,
   and AI lead-scoring rule imports from here. Adding a new portal
   means one edit + one i18n key per locale, not a search across the
   codebase.

   Geo coverage:
     UNIVERSAL — apply everywhere (website, referral, open_house, etc.)
     EU PORTALS — Funda, ImmoScout24, Idealista, SeLoger, Logic-Immo, Immoweb
     LEGACY US (excluded since EU pivot 2026-05-26) — zillow, realtor_com

   The legacy zillow/realtor_com values may still exist in DB rows from
   pre-pivot data — Contact.leadSource is just a String column. The
   filter validation excludes them so new rows can't add them, but the
   data is intact. A future migration could remap legacy rows if needed.

   See: prisma/schema.prisma Contact.leadSource comment */

export const LEAD_SOURCES = [
  // Universal (geo-agnostic) — work everywhere
  'website',
  'referral',
  'open_house',
  'facebook',
  'google',
  'cold_call',
  'sphere',
  'email_campaign',
  // EU listing portals (added 2026-05-26 for the EU real-estate wedge)
  'funda',           // NL — dominant residential
  'immoscout24',     // DE — dominant residential
  'idealista',       // ES — dominant residential
  'seloger',         // FR — large residential
  'logic_immo',      // FR — secondary
  'immoweb',         // BE — dominant BENELUX-FR
] as const

export type LeadSource = (typeof LEAD_SOURCES)[number]

/**
 * Type guard for runtime validation. Anything not in LEAD_SOURCES is
 * either legacy data or a typo — fail-closed in validation layers.
 */
export function isLeadSource(value: string): value is LeadSource {
  return (LEAD_SOURCES as readonly string[]).includes(value)
}

/**
 * i18n key suffix for the lead-source label. UI consumers should
 * render with `t(\`leadSource.${source}\`)`. Falls back to the raw
 * key if an EN-locale fallback is missing (next-intl behavior).
 */
export function leadSourceI18nKey(source: LeadSource): `leadSource.${LeadSource}` {
  return `leadSource.${source}`
}
