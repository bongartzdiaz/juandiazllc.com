import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { VENTURES, getVenture } from "@/lib/ventures";
import { breadcrumbSchema } from "@/lib/breadcrumb";
import { LOCALES } from "@/lib/i18n/dict";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";

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
  const { slug } = await params;
  const v = getVenture(slug);
  if (!v) notFound();

  const others = VENTURES.filter((x) => x.slug !== v.slug).slice(0, 3);

  const crumbs = breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Work", path: "/work" },
    { name: v.name, path: `/work/${v.slug}` },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
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
            ◉ {v.sector} · <span style={{ color: "var(--muted-soft)" }}>{v.status === "live" ? "Live" : v.status === "shipping" ? "Shipping" : "Reserved"}</span>
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
              Visit {v.domain} <span className="arr">↗</span>
            </a>
            <Link className="btn ghost" href="/contact">
              Talk about a build like this <span className="arr">→</span>
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
        <h2>The <em>story.</em></h2>
        <p>{v.story}</p>

        <h2>The <em>five phases</em>, applied.</h2>
        <p style={{ color: "var(--muted)" }}>
          Every build under Juan Diaz LLC runs the same playbook. Here&apos;s how it ran for {v.name}.
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

        <h2><em>Built on.</em></h2>
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
            ◉ Want something like this for your operation?
          </div>
          <div style={{ fontFamily: "'Inter'", fontWeight: 300, fontSize: "clamp(24px, 3vw, 36px)", letterSpacing: "-.02em", lineHeight: 1.2, marginBottom: 24, maxWidth: "30ch" }}>
            Same <em>five phases</em>. Different sector. Let&apos;s draw the blueprint.
          </div>
          <Link className="btn primary btn-mag" href="/contact">
            Book a blueprint call <span className="arr">→</span>
          </Link>
        </div>
      </article>

      <section style={{ padding: "80px 40px 140px", maxWidth: "var(--max)", margin: "0 auto" }}>
        <div className="sec-head" data-reveal style={{ marginBottom: 40 }}>
          <div>
            <div className="label">◉ Related</div>
            <h2>Other <em>builds.</em></h2>
          </div>
          <p>Different sectors, same playbook. Each of these is the five-phase method applied to another real P&amp;L.</p>
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
                See the build →
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
