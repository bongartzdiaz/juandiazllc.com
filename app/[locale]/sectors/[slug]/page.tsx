import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SECTORS, getSector } from "@/lib/sectors";
import { breadcrumbSchema } from "@/lib/breadcrumb";
import { LOCALES, translate } from "@/lib/i18n/dict";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";
import { FaqSection } from "@/components/FaqSection";
import { Countdown2027 } from "@/components/Countdown2027";
import { faqSchema, serviceSchema } from "@/lib/seo/schema";
import { getSectorFaq } from "@/lib/seo/faqs";

export function generateStaticParams() {
  return LOCALES.flatMap((locale) => SECTORS.map((s) => ({ locale, slug: s.slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const l = assertLocale(locale);
  const s = getSector(slug);
  if (!s) return { title: "Sector not found" };
  return {
    title: `${s.name} — ${s.tagline}`,
    description: s.summary,
    alternates: buildAlternates(l, `/sectors/${s.slug}`),
    openGraph: {
      type: "article",
      url: `/${l}/sectors/${s.slug}`,
      title: `${s.name} — ${s.tagline}`,
      description: s.summary,
      locale: ogLocale(l),
      alternateLocale: alternateOgLocales(l),
    },
  };
}

export default async function SectorPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const l = assertLocale(locale);
  const s = getSector(slug);
  if (!s) notFound();

  const others = SECTORS.filter((x) => x.slug !== s.slug);
  const sectorFaq = getSectorFaq(l, s.slug);

  const crumbs = breadcrumbSchema([
    { name: "Home", path: `/${l}` },
    { name: "Sectors", path: `/${l}/sectors` },
    { name: s.name, path: `/${l}/sectors/${s.slug}` },
  ]);

  const service = serviceSchema({
    name: `${s.name} — ${s.tagline}`,
    description: s.summary,
    slug: s.slug,
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(service) }} />
      {sectorFaq.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(sectorFaq)) }} />
      )}
      <header className="page-hero" style={{ position: "relative", overflow: "hidden" }}>
        <div aria-hidden style={{ position: "absolute", inset: 0, background: s.gradient, pointerEvents: "none" }} />
        <div style={{ position: "relative" }}>
          <div className="eyebrow">◉ Sector</div>
          <h1>{s.name.split(" & ").map((part, i) => (
            i === 0 ? <span key={i}>{part}</span> : <span key={i}> & <em>{part}</em></span>
          ))}</h1>
          <p>{s.summary}</p>

          <div style={{ marginTop: 32, display: "flex", flexWrap: "wrap", gap: 8 }}>
            {s.tags.map((t) => (
              <span
                key={t}
                style={{
                  fontFamily: "'JetBrains Mono'",
                  fontSize: 11,
                  letterSpacing: ".12em",
                  textTransform: "uppercase",
                  color: "var(--muted-soft)",
                  padding: "6px 12px",
                  border: "1px solid var(--line)",
                  borderRadius: 999,
                  background: "rgba(10,36,24,.4)",
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </header>

      <article className="long" style={{ paddingTop: 60 }}>
        {(() => {
          const anchorHref =
            s.slug === "energy" ? "/tools/energy-roi" : "/contact";
          const eyebrow = translate(l, `fomo.anchor.${s.slug}.eyebrow`);
          const title = translate(l, `fomo.anchor.${s.slug}.title`);
          const body = translate(l, `fomo.anchor.${s.slug}.body`);
          const cta = translate(l, `fomo.anchor.${s.slug}.cta`);
          if (!eyebrow || eyebrow.startsWith("fomo.anchor.")) return null;
          return (
            <aside className="anchor-callout" aria-labelledby="anchor-title">
              <div className="anchor-callout-body">
                <span className="anchor-callout-eyebrow">{eyebrow}</span>
                <h3
                  id="anchor-title"
                  className="anchor-callout-title"
                  dangerouslySetInnerHTML={{ __html: title }}
                />
                <p className="anchor-callout-text">{body}</p>
              </div>
              <Link href={anchorHref} className="anchor-callout-cta">
                {cta}
              </Link>
            </aside>
          );
        })()}
        {s.slug === "energy" && (
          <div style={{ margin: "0 0 48px" }}>
            <Countdown2027 />
          </div>
        )}
        {(() => {
          const TOOLS_BY_SECTOR: Record<string, Array<{ href: string; ns: string; tag: string }>> = {
            energy: [
              { href: "/tools/energy-roi", ns: "energy", tag: "tools.energy" },
              { href: "/tools/peak-shift", ns: "peak", tag: "tools.peak" },
            ],
            "real-estate": [{ href: "/tools/deal-cycle", ns: "cycle", tag: "tools.cycle" }],
            hospitality: [{ href: "/tools/deal-cycle", ns: "cycle", tag: "tools.cycle" }],
            adjacent: [{ href: "/tools/deal-cycle", ns: "cycle", tag: "tools.cycle" }],
          };
          const tools = TOOLS_BY_SECTOR[s.slug] ?? [];
          if (tools.length === 0) return null;
          return (
            <div style={{ display: "grid", gap: 12, marginBottom: 48 }}>
              {tools.map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 16,
                    padding: "18px 22px",
                    border: "1px solid var(--accent)",
                    borderRadius: 14,
                    background: "rgba(46,196,137,.08)",
                    textDecoration: "none",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, letterSpacing: ".14em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 6 }}>
                      ◉ {translate(l, `${tool.tag}.tag`)}
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 500 }}>
                      {translate(l, `${tool.tag}.title`)} — {translate(l, `${tool.tag}.body`)}
                    </div>
                  </div>
                  <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, letterSpacing: ".12em", color: "var(--accent)", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                    {translate(l, `${tool.tag}.cta`)}
                  </span>
                </Link>
              ))}
            </div>
          );
        })()}
        <h2>Where <em>revenue leaks</em> in this sector.</h2>
        <p style={{ color: "var(--muted)" }}>The five common failure modes I see when I survey a new operator in this space.</p>

        <div style={{ marginTop: 32, marginBottom: 48 }}>
          {s.leaks.map((l, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "48px 1fr",
                gap: 20,
                padding: "20px 0",
                borderTop: "1px solid var(--line)",
                alignItems: "baseline",
              }}
            >
              <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, letterSpacing: ".14em", color: "var(--accent)" }}>
                0{i + 1}
              </div>
              <div>
                <div style={{ fontFamily: "'Inter'", fontWeight: 500, fontSize: 18, marginBottom: 8 }}>{l.title}</div>
                <div style={{ color: "var(--muted)", fontSize: 16, lineHeight: 1.6 }}>{l.body}</div>
              </div>
            </div>
          ))}
        </div>

        <h2>The <em>playbook</em>, applied to {s.name.toLowerCase()}.</h2>
        <p style={{ color: "var(--muted)" }}>Same five phases every time — here&apos;s what they look like in this sector.</p>

        <div style={{ marginTop: 32, marginBottom: 48 }}>
          {s.playbook.map((p, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "60px 140px 1fr",
                gap: 24,
                padding: "22px 0",
                borderTop: "1px solid var(--line)",
                alignItems: "baseline",
              }}
            >
              <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 12, letterSpacing: ".14em", color: "var(--muted-soft)" }}>
                <em style={{ color: "var(--accent)", fontStyle: "normal" }}>0{i + 1}</em>
              </div>
              <div style={{ fontFamily: "'Inter'", fontWeight: 400, fontSize: 20, letterSpacing: "-.015em" }}>
                {p.phase}
              </div>
              <div style={{ color: "var(--muted)", fontSize: 16, lineHeight: 1.65 }}>{p.applied}</div>
            </div>
          ))}
        </div>

        <h2><em>Proof</em> points.</h2>
        <div style={{ marginTop: 24, marginBottom: 56, display: "grid", gap: 12 }}>
          {s.proof.map((p, i) => {
            const Inner = (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  padding: "22px 24px",
                  border: "1px solid var(--line)",
                  borderRadius: 14,
                  background: "rgba(10,36,24,.4)",
                  transition: "all .3s var(--ease)",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 6 }}>{p.title}</div>
                  <div style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.55, maxWidth: "60ch" }}>
                    {p.body}
                  </div>
                </div>
                {p.href && (
                  <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, letterSpacing: ".12em", color: "var(--accent)", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                    See the build →
                  </span>
                )}
              </div>
            );
            return p.href ? (
              <Link key={i} href={p.href} style={{ textDecoration: "none" }}>
                {Inner}
              </Link>
            ) : (
              <div key={i}>{Inner}</div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 56,
            padding: 36,
            border: "1px solid var(--line)",
            borderRadius: 18,
            background: "linear-gradient(180deg, var(--panel), var(--bg-2))",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 12, letterSpacing: ".14em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 14 }}>
            ◉ {s.cta}
          </div>
          <div style={{ fontFamily: "'Inter'", fontWeight: 300, fontSize: "clamp(26px, 3vw, 42px)", letterSpacing: "-.02em", lineHeight: 1.15, marginBottom: 28, maxWidth: "26ch" }}>
            Let&apos;s draw the <em>blueprint</em>.
          </div>
          <Link className="btn primary btn-mag" href="/contact">
            Book a blueprint call <span className="arr">→</span>
          </Link>
        </div>
      </article>

      <section style={{ padding: "80px 40px 140px", maxWidth: "var(--max)", margin: "0 auto" }}>
        <div className="sec-head" data-reveal style={{ marginBottom: 40 }}>
          <div>
            <div className="label">◉ Other sectors</div>
            <h2>Same playbook. <em>Different</em> P&amp;L.</h2>
          </div>
          <p>The method doesn&apos;t care what industry your operators run. If there&apos;s complexity and bad software, it applies.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          {others.map((o) => (
            <Link key={o.slug} href={`/sectors/${o.slug}`} className="sec-card" data-reveal style={{ minHeight: 200 }}>
              <div>
                <div className="ix">— {o.name}</div>
                <h4 style={{ marginTop: 14, fontSize: 22 }}>{o.tagline}</h4>
              </div>
              <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, letterSpacing: ".12em", color: "var(--muted-soft)", textTransform: "uppercase", marginTop: 20 }}>
                See the sector →
              </div>
            </Link>
          ))}
        </div>
      </section>
      {sectorFaq.length > 0 && (
        <FaqSection title={`${s.name} — common questions`} items={sectorFaq} />
      )}
    </>
  );
}
