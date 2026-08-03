import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SIGNALS, getSignals } from "@/lib/signals";
import { breadcrumbSchema } from "@/lib/breadcrumb";
import { LOCALES, translate } from "@/lib/i18n/dict";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";

// Tag archive pages for /signals — mirrors /insights/tag/[tag]. Every
// distinct signal tag becomes a pre-rendered SEO surface, one per locale.
// URL convention: tag slug is lowercased with non-alphanum collapsed to
// hyphens (so "Real Estate" → "real-estate"). Canonical case comes from
// the first signal that declares the tag.

function toSlug(tag: string) {
  return tag
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function uniqueTags() {
  const map = new Map<string, string>(); // slug -> canonical tag
  for (const s of SIGNALS) {
    const slug = toSlug(s.tag);
    if (!map.has(slug)) map.set(slug, s.tag);
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
  const title = `${translate(l, "signals.tag.title")} ${canonical}`;
  return {
    title,
    description: `${translate(l, "signals.tag.title")} ${canonical.toLowerCase()} — field notes and build logs from Juan Diaz, LLC.`,
    alternates: buildAlternates(l, `/signals/tag/${tag}`),
    openGraph: {
      type: "website",
      url: `/${l}/signals/tag/${tag}`,
      title: `${canonical} signals — Juan Diaz, LLC`,
      locale: ogLocale(l),
      alternateLocale: alternateOgLocales(l),
    },
  };
}

export default async function SignalsTagArchivePage(
  { params }: { params: Promise<{ locale: string; tag: string }> }
) {
  const { locale, tag } = await params;
  const l = assertLocale(locale);
  const canonical = uniqueTags().get(tag);
  if (!canonical) notFound();

  const posts = getSignals(l).filter((s) => s.tag === canonical);

  const crumbs = breadcrumbSchema([
    { name: "Home", path: `/${l}` },
    { name: "Signals", path: `/${l}/signals` },
    { name: canonical, path: `/${l}/signals/tag/${tag}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }}
      />
      <header className="page-hero">
        <Link
          href="/signals"
          className="eyebrow"
          style={{ display: "inline-block", marginBottom: 20 }}
        >
          {translate(l, "signals.tag.back")}
        </Link>
        <div className="eyebrow">◉ {canonical}</div>
        <h1>
          {translate(l, "signals.tag.title")} <em>{canonical}</em>
        </h1>
        <p>
          {posts.length} piece{posts.length === 1 ? "" : "s"} tagged{" "}
          <em>{canonical.toLowerCase()}</em> —{" "}
          <Link href="/signals">back to all signals</Link>.
        </p>
      </header>

      <section
        style={{
          padding: "40px 40px 140px",
          maxWidth: "var(--max)",
          margin: "0 auto",
        }}
      >
        {posts.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>
            {translate(l, "signals.tag.empty").replace("{tag}", canonical)}
          </p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {posts.map((s) => (
              <Link
                key={s.slug}
                href={`/signals/${s.slug}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "180px 1fr auto",
                  gap: 32,
                  padding: "32px 28px",
                  border: "1px solid var(--line)",
                  borderRadius: 16,
                  background: "var(--panel)",
                  alignItems: "baseline",
                  transition: "all .3s var(--ease)",
                }}
                data-reveal
              >
                <div
                  style={{
                    fontFamily: "'JetBrains Mono'",
                    fontSize: 11,
                    letterSpacing: ".14em",
                    textTransform: "uppercase",
                    color: "var(--accent)",
                  }}
                >
                  {s.dateLabel}
                  <div style={{ color: "var(--muted-soft)", marginTop: 6 }}>
                    {s.readTime}
                  </div>
                </div>
                <div>
                  <h2
                    style={{
                      fontFamily: "'Inter'",
                      fontWeight: 400,
                      fontSize: 28,
                      lineHeight: 1.15,
                      letterSpacing: "-.02em",
                      marginBottom: 12,
                    }}
                  >
                    {s.title}
                  </h2>
                  <p
                    style={{
                      color: "var(--muted)",
                      fontSize: 16,
                      lineHeight: 1.6,
                      maxWidth: "60ch",
                    }}
                  >
                    {s.excerpt}
                  </p>
                </div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono'",
                    fontSize: 11,
                    letterSpacing: ".12em",
                    color: "var(--muted-soft)",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                    alignSelf: "center",
                  }}
                >
                  Read →
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
