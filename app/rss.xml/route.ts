import { getAllInsights } from "@/lib/insights";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://juandiazllc.com";

// RSS 2.0 feed for /insights. Lets readers subscribe via reader apps
// and gives search crawlers a clean index of every post. The feed is
// re-rendered per request; since the list is static, that is cheap.
// escape() keeps user-visible copy safe even if future posts contain
// characters that break XML.
function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(): Promise<Response> {
  const posts = getAllInsights();
  const items = posts
    .map(
      (p) => `
    <item>
      <title>${escape(p.title)}</title>
      <link>${SITE}/insights/${p.slug}</link>
      <guid isPermaLink="true">${SITE}/insights/${p.slug}</guid>
      <description>${escape(p.summary)}</description>
      <pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>
      <category>${escape(p.tag)}</category>
    </item>`
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Juan Diaz LLC — Insights</title>
    <link>${SITE}/insights</link>
    <description>Field notes on building the systems that move real P&amp;Ls.</description>
    <language>en-US</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
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
