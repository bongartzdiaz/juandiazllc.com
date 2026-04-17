"use client";

import { useEffect, useState } from "react";

export function ScrollProgress() {
  const [p, setP] = useState(0);

  useEffect(() => {
    function update() {
      const doc = document.documentElement;
      const total = doc.scrollHeight - window.innerHeight;
      setP(total > 0 ? window.scrollY / total : 0);
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        zIndex: 60,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${p * 100}%`,
          background: "linear-gradient(90deg, transparent, var(--accent) 20%, var(--accent) 80%, var(--accent-2))",
          boxShadow: "0 0 14px rgba(94,255,177,.4)",
          transition: "width .1s linear",
        }}
      />
    </div>
  );
}
