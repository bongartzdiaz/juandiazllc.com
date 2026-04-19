"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/useT";

export function Chapters() {
  const sectionRef = useRef<HTMLElement>(null);
  const [idx, setIdx] = useState(0);
  const t = useT();

  useEffect(() => {
    function sync() {
      const sec = sectionRef.current;
      if (!sec) return;
      const r = sec.getBoundingClientRect();
      const total = sec.offsetHeight - window.innerHeight;
      const p = Math.min(1, Math.max(0, -r.top / total));
      setIdx(Math.min(2, Math.floor(p * 3)));
    }
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  return (
    <section
      className="chapters chapters-wrap"
      id="chapters"
      ref={sectionRef}
      style={{
        height: "calc(3 * 100vh + 100vh)",
        maxWidth: "none",
        padding: 0,
        margin: 0,
      }}
    >
      <div className="chapters-pin">
        <div className="ch-visual">
          <div className="ch-num">
            <b>{t("ch.word")}</b> {String(idx + 1).padStart(2, "0")} / 03
          </div>

          <div className={`ch-scene${idx === 0 ? " active" : ""}`} data-scene="0">
            <svg viewBox="-200 -200 400 400">
              <g className="rot">
                <circle className="ring" r="180" />
                <circle className="ring" r="150" />
                <circle className="ring" r="120" />
                <circle className="ring b" r="90" />
                <circle className="ring b" r="60" />
              </g>
              <g className="rotFast">
                <circle className="dot" cx="180" cy="0" r="3" />
                <circle className="dot" cx="-150" cy="0" r="2" />
                <circle className="dot" cx="0" cy="120" r="2.5" />
              </g>
              <circle r="10" fill="var(--accent)" opacity=".9" />
              <circle r="22" fill="none" stroke="var(--accent)" strokeWidth=".8" opacity=".5" />
              <circle r="40" fill="none" stroke="var(--accent)" strokeWidth=".5" opacity=".25" />
            </svg>
          </div>

          <div className={`ch-scene${idx === 1 ? " active" : ""}`} data-scene="1">
            <svg viewBox="-200 -200 400 400">
              <g className="grid-lines">
                {[-150, -100, -50, 0, 50, 100, 150].map((y) => (
                  <line key={`h${y}`} x1="-200" y1={y} x2="200" y2={y} />
                ))}
                {[-150, -100, -50, 0, 50, 100, 150].map((x) => (
                  <line key={`v${x}`} x1={x} y1="-200" x2={x} y2="200" />
                ))}
              </g>
              <g className="rotR">
                <rect x="-80" y="-80" width="160" height="160" fill="none" stroke="var(--accent)" strokeWidth="1" opacity=".7" />
                <rect x="-50" y="-50" width="100" height="100" fill="none" stroke="var(--accent-2)" strokeWidth=".8" opacity=".5" />
              </g>
              <circle r="6" fill="var(--accent)" />
              <path className="wave" d="M -180 0 Q -135 -60 -90 0 T 0 0 T 90 0 T 180 0" />
            </svg>
          </div>

          <div className={`ch-scene${idx === 2 ? " active" : ""}`} data-scene="2">
            <svg viewBox="-200 -200 400 400">
              <g className="rot">
                <circle className="ring" r="180" strokeDasharray="2 8" />
                <circle className="ring b" r="140" strokeDasharray="1 6" />
              </g>
              <g transform="translate(-120,60)">
                {[30, 60, 90, 120, 100, 140, 110, 160, 130, 170, 200, 180].map((h, i) => (
                  <rect
                    key={i}
                    x={i * 20}
                    y={-h}
                    width="10"
                    height={h}
                    fill={i < 5 ? "var(--accent)" : "var(--accent-2)"}
                    opacity={0.7 + (i % 3) * 0.1}
                  />
                ))}
              </g>
              <circle r="4" fill="var(--accent)" />
            </svg>
          </div>

          <div className="ch-bars">
            <i className={idx >= 0 ? "on" : ""} />
            <i className={idx >= 1 ? "on" : ""} />
            <i className={idx >= 2 ? "on" : ""} />
          </div>
        </div>

        <div className="ch-text">
          <div className="ch-slides">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`ch-slide${idx === i ? " active" : ""}`}
                data-slide={i}
              >
                <div className="eyebrow">{t(`ch.${i + 1}.eyebrow`)}</div>
                <h3 dangerouslySetInnerHTML={{ __html: t(`ch.${i + 1}.title`) }} />
                <p>{t(`ch.${i + 1}.body`)}</p>
                <div className="ch-meta">{t(`ch.${i + 1}.meta`)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
