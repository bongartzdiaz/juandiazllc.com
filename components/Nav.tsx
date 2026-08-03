"use client";

import { LocaleLink } from "@/components/LocaleLink";
import { useT } from "@/lib/i18n/useT";
import { Logo } from "./Logo";

export function Nav() {
  const t = useT();
  return (
    <nav className="top" aria-label={t("nav.aria.primary")}>
      <LocaleLink
        href="/"
        className="brand"
        aria-label={t("nav.aria.brand")}
        style={{ color: "var(--accent)", gap: 12 }}
      >
        <Logo size={26} animated />
        <span style={{ color: "var(--text)" }}>Juan Diaz, LLC</span>
      </LocaleLink>
      <div className="nav-right">
        <span id="navTime">—</span>
        <LocaleLink href="/about" className="hide-mobile">{t("nav.about")}</LocaleLink>
        <LocaleLink href="/story" className="hide-mobile">{t("nav.story")}</LocaleLink>
        <LocaleLink href="/work">{t("nav.work")}</LocaleLink>
        <LocaleLink href="/services" className="hide-mobile">{t("nav.services")}</LocaleLink>
        <LocaleLink href="/sectors" className="hide-mobile">{t("nav.sectors")}</LocaleLink>
        <LocaleLink href="/pricing">{t("nav.pricing")}</LocaleLink>
        <LocaleLink href="/insights" className="hide-mobile">{t("nav.insights")}</LocaleLink>
        <LocaleLink href="/signals" className="hide-mobile">{t("nav.signals")}</LocaleLink>
        <LocaleLink href="/contact" className="hide-tiny">{t("nav.contact")}</LocaleLink>
      </div>
    </nav>
  );
}
