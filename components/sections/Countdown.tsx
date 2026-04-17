"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/useT";

const TARGET = new Date("2027-01-01T00:00:00+01:00").getTime();

function pad(n: number, w = 2) {
  return String(Math.max(0, n)).padStart(w, "0");
}

export function Countdown() {
  const [t, setT] = useState({ D: "—", H: "—", M: "—", S: "—" });
  const tr = useT();

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
          <div className="label" style={{ marginBottom: 8 }}>{tr("cd.label")}</div>
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
            {tr("cd.title")}{" "}
            <em style={{ color: "var(--accent)", fontStyle: "italic" }}>
              {tr("cd.date")}
            </em>{" "}
            {tr("cd.sub")}
          </div>
        </div>
        <div className="cd-pulse">{tr("cd.live")}</div>
      </div>
      <div className="cd-grid">
        <div className="cd-cell">
          <div className="num"><em>{t.D}</em></div>
          <div className="unit">{tr("cd.days")}</div>
        </div>
        <div className="cd-cell">
          <div className="num">{t.H}</div>
          <div className="unit">{tr("cd.hours")}</div>
        </div>
        <div className="cd-cell">
          <div className="num">{t.M}</div>
          <div className="unit">{tr("cd.minutes")}</div>
        </div>
        <div className="cd-cell">
          <div className="num">{t.S}</div>
          <div className="unit">{tr("cd.seconds")}</div>
        </div>
      </div>
      <div className="cd-foot">{tr("cd.foot")}</div>
    </div>
  );
}
