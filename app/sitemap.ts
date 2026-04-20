import type { MetadataRoute } from "next";
import { getAllInsights } from "@/lib/insights";
import { VENTURES } from "@/lib/ventures";
import { SIGNALS } from "@/lib/signals";
import { SECTORS } from "@/lib/sectors";
import { LOCALES } from "@/lib/i18n/dict";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://juandiazllc.com";

function toSlug(tag: string) {
  return tag.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

type Entry = {
  path: string;
  priority: number;
  change: MetadataRoute.Sitemap[number]["changeFrequency"];
  lastMod?: Date;
};

// Emits one URL per (locale, path) combination with hreflang alternates
// so Google sees the four-language site. Gated + auth-only routes
// (/dashboard, /app, /login) are omitted — not crawl-worthy.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticEntries: Entry[] = [
    { path: "", priority: 1.0, change: "weekly" },
    { path: "/story", priority: 0.85, change: "monthly" },
    { path: "/about", priority: 0.9, change: "monthly" },
    { path: "/now", priority: 0.7, change: "monthly" },
    { path: "/uses", priority: 0.65, change: "monthly" },
    { path: "/work", priority: 0.85, change: "weekly" },
    { path: "/sectors", priority: 0.8, change: "monthly" },
    { path: "/signals", priority: 0.8, change: "weekly" },
    { path: "/insights", priority: 0.9, change: "weekly" },
    { path: "/tools/energy-roi", priority: 0.75, change: "monthly" },
    { path: "/contact", priority: 0.7, change: "monthly" },
    { path: "/privacy", priority: 0.3, change: "yearly" },
    { path: "/impressum", priority: 0.3, change: "yearly" },
  ];

  const ventureEntries: Entry[] = VENTURES.map((v) => ({
    path: `/work/${v.slug}`,
    priority: 0.8,
    change: "monthly",
  }));

  const sectorEntries: Entry[] = SECTORS.map((s) => ({
    path: `/sectors/${s.slug}`,
    priority: 0.75,
    change: "monthly",
  }));

  const signalEntries: Entry[] = SIGNALS.map((s) => ({
    path: `/signals/${s.slug}`,
    priority: 0.7,
    change: "monthly",
  }));

  const insightEntries: Entry[] = getAllInsights().map((p) => ({
    path: `/insights/${p.slug}`,
    priority: 0.8,
    change: "monthly",
    lastMod: new Date(p.publishedAt),
  }));

  const tagSet = new Set(getAllInsights().map((p) => toSlug(p.tag)));
  const tagEntries: Entry[] = Array.from(tagSet).map((t) => ({
    path: `/insights/tag/${t}`,
    priority: 0.6,
    change: "weekly",
  }));

  const all = [
    ...staticEntries,
    ...ventureEntries,
    ...sectorEntries,
    ...signalEntries,
    ...insightEntries,
    ...tagEntries,
  ];

  return all.flatMap((entry) => {
    const languages: Record<string, string> = {};
    for (const l of LOCALES) languages[l] = `${SITE}/${l}${entry.path}`;
    languages["x-default"] = `${SITE}/en${entry.path}`;
    return LOCALES.map((locale) => ({
      url: `${SITE}/${locale}${entry.path}`,
      lastModified: entry.lastMod ?? now,
      changeFrequency: entry.change,
      priority: entry.priority,
      alternates: { languages },
    }));
  });
}
