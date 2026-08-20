// Shared BlogPosting + Person schema for article pages (insights, signals).
// Centralising here keeps author identity / publisher / sameAs consistent
// across every article and makes it a one-line change to update the
// founder's bio or social profiles — instead of editing each page.

import type { Locale } from "@/lib/i18n/dict";
import {
  AUTHOR_IMAGE_URL,
  ORG_LOGO_URL,
  PERSON_SAME_AS,
  PERSON_NAME,
  PERSON_ALTERNATE_NAMES,
  PERSON_ID,
  PERSON_URL,
  ORG_NAME,
  ORG_ID,
} from "@/lib/seo/branding";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://juandiazllc.com";

// BCP-47 tags keyed by our route locale. schema.org inLanguage expects
// a full language + region tag so Google can match the article to the
// right hreflang variant.
const IN_LANGUAGE: Record<Locale, string> = {
  en: "en-US",
  nl: "nl-NL",
  de: "de-DE",
  es: "es-ES",
};

export function bcp47(locale: Locale): string {
  return IN_LANGUAGE[locale];
}

// Canonical Person schema for Juan — the legal name is what Google uses
// for knowledge-panel identity, with the short form as an alternateName
// so existing bylines still resolve to the same entity.
export const AUTHOR_PERSON = {
  "@type": "Person" as const,
  "@id": PERSON_ID,
  name: PERSON_NAME,
  alternateName: PERSON_ALTERNATE_NAMES,
  url: PERSON_URL,
  image: AUTHOR_IMAGE_URL,
  jobTitle: "Founder, Juan Diaz, LLC",
  worksFor: {
    "@type": "Organization",
    "@id": ORG_ID,
    name: ORG_NAME,
    url: SITE,
  },
  sameAs: PERSON_SAME_AS,
};

export const PUBLISHER_ORG = {
  "@type": "Organization" as const,
  name: "Juan Diaz, LLC",
  url: SITE,
  logo: { "@type": "ImageObject", url: ORG_LOGO_URL },
};

export interface BlogPostingInput {
  locale: Locale;
  /** Unprefixed path like `/insights/foo` or `/signals/bar`. */
  path: string;
  headline: string;
  description: string;
  datePublished: string;
  dateModified?: string;
  tag?: string;
  /** Optional override; defaults to the site-level OG portrait. */
  image?: string;
  articleBody?: string;
}

export function blogPostingSchema(input: BlogPostingInput): Record<string, unknown> {
  const url = `${SITE}/${input.locale}${input.path.startsWith("/") ? input.path : `/${input.path}`}`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: input.headline,
    description: input.description,
    datePublished: input.datePublished,
    dateModified: input.dateModified ?? input.datePublished,
    inLanguage: IN_LANGUAGE[input.locale],
    author: AUTHOR_PERSON,
    publisher: PUBLISHER_ORG,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    image: input.image ?? AUTHOR_IMAGE_URL,
    ...(input.tag ? { keywords: input.tag } : {}),
    ...(input.articleBody ? { articleBody: input.articleBody } : {}),
    isAccessibleForFree: true,
  };
}
