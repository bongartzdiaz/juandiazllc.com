"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/useT";

export function Nav() {
  const t = useT();
  return (
    <nav className="top" aria-label="Primary">
      <Link href="/" className="brand" aria-label="Juan Diaz LLC — home">
        <span className="dot" aria-hidden="true" />
        <span>Juan Diaz LLC</span>
      </Link>
      <div className="nav-right">
        <span id="navTime">—</span>
        <Link href="/story" className="hide-mobile">{t("nav.story")}</Link>
        <Link href="/work">{t("nav.work")}</Link>
        <Link href="/signals" className="hide-mobile">{t("nav.signals")}</Link>
        <Link href="/contact" className="hide-tiny">{t("nav.contact")}</Link>
        <Link href="/login" className="auth">◉ {t("nav.login")}</Link>
      </div>
    </nav>
  );
}
