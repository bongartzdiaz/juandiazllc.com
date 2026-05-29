"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useT } from "@/lib/i18n/useT";

// Globe is decorative (the hero stage is aria-hidden) and pulls in
// d3-geo + topojson-client + a 108KB world-atlas fetch. Dynamic-import
// with ssr:false keeps it off the critical path: hero text + LCP paint
// immediately, the interactive earth hydrates after. A faint skeleton
// holds the layout so there's no jump when it mounts.
const Globe = dynamic(() => import("./Globe").then((m) => m.Globe), {
  ssr: false,
  loading: () => <div className="globe-skeleton" aria-hidden="true" />,
});

// Hero — interactive earth with real countries (SVG orthographic
// projection via d3-geo). Background is a living Milky Way: rotating
// galactic arms, dust lanes, nebula cloud pulses, twinkling stars,
// and occasional shooting stars. Pure CSS + SVG; no WebGL.
export function Hero() {
  const t = useT();

  return (
    <header className="hero" aria-label={t("hero.aria.label")}>
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
          <Globe />
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
