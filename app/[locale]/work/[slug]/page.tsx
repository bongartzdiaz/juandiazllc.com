import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LocaleLink } from "@/components/LocaleLink";
import { VENTURES, getVenture, getVentures } from "@/lib/ventures";
import { getSector } from "@/lib/sectors";
import { breadcrumbSchema } from "@/lib/breadcrumb";
import { AUTHOR_PERSON } from "@/lib/seo/article";
import { LOCALES, translate } from "@/lib/i18n/dict";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://juandiazllc.com";

export function generateStaticParams() {
  return LOCALES.flatMap((locale) => VENTURES.map((v) => ({ locale, slug: v.slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const l = assertLocale(locale);
  const v = getVenture(slug, l);
  if (!v) return { title: "Venture not found" };
  const titel = v.seoTitle ?? `${v.name} — ${v.tagline}`;
  const beschrijving = v.seoDescription ?? v.summary;
  return {
    title: titel,
    description: beschrijving,
    alternates: buildAlternates(l, `/work/${v.slug}`),
    openGraph: {
      type: "article",
      url: `/${l}/work/${v.slug}`,
      title: titel,
      description: beschrijving,
      locale: ogLocale(l),
      alternateLocale: alternateOgLocales(l),
    },
  };
}

export default async function VenturePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const l = assertLocale(locale);
  const t = (k: string) => translate(l, k);
  const v = getVenture(slug, l);
  if (!v) notFound();

  const others = getVentures(l).filter((x) => x.slug !== v.slug).slice(0, 3);
  const sector = getSector(v.sectorSlug, l);

  const crumbs = breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Work", path: "/work" },
    { name: v.name, path: `/work/${v.slug}` },
  ]);

  // CreativeWork schema for the case itself (the page previously only emitted a
  // breadcrumb trail). Ties the proof layer to the canonical authored Person +
  // the org, and labels its sector for topical relevance.
  const workSchema = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: v.name,
    headline: `${v.name} — ${v.tagline}`,
    description: v.summary,
    url: `${SITE}/${l}/work/${v.slug}`,
    about: v.sector,
    inLanguage: l,
    creator: { "@type": "Organization", name: "Juan Diaz, LLC", url: SITE },
    author: AUTHOR_PERSON,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(workSchema) }} />
      <header
        className="page-hero"
        style={{
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: v.gradient,
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative" }}>
          <div className="eyebrow">
            ◉ {v.sector} · <span style={{ color: "var(--muted-soft)" }}>{v.status === "live" ? t("work.status.live") : v.status === "shipping" ? t("work.status.shipping") : t("work.status.reserved")}</span>
          </div>
          <h1>
            {v.name} — <em>{v.tagline.replace(/\.$/, "")}</em>
          </h1>
          <p>{v.summary}</p>

          <div style={{ marginTop: 40, display: "flex", gap: 12, flexWrap: "wrap" }}>
            {/* Only link out when `external` is a real URL. /work already
                gated on this; here it rendered unconditionally, so a venture
                whose external is an internal path (or a route that no longer
                exists) shipped a dead CTA. The two pages now agree. */}
            {v.external.startsWith("http") && (
              <a
                className="btn primary btn-mag"
                href={v.external}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("work.d.visit")} {v.domain} <span className="arr">↗</span>
              </a>
            )}
            <LocaleLink className="btn ghost" href="/contact">
              {t("work.d.talk")} <span className="arr">→</span>
            </LocaleLink>
          </div>
        </div>
      </header>

      <section style={{ padding: "60px 40px 40px", maxWidth: "var(--max)", margin: "0 auto" }}>
        <div className="stats" data-reveal style={{ borderRadius: 16 }}>
          {v.metrics.map((m, i) => (
            <div key={i} className="stat">
              <div className="n" style={{ fontSize: "clamp(28px, 4vw, 44px)" }}>{m.value}</div>
              <div className="l">{m.label}</div>
            </div>
          ))}
        </div>
      </section>

      <article className="long" style={{ paddingTop: 40 }}>
        <h2 dangerouslySetInnerHTML={{ __html: t("work.d.story") }} />
        <p>{v.story}</p>

        <h2 dangerouslySetInnerHTML={{ __html: t("work.d.fivephases") }} />
        <p style={{ color: "var(--muted)" }}>
          {t("work.d.everybuild").replace("{name}", v.name)}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 12,
            marginTop: 32,
            marginBottom: 40,
          }}
        >
          {v.phases.map((p, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "60px 140px 1fr",
                gap: 24,
                padding: "24px 0",
                borderTop: "1px solid var(--line)",
                alignItems: "baseline",
              }}
            >
              <div
                style={{
                  fontFamily: "'JetBrains Mono'",
                  fontSize: 12,
                  letterSpacing: ".14em",
                  color: "var(--muted-soft)",
                }}
              >
                <em style={{ color: "var(--accent)", fontStyle: "normal" }}>
                  0{i + 1}
                </em>
              </div>
              <div
                style={{
                  fontFamily: "'Inter'",
                  fontWeight: 400,
                  fontSize: 22,
                  letterSpacing: "-.015em",
                }}
              >
                {p.title}
              </div>
              <div style={{ color: "var(--muted)", fontSize: 16, lineHeight: 1.65 }}>
                {p.body}
              </div>
            </div>
          ))}
        </div>

        <h2 dangerouslySetInnerHTML={{ __html: t("work.d.builton") }} />
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            margin: "20px 0 48px",
          }}
        >
          {v.stack.map((s) => (
            <span
              key={s}
              style={{
                fontFamily: "'JetBrains Mono'",
                fontSize: 12,
                letterSpacing: ".08em",
                color: "var(--muted)",
                padding: "8px 14px",
                border: "1px solid var(--line)",
                borderRadius: 999,
                background: "rgba(10,36,24,.4)",
              }}
            >
              {s}
            </span>
          ))}
        </div>

        <div
          style={{
            marginTop: 56,
            padding: 32,
            border: "1px solid var(--line)",
            borderRadius: 18,
            background: "linear-gradient(180deg, var(--panel), var(--bg-2))",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 12, letterSpacing: ".14em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 14 }}>
            {t("work.d.want.eyebrow")}
          </div>
          <div
            style={{ fontFamily: "'Inter'", fontWeight: 300, fontSize: "clamp(24px, 3vw, 36px)", letterSpacing: "-.02em", lineHeight: 1.2, marginBottom: 24, maxWidth: "30ch" }}
            dangerouslySetInnerHTML={{ __html: t("work.d.want.title") }}
          />
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <LocaleLink className="btn primary btn-mag" href="/contact">
              {t("work.d.want.cta")} <span className="arr">→</span>
            </LocaleLink>
            {sector && (
              <LocaleLink className="btn ghost" href={`/sectors/${sector.slug}`}>
                {t("work.d.want.sector").replace("{sector}", sector.name)} <span className="arr">→</span>
              </LocaleLink>
            )}
          </div>
        </div>
      </article>

      <section style={{ padding: "80px 40px 140px", maxWidth: "var(--max)", margin: "0 auto" }}>
        <div className="sec-head" data-reveal style={{ marginBottom: 40 }}>
          <div>
            <div className="label">{t("work.d.related.label")}</div>
            <h2 dangerouslySetInnerHTML={{ __html: t("work.d.related.title") }} />
          </div>
          <p>{t("work.d.related.sub")}</p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {others.map((o) => (
            <LocaleLink
              key={o.slug}
              href={`/work/${o.slug}`}
              className="sec-card"
              data-reveal
              style={{ minHeight: 220 }}
            >
              <div>
                <div className="ix">— {o.sector}</div>
                <h4 style={{ marginTop: 18 }}>{o.name}</h4>
                <p>{o.tagline}</p>
              </div>
              <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, letterSpacing: ".12em", color: "var(--muted-soft)", textTransform: "uppercase", marginTop: 20 }}>
                {t("work.d.seebuild")}
              </div>
            </LocaleLink>
          ))}
        </div>
      </section>
    </>
  );
}
