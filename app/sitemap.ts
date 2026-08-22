import type { MetadataRoute } from "next";
import { getAllInsights, insightMarkets } from "@/lib/insights";
import { VENTURES } from "@/lib/ventures";
import { SIGNALS } from "@/lib/signals";
import { SECTORS } from "@/lib/sectors";
import { LOCALES, type Locale } from "@/lib/i18n/dict";
import { localesVoor } from "@/lib/i18n/enkele-taal";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://juandiazllc.com";

function toSlug(tag: string) {
  return tag.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

type Entry = {
  path: string;
  priority: number;
  change: MetadataRoute.Sitemap[number]["changeFrequency"];
  lastMod?: Date;
  /** Locales this entry exists in. Undefined = all four. Used so Dutch-only
   *  insights only emit a /nl URL (+ nl hreflang), not /en,/de,/es. */
  locales?: Locale[];
};

// Emits one URL per (locale, path) combination with hreflang alternates
// so Google sees the four-language site. Er zijn geen afgeschermde routes
// meer om over te slaan: /philly, /app, /dashboard en /login zijn met het
// CRM meeverhuisd naar zijn eigen deployment. Alles wat hier staat is
// publiek en crawlbaar.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticEntries: Entry[] = [
    { path: "", priority: 1.0, change: "weekly" },
    { path: "/story", priority: 0.85, change: "monthly" },
    { path: "/about", priority: 0.9, change: "monthly" },
    { path: "/now", priority: 0.7, change: "monthly" },
    { path: "/uses", priority: 0.65, change: "monthly" },
    { path: "/work", priority: 0.85, change: "weekly" },
    { path: "/services", priority: 0.85, change: "monthly" },
    { path: "/sectors", priority: 0.8, change: "monthly" },
    { path: "/signals", priority: 0.8, change: "weekly" },
    { path: "/insights", priority: 0.9, change: "weekly" },
    { path: "/tools/energy-roi", priority: 0.75, change: "monthly" },
    // Alleen /nl — zie lib/i18n/enkele-taal.ts voor de reden.
    { path: "/tools/lekkage-scan", priority: 0.75, change: "monthly", locales: localesVoor("/tools/lekkage-scan", LOCALES) },
    { path: "/pricing", priority: 0.9, change: "monthly" },
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
    locales: insightMarkets(p),
  }));

  const tagSet = new Set(getAllInsights().map((p) => toSlug(p.tag)));
  const tagEntries: Entry[] = Array.from(tagSet).map((t) => ({
    path: `/insights/tag/${t}`,
    priority: 0.6,
    change: "weekly",
    locales: LOCALES.filter((loc) => getAllInsights(loc).some((p) => toSlug(p.tag) === t)),
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
    const locs = entry.locales ?? LOCALES;
    const languages: Record<string, string> = {};
    for (const l of locs) languages[l] = `${SITE}/${l}${entry.path}`;
    languages["x-default"] = `${SITE}/${locs.includes("en") ? "en" : locs[0]}${entry.path}`;
    return locs.map((locale) => ({
      url: `${SITE}/${locale}${entry.path}`,
      lastModified: entry.lastMod ?? now,
      changeFrequency: entry.change,
      priority: entry.priority,
      alternates: { languages },
    }));
  });
}
