import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllInsights, getInsight, formatDate } from "@/lib/insights";
import { getVentureForTag } from "@/lib/ventures";
import { breadcrumbSchema } from "@/lib/breadcrumb";
import { ReadingProgress } from "@/components/ReadingProgress";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://juandiazllc.com";

// Static params — generate all post URLs at build time so Vercel
// serves them from the edge cache without hitting Node on every hit.
export async function generateStaticParams() {
  return getAllInsights().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const post = getInsight(slug);
  if (!post) return { title: "Not found" };
  return {
    title: post.seo?.metaTitle ?? post.title,
    description: post.seo?.metaDescription ?? post.summary,
    alternates: { canonical: `/insights/${post.slug}` },
    openGraph: {
      type: "article",
      url: `/insights/${post.slug}`,
      title: post.title,
      description: post.summary,
      publishedTime: post.publishedAt,
      tags: [post.tag],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.summary,
    },
  };
}

export default async function InsightPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const post = getInsight(slug);
  if (!post) notFound();

  // JSON-LD Article schema — gives the post rich-result eligibility
  // (bylines in SERPs, Top Stories, Discover).
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.summary,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    author: { "@type": "Person", name: "Juan Diaz", url: SITE },
    publisher: {
      "@type": "Organization",
      name: "Juan Diaz LLC",
      logo: { "@type": "ImageObject", url: `${SITE}/icon.svg` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE}/insights/${post.slug}` },
    keywords: post.tag,
  };

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
            <span className="ia-tag">{post.tag}</span>
            <span>·</span>
            <span>{formatDate(post.publishedAt)}</span>
            <span>·</span>
            <span>{post.readingMinutes} min read</span>
          </div>
          <h1 className="ia-title">{post.title}</h1>
          <p className="ia-lede">{post.summary}</p>
        </header>

        <div className="ia-body">
          {post.body.map((block, i) => {
            if (block.type === "h2") return <h2 key={i}>{block.text}</h2>;
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
          })}
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
