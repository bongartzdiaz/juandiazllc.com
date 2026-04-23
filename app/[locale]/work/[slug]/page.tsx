import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { VENTURES, getVenture } from "@/lib/ventures";
import { breadcrumbSchema } from "@/lib/breadcrumb";
import { LOCALES, translate } from "@/lib/i18n/dict";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";
import { softwareApplicationSchema } from "@/lib/seo/schema";

export function generateStaticParams() {
  return LOCALES.flatMap((locale) => VENTURES.map((v) => ({ locale, slug: v.slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const l = assertLocale(locale);
  const v = getVenture(slug);
  if (!v) return { title: "Venture not found" };
  return {
    title: `${v.name} — ${v.tagline}`,
    description: v.summary,
    alternates: buildAlternates(l, `/work/${v.slug}`),
    openGraph: {
      type: "article",
      url: `/${l}/work/${v.slug}`,
      title: `${v.name} — ${v.tagline}`,
      description: v.summary,
      locale: ogLocale(l),
      alternateLocale: alternateOgLocales(l),
    },
  };
}

export default async function VenturePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const l = assertLocale(locale);
  const t = (k: string) => translate(l, k);
  const v = getVenture(slug);
  if (!v) notFound();

  const others = VENTURES.filter((x) => x.slug !== v.slug).slice(0, 3);

  const crumbs = breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Work", path: "/work" },
    { name: v.name, path: `/work/${v.slug}` },
  ]);

  // Pull the launch year out of the display metrics — ventures.ts
  // stores it as "Launched: 2024" for the stat strip; reuse that
  // rather than duplicating it into a schema-only field.
  const launchedYear = v.metrics.find((m) => m.label.toLowerCase() === "launched")?.value;
  const softwareSchema = softwareApplicationSchema({
    locale: l,
    slug: v.slug,
    name: v.name,
    description: v.summary,
    external: v.external,
    sector: v.sector,
    launchedYear,
    stack: v.stack,
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
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
            <a
              className="btn primary btn-mag"
              href={v.external}
              target={v.external.startsWith("http") ? "_blank" : undefined}
              rel={v.external.startsWith("http") ? "noopener noreferrer" : undefined}
            >
              {t("work.d.visit")} {v.domain} <span className="arr">↗</span>
            </a>
            <Link className="btn ghost" href="/contact">
              {t("work.d.talk")} <span className="arr">→</span>
            </Link>
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
          <Link className="btn primary btn-mag" href="/contact">
            {t("work.d.want.cta")} <span className="arr">→</span>
          </Link>
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
            <Link
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
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
