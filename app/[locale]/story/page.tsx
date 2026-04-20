import type { Metadata } from "next";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";
import { translate } from "@/lib/i18n/dict";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = assertLocale(locale);
  return {
    title: "Story — construction-trained, operator-built",
    description:
      "The story behind Juan Diaz, LLC — construction management, the crossover to revenue operations, and why I build honest software for operators.",
    alternates: buildAlternates(l, "/story"),
    openGraph: { locale: ogLocale(l), alternateLocale: alternateOgLocales(l) },
  };
}

export default async function StoryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const l = assertLocale(locale);
  const t = (k: string) => translate(l, k);

  return (
    <>
      <header className="page-hero">
        <div className="eyebrow">{t("sp.eyebrow")}</div>
        <h1 dangerouslySetInnerHTML={{ __html: t("sp.title") }} />
        <p>{t("sp.lede")}</p>
      </header>

      <article className="long">
        <p dangerouslySetInnerHTML={{ __html: t("sp.p.intro") }} />

        <h2 dangerouslySetInnerHTML={{ __html: t("sp.h.teacher") }} />
        <p dangerouslySetInnerHTML={{ __html: t("sp.p.teacher1") }} />
        <p>{t("sp.p.teacher2")}</p>

        <h2 dangerouslySetInnerHTML={{ __html: t("sp.h.crossover") }} />
        <p dangerouslySetInnerHTML={{ __html: t("sp.p.crossover1") }} />
        <blockquote>{t("sp.quote")}</blockquote>
        <p>{t("sp.p.crossover2")}</p>

        <h2 dangerouslySetInnerHTML={{ __html: t("sp.h.now") }} />
        <p>{t("sp.p.now1")}</p>
        <p dangerouslySetInnerHTML={{ __html: t("sp.p.now2") }} />

        <p style={{ marginTop: 56 }}>
          — Juan Stefan Diaz<br />
          <span style={{ color: "var(--muted-soft)", fontSize: 14, letterSpacing: ".08em", textTransform: "uppercase", fontFamily: "'JetBrains Mono'" }}>
            {t("sp.sign.role")}
          </span>
        </p>
      </article>
    </>
  );
}
