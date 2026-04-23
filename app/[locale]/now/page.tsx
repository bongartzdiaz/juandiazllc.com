import type { Metadata } from "next";
import Link from "next/link";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";
import { translate } from "@/lib/i18n/dict";
import { webPageSchema } from "@/lib/seo/schema";

// /now — https://nownownow.com convention. A public "what I'm
// actually focused on right this quarter" page. Updated roughly
// monthly. Stays honest because it's dated; anyone checking a year
// later can see how plans held up. Good EEAT signal: concrete, recent,
// and signed with a timestamp.

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = assertLocale(locale);
  return {
    title: translate(l, "now.meta.title"),
    description: translate(l, "now.meta.desc"),
    alternates: buildAlternates(l, "/now"),
    openGraph: { locale: ogLocale(l), alternateLocale: alternateOgLocales(l) },
  };
}

const LAST_UPDATED = "2026-04-18";

const SHIPPING_KEYS = ["now.ship.1", "now.ship.2", "now.ship.3"] as const;
const WRITING_KEYS = ["now.write.1", "now.write.2", "now.write.3"] as const;
const LEARNING_KEYS = ["now.learn.1", "now.learn.2", "now.learn.3"] as const;
const NOT_DOING_KEYS = ["now.nope.1", "now.nope.2", "now.nope.3"] as const;

const DATE_LOCALE: Record<string, string> = {
  en: "en-US",
  nl: "nl-NL",
  de: "de-DE",
  es: "es-ES",
};

export default async function NowPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const l = assertLocale(locale);
  const t = (k: string) => translate(l, k);

  const lastUpdated = new Date(LAST_UPDATED).toLocaleDateString(DATE_LOCALE[l] ?? "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const pageSchema = webPageSchema({
    locale: l,
    path: "/now",
    name: t("now.meta.title"),
    description: t("now.meta.desc"),
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }} />
      <header className="page-hero">
        <div className="eyebrow">{t("now.eyebrow")}</div>
        <h1 dangerouslySetInnerHTML={{ __html: t("now.title") }} />
        <p>{t("now.lede")}</p>
      </header>

      <article className="long">
        <div style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 24 }}>
          {t("now.lastupdated")} {lastUpdated}
        </div>

        <h2>{t("now.h.shipping")}</h2>
        <ul>
          {SHIPPING_KEYS.map((k) => <li key={k}>{t(k)}</li>)}
        </ul>

        <h2>{t("now.h.writing")}</h2>
        <ul>
          {WRITING_KEYS.map((k) => <li key={k}>{t(k)}</li>)}
        </ul>

        <h2>{t("now.h.learning")}</h2>
        <ul>
          {LEARNING_KEYS.map((k) => <li key={k}>{t(k)}</li>)}
        </ul>

        <h2>{t("now.h.notdoing")}</h2>
        <ul>
          {NOT_DOING_KEYS.map((k) => <li key={k}>{t(k)}</li>)}
        </ul>

        <p style={{ marginTop: 48 }}>
          {t("now.outro.1")}{" "}
          <Link href="/contact">{t("now.outro.link.contact")}</Link>
          {t("now.outro.2")}{" "}
          <Link href="/insights">{t("now.outro.link.insights")}</Link>{" "}
          {t("now.outro.3")}{" "}
          <Link href="/story">{t("now.outro.link.story")}</Link>{" "}
          {t("now.outro.4")}{" "}
          <Link href="/uses">{t("now.outro.link.uses")}</Link>.
        </p>
      </article>
    </>
  );
}
