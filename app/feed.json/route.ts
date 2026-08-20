import { getAllInsights } from "@/lib/insights";
import { SIGNALS } from "@/lib/signals";
import { PERSON_NAME, PERSON_URL } from "@/lib/seo/branding";
import { insightNaarTekst, signalNaarTekst } from "@/lib/seo/plattetekst";

// JSON Feed 1.1 — https://www.jsonfeed.org/version/1.1/
// Covers BOTH /insights and /signals in one feed. RSS readers don't
// negotiate language, so we ship the English variant — the sitemap
// carries hreflang for the rest. Cached at the edge for an hour.

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://juandiazllc.com";

export const dynamic = "force-static";
export const revalidate = 3600;

type FeedItem = {
  id: string;
  url: string;
  title: string;
  summary: string;
  content_text: string;
  date_published: string;
  tags: string[];
  authors: { name: string }[];
};

function buildItems(): FeedItem[] {
  const insights: FeedItem[] = getAllInsights("en").map((p) => ({
    id: `${SITE}/en/insights/${p.slug}`,
    url: `${SITE}/en/insights/${p.slug}`,
    title: p.title,
    summary: p.summary,
    content_text: insightNaarTekst(p.body),
    date_published: new Date(p.publishedAt).toISOString(),
    tags: [p.tag],
    authors: [{ name: PERSON_NAME }],
  }));

  const signals: FeedItem[] = SIGNALS.map((s) => ({
    id: `${SITE}/en/signals/${s.slug}`,
    url: `${SITE}/en/signals/${s.slug}`,
    title: s.title,
    summary: s.excerpt,
    content_text: signalNaarTekst(s.body),
    date_published: new Date(s.date).toISOString(),
    tags: [s.tag],
    authors: [{ name: PERSON_NAME }],
  }));

  return [...insights, ...signals].sort((a, b) =>
    a.date_published > b.date_published ? -1 : 1
  );
}

export async function GET() {
  const items = buildItems();

  const feed = {
    version: "https://jsonfeed.org/version/1.1",
    title: "Juan Diaz — Insights & Signals",
    home_page_url: SITE,
    feed_url: `${SITE}/feed.json`,
    description:
      "Revenue-engine thinking from Juan Diaz, LLC. Essays, signals, operator ops.",
    language: "en-us",
    authors: [{ name: PERSON_NAME, url: PERSON_URL }],
    items,
  };

  return new Response(JSON.stringify(feed, null, 2), {
    headers: {
      "Content-Type": "application/feed+json; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
