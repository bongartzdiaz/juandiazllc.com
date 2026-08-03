"use client";

import { LocaleLink } from "@/components/LocaleLink";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function NotFoundBody() {
  const { locale, t } = useLocale();
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
        <p
          style={{
            color: "var(--muted)",
            fontSize: 17,
            lineHeight: 1.6,
            marginBottom: 36,
          }}
        >
          {t("nf.body")}
        </p>
        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <LocaleLink href={`/${locale}`} className="btn primary">
            {t("nf.btn.home")} <span className="arr">→</span>
          </LocaleLink>
          <LocaleLink href={`/${locale}/insights`} className="btn ghost">
            {t("nf.btn.insights")} <span className="arr">→</span>
          </LocaleLink>
          <LocaleLink href={`/${locale}/contact`} className="btn ghost">
            {t("nf.btn.contact")} <span className="arr">→</span>
          </LocaleLink>
        </div>
      </div>
    </section>
  );
}
