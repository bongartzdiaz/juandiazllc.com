import type { Metadata } from "next";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";

// Plain-language privacy page. Not legal advice — a statement of what
// the site actually does with data, which is what NL/EU regulators
// (AP, ICO) increasingly expect over a lawyer-drafted wall of text.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = assertLocale(locale);
  return {
    title: "Privacy",
    description:
      "What this site stores, what it does not, and how to reach me about your data.",
    alternates: buildAlternates(l, "/privacy"),
    robots: { index: true, follow: true },
    openGraph: { locale: ogLocale(l), alternateLocale: alternateOgLocales(l) },
  };
}

export default function PrivacyPage() {
  return (
    <>
      <header className="page-hero">
        <div className="eyebrow">◉ Privacy</div>
        <h1>
          What this site knows <em>about you</em>.
        </h1>
        <p>
          Plain-language version. The short answer: as little as possible, and only
          what the site actually needs to work.
        </p>
      </header>
      <section
        className="long"
        style={{ padding: "20px 40px 140px", maxWidth: 760, margin: "0 auto" }}
      >
        <h2>Cookies we set</h2>
        <p>
          A session cookie when you sign in (so the dashboard remembers you),
          a locale preference cookie (so the site stays in your language), and
          a single consent record in localStorage so we do not ask you about
          cookies on every visit. That is the full list.
        </p>

        <h2>Analytics</h2>
        <p>
          If you accept cookies, we load a privacy-friendly analytics script
          that counts page views without a personal identifier. No ad tracking,
          no cross-site profiling, no resale to third parties. If you decline,
          nothing loads — the site still works the same.
        </p>

        <h2>The contact form</h2>
        <p>
          When you submit the contact form, your name, email, company and
          message are stored in our Supabase database so I can write back.
          Nothing is forwarded to marketing platforms. If you later want that
          record deleted, mail me (the address is at the bottom of every page)
          and it is gone within a working day.
        </p>

        <h2>The dashboard (Philly CRM)</h2>
        <p>
          If you have an account on the operator dashboard under{" "}
          <code>/philly</code>, your email, encrypted session and business
          data live in our Supabase + MariaDB infrastructure. Access is
          controlled by your organisation. Nothing is shared outside of the
          platform unless you explicitly integrate it (Twilio, SendGrid, etc.).
        </p>

        <h2>Your rights</h2>
        <p>
          Under the GDPR, you can ask us for a copy of everything we hold on
          you, ask us to correct it, or ask us to delete it. Mail{" "}
          <a href="mailto:juan@juandiazllc.com">juan@juandiazllc.com</a> and
          you will get a response within three working days.
        </p>

        <h2>Changes to this page</h2>
        <p>
          If we ever start doing something we did not list above, this page
          changes before that happens. The last update date is visible in the
          footer.
        </p>
      </section>
    </>
  );
}
