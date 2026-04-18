// Small helper to produce BreadcrumbList JSON-LD. Used on detail
// pages (/insights/[slug], /work/[slug], /insights/tag/[tag]) so
// Google + AI search can render breadcrumb trails in SERPs instead
// of the raw URL.

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://juandiazllc.com";

export type Crumb = { name: string; path: string };

export function breadcrumbSchema(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.path.startsWith("http") ? c.path : `${SITE}${c.path}`,
    })),
  };
}
