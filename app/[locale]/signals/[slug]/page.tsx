import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SIGNALS, getSignal, getSignals } from "@/lib/signals";
import { LOCALES, translate } from "@/lib/i18n/dict";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";
import { breadcrumbSchema } from "@/lib/breadcrumb";
import { blogPostingSchema } from "@/lib/seo/article";

function toTagSlug(tag: string) {
  return tag.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function generateStaticParams() {
  return LOCALES.flatMap((locale) => SIGNALS.map((s) => ({ locale, slug: s.slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const l = assertLocale(locale);
  const s = getSignal(slug, l);
  if (!s) return { title: "Signal not found" };
  const titel = s.seoTitle ?? s.title;
  return {
    title: titel,
    description: s.excerpt,
    alternates: buildAlternates(l, `/signals/${s.slug}`),
    openGraph: {
      type: "article",
      url: `/${l}/signals/${s.slug}`,
      title: titel,
      description: s.excerpt,
      locale: ogLocale(l),
      alternateLocale: alternateOgLocales(l),
      images: [
        {
          url: `/${l}/signals/${s.slug}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: s.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: s.title,
      description: s.excerpt,
    },
  };
}

export default async function SignalPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const l = assertLocale(locale);
  const s = getSignal(slug, l);
  if (!s) notFound();

  const alle = getSignals(l);
  const idx = alle.findIndex((x) => x.slug === s.slug);
  const prev = idx > 0 ? alle[idx - 1] : null;
  const next = idx < alle.length - 1 ? alle[idx + 1] : null;

  // Flatten the block body into a plain-text articleBody for schema.
  // Lists are bulleted so keyword signal survives; quotes/headings
  // kept inline — schema.org articleBody is prose, not structured.
  const articleBody = s.body
    .map((b) => {
      if (b.type === "list" && Array.isArray(b.text)) {
        return (b.text as string[]).map((it) => `• ${it}`).join("\n");
      }
      return typeof b.text === "string" ? b.text : "";
    })
    .filter(Boolean)
    .join("\n\n");

  const articleSchema = blogPostingSchema({
    locale: l,
    path: `/signals/${s.slug}`,
    headline: s.title,
    description: s.excerpt,
    datePublished: s.date,
    tag: s.tag,
    articleBody,
  });

  const crumbs = breadcrumbSchema([
    { name: "Home", path: `/${l}` },
    { name: "Signals", path: `/${l}/signals` },
    { name: s.title, path: `/${l}/signals/${s.slug}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }}
      />
      <header className="page-hero" style={{ paddingBottom: 32 }}>
        <Link href="/signals" className="eyebrow" style={{ display: "inline-block", marginBottom: 24 }}>
          ← {translate(l, "signals.d.all")}
        </Link>
        <div
          style={{
            display: "flex",
            gap: 20,
            alignItems: "center",
            marginBottom: 20,
            fontFamily: "'JetBrains Mono'",
            fontSize: 11,
            letterSpacing: ".14em",
            textTransform: "uppercase",
            color: "var(--muted)",
          }}
        >
          <span style={{ color: "var(--accent)" }}>— {s.dateLabel}</span>
          <span>·</span>
          <span>{s.tag}</span>
          <span>·</span>
          <span>{s.readTime}</span>
        </div>
        <h1>{s.title}</h1>
        <p style={{ maxWidth: "60ch" }}>{s.excerpt}</p>
      </header>

      <article className="long">
        {s.body.map((block, i) => {
          if (block.type === "h2") return <h2 key={i}>{block.text as string}</h2>;
          if (block.type === "quote") return <blockquote key={i}>{block.text as string}</blockquote>;
          if (block.type === "list" && Array.isArray(block.text)) {
            return (
              <ul key={i} style={{ color: "var(--text)", fontSize: 18, lineHeight: 1.7, paddingLeft: 24, marginBottom: 28 }}>
                {block.text.map((item, j) => <li key={j}>{item}</li>)}
              </ul>
            );
          }
          return <p key={i}>{block.text as string}</p>;
        })}

        <div
          style={{
            marginTop: 60,
            paddingTop: 32,
            borderTop: "1px solid var(--line)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 12, letterSpacing: ".1em", color: "var(--muted-soft)", textTransform: "uppercase" }}>
            — Juan Stefan Bongartz Diaz
          </div>
          <Link className="btn primary btn-mag" href="/contact">
            {translate(l, "signals.d.cta")} <span className="arr">→</span>
          </Link>
        </div>
      </article>

      <section style={{ padding: "40px 40px 140px", maxWidth: "var(--max)", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {prev ? (
            <Link
              href={`/signals/${prev.slug}`}
              style={{
                padding: 24,
                border: "1px solid var(--line)",
                borderRadius: 14,
                background: "var(--panel)",
                transition: "all .3s var(--ease)",
              }}
            >
              <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, letterSpacing: ".14em", color: "var(--muted-soft)", textTransform: "uppercase", marginBottom: 10 }}>
                ← {translate(l, "signals.d.prev")}
              </div>
              <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: "-.015em", lineHeight: 1.3 }}>
                {prev.title}
              </div>
            </Link>
          ) : <div />}
          {next ? (
            <Link
              href={`/signals/${next.slug}`}
              style={{
                padding: 24,
                border: "1px solid var(--line)",
                borderRadius: 14,
                background: "var(--panel)",
                textAlign: "right",
                transition: "all .3s var(--ease)",
              }}
            >
              <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, letterSpacing: ".14em", color: "var(--muted-soft)", textTransform: "uppercase", marginBottom: 10 }}>
                {translate(l, "signals.d.next")} →
              </div>
              <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: "-.015em", lineHeight: 1.3 }}>
                {next.title}
              </div>
            </Link>
          ) : <div />}
        </div>
      </section>
    </>
  );
}
