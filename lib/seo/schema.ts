// Re-usable JSON-LD schema builders for marketing pages. Kept tiny and
// dependency-free so any server component can import + emit without pulling
// client bundles. AI Overview citations pull heavily from FAQPage and
// Service schemas, so every answer-box-targetable page should emit one.

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://juandiazllc.com";

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
