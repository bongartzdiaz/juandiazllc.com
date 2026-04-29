import Link from "next/link";
import { translate, type Locale } from "@/lib/i18n/dict";
import { Globe } from "./Globe";

// Hero — interactive earth with real countries (SVG orthographic
// projection via d3-geo). Background is a living Milky Way: rotating
// galactic arms, dust lanes, nebula cloud pulses, twinkling stars,
// and occasional shooting stars. Pure CSS + SVG; no WebGL.
//
// Server component: the interactive Globe child keeps "use client"
// on its own, but the surrounding layout + title + CTA labels need
// nothing beyond the URL locale, so hoisting this out of the client
// bundle shaves the initial JS parse on every homepage load.
export function Hero({ locale }: { locale: Locale }) {
  const t = (k: string) => translate(locale, k);

  return (
    <header className="hero" aria-label="Hero">
      <div className="hero-stage" aria-hidden="true">
        <div className="milky-way">
          <div className="mw-core" />
          <div className="mw-arms" />
          <div className="mw-dust" />
          <div className="mw-nebula" />
        </div>
        <div className="hero-starfield-deep" />
        <div className="hero-starfield" />
        <div className="hero-globe-container">
          <Globe
            labels={{
              aria: t("globe.aria"),
              close: t("globe.close"),
              back: t("globe.back"),
              eyebrowFallback: t("globe.eyebrow.fallback"),
              bodyFallback: t("globe.body.fallback"),
            }}
          />
        </div>
      </div>

      <div className="hero-overlay">
        <div className="hero-tag">
          <span className="chip">{t("hero.chip.status")}</span>
          <span className="chip">{t("hero.chip.sectors")}</span>
        </div>
        <h1 className="hero-title">
          <span className="line"><span>{t("hero.title.1")}</span></span>
          <span className="line"><span>{t("hero.title.2")}</span></span>
          <span className="line"><span><em>{t("hero.title.3")}</em></span></span>
        </h1>
        <div className="hero-foot">
          <div style={{ maxWidth: 600 }}>
            <p className="hero-desc">
              <b>Juan Diaz, LLC</b> {t("hero.desc")}
            </p>
            <div className="hero-ctas">
              <Link className="btn primary btn-mag" href="/contact">
                {t("hero.cta.primary")} <span className="arr">→</span>
              </Link>
              <Link className="btn ghost" href="/work">
                {t("hero.cta.secondary")} <span className="arr">→</span>
              </Link>
            </div>
          </div>
          <div className="scroll-hint">
            <i />
            <span>{t("hero.scroll")}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
