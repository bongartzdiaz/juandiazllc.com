import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { LOCALES, DEFAULT_LOCALE, translate, type Locale } from "@/lib/i18n/dict";

// Root 404 — catches any URL that slips past the /[locale]/... tree
// (mistyped /philly/* paths, direct hits on deleted routes, etc).
// Keeps the brand chrome intact and steers the visitor back to their
// preferred locale's home, using the cookie proxy.ts maintains.

export const metadata: Metadata = {
  title: "Not found — 404",
  description: "The page you were looking for does not exist.",
  robots: { index: false, follow: true },
};

export default async function NotFound() {
  const c = await cookies();
  const cookieLocale = c.get("jdl_locale")?.value;
  const l: Locale =
    cookieLocale && (LOCALES as readonly string[]).includes(cookieLocale)
      ? (cookieLocale as Locale)
      : DEFAULT_LOCALE;
  const t = (k: string) => translate(l, k);

  return (
    <section
      style={{
        minHeight: "80vh",
        display: "grid",
        placeItems: "center",
        padding: "120px 24px 80px",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 620 }}>
        <div className="eyebrow" style={{ marginBottom: 24 }}>
          {t("nf.eyebrow")}
        </div>
        <h1
          style={{
            fontSize: "clamp(48px, 8vw, 96px)",
            fontWeight: 300,
            letterSpacing: "-0.04em",
            lineHeight: 1,
            marginBottom: 24,
          }}
        >
          <em>{t("nf.title")}</em>
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 17, lineHeight: 1.6, marginBottom: 36 }}>
          {t("nf.body")}
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href={`/${l}`} className="btn primary">
            {t("nf.btn.home")} <span className="arr">→</span>
          </Link>
          <Link href={`/${l}/insights`} className="btn ghost">
            {t("nf.btn.insights")} <span className="arr">→</span>
          </Link>
          <Link href={`/${l}/contact`} className="btn ghost">
            {t("nf.btn.contact")} <span className="arr">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
