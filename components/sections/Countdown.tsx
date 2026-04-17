"use client";

import { useEffect, useState } from "react";

const TARGET = new Date("2027-01-01T00:00:00+01:00").getTime();

function pad(n: number, w = 2) {
  return String(Math.max(0, n)).padStart(w, "0");
}

export function Countdown() {
  const [t, setT] = useState({ D: "—", H: "—", M: "—", S: "—" });

  useEffect(() => {
    function tick() {
      const diff = Math.max(0, TARGET - Date.now());
      const s = Math.floor(diff / 1000);
      setT({
        D: pad(Math.floor(s / 86400), 3),
        H: pad(Math.floor((s % 86400) / 3600)),
        M: pad(Math.floor((s % 3600) / 60)),
        S: pad(s % 60),
      });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="countdown" data-reveal>
      <div className="cd-head">
        <div>
          <div className="label" style={{ marginBottom: 8 }}>◉ The deadline</div>
          <div
            style={{
              fontFamily: "'Inter'",
              fontWeight: 300,
              fontSize: "clamp(22px,2.6vw,32px)",
              lineHeight: 1.25,
              letterSpacing: "-.015em",
              maxWidth: "60ch",
            }}
          >
            Salderingsregeling ends{" "}
            <em style={{ color: "var(--accent)", fontStyle: "italic" }}>
              January 1, 2027
            </em>{" "}
            — and the Dutch energy map changes overnight.
          </div>
        </div>
        <div className="cd-pulse">Live counter</div>
      </div>
      <div className="cd-grid">
        <div className="cd-cell">
          <div className="num"><em>{t.D}</em></div>
          <div className="unit">Days</div>
        </div>
        <div className="cd-cell">
          <div className="num">{t.H}</div>
          <div className="unit">Hours</div>
        </div>
        <div className="cd-cell">
          <div className="num">{t.M}</div>
          <div className="unit">Minutes</div>
        </div>
        <div className="cd-cell">
          <div className="num">{t.S}</div>
          <div className="unit">Seconds</div>
        </div>
      </div>
      <div className="cd-foot">
        — Ticking live from your browser · <b>target 2027-01-01 00:00 CET</b> · this is the window we're building in.
      </div>
    </div>
  );
}
