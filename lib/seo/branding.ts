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

import type { Locale } from "@/lib/i18n/dict";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://juandiazllc.com";

/**
 * Founder portrait. Used as `Person.image` / `Organization.image` in JSON-LD
 * across about, insights, signals, layout, article schema.
 *
 * WIJST NIET MEER NAAR portrait.jpg — 2026-08-12
 *
 * `/me/portrait.jpg` bestaat niet: gemeten op productie gaf hij 404. Daardoor
 * verwees de JSON-LD op elke pagina naar een kapotte afbeelding (7 plekken:
 * Organization.image overal + Person.image op /about), en Google diskwalificeert
 * een entiteit met een niet-crawlbare `image` voor rich results en het
 * kennispaneel. Zelfde 404 zat op /about's og:image.
 *
 * Tot er een echt portret staat wijzen we naar `/opengraph-image` — de
 * gegenereerde 1200×630 PNG die wél 200 geeft (zie OG_IMAGES). Een branded
 * raster-afbeelding, universeel geaccepteerd door zowel JSON-LD als OG.
 *
 * Zodra er een echte foto op `/public/me/portrait.jpg` staat: zet deze twee
 * regels terug op `/me/portrait.jpg` en alles pakt de foto op zonder verdere
 * wijziging.
 */
export const AUTHOR_IMAGE_URL = `${SITE}/opengraph-image`;

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
 * De deelafbeelding voor OpenGraph en Twitter. Wijst naar de gegenereerde
 * route `app/opengraph-image.tsx` — gemeten op productie: HTTP 200, 88 kB PNG.
 *
 * WAAROM DIT EEN CONSTANTE IS, EN GEEN OVERERVING
 *
 * Next voegt metadata **ondiep** samen: declareert een pagina `openGraph`, dan
 * vervángt dat object dat van de layout erboven — inclusief `images`. Elke
 * pagina onder `app/[locale]` declareert `openGraph` om `locale` en
 * `alternateLocale` te zetten, en liet daarmee de afbeelding van de
 * root-layout vallen.
 *
 * Gemeten 2026-08-12 over alle 176 sitemap-URL's: 92 pagina's serveerden geen
 * `og:image`, terwijl `twitter:card` overal `summary_large_image` beloofde.
 * Daaronder de homepage, /pricing, /contact en elke sectorpagina — precies wat
 * je in outreach deelt. De 84 die het wél goed deden waren de detailpagina's
 * met een eigen `opengraph-image.tsx` op hetzelfde segment, plus /about.
 *
 * Zet dit dus in ELKE `openGraph`-declaratie. Overerven werkt hier niet, en
 * dat is geen bug in Next maar de gedocumenteerde samenvoegregel.
 * `metadata-locales.test.ts` bewaakt het.
 *
 * WAAROM DIT EEN FUNCTIE IS, EN GEEN CONSTANTE MEER
 *
 * Tot 2026-08-26 wees dit naar `/opengraph-image`, de wortelkaart. Die kaart
 * draagt Engelse kopij, dus wie /nl of /de deelde kreeg een Engelse tagline —
 * op elke pagina, in elke taal. Nu wijst het per taal naar
 * `/{taal}/opengraph-image` (app/[locale]/opengraph-image.tsx).
 *
 * De wortelkaart blijft bestaan en is bewust NIET vertaald: hij is de
 * entiteitsafbeelding waar AUTHOR_IMAGE_PATH naar wijst voor Person.image en
 * Organization.image in de JSON-LD. Eén entiteit, één afbeelding — zie #198,
 * dat vier losse Person-knopen juist tot één terugbracht.
 */
export function ogImages(l: Locale) {
  return [
    {
      url: `/${l}/opengraph-image`,
      width: 1200,
      height: 630,
      alt: "Juan Diaz, LLC",
    },
  ];
}

/** Dezelfde afbeelding in de vorm die `twitter.images` verwacht. */
export function twitterImages(l: Locale) {
  return [`/${l}/opengraph-image`];
}

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

/* ── De identiteit van de persoon, uit één bron ──────────────────────────
 *
 * Tot 2026-08-20 beschreven drie plekken dezelfde persoon en waren ze het
 * oneens. Gemeten:
 *
 *   app/[locale]/layout.tsx   name "Juan Stefan Diaz"           url /{l}/about
 *   app/[locale]/about/page   name "Juan Stefan Bongartz Diaz"  url /about
 *   lib/seo/article.ts        name "Juan Stefan Bongartz Diaz"  url /about
 *
 * Drie gevolgen tegelijk. Twee verschillende namen, dus het onderscheidende
 * woord stond in de ene knoop wel en in de andere niet. Geen enkele knoop droeg
 * een `@id`, dus er was geen bewijs dat het één entiteit is in plaats van drie
 * personen. En `url` wees twee van de drie keer naar /about, wat 307 geeft naar
 * /en/about, terwijl de derde de canonieke taal-geprefixte vorm gebruikte.
 *
 * WAAROM ALLE DRIE DE NAMEN ERIN STAAN. Ze doen verschillend werk. De volle
 * vorm is bijna uniek en het makkelijkst te winnen; "Juan Stefan Diaz" is de
 * variant die in de meting van 2026-08-20 al bovenaan stond; "Juan Diaz" is wat
 * iemand intikt die de naam hoorde, en is verzadigd met naamgenoten — een
 * bokser, meerdere voetballers, een wijk in Panama-Stad. schema.org lost dat op
 * met één `name` en een lijst `alternateName`, zodat het drie ingangen naar
 * dezelfde knoop zijn in plaats van drie knopen.
 *
 * `PERSON_ID` is bewust taal-onafhankelijk: vier vertaalde /about-pagina's
 * beschrijven één persoon, geen vier. De canonieke Engelse URL is de ankerplek.
 * ------------------------------------------------------------------------ */

