// Re-usable JSON-LD schema builders for marketing pages. Kept tiny and
// dependency-free so any server component can import + emit without pulling
// client bundles. AI Overview citations pull heavily from FAQPage and
// Service schemas, so every answer-box-targetable page should emit one.

import type { Locale } from "@/lib/i18n/dict";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://juandiazllc.com";

const IN_LANGUAGE: Record<Locale, string> = {
  en: "en-US",
  nl: "nl-NL",
  de: "de-DE",
  es: "es-ES",
};

export type FaqItem = { q: string; a: string };

export function faqSchema(items: FaqItem[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: it.a,
      },
    })),
  };
}

export function serviceSchema(opts: {
  name: string;
  description: string;
  slug: string;
  areaServed?: string[];
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: opts.name,
    description: opts.description,
    url: `${SITE}/sectors/${opts.slug}`,
    provider: {
      "@type": "Organization",
      name: "Juan Diaz, LLC",
      url: SITE,
    },
    areaServed: opts.areaServed ?? ["US", "NL", "DE", "ES"],
  };
}

// CollectionPage for index pages (insights, signals, work, sectors). Gives
// Google a hint that this is a list of related articles/services plus the
// inLanguage for hreflang alignment.
export function collectionPageSchema(opts: {
  locale: Locale;
  /** Unprefixed path like "/insights". */
  path: string;
  name: string;
  description: string;
  items?: Array<{ name: string; url: string; description?: string }>;
}): Record<string, unknown> {
  const url = `${SITE}/${opts.locale}${opts.path}`;
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: opts.name,
    description: opts.description,
    url,
    inLanguage: IN_LANGUAGE[opts.locale],
    isPartOf: {
      "@type": "WebSite",
      name: "Juan Diaz, LLC",
      url: SITE,
    },
    ...(opts.items && opts.items.length > 0
      ? {
          mainEntity: {
            "@type": "ItemList",
            itemListElement: opts.items.map((it, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: it.url.startsWith("http") ? it.url : `${SITE}${it.url}`,
              name: it.name,
              ...(it.description ? { description: it.description } : {}),
            })),
          },
        }
      : {}),
  };
}

// WebPage schema for leaf pages (about, contact, story, now, uses, privacy).
// Lightweight alternative to BlogPosting where the content isn't an article.
export function webPageSchema(opts: {
  locale: Locale;
  path: string;
  name: string;
  description: string;
}): Record<string, unknown> {
  const url = `${SITE}/${opts.locale}${opts.path}`;
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: opts.name,
    description: opts.description,
    url,
    inLanguage: IN_LANGUAGE[opts.locale],
    isPartOf: {
      "@type": "WebSite",
      name: "Juan Diaz, LLC",
      url: SITE,
    },
  };
}

// SoftwareApplication for the ventures under /work/*. Each internal
// product (Voltafy, Philly CRM, Help Mij Besparen, …) gets this on
// its detail page — unlocks product-card eligibility in Google and
// lets Perplexity / ChatGPT cite the product with structured facts
// (name, publisher, audience) instead of a generic page snippet.
export function softwareApplicationSchema(opts: {
  locale: Locale;
  slug: string;
  name: string;
  description: string;
  /** Landing URL for the product itself (e.g. voltafy.nl). */
  external: string;
  /** Free-form sector string, used as `applicationCategory`. */
  sector: string;
  /** Launch year or YYYY-MM-DD; helpful for datePublished when known. */
  launchedYear?: string;
  /** Tech stack array — maps to `softwareRequirements`. */
  stack?: string[];
  /** Screenshot / logo URL for image-rich cards. */
  image?: string;
}): Record<string, unknown> {
  const detailUrl = `${SITE}/${opts.locale}/work/${opts.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${detailUrl}#software`,
    name: opts.name,
    description: opts.description,
    url: opts.external,
    mainEntityOfPage: detailUrl,
    applicationCategory: opts.sector,
    inLanguage: IN_LANGUAGE[opts.locale],
    // Browser-based products — no install required. Every venture
    // here is a web app, not a mobile binary.
    operatingSystem: "Web",
    publisher: {
      "@type": "Organization",
      "@id": `${SITE}/#organization`,
      name: "Juan Diaz, LLC",
      url: SITE,
    },
    creator: { "@id": `${SITE}/about#person` },
    ...(opts.launchedYear ? { datePublished: opts.launchedYear } : {}),
    ...(opts.stack && opts.stack.length > 0 ? { softwareRequirements: opts.stack.join(", ") } : {}),
    ...(opts.image ? { image: opts.image } : {}),
    // We don't sell consumer SKUs with fixed pricing — leave `offers`
    // off rather than fabricate one. Google tolerates its absence.
    isAccessibleForFree: false,
  };
}

