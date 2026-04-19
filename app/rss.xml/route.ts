import { getAllInsights } from "@/lib/insights";
import { SIGNALS } from "@/lib/signals";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://juandiazllc.com";

// RSS 2.0 feed covering BOTH /insights and /signals. RSS readers don't
// negotiate language, so we serve the English variant (the sitemap
// carries hreflang for the rest). The feed is re-rendered per request;
// since the lists are static, that is cheap. escape() keeps user-visible
// copy safe even if future posts contain characters that break XML.
function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

type FeedItem = {
  title: string;
  url: string;
  description: string;
  publishedAt: string;
  tag: string;
};

function collectItems(): FeedItem[] {
  const insights: FeedItem[] = getAllInsights().map((p) => ({
    title: p.title,
    url: `${SITE}/en/insights/${p.slug}`,
    description: p.summary,
    publishedAt: p.publishedAt,
    tag: p.tag,
  }));
  const signals: FeedItem[] = SIGNALS.map((s) => ({
    title: s.title,
    url: `${SITE}/en/signals/${s.slug}`,
    description: s.excerpt,
    publishedAt: s.date,
    tag: s.tag,
  }));
  return [...insights, ...signals].sort((a, b) =>
    a.publishedAt > b.publishedAt ? -1 : 1
  );
}

export async function GET(): Promise<Response> {
  const entries = collectItems();
  const items = entries
    .map(
      (p) => `
    <item>
      <title>${escape(p.title)}</title>
      <link>${p.url}</link>
      <guid isPermaLink="true">${p.url}</guid>
      <description>${escape(p.description)}</description>
      <pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>
      <category>${escape(p.tag)}</category>
    </item>`
    )
    .join("");

  const lastBuildDate = entries.length
    ? new Date(entries[0].publishedAt).toUTCString()
    : new Date().toUTCString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Juan Diaz — Insights &amp; Signals</title>
    <link>${SITE}</link>
    <description>Revenue-engine thinking from Juan Diaz LLC. Essays, signals, operator ops.</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml"/>${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
    },
  });
}
