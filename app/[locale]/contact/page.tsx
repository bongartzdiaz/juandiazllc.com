import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";
import { FaqSection } from "@/components/FaqSection";
import { Capacity } from "@/components/Capacity";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";
import { translate } from "@/lib/i18n/dict";
import { faqSchema, contactPointSchema } from "@/lib/seo/schema";
import { CONTACT_FAQ } from "@/lib/seo/faqs";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = assertLocale(locale);
  return {
    title: "Contact — book a blueprint call",
    description:
      "Direct line to Juan. Blueprint calls are free, blunt, and under 30 minutes. Leave your details and I'll come back within 24 hours.",
    alternates: buildAlternates(l, "/contact"),
    openGraph: { locale: ogLocale(l), alternateLocale: alternateOgLocales(l) },
  };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const l = assertLocale(locale);
  const t = (k: string) => translate(l, k);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactPointSchema()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(CONTACT_FAQ)) }}
      />
      <header className="page-hero">
        <div className="eyebrow">{t("contact.page.eyebrow")}</div>
        <h1 dangerouslySetInnerHTML={{ __html: t("contact.page.title") }} />
        <p>{t("contact.page.lede")}</p>
      </header>
      <section style={{ padding: "60px 40px 20px", maxWidth: 760, margin: "0 auto" }}>
        <Capacity locale={l} />
      </section>

      <section
        aria-labelledby="directline-heading"
        style={{
          padding: "20px 40px",
          maxWidth: 760,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            border: "1px solid var(--mint-line, rgba(94,255,177,0.25))",
            borderRadius: 14,
            padding: "24px 28px",
            background: "var(--bg-card, rgba(255,255,255,0.02))",
          }}
        >
          <h2
            id="directline-heading"
            style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}
          >
            {t("contact.directline.title")}
          </h2>
          <p style={{ color: "var(--muted, #8a9a93)", fontSize: 14, marginBottom: 18 }}>
            {t("contact.directline.lede")}
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <a
              href="tel:+31653142656"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 16px",
                borderRadius: 10,
                border: "1px solid var(--mint-line, rgba(94,255,177,0.25))",
                color: "var(--fg, #FAF7F2)",
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 600,
              }}
              aria-label={`${t("contact.directline.call")} +31 6 5314 2656`}
            >
              <span aria-hidden="true">📞</span>
              <span>{t("contact.directline.call")}</span>
              <span style={{ color: "var(--mint, #5EFFB1)", fontVariantNumeric: "tabular-nums" }}>
                +31 6 5314 2656
              </span>
            </a>
            <a
              href="https://wa.me/message/GUH2NLTZM6LTK1"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 16px",
                borderRadius: 10,
                border: "1px solid var(--mint-line, rgba(94,255,177,0.25))",
                color: "var(--fg, #FAF7F2)",
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 600,
              }}
              aria-label={`${t("contact.directline.whatsapp")} +31 6 5314 2656`}
            >
              <span aria-hidden="true">💬</span>
              <span>{t("contact.directline.whatsapp")}</span>
              <span style={{ color: "var(--mint, #5EFFB1)", fontVariantNumeric: "tabular-nums" }}>
                +31 6 5314 2656
              </span>
            </a>
            <a
              href="mailto:juan@juandiazllc.com"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 16px",
                borderRadius: 10,
                border: "1px solid var(--mint-line, rgba(94,255,177,0.25))",
                color: "var(--fg, #FAF7F2)",
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 600,
              }}
              aria-label={`${t("contact.directline.email")} juan@juandiazllc.com`}
            >
              <span aria-hidden="true">✉️</span>
              <span>{t("contact.directline.email")}</span>
              <span style={{ color: "var(--mint, #5EFFB1)" }}>juan@juandiazllc.com</span>
            </a>
          </div>
          <p style={{ color: "var(--muted-soft, #6a7a73)", fontSize: 12 }}>
            {t("contact.directline.hours")}
          </p>
        </div>
      </section>

      <section style={{ padding: "20px 40px 40px", maxWidth: 760, margin: "0 auto" }}>
        <ContactForm />
      </section>
      <FaqSection title="Before you book a call" items={CONTACT_FAQ} />
    </>
  );
}
