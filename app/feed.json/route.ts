import { getAllInsights } from "@/lib/insights";

// JSON Feed 1.1 — https://www.jsonfeed.org/version/1.1/
// Cleaner to consume than RSS for modern readers (NetNewsWire,
// Feedbin, Inoreader all speak it). Mirrors /rss.xml exactly.
//
// Cached at the edge for an hour — re-publishes don't need to be
// instantaneous and this keeps Vercel function invocations low.

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://juandiazllc.com";

export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
  const posts = getAllInsights();

  const feed = {
    version: "https://jsonfeed.org/version/1.1",
    title: "Juan Diaz LLC — Insights",
    home_page_url: `${SITE}/insights`,
    feed_url: `${SITE}/feed.json`,
    description:
      "Field notes on building revenue engines for operators — CRM, automations, energy funnels.",
    language: "en",
    authors: [{ name: "Juan Diaz", url: SITE }],
    items: posts.map((p) => ({
      id: `${SITE}/insights/${p.slug}`,
      url: `${SITE}/insights/${p.slug}`,
      title: p.title,
      summary: p.summary,
      content_text: p.body
        .map((b) => {
          if (b.type === "p" || b.type === "h2" || b.type === "quote") return b.text;
          if (b.type === "ul") return b.items.map((i) => `• ${i}`).join("\n");
          return "";
        })
        .join("\n\n"),
      date_published: new Date(p.publishedAt).toISOString(),
      tags: [p.tag],
      authors: [{ name: "Juan Diaz" }],
    })),
  };

  return new Response(JSON.stringify(feed, null, 2), {
    headers: {
      "Content-Type": "application/feed+json; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
