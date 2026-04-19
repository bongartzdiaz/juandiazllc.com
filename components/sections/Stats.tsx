"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/useT";

type StatDef = {
  value: number;
  suffix?: string;
  italicSuffix?: string;
  italicPrefix?: string;
  labelKey: string;
  format?: (n: number) => string;
};

const STATS: StatDef[] = [
  { italicPrefix: "07", value: 0, labelKey: "stats.l.years" },
  { value: 4, italicSuffix: "+", labelKey: "stats.l.live" },
  { italicPrefix: "5", value: 0, labelKey: "stats.l.phases" },
  { value: 2, italicSuffix: "027", labelKey: "stats.l.deadline" },
];

function useCount(target: number, active: boolean, duration = 1400) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    let raf = 0;
    function tick(t: number) {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);
  return n;
}

function Stat({ def, active }: { def: StatDef; active: boolean }) {
  const t = useT();
  const n = useCount(def.value, active);
  const display = def.italicPrefix ? (
    <>
      <em>{def.italicPrefix}</em>
      {def.value > 0 ? n : ""}
      {def.italicSuffix && <em>{def.italicSuffix}</em>}
    </>
  ) : (
    <>
      {n}
      {def.italicSuffix && <em>{def.italicSuffix}</em>}
    </>
  );
  return (
    <div className="stat">
      <div className="n">{display}</div>
      <div className="l">{t(def.labelKey)}</div>
    </div>
  );
}

export function Stats() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setActive(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.35 }
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  return (
    <div className="stats" data-reveal ref={ref}>
      {STATS.map((s, i) => (
        <Stat key={i} def={s} active={active} />
      ))}
    </div>
  );
}
