import type { Metadata } from "next";
import Link from "next/link";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://juandiazllc.com";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = assertLocale(locale);
  return {
    title: "About Juan Diaz — operator, builder, founder",
    description:
      "Construction-trained, operator-built. Juan Diaz runs Juan Diaz LLC — a holding company building revenue engines for operators in energy, real estate and hospitality.",
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
  name: "Juan Diaz",
  url: `${SITE}/about`,
  image: `${SITE}/me/portrait.jpg`,
  jobTitle: "Founder, Juan Diaz LLC",
  worksFor: {
    "@type": "Organization",
    name: "Juan Diaz LLC",
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

const FOCUS = [
  {
    sector: "Energy",
    blurb:
      "Solar, batteries, installers, energy advisory. Live products: Voltafy (platform), Help Mij Besparen (consumer), Salderingsregeling 2027 (policy).",
  },
  {
    sector: "Real estate",
    blurb:
      "Brokerage + property management operators with distributed field teams. Philly CRM started here — built for people who update deals while walking from the car to the door.",
  },
  {
    sector: "Hospitality",
    blurb:
      "Multi-location operators where the front-of-house and the back-office speak different languages. Our lane: making them agree on one number.",
  },
  {
    sector: "Operator-adjacent",
    blurb:
      "Logistics, trades, home services. Anything where revenue is earned in the field and lost in the office because the systems never met.",
  },
];

const PRINCIPLES = [
  "Survey, blueprint, build, commission, operate — skip a phase and it leaks.",
  "Buy the commodity. Build the moat.",
  "The field team is the primary user. The dashboard is a consequence.",
  "If it takes more than three taps, it will not happen.",
  "Ship honestly: uncomfortable truths first, vanity metrics last.",
];

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
      <header className="page-hero">
        <div className="eyebrow">◉ About</div>
        <h1>
          <em>Juan Diaz</em> — operator, builder, founder.
        </h1>
        <p>
          Construction-management-trained. Amsterdam-based. Building revenue engines for
          operators across energy, real estate, hospitality and adjacent industries.
        </p>
      </header>

      <article className="long">
        <h2>What I actually do</h2>
        <p>
          I run Juan Diaz LLC as a small holding company. Internally we ship product
          (Voltafy for energy, Philly for operator CRM, Help Mij Besparen for consumer
          energy advisory, and a couple more on the way). Externally I take on a small
          number of operator engagements per year — founders with a team of 20–200 who
          know they are leaving revenue on the table but cannot see where.
        </p>
        <p>
          The common thread across both sides is the same: I build the systems that make
          operators more money. Not decks. Not dashboards for the sake of it. The
          specific CRM views, automations, and integration layers that turn a team of
          humans plus software into something that compounds.
        </p>

        <h2>Where I spend my time</h2>
        <div className="about-focus">
          {FOCUS.map((f) => (
            <div key={f.sector} className="about-focus-card">
              <div className="af-sector">{f.sector}</div>
              <p>{f.blurb}</p>
            </div>
          ))}
        </div>

        <h2>Operating principles</h2>
        <ul>
          {PRINCIPLES.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>

        <h2>Why construction</h2>
        <p>
          I trained as a construction manager before I wrote production software. It is
          the most ruthless teacher I know of about what it takes to ship something real.
          Concrete either sets or it does not. The five phases — survey, blueprint,
          build, commission, operate — are a better project-management framework than
          anything I have seen in tech. I apply them unchanged to every system I build.
        </p>
        <p>
          For the narrative version, the origin story lives on{" "}
          <Link href="/story">the story page</Link>. For what we have shipped, see{" "}
          <Link href="/work">the ventures</Link>. For how I think, the{" "}
          <Link href="/insights">insights</Link> are honest — closer to field notes than
          thought leadership.
        </p>

        <div className="about-cta" style={{ marginTop: 48 }}>
          <Link href="/contact" className="btn primary">
            Book a blueprint call <span className="arr">→</span>
          </Link>
        </div>
      </article>
    </>
  );
}
