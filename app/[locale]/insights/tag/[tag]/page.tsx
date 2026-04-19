import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllInsights, formatDate } from "@/lib/insights";
import { breadcrumbSchema } from "@/lib/breadcrumb";
import { LOCALES } from "@/lib/i18n/dict";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";

// Tag archive pages — /insights/tag/systems, /insights/tag/energy etc.
// Each becomes a dedicated SEO surface for a topic cluster. Built
// statically at build time; generateStaticParams produces one page
// per distinct tag. Keeps the site map tidy without manual upkeep.
//
// URL convention: tag slugs are lowercased and non-alphanum chars
// become hyphens, so "Real Estate" -> "real-estate". The page title
// uses the canonical case from the first post that declares the tag.

function toSlug(tag: string) {
  return tag
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function uniqueTags() {
  const map = new Map<string, string>(); // slug -> canonical tag
  for (const p of getAllInsights()) {
    const slug = toSlug(p.tag);
    if (!map.has(slug)) map.set(slug, p.tag);
  }
  return map;
}

export function generateStaticParams() {
  const tags = Array.from(uniqueTags().keys());
  return LOCALES.flatMap((locale) => tags.map((tag) => ({ locale, tag })));
}

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string; tag: string }> }
): Promise<Metadata> {
  const { locale, tag } = await params;
  const l = assertLocale(locale);
  const canonical = uniqueTags().get(tag);
  if (!canonical) return { title: "Tag not found" };
  return {
    title: `${canonical} insights — revenue engines for operators`,
    description: `Everything I've written on ${canonical.toLowerCase()} — field notes, case patterns, decisions that moved real P&Ls.`,
    alternates: buildAlternates(l, `/insights/tag/${tag}`),
    openGraph: {
      type: "website",
      url: `/${l}/insights/tag/${tag}`,
      title: `${canonical} insights — Juan Diaz LLC`,
      locale: ogLocale(l),
      alternateLocale: alternateOgLocales(l),
    },
  };
}

export default async function TagArchivePage(
  { params }: { params: Promise<{ locale: string; tag: string }> }
) {
  const { tag } = await params;
  const canonical = uniqueTags().get(tag);
  if (!canonical) notFound();

  const posts = getAllInsights().filter((p) => p.tag === canonical);

  const crumbs = breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Insights", path: "/insights" },
    { name: canonical, path: `/insights/tag/${tag}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }}
      />
      <header className="page-hero">
        <div className="eyebrow">◉ {canonical}</div>
        <h1>
          Writing on <em>{canonical.toLowerCase()}</em>.
        </h1>
        <p>
          {posts.length} piece{posts.length === 1 ? "" : "s"} across the {canonical}{" "}
          cluster. Field notes, not thought leadership —{" "}
          <Link href="/insights">back to all insights</Link>.
        </p>
      </header>

      <section
        style={{
          padding: "40px 40px 140px",
          maxWidth: "var(--max)",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            gap: 14,
          }}
        >
          {posts.map((p) => (
            <Link
              key={p.slug}
              href={`/insights/${p.slug}`}
              className="insight-card"
              data-reveal
            >
              <div className="ic-top">
                <span className="ic-tag">— {p.tag}</span>
                <span className="ic-meta">
                  {formatDate(p.publishedAt)} · {p.readingMinutes} min
                </span>
              </div>
              <h2 className="ic-title">{p.title}</h2>
              <p className="ic-sum">{p.summary}</p>
              <span className="ic-read">
                Read <span className="arr">→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
