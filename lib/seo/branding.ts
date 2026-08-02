// Single source of truth for brand asset URLs used in JSON-LD, OpenGraph,
// and Twitter card metadata. Centralized so the operator can swap in real
// photos by editing one file instead of grepping the codebase.
//
// Pattern: every constant resolves to an absolute URL when SITE is set,
// or a path-relative URL otherwise. Path-relative is fine for OG (Next.js
// resolves them against the request origin) but JSON-LD wants absolute.
//
// **Operator action**: when real assets land at the canonical paths,
// drop the file and no code change is needed — only update the constant
// if the filename or extension changes.

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://juandiazllc.com";

/**
 * Founder portrait. Used as `Person.image` in JSON-LD across about,
 * insights, signals, layout. Falls back to the 512px PWA icon (raster-
 * compatible) until a real portrait is dropped at `/public/me/portrait.jpg`.
 */
export const AUTHOR_IMAGE_URL = `${SITE}/me/portrait.jpg`;

/**
 * Same as AUTHOR_IMAGE_URL but path-relative — for use in Next.js
 * Metadata API `openGraph.images[].url` which Next resolves against the
 * request origin. Using a path keeps preview deploys + multi-domain
 * setups working without env-var gymnastics.
 */
export const AUTHOR_IMAGE_PATH = "/me/portrait.jpg";

/**
 * Fallback used when the canonical asset hasn't shipped yet. The 512px
 * SVG icon exists today (`public/icon-512.svg`) and renders correctly
 * in JSON-LD ImageObject. OG cards prefer raster, so most platforms
 * will skip an SVG OG image — that's OK, the OG card just won't show
 * a preview image until portrait.jpg is dropped. JSON-LD gracefully
 * accepts SVG.
 *
 * To activate the fallback in JSON-LD/OG today (before the real photo
 * is ready), swap `AUTHOR_IMAGE_URL` to use `AUTHOR_IMAGE_FALLBACK_URL`
 * instead. We ship the canonical path by default so the moment the
 * file lands, everything works without a deploy.
 */
export const AUTHOR_IMAGE_FALLBACK_URL = `${SITE}/icon-512.svg`;

/**
 * Organization logo for JSON-LD `Organization.logo`. The 192px PWA
 * icon is the canonical brand mark and exists today.
 */
export const ORG_LOGO_URL = `${SITE}/icon.svg`;

/**
 * Het achtervoegsel dat `title.template` in app/layout.tsx aan elke paginatitel
 * plakt. Staat hier omdat de metadata-gate (metadata-locales.test.ts) hetzelfde
 * getal nodig heeft: Google kapt rond de 60 tekens, dus wat dit kost gaat af van
 * wat de pagina zelf mag zeggen.
 *
 * Was " · Juan Diaz, LLC" (17 tekens) tot 2026-08-02. Ingekort naar 12 omdat
 * er anders 43 tekens overbleven voor de titel — te weinig voor Duits en Spaans.
 * Gemeten: zelfs /pricing, de pagina die het patroon goed doet, viel in DE (45)
 * en ES (47) buiten de grens. Nu is de ruimte 48.
 *
 * Verander dit niet zonder de gate opnieuw te draaien.
 */
export const TITLE_SUFFIX = " · Juan Diaz";

/** Wat er overblijft voor de paginatitel zelf bij een SERP-limiet van 60. */
export const TITLE_BUDGET = 60 - TITLE_SUFFIX.length;

/**
 * Canonical `sameAs` profile set for the founder Person + the Organization —
 * single source of truth. Google treats sameAs as entity-disambiguation
 * signals (knowledge panel + author authority/E-E-A-T) and wants them
 * CONSISTENT across every JSON-LD block. Previously these drifted: layout had
 * linkedin+instagram, article.ts had github+linkedin+instagram, about had
 * github only. Reference this array everywhere instead of literals.
 */
export const PERSON_SAME_AS = [
  "https://linkedin.com/in/juanstefan",
  "https://github.com/bongartzdiaz",
  "https://instagram.com/diazelcazador",
];
