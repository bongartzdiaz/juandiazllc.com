import type { Metadata } from "next";
import Link from "next/link";
import { VENTURES } from "@/lib/ventures";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";
import { translate } from "@/lib/i18n/dict";
import { breadcrumbSchema } from "@/lib/breadcrumb";
import { collectionPageSchema } from "@/lib/seo/schema";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = assertLocale(locale);
  return {
    title: translate(l, "meta.work.title"),
    description: translate(l, "meta.work.description"),
    alternates: buildAlternates(l, "/work"),
    openGraph: { locale: ogLocale(l), alternateLocale: alternateOgLocales(l) },
  };
}

export default async function WorkPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const l = assertLocale(locale);
  const t = (k: string) => translate(l, k);

  const crumbs = breadcrumbSchema([
    { name: "Home", path: `/${l}` },
    { name: "Work", path: `/${l}/work` },
  ]);
  const collection = collectionPageSchema({
    locale: l,
    path: "/work",
    name: "Work — Juan Diaz, LLC",
    description: "Live products under Juan Diaz, LLC — the five-phase playbook applied to real sectors.",
    items: VENTURES.map((v) => ({
      name: v.name,
      url: `/${l}/work/${v.slug}`,
      description: v.tagline,
    })),
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collection) }} />
      <header className="page-hero">
        <div className="eyebrow">{t("work.page.eyebrow")}</div>
        <h1 dangerouslySetInnerHTML={{ __html: t("work.page.title") }} />
        <p>{t("work.page.lede")}</p>
      </header>

      <section style={{ padding: "80px 40px 160px", maxWidth: "var(--max)", margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          {VENTURES.map((v) => (
            <article
              key={v.slug}
              className="sec-card"
              data-reveal
              style={{ minHeight: 400, display: "flex", flexDirection: "column", justifyContent: "space-between" }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 16,
                  }}
                >
                  <div className="ix">— {v.sector}</div>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono'",
                      fontSize: 10,
                      letterSpacing: ".14em",
                      textTransform: "uppercase",
                      padding: "4px 10px",
                      border: `1px solid ${v.status === "live" ? "var(--accent)" : "var(--warn)"}`,
                      color: v.status === "live" ? "var(--accent)" : "var(--warn)",
                      borderRadius: 999,
                      background: v.status === "live" ? "rgba(94,255,177,.06)" : "rgba(255,181,71,.06)",
                    }}
                  >
                    {v.status === "live" ? t("work.status.live") : v.status === "shipping" ? t("work.status.shipping") : t("work.status.reserved")}
                  </div>
                </div>

                <h3 style={{ fontSize: 30, fontWeight: 500, letterSpacing: "-.02em", lineHeight: 1.05, marginBottom: 14 }}>
                  {v.name} <span style={{ color: "var(--muted-soft)", fontWeight: 300, fontSize: 20 }}>· {v.tagline}</span>
                </h3>

                <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.6 }}>
                  {v.summary}
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 28,
                  paddingTop: 20,
                  borderTop: "1px solid var(--line)",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 12, color: "var(--muted-soft)", letterSpacing: ".08em" }}>
                  {v.domain}
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <Link
                    href={`/work/${v.slug}`}
                    style={{
                      fontFamily: "'JetBrains Mono'",
                      fontSize: 11,
                      letterSpacing: ".14em",
                      textTransform: "uppercase",
                      padding: "8px 14px",
                      border: "1px solid var(--line)",
                      borderRadius: 999,
                      color: "var(--text)",
                      transition: "all .3s var(--ease)",
                    }}
                  >
                    {t("work.page.cta.details")}
                  </Link>
                  {v.external.startsWith("http") && (
                    <a
                      href={v.external}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontFamily: "'JetBrains Mono'",
                        fontSize: 11,
                        letterSpacing: ".14em",
                        textTransform: "uppercase",
                        padding: "8px 14px",
                        border: "1px solid var(--accent)",
                        color: "var(--accent)",
                        borderRadius: 999,
                        transition: "all .3s var(--ease)",
                      }}
                    >
                      {t("work.page.cta.visit")}
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