/** Canonieke naam. De vorm die in `Person.name` staat. */
export const PERSON_NAME = "Juan Stefan Bongartz Diaz";

/** De andere twee ingangen, als `Person.alternateName`. */
export const PERSON_ALTERNATE_NAMES = ["Juan Stefan Diaz", "Juan Diaz"];

/** Stabiele knoop-identiteit. Elke Person-knoop op de site draagt deze `@id`. */
export const PERSON_ID = `${SITE}/en/about#juan`;

/** De pagina die over de persoon gaat. Taal-geprefixt, dus geen 307. */
export const PERSON_URL = `${SITE}/en/about`;

/* ── De tweede organisatie waar deze persoon aan vastzit ──────────────────
 *
 * `worksFor` hierboven draagt de rechtspersoon van deze site: Juan Diaz, LLC.
 * Lucen AI is iets anders — een bedrijf met drie oprichters, waarvan Juan de
 * CTO is. Dat staat woordelijk op hun eigen /about, met exact de lange
 * naamvorm die `PERSON_NAME` draagt. Dat maakt het een controleerbare claim en
 * geen zelfbenoeming, en daarom hoort hij in het schema.
 *
 * WAAROM `affiliation` EN NIET `sameAs`. `sameAs` is het veld waarmee Google
 * verifieert dat twee adressen DEZELFDE entiteit beschrijven; een bedrijfssite
 * beschrijft de persoon niet. Diezelfde verwarring stond tot 2026-08-20 in
 * ORG_SAME_AS, waar persoonlijke profielen aan de rechtspersoon hingen.
 * `affiliation` zegt wat het is: een organisatie waar deze persoon bij hoort.
 *
 * `worksFor` was al bezet en blijft bezet. Twee werkgevers in dat veld maakt
 * geen van beide sterker.
 *
 * NAGEMETEN OP 2026-08-20. https://lucenai.eu/ geeft 200 over TLS, www 301
 * naar de apex, en /about noemt "Juan Stefan Bongartz Diaz — Co-Founder |
 * CTO". Let op: dit adres is NIET lucen.ai. Dat laatste komt in deze repo nog
 * voor in de toelichting bij `lib/contactadressen.test.ts` en is een geparkeerd
 * Namecheap-domein zonder werkende https. Twee adressen, één merknaam.
 *
 * De bereikbaarheid wordt bewaakt in `lib/seo/venture-adressen.ts`, dat in de
 * dagelijkse productie-audit draait en niet in de PR-audit — een storing bij
 * een ander mag geen merge blokkeren.
 * ------------------------------------------------------------------------ */

/** Naam van de organisatie waar de persoon medeoprichter/CTO van is. */
export const AFFILIATIE_NAAM = "Lucen AI";

/** Canoniek adres van die organisatie. Apex, https, geen slash-staart. */
export const AFFILIATIE_URL = "https://lucenai.eu";

/** Naam en knoop-identiteit van de rechtspersoon. */
export const ORG_NAME = "Juan Diaz, LLC";
export const ORG_ID = `${SITE}#organization`;

/**
 * `sameAs` van de ORGANISATIE. Bewust een andere lijst dan `PERSON_SAME_AS`:
 * een bedrijfspagina op LinkedIn hoort bij de rechtspersoon, een persoonlijke
 * GitHub en Instagram bij de mens. Ze door elkaar halen vertelt Google dat het
 * één ding is.
 *
 * TWITTER IS ER BEWUST UIT. `app/layout.tsx` droeg tot 2026-08-20
 * `https://twitter.com/juandiazllc` in deze lijst. Gemeten op die datum: 404,
 * na doorverwijzing naar `x.com/juandiazllc`. Die handle bestaat niet.
 *
 * Een dood adres in `sameAs` is niet neutraal. Dit is het veld waarmee Google
 * je identiteit vérifieert: het volgt de link en kijkt of daar hetzelfde
 * subject staat. Een 404 is dus geen ontbrekend signaal maar een mislukte
 * controle — dezelfde fout als de venture die een hostnaam droeg die niet in
 * DNS stond (#188). Zet er alleen profielen in die je hebt nagelopen.
 *
 * GITHUB EN INSTAGRAM STAAN HIER OOK NIET. Die zijn van de mens, niet van de
 * rechtspersoon: `github.com/bongartzdiaz` is een persoonlijk account. Ze staan
 * in `PERSON_SAME_AS`, waar ze thuishoren. Tot 2026-08-20 stonden ze in beide,
 * en dat vertelt Google dat de persoon en het bedrijf hetzelfde ding zijn.
 *
 * Minder signaal is beter dan verkeerd signaal. Komt er een echte bedrijfs-X of
 * bedrijfs-Instagram, dan hoort die hier — na hem te hebben opgevraagd.
 *
 * Stand 2026-08-20: linkedin/company 200, github 200, linkedin/in 200,
 * instagram 200. Let op dat LinkedIn ook 200 geeft op een inlogmuur, dus die
 * twee zijn van buitenaf niet hard te bewijzen — de 404 op X wél.
 */
export const ORG_SAME_AS = [
  "https://linkedin.com/company/juandiazllc",
];
