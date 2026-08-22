import type { Metadata } from "next";
import { LocaleLink } from "@/components/LocaleLink";
import { notFound } from "next/navigation";
import { getAllInsights, getInsight, insightMarkets, isInMarket, formatDate, tocFromBody, headingSlug } from "@/lib/insights";
import { getVentureForTag } from "@/lib/ventures";
import { breadcrumbSchema } from "@/lib/breadcrumb";
import { ReadingProgress } from "@/components/ReadingProgress";
import { LOCALES, translate } from "@/lib/i18n/dict";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";
import { blogPostingSchema } from "@/lib/seo/article";
import { BOOKING_15MIN } from "@/lib/booking";
import { ScanCallout } from "@/components/ScanCallout";

export async function generateStaticParams() {
  // Only pre-render (locale, slug) pairs where the post is published in that
  // market — so Dutch-only posts exist under /nl and never /en,/de,/es.
  return LOCALES.flatMap((locale) =>
    getAllInsights(locale).map((p) => ({ locale, slug: p.slug })),
  );
}

export const dynamicParams = false;

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string; slug: string }> }
): Promise<Metadata> {
  const { locale, slug } = await params;
  const l = assertLocale(locale);
  const post = getInsight(slug, l);
  if (!post || !isInMarket(post, l)) return { title: "Not found" };
  return {
    title: post.seo?.metaTitle ?? post.title,
    description: post.seo?.metaDescription ?? post.summary,
    alternates: buildAlternates(l, `/insights/${post.slug}`, insightMarkets(post)),
    openGraph: {
      type: "article",
      url: `/${l}/insights/${post.slug}`,
      title: post.title,
      description: post.summary,
      publishedTime: post.publishedAt,
      tags: [post.tag],
      locale: ogLocale(l),
      alternateLocale: alternateOgLocales(l),
      images: [
        {
          url: `/${l}/insights/${post.slug}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.summary,
    },
  };
}

export default async function InsightPage(
  { params }: { params: Promise<{ locale: string; slug: string }> }
) {
  const { locale, slug } = await params;
  const l = assertLocale(locale);
  const t = (k: string) => translate(l, k);
  const post = getInsight(slug, l);
  if (!post || !isInMarket(post, l)) notFound();

  const articleSchema = blogPostingSchema({
    locale: l,
    path: `/insights/${post.slug}`,
    headline: post.title,
    description: post.summary,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    tag: post.tag,
  });

  const toc = tocFromBody(post.body);
  // In-market only: getAllInsights(l) filters to posts published in this
  // locale's market and applies localized titles — so "read next" never
  // links to a post that 404s under the current locale (e.g. an NL-only
  // saldering post surfaced on /de).
  const related = getAllInsights(l).filter((p) => p.slug !== post.slug).slice(0, 2);
  const venture = getVentureForTag(post.tag, l);
  const crumbs = breadcrumbSchema([
    { name: "Home", path: `/${l}` },
    { name: "Insights", path: `/${l}/insights` },
    { name: post.title, path: `/${l}/insights/${post.slug}` },
  ]);

  return (
    <>
      <ReadingProgress />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }}
      />
      <article className="insight-article">
        <header className="ia-head">
          <LocaleLink href="/insights" className="ia-back">
            <span className="arr" style={{ marginRight: 6 }}>←</span> {t("insights.d.allposts")}
          </LocaleLink>
          <div className="ia-meta">
            <LocaleLink href={`/insights/tag/${post.tag.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`} className="ia-tag">{post.tag}</LocaleLink>
            <span>·</span>
            <span>{formatDate(post.publishedAt)}</span>
            <span>·</span>
            <span>{post.readingMinutes} {t("insights.d.minread")}</span>
          </div>
          <h1 className="ia-title">{post.title}</h1>
          <p className="ia-lede">{post.summary}</p>
        </header>

        {toc.length >= 2 && (
          <nav className="ia-toc" aria-label={t("insights.d.toc.aria")}>
            <div className="ia-toc-label">{t("insights.d.toc.label")}</div>
            <ol>
              {toc.map((h) => (
                <li key={h.id}>
                  <a href={`#${h.id}`}>{h.text}</a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className="ia-body">
          {(() => {
            let h2Idx = 0;
            return post.body.map((block, i) => {
              if (block.type === "h2") {
                const id = toc[h2Idx]?.id ?? headingSlug(block.text);
                h2Idx++;
                return (
                  <h2 key={i} id={id}>
                    {block.text}
                  </h2>
                );
              }
              if (block.type === "p") return <p key={i}>{block.text}</p>;
              if (block.type === "ul")
                return (
                  <ul key={i}>
                    {block.items.map((it, j) => (
                      <li key={j}>{it}</li>
                    ))}
                  </ul>
                );
              if (block.type === "quote")
                return (
                  <blockquote key={i}>
                    {block.text}
                    {block.cite ? <cite>— {block.cite}</cite> : null}
                  </blockquote>
                );
              if (block.type === "cta")
                return (
                  <p key={i} className="ia-inline-cta">
                    <LocaleLink href={block.href} className="btn primary">
                      {block.text} <span className="arr">→</span>
                    </LocaleLink>
                  </p>
                );
              return null;
            });
          })()}
        </div>

        <footer className="ia-foot">
          {/* De tekst hierboven belooft al "een kort gesprek is de volgende
              stap", maar de knop wees naar een formulier met zeven velden. Dat
              is de plek waar AI-verkeer landt en waar de intentie het hoogst
              is, dus daar hoort de boeking te staan — niet het formulier.
              Eén primaire actie, met de formulierroute eronder voor wie liever
              schrijft. Geen tweede knop ernaast: dat dwingt een keuze af. */}
          <div className="ia-cta">
            <h3 dangerouslySetInnerHTML={{ __html: t("insights.d.want.title") }} />
            <p>{t("insights.d.want.body")}</p>
            <a
              className="btn primary plausible-event-name=Boeking+15min"
              href={BOOKING_15MIN}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("cta.intro")} <span className="arr">→</span>
            </a>
            <p style={{ marginTop: 12, fontSize: 14 }}>
              <LocaleLink href="/contact">{t("insights.d.want.cta")}</LocaleLink>
            </p>
          </div>

          {/* Lagere drempel dan het kwartier hierboven: wie nog niet wil boeken kan
              eerst zelf meten. Alleen onder de energie-artikelen — dat is het
              cluster waar het ICP zit. ScanCallout poortert zelf op taal, dus op de
              Duitse en Spaanse energieposts rendert hij niets (de scan bestaat daar
              niet) en dat is geen toeval maar dezelfde bron. */}
          {post.tag === "Energy" && <ScanCallout locale={l} />}

          {venture && (
            <div className="ia-venture">
              <div className="label">{t("insights.d.seenwild")}</div>
              <LocaleLink href={`/work/${venture.slug}`} className="ia-venture-card">
                <div className="iav-sector">{venture.sector}</div>
                <h3 className="iav-name">{venture.name}</h3>
                <p className="iav-tagline">{venture.tagline}</p>
                <span className="iav-cue">{t("insights.d.seeventure")} <span className="arr">→</span></span>
              </LocaleLink>
            </div>
          )}

          {related.length > 0 && (
            <div className="ia-related">
              <div className="label">{t("insights.d.readnext")}</div>
              <div className="ia-related-grid">
                {related.map((r) => (
                  <LocaleLink key={r.slug} href={`/insights/${r.slug}`} className="insight-card">
                    <div className="ic-top">
                      <span className="ic-tag">— {r.tag}</span>
                      <span className="ic-meta">{r.readingMinutes} {t("insights.d.min")}</span>
                    </div>
                    <h2 className="ic-title" style={{ fontSize: 22 }}>
                      {r.title}
                    </h2>
                  </LocaleLink>
                ))}
              </div>
            </div>
          )}
        </footer>
      </article>
    </>
  );
}
