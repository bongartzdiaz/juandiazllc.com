import type { Metadata } from "next";
import Link from "next/link";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";
import { translate } from "@/lib/i18n/dict";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://juandiazllc.com";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = assertLocale(locale);
  return {
    title: "About Juan Diaz — operator, builder, founder",
    description:
      "Construction-trained, operator-built. Juan Diaz runs Juan Diaz, LLC — a holding company building revenue engines for operators in energy, real estate and hospitality.",
    alternates: buildAlternates(l, "/about"),
    openGraph: {
      type: "profile",
      url: `/${l}/about`,
      title: "About Juan Diaz",
      description:
        "Construction-trained, operator-built. Revenue engines for operators in energy, real estate and hospitality.",
      locale: ogLocale(l),
      alternateLocale: alternateOgLocales(l),
      images: [{ url: "/me/portrait.jpg", width: 1200, height: 1200, alt: "Juan Diaz" }],
    },
  };
}

const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Juan Stefan Bongartz Diaz",
  alternateName: "Juan Diaz",
  url: `${SITE}/about`,
  image: `${SITE}/me/portrait.jpg`,
  jobTitle: "Founder, Juan Diaz, LLC",
  worksFor: {
    "@type": "Organization",
    name: "Juan Diaz, LLC",
    url: SITE,
  },
  description:
    "Construction-management-trained operator turned systems-builder. Builds revenue engines for operators in energy, real estate, hospitality and adjacent industries.",
  knowsAbout: [
    "Revenue operations",
    "CRM design",
    "Operator software",
    "Energy market operations",
    "Real estate operations",
    "Sales automation",
    "Data engineering for operators",
  ],
  sameAs: ["https://github.com/bongartzdiaz"],
};

const FOCUS_KEYS = [
  { nameKey: "about.focus.energy.name", bodyKey: "about.focus.energy.body" },
  { nameKey: "about.focus.re.name", bodyKey: "about.focus.re.body" },
  { nameKey: "about.focus.hosp.name", bodyKey: "about.focus.hosp.body" },
  { nameKey: "about.focus.adj.name", bodyKey: "about.focus.adj.body" },
] as const;

const PRINCIPLE_KEYS = [
  "about.pr.1",
  "about.pr.2",
  "about.pr.3",
  "about.pr.4",
  "about.pr.5",
] as const;

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const l = assertLocale(locale);
  const t = (k: string) => translate(l, k);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
      <header className="page-hero">
        <div className="eyebrow">{t("about.eyebrow")}</div>
        <h1>
          <em>{t("about.title.a")}</em> {t("about.title.b")}
        </h1>
        <p>{t("about.lede")}</p>
      </header>

      <article className="long">
        <h2>{t("about.h.do")}</h2>
        <p>{t("about.p.do1")}</p>
        <p>{t("about.p.do2")}</p>

        <h2>{t("about.h.where")}</h2>
        <div className="about-focus">
          {FOCUS_KEYS.map((f) => (
            <div key={f.nameKey} className="about-focus-card">
              <div className="af-sector">{t(f.nameKey)}</div>
              <p>{t(f.bodyKey)}</p>
            </div>
          ))}
        </div>

        <h2>{t("about.h.principles")}</h2>
        <ul>
          {PRINCIPLE_KEYS.map((k) => (
            <li key={k}>{t(k)}</li>
          ))}
        </ul>

        <h2>{t("about.h.why")}</h2>
        <p>{t("about.p.why1")}</p>
        <p>
          {t("about.p.why2.1")}{" "}
          <Link href="/story">{t("about.p.why2.link1")}</Link>
          {t("about.p.why2.2")}{" "}
          <Link href="/work">{t("about.p.why2.link2")}</Link>
          {t("about.p.why2.3")}{" "}
          <Link href="/insights">{t("about.p.why2.link3")}</Link>{" "}
          {t("about.p.why2.4")}
        </p>

        <div className="about-cta" style={{ marginTop: 48 }}>
          <Link href="/contact" className="btn primary">
            {t("about.cta")} <span className="arr">→</span>
          </Link>
        </div>
      </article>
    </>
  );
}
