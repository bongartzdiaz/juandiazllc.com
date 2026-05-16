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

// Product + AggregateOffer for /pricing. Each public tier becomes
// an Offer; Enterprise is dropped from the structured data since it's
// contact-us only (no price = no Offer eligible for rich-results).
export type PricingTierOffer = {
  name: string;
  description: string;
  priceEuro: number; // monthly per-seat price, e.g. 40
  url: string; // CTA href, will be absolute-ified
};

export function productOfferSchema(opts: {
  locale: Locale;
  productName: string;
  productDescription: string;
  tiers: PricingTierOffer[];
}): Record<string, unknown> {
  const url = `${SITE}/${opts.locale}/pricing`;
  const prices = opts.tiers.map((t) => t.priceEuro);
  const lowPrice = Math.min(...prices);
  const highPrice = Math.max(...prices);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: opts.productName,
    description: opts.productDescription,
    url,
    brand: {
      "@type": "Brand",
      name: "DEUS",
    },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "EUR",
      lowPrice: lowPrice.toString(),
      highPrice: highPrice.toString(),
      offerCount: opts.tiers.length,
      offers: opts.tiers.map((tier) => ({
        "@type": "Offer",
        name: tier.name,
        description: tier.description,
        price: tier.priceEuro.toString(),
        priceCurrency: "EUR",
        url: tier.url.startsWith("http") ? tier.url : `${SITE}${tier.url}`,
        availability: "https://schema.org/InStock",
        category: "SaaS subscription",
      })),
    },
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
      telephone: "+31653142656",
      contactPoint: [
        {
          "@type": "ContactPoint",
          contactType: "sales",
          telephone: "+31653142656",
          availableLanguage: ["English", "Dutch", "German", "Spanish"],
          areaServed: ["US", "NL", "DE", "ES"],
          hoursAvailable: {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            opens: "09:00",
            closes: "18:00",
          },
        },
        {
          "@type": "ContactPoint",
          contactType: "customer support",
          telephone: "+31653142656",
          availableLanguage: ["English", "Dutch", "German", "Spanish"],
          areaServed: ["US", "NL", "DE", "ES"],
        },
      ],
    },
  };
}
