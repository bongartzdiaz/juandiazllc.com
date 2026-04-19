import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllInsights, getInsight, formatDate, tocFromBody, headingSlug } from "@/lib/insights";
import { getVentureForTag } from "@/lib/ventures";
import { breadcrumbSchema } from "@/lib/breadcrumb";
import { ReadingProgress } from "@/components/ReadingProgress";
import { LOCALES } from "@/lib/i18n/dict";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://juandiazllc.com";

export async function generateStaticParams() {
  return LOCALES.flatMap((locale) => getAllInsights().map((p) => ({ locale, slug: p.slug })));
}

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string; slug: string }> }
): Promise<Metadata> {
  const { locale, slug } = await params;
  const l = assertLocale(locale);
  const post = getInsight(slug);
  if (!post) return { title: "Not found" };
  return {
    title: post.seo?.metaTitle ?? post.title,
    description: post.seo?.metaDescription ?? post.summary,
    alternates: buildAlternates(l, `/insights/${post.slug}`),
    openGraph: {
      type: "article",
      url: `/${l}/insights/${post.slug}`,
      title: post.title,
      description: post.summary,
      publishedTime: post.publishedAt,
      tags: [post.tag],
      locale: ogLocale(l),
      alternateLocale: alternateOgLocales(l),
      images: [{ url: "/me/portrait.jpg", width: 1200, height: 1200, alt: "Juan Diaz" }],
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
  const { slug } = await params;
  const post = getInsight(slug);
  if (!post) notFound();

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.summary,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    author: {
      "@type": "Person",
      name: "Juan Stefan Diaz",
      url: `${SITE}/about`,
      image: `${SITE}/me/portrait.jpg`,
      jobTitle: "Founder, Juan Diaz LLC",
      sameAs: [
        "https://linkedin.com/in/juanstefan",
        "https://instagram.com/diazelcazador",
      ],
    },
    publisher: {
      "@type": "Organization",
      name: "Juan Diaz LLC",
      logo: { "@type": "ImageObject", url: `${SITE}/icon.svg` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE}/insights/${post.slug}` },
    keywords: post.tag,
    inLanguage: "en",
  };

  const toc = tocFromBody(post.body);
  const related = getAllInsights().filter((p) => p.slug !== post.slug).slice(0, 2);
  const venture = getVentureForTag(post.tag);
  const crumbs = breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Insights", path: "/insights" },
    { name: post.title, path: `/insights/${post.slug}` },
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
          <Link href="/insights" className="ia-back">
            <span className="arr" style={{ marginRight: 6 }}>←</span> All insights
          </Link>
          <div className="ia-meta">
            <Link href={`/insights/tag/${post.tag.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`} className="ia-tag">{post.tag}</Link>
            <span>·</span>
            <span>{formatDate(post.publishedAt)}</span>
            <span>·</span>
            <span>{post.readingMinutes} min read</span>
          </div>
          <h1 className="ia-title">{post.title}</h1>
          <p className="ia-lede">{post.summary}</p>
        </header>

        {toc.length >= 2 && (
          <nav className="ia-toc" aria-label="Table of contents">
            <div className="ia-toc-label">On this page</div>
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
              return null;
            });
          })()}
        </div>

        <footer className="ia-foot">
          <div className="ia-cta">
            <h3>
              Want something like this <em>shipped</em> for your team?
            </h3>
            <p>
              I take on a small number of operator engagements per year. If the pattern
              in this piece sounds familiar, the next move is a short call.
            </p>
            <Link href="/contact" className="btn primary">
              Start a conversation <span className="arr">→</span>
            </Link>
          </div>

          {venture && (
            <div className="ia-venture">
              <div className="label">Seen in the wild</div>
              <Link href={`/work/${venture.slug}`} className="ia-venture-card">
                <div className="iav-sector">{venture.sector}</div>
                <h3 className="iav-name">{venture.name}</h3>
                <p className="iav-tagline">{venture.tagline}</p>
                <span className="iav-cue">See the venture <span className="arr">→</span></span>
              </Link>
            </div>
          )}

          {related.length > 0 && (
            <div className="ia-related">
              <div className="label">Read next</div>
              <div className="ia-related-grid">
                {related.map((r) => (
                  <Link key={r.slug} href={`/insights/${r.slug}`} className="insight-card">
                    <div className="ic-top">
                      <span className="ic-tag">— {r.tag}</span>
                      <span className="ic-meta">{r.readingMinutes} min</span>
                    </div>
                    <h2 className="ic-title" style={{ fontSize: 22 }}>
                      {r.title}
                    </h2>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </footer>
      </article>
    </>
  );
}
