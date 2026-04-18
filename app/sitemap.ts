import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://juandiazllc.com";

// Static public routes + locale variants. Philly CRM (/philly/*) is
// intentionally excluded — that's a gated app, not crawl-worthy content.
// Keep this list in sync with the nav and robots allow-list.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: Array<{ path: string; priority: number; change: MetadataRoute.Sitemap[number]["changeFrequency"] }> = [
    { path: "", priority: 1.0, change: "weekly" },
    { path: "/story", priority: 0.85, change: "monthly" },
    { path: "/work", priority: 0.85, change: "weekly" },
    { path: "/sectors", priority: 0.8, change: "monthly" },
    { path: "/signals", priority: 0.8, change: "weekly" },
    { path: "/contact", priority: 0.7, change: "monthly" },
  ];
  return routes.map(({ path, priority, change }) => ({
    url: `${SITE}${path}`,
    lastModified: now,
    changeFrequency: change,
    priority,
  }));
}
