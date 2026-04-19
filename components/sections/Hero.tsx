"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/useT";

// True CSS-3D globe. Each meridian is a pre-rotated ring (border-radius
// circle) inside a transform-style: preserve-3d container. When the
// container rotates on Y, every ring rotates with it in actual 3D,
// producing a wireframe sphere without WebGL. Works on every device,
// every browser, regardless of fingerprinting/battery/reduced-motion
// settings. Reduced-motion users get a still globe.
const MERIDIAN_COUNT = 12;
const PARALLEL_COUNT = 7;

export function Hero() {
  const t = useT();

  const meridians = Array.from({ length: MERIDIAN_COUNT }, (_, i) => ({
    angle: (i * 180) / MERIDIAN_COUNT,
  }));
  const parallels = Array.from({ length: PARALLEL_COUNT }, (_, i) => {
    // latitudes from -75° to 75°
    const lat = -75 + (i * 150) / (PARALLEL_COUNT - 1);
    return { lat };
  });

  return (
    <header className="hero" aria-label="Hero">
      <div className="hero-stage" aria-hidden="true">
        <div className="hero-starfield" />
        <div className="hero-globe3d">
          <div className="globe-rotor">
            <div className="globe-core" />
            <div className="globe-atmosphere" />
            {meridians.map((m, i) => (
              <div
                key={`m${i}`}
                className="globe-meridian"
                style={{ transform: `rotateY(${m.angle}deg)` }}
              />
            ))}
            {parallels.map((p, i) => {
              const rad = (p.lat * Math.PI) / 180;
              const scale = Math.cos(rad);
              const translateY = Math.sin(rad) * 50;
              return (
                <div
                  key={`p${i}`}
                  className="globe-parallel"
                  style={{
                    transform: `translateY(${translateY}%) rotateX(90deg) scale(${scale})`,
                  }}
                />
              );
            })}
            <div className="globe-specular" />
          </div>
          <div className="globe-orbit orbit-1">
            <div className="orbit-sat" />
          </div>
          <div className="globe-orbit orbit-2">
            <div className="orbit-sat" />
          </div>
          <div className="globe-orbit orbit-3">
            <div className="orbit-sat" />
          </div>
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
              <b>Juan Diaz LLC</b> {t("hero.desc")}
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
