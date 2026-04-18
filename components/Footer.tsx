"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/useT";

export function Footer() {
  const t = useT();
  return (
    <footer>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="f-mark">Juan Diaz LLC</div>
        <div style={{ color: "var(--muted-soft)", fontSize: 11 }}>© 2026 · Delaware, USA</div>
      </div>
      <nav aria-label="Footer" style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
        <Link href="/story">{t("nav.story")}</Link>
        <Link href="/about">About</Link>
        <Link href="/now">Now</Link>
        <Link href="/uses">Uses</Link>
        <Link href="/work">{t("nav.work")}</Link>
        <Link href="/insights">{t("nav.insights")}</Link>
        <Link href="/signals">{t("nav.signals")}</Link>
        <Link href="/contact">{t("nav.contact")}</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/login">{t("nav.login")}</Link>
      </nav>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "right" }}>
        <div>
          <span id="footTime">—</span> · Amsterdam CET
        </div>
        <div style={{ color: "var(--muted-soft)", fontSize: 11 }}>
          juandiazllc.com · {t("footer.version")}
        </div>
      </div>
    </footer>
  );
}
