"use client";

import { LocaleLink } from "@/components/LocaleLink";
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
        <LocaleLink href="/story">{t("nav.story")}</LocaleLink>
        <LocaleLink href="/about">{t("footer.about")}</LocaleLink>
        <LocaleLink href="/now">{t("footer.now")}</LocaleLink>
        <LocaleLink href="/uses">{t("footer.uses")}</LocaleLink>
        <LocaleLink href="/work">{t("nav.work")}</LocaleLink>
        <LocaleLink href="/services">{t("nav.services")}</LocaleLink>
        <LocaleLink href="/sectors">{t("nav.sectors")}</LocaleLink>
        <LocaleLink href="/insights">{t("nav.insights")}</LocaleLink>
        <LocaleLink href="/signals">{t("nav.signals")}</LocaleLink>
        <LocaleLink href="/contact">{t("nav.contact")}</LocaleLink>
        <LocaleLink href="/privacy">{t("footer.privacy")}</LocaleLink>
        <LocaleLink href="/impressum">{t("footer.impressum")}</LocaleLink>
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
            href="https://wa.me/message/GUH2NLTZM6LTK1"
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
