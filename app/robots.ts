import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://juandiazllc.com";

// Robots policy — let search engines crawl the public brand site, but
// block the private CRM sub-app (/philly/*), auth pages, and anything
// under /api. Sitemap pointer helps Google + Bing discover content.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/philly/",
          "/api/",
          "/login",
          "/app",
          "/dashboard",
          "/_next/",
        ],
      },
      {
        userAgent: ["GPTBot", "Google-Extended", "CCBot", "PerplexityBot"],
        allow: ["/", "/story", "/work", "/signals", "/sectors", "/insights", "/contact"],
        disallow: ["/philly/", "/api/", "/login"],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
