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
    title: translate(l, "contact.meta.title"),
    description: translate(l, "contact.meta.desc"),
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
      <section style={{ padding: "20px 40px 40px", maxWidth: 760, margin: "0 auto" }}>
        <ContactForm />
      </section>
      <FaqSection title={t("contact.faq.title")} items={CONTACT_FAQ} />
    </>
  );
}
