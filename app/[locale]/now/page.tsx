import type { Metadata } from "next";
import { LocaleLink } from "@/components/LocaleLink";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";
import { translate } from "@/lib/i18n/dict";
import { ogImages } from "@/lib/seo/branding";

// /now — https://nownownow.com convention. A public "what I'm
// actually focused on right this quarter" page. Updated roughly
// monthly. Stays honest because it's dated; anyone checking a year
// later can see how plans held up. Good EEAT signal: concrete, recent,
// and signed with a timestamp.

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = assertLocale(locale);
  return {
    title: translate(l, "meta.now.title"),
    description: translate(l, "meta.now.description"),
    alternates: buildAlternates(l, "/now"),
    openGraph: {
      images: ogImages(l), locale: ogLocale(l), alternateLocale: alternateOgLocales(l) },
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

  return (
    <>
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
          <LocaleLink href="/contact">{t("now.outro.link.contact")}</LocaleLink>
          {t("now.outro.2")}{" "}
          <LocaleLink href="/insights">{t("now.outro.link.insights")}</LocaleLink>{" "}
          {t("now.outro.3")}{" "}
          <LocaleLink href="/story">{t("now.outro.link.story")}</LocaleLink>{" "}
          {t("now.outro.4")}{" "}
          <LocaleLink href="/uses">{t("now.outro.link.uses")}</LocaleLink>.
        </p>
      </article>
    </>
  );
}
