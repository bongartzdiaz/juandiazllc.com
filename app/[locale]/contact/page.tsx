import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";
import { translate } from "@/lib/i18n/dict";

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
      <header className="page-hero">
        <div className="eyebrow">{t("contact.page.eyebrow")}</div>
        <h1 dangerouslySetInnerHTML={{ __html: t("contact.page.title") }} />
        <p>{t("contact.page.lede")}</p>
      </header>
      <section style={{ padding: "60px 40px", maxWidth: 760, margin: "0 auto" }}>
        <ContactForm />
      </section>
    </>
  );
}
