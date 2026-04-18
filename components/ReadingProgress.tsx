"use client";

import { useEffect, useState } from "react";

// Thin accent-green progress bar pinned to the top of the viewport.
// Tracks how far through the article body the reader has scrolled.
// Uses rAF-throttled scroll so it stays smooth on low-end mobile.
//
// Mounts only on pages that include it (insights/[slug]) — not global
// — so the marketing pages stay clean.

export function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    function update() {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const pct = max > 0 ? Math.min(1, Math.max(0, doc.scrollTop / max)) : 0;
      setProgress(pct);
    }
    function onScroll() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    }
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        background: "transparent",
        zIndex: 80,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: `${progress * 100}%`,
          height: "100%",
          background: "linear-gradient(90deg, var(--accent-dk), var(--accent), var(--accent-2))",
          transition: "width 80ms linear",
          boxShadow: "0 0 12px rgba(46,196,137,0.45)",
        }}
      />
    </div>
  );
}