// AboutPage — purpose-built schema for the /about route. Distinct
// from the Person + ProfilePage already on that page: AboutPage says
// "this URL describes an entity" while ProfilePage says "this URL is
// the canonical profile for a Person". Both help disambiguation.
export function aboutPageSchema(opts: {
  locale: Locale;
  name: string;
  description: string;
}): Record<string, unknown> {
  const url = `${SITE}/${opts.locale}/about`;
  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: opts.name,
    description: opts.description,
    url,
    inLanguage: IN_LANGUAGE[opts.locale],
    isPartOf: {
      "@type": "WebSite",
      "@id": `${SITE}/#organization`,
      name: "Juan Diaz, LLC",
      url: SITE,
    },
    about: { "@id": `${SITE}/about#person` },
  };
}

export function contactPointSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    url: `${SITE}/contact`,
    mainEntity: {
      "@type": "Organization",
      name: "Juan Diaz, LLC",
      url: SITE,
      contactPoint: [
        {
          "@type": "ContactPoint",
          contactType: "sales",
          availableLanguage: ["English", "Dutch", "German", "Spanish"],
          areaServed: ["US", "NL", "DE", "ES"],
        },
      ],
    },
  };
}

/* Bundle DA — pricing-page schema for SaaS Rich Results.
 * Emits a SoftwareApplication describing the Philly CRM with an
 * AggregateOffer rolling up the priced tiers. Google needs at least
 * `offers` (with price + priceCurrency) to render the Pricing chip
 * in search results. We emit one Offer per tier so the rich-result
 * test can show each plan's name/price.
 *
 * The Enterprise tier is NOT in the offer list because it has no
 * fixed price; Google's validator rejects offers with null/zero
 * price. Listing only the priced tiers keeps the markup honest. */
export interface PricingTierInput {
  id: string;
  name: string;
  /** Numeric price in EUR (e.g. 49 for €49/month). Use 0 to skip. */
  priceEur: number;
  description: string;
}

export function pricingPlanSchema(opts: {
  locale: Locale;
  productName: string;
  productDescription: string;
  tiers: PricingTierInput[];
  /** Cycle for the offers — schema.org Period values. SaaS = P1M. */
  billingCycle?: string;
}): Record<string, unknown> {
  const cycle = opts.billingCycle ?? "P1M";
  const url = `${SITE}/${opts.locale}/pricing`;
  const priced = opts.tiers.filter((t) => t.priceEur > 0);
  const prices = priced.map((t) => t.priceEur);
  const lowPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const highPrice = prices.length > 0 ? Math.max(...prices) : 0;

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${url}#software`,
    name: opts.productName,
    description: opts.productDescription,
    url,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "CRM",
    operatingSystem: "Web",
    inLanguage: IN_LANGUAGE[opts.locale],
    publisher: {
      "@type": "Organization",
      "@id": `${SITE}/#organization`,
      name: "Juan Diaz, LLC",
      url: SITE,
    },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "EUR",
      lowPrice: lowPrice.toFixed(2),
      highPrice: highPrice.toFixed(2),
      offerCount: priced.length,
      offers: priced.map((t) => ({
        "@type": "Offer",
        name: t.name,
        description: t.description,
        price: t.priceEur.toFixed(2),
        priceCurrency: "EUR",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: t.priceEur.toFixed(2),
          priceCurrency: "EUR",
          billingDuration: cycle,
          unitText: "MONTH",
        },
        availability: "https://schema.org/InStock",
        url: `${url}#tier-${t.id}`,
      })),
    },
  };
}
