import type { Metadata } from "next";
import { LocaleLink } from "@/components/LocaleLink";
import { notFound } from "next/navigation";
import { getAllInsights, formatDate } from "@/lib/insights";
import { breadcrumbSchema } from "@/lib/breadcrumb";
import { LOCALES, translate, type Locale } from "@/lib/i18n/dict";
import { tagLabel, tagSlug } from "@/lib/i18n/tags";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";
import { ogImages } from "@/lib/seo/branding";

// Tag archive pages — /insights/tag/systems, /insights/tag/energy etc.
// Each becomes a dedicated SEO surface for a topic cluster. Built
// statically at build time; generateStaticParams produces one page
// per distinct tag. Keeps the site map tidy without manual upkeep.
//
// URL convention: tag slugs are lowercased and non-alphanum chars
// become hyphens, so "Real Estate" -> "real-estate". The page title
// uses the canonical case from the first post that declares the tag.

function uniqueTags(locale?: Locale) {
  const map = new Map<string, string>(); // slug -> canonical tag
  for (const p of getAllInsights(locale)) {
    const slug = tagSlug(p.tag);
    if (!map.has(slug)) map.set(slug, p.tag);
  }
  return map;
}

/** Locales in which a given tag-slug actually has published posts. */
function tagLocales(tag: string): Locale[] {
  return LOCALES.filter((l) => uniqueTags(l).has(tag));
}

export function generateStaticParams() {
  // Only generate a tag page for a locale if that market has posts with the tag
  // (so a Dutch-only tag doesn't spawn empty /en,/de,/es archives).
  return LOCALES.flatMap((locale) =>
    Array.from(uniqueTags(locale).keys()).map((tag) => ({ locale, tag })),
  );
}

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string; tag: string }> }
): Promise<Metadata> {
  const { locale, tag } = await params;
  const l = assertLocale(locale);
  const canonical = uniqueTags(l).get(tag);
  if (!canonical) return { title: "Tag not found" };
  const label = tagLabel(l, tag, canonical);
  return {
    title: translate(l, "insights.tag.meta.title").replace("{tag}", label),
    description: translate(l, "insights.tag.meta.description").replace("{tag}", label),
    alternates: buildAlternates(l, `/insights/tag/${tag}`, tagLocales(tag)),
    openGraph: {
      images: ogImages(l),
      type: "website",
      url: `/${l}/insights/tag/${tag}`,
      title: translate(l, "insights.tag.meta.title").replace("{tag}", label),
      locale: ogLocale(l),
      alternateLocale: alternateOgLocales(l),
    },
  };
}

export default async function TagArchivePage(
  { params }: { params: Promise<{ locale: string; tag: string }> }
) {
  const { locale, tag } = await params;
  const l = assertLocale(locale);
  const canonical = uniqueTags(l).get(tag);
  if (!canonical) notFound();

  const posts = getAllInsights(l).filter((p) => p.tag === canonical);
  const label = tagLabel(l, tag, canonical);

  const crumbs = breadcrumbSchema([
    { name: "Home", path: `/${l}` },
    { name: "Insights", path: `/${l}/insights` },
    { name: label, path: `/${l}/insights/tag/${tag}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }}
      />
      <header className="page-hero">
        <div className="eyebrow">◉ {label}</div>
        <h1
          dangerouslySetInnerHTML={{
            __html: translate(l, "insights.tag.h1").replace("{tag}", label),
          }}
        />
        <p>
          {translate(l, posts.length === 1 ? "insights.tag.lede.one" : "insights.tag.lede.many")
            .replace("{n}", String(posts.length))
            .replace("{tag}", label)}{" "}
          <LocaleLink href={`/${l}/insights`}>{translate(l, "insights.tag.back")}</LocaleLink>.
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
            <LocaleLink
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
                {translate(l, "card.read")} <span className="arr">→</span>
              </span>
            </LocaleLink>
          ))}
        </div>
      </section>
    </>
  );
}
