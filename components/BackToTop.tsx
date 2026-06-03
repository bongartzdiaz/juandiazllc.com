"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/useT";

// Appears after 600px of scroll. Smooth-scrolls to top on click.
// Respects prefers-reduced-motion.

export function BackToTop() {
  const t = useT();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 600);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function toTop() {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }

  return (
    <button
      type="button"
      aria-label={t("a11y.backtotop")}
      onClick={toTop}
      className="back-to-top"
      data-visible={visible}
    >
      <span aria-hidden="true">↑</span>
    </button>
  );
}
