import type { MetadataRoute } from "next";
import { getAllInsights } from "@/lib/insights";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://juandiazllc.com";

// Static public routes + locale variants. Philly CRM (/philly/*) is
// intentionally excluded - that's a gated app, not crawl-worthy content.
// Keep this list in sync with the nav and robots allow-list.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes: Array<{ path: string; priority: number; change: MetadataRoute.Sitemap[number]["changeFrequency"] }> = [
    { path: "", priority: 1.0, change: "weekly" },
    { path: "/story", priority: 0.85, change: "monthly" },
    { path: "/about", priority: 0.85, change: "monthly" },
    { path: "/now", priority: 0.7, change: "monthly" },
    { path: "/uses", priority: 0.65, change: "monthly" },
    { path: "/work", priority: 0.85, change: "weekly" },
    { path: "/sectors", priority: 0.8, change: "monthly" },
    { path: "/signals", priority: 0.8, change: "weekly" },
    { path: "/insights", priority: 0.9, change: "weekly" },
    { path: "/contact", priority: 0.7, change: "monthly" },
    { path: "/privacy", priority: 0.3, change: "yearly" },
  ];

  const insightRoutes = getAllInsights().map((p) => ({
    path: `/insights/${p.slug}`,
    priority: 0.8,
    change: "monthly" as const,
    lastMod: new Date(p.publishedAt),
  }));

  return [
    ...staticRoutes.map(({ path, priority, change }) => ({
      url: `${SITE}${path}`,
      lastModified: now,
      changeFrequency: change,
      priority,
    })),
    ...insightRoutes.map(({ path, priority, change, lastMod }) => ({
      url: `${SITE}${path}`,
      lastModified: lastMod,
      changeFrequency: change,
      priority,
    })),
  ];
}
