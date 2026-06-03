"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/useT";
import { Logo } from "./Logo";

export function Nav() {
  const t = useT();
  return (
    <nav className="top" aria-label={t("nav.aria.primary")}>
      <Link
        href="/"
        className="brand"
        aria-label={t("nav.aria.brand")}
        style={{ color: "var(--accent)", gap: 12 }}
      >
        <Logo size={26} animated />
        <span style={{ color: "var(--text)" }}>Juan Diaz, LLC</span>
      </Link>
      <div className="nav-right">
        <span id="navTime">—</span>
        <Link href="/about" className="hide-mobile">{t("nav.about")}</Link>
        <Link href="/story" className="hide-mobile">{t("nav.story")}</Link>
        <Link href="/work">{t("nav.work")}</Link>
        <Link href="/sectors" className="hide-mobile">{t("nav.sectors")}</Link>
        <Link href="/pricing">{t("nav.pricing")}</Link>
        <Link href="/insights" className="hide-mobile">{t("nav.insights")}</Link>
        <Link href="/signals" className="hide-mobile">{t("nav.signals")}</Link>
        <Link href="/contact" className="hide-tiny">{t("nav.contact")}</Link>
      </div>
    </nav>
  );
}
