"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/useT";

export function Footer() {
  const t = useT();
  return (
    <footer>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="f-mark">Juan Diaz, LLC</div>
        <div style={{ color: "var(--muted-soft)", fontSize: 11 }}>{t("footer.copyright")}</div>
      </div>
      <nav aria-label="Footer" style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
        <Link href="/story">{t("nav.story")}</Link>
        <Link href="/about">{t("footer.about")}</Link>
        <Link href="/now">{t("footer.now")}</Link>
        <Link href="/uses">{t("footer.uses")}</Link>
        <Link href="/work">{t("nav.work")}</Link>
        <Link href="/services">{t("nav.services")}</Link>
        <Link href="/sectors">{t("nav.sectors")}</Link>
        <Link href="/insights">{t("nav.insights")}</Link>
        <Link href="/signals">{t("nav.signals")}</Link>
        <Link href="/contact">{t("nav.contact")}</Link>
        <Link href="/privacy">{t("footer.privacy")}</Link>
        <Link href="/impressum">{t("footer.impressum")}</Link>
      </nav>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "right" }}>
        <div>
          <span id="footTime">—</span> · {t("footer.tz")}
        </div>
        <div style={{ fontSize: 12 }}>
          <a
            href="tel:+31653142656"
            style={{ fontVariantNumeric: "tabular-nums" }}
            aria-label="Call +31 6 5314 2656"
          >
            +31 6 5314 2656
          </a>
          {" · "}
          <a
            href="https://wa.me/31653142656"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp +31 6 5314 2656"
          >
            WhatsApp
          </a>
        </div>
        <div style={{ color: "var(--muted-soft)", fontSize: 11 }}>
          juandiazllc.com · {t("footer.version")}
        </div>
      </div>
    </footer>
  );
}
