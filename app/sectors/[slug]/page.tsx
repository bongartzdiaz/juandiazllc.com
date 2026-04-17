import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SECTORS, getSector } from "@/lib/sectors";

export function generateStaticParams() {
  return SECTORS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const s = getSector(slug);
  if (!s) return { title: "Sector not found" };
  return { title: `${s.name} — ${s.tagline}`, description: s.summary };
}

export default async function SectorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = getSector(slug);
  if (!s) notFound();

  const others = SECTORS.filter((x) => x.slug !== s.slug);

  return (
    <>
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
    </>
  );
}
