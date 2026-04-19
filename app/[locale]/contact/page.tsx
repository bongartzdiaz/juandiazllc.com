import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";

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

export default function ContactPage() {
  return (
    <>
      <header className="page-hero">
        <div className="eyebrow">◉ Direct line</div>
        <h1>Let&apos;s find the <em>revenue</em> you&apos;re leaving on the table.</h1>
        <p>
          Blueprint calls are free, blunt, and under 30 minutes. Leave your details and tell me
          what you&apos;re wrestling with. I&apos;ll come back within 24 hours — if I can help, we&apos;ll book it.
          If I can&apos;t, I&apos;ll tell you who can.
        </p>
      </header>
      <section style={{ padding: "60px 40px", maxWidth: 760, margin: "0 auto" }}>
        <ContactForm />
      </section>
    </>
  );
}
