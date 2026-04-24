import type { Metadata } from "next";
import Link from "next/link";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";
import { translate } from "@/lib/i18n/dict";
import { aboutPageSchema } from "@/lib/seo/schema";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://juandiazllc.com";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = assertLocale(locale);
  return {
    title: translate(l, "about.meta.title"),
    description: translate(l, "about.meta.desc"),
    alternates: buildAlternates(l, "/about"),
    openGraph: {
      type: "profile",
      url: `/${l}/about`,
      title: translate(l, "about.og.title"),
      description: translate(l, "about.og.desc"),
      locale: ogLocale(l),
      alternateLocale: alternateOgLocales(l),
      images: [{ url: "/me/portrait.svg", width: 1200, height: 1200, alt: "Juan Diaz" }],
    },
  };
}

// Person entity for Google's Knowledge Panel eligibility. The legal
// name is the canonical identifier (what Google matches against),
// with `alternateName` covering the form that appears on bylines,
// social handles, and the company name itself. Every disambiguation
// field (workLocation, nationality, worksFor, sameAs, description)
// is a signal Google uses to merge this into a single entity and
// decide which "Juan Diaz" on the web this is.
const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": `${SITE}/about#person`,
  name: "Juan Stefan Bongartz Diaz",
  alternateName: ["Juan Diaz", "Juan S. Diaz", "Juan Bongartz Diaz"],
  givenName: "Juan",
  additionalName: "Stefan",
  familyName: "Bongartz Diaz",
  url: `${SITE}/about`,
  mainEntityOfPage: `${SITE}/about`,
  image: `${SITE}/me/portrait.svg`,
  jobTitle: "Founder, Juan Diaz, LLC",
  nationality: { "@type": "Country", name: "Netherlands" },
  workLocation: {
    "@type": "Place",
    name: "Amsterdam, Netherlands",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Amsterdam",
      addressCountry: "NL",
    },
  },
  worksFor: {
    "@type": "Organization",
    name: "Juan Diaz, LLC",
    url: SITE,
  },
  description:
    "Construction-management-trained operator turned systems-builder. Founder of Juan Diaz, LLC and multiple operator-focused ventures including Philly CRM, Voltafy and Help Mij Besparen. Builds revenue engines for operators in energy, real estate, hospitality and adjacent industries.",
  knowsAbout: [
    "Revenue operations",
    "CRM design",
    "Operator software",
    "Energy market operations",
    "Real estate operations",
    "Sales automation",
    "Data engineering for operators",
    "Solar and battery economics",
    "Salderingsregeling 2027",
    "Holding-company operations",
  ],
  knowsLanguage: ["en", "nl", "de", "es"],
  sameAs: [
    "https://github.com/bongartzdiaz",
    "https://linkedin.com/in/juanstefan",
    "https://twitter.com/juandiazllc",
    "https://instagram.com/diazelcazador",
  ],
};

// ProfilePage is Google's purpose-built schema for author / founder
// disambiguation — it tells the crawler "this URL is the canonical
// profile page for the Person below", which is exactly what we need
// for name-search Knowledge Panel eligibility.
const profilePageSchema = {
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  "@id": `${SITE}/about`,
  url: `${SITE}/about`,
  mainEntity: { "@id": `${SITE}/about#person` },
  dateCreated: "2024-01-01",
  dateModified: new Date().toISOString().slice(0, 10),
  inLanguage: "en",
  about: { "@id": `${SITE}/about#person` },
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
  const aboutSchema = aboutPageSchema({
    locale: l,
    name: translate(l, "about.meta.title"),
    description: translate(l, "about.meta.desc"),
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(profilePageSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutSchema) }}
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
