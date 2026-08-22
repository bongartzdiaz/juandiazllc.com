import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";
import { ENKELE_TAAL } from "@/lib/i18n/enkele-taal";
import { breadcrumbSchema } from "@/lib/breadcrumb";
import { LekkageScan } from "@/components/LekkageScan";
import { OG_IMAGES } from "@/lib/seo/branding";

/* De lekkage-scan — bestaat alleen op /nl.
 *
 * De reden staat in lib/i18n/enkele-taal.ts en in docs/lead-magnet.md §1: alle
 * vier de bevestigde engagements zijn NL/BE. Dezelfde keuze als bij het
 * saldering-cluster.
 *
 * De kopij is daarom hardgecodeerd Nederlands en loopt niet via dict.ts —
 * zestig sleutels toevoegen voor drie talen die deze pagina nooit zien is dood
 * gewicht, en lib/i18n/wees-sleutels.test.ts zou daar terecht op vallen. */

const PAD = "/tools/lekkage-scan";
const TALEN = ENKELE_TAAL[PAD].locales;

const TITEL = "Lekkage-scan: waar je omzet weglekt";
const BESCHRIJVING =
  "Vijftien ja/nee-vragen over je stack. Je ziet direct welke drie dingen bij " +
  "jou het eerst lekken. Geen e-mail nodig, geen verkooppraat.";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const l = assertLocale(locale);
  return {
    title: TITEL,
    description: BESCHRIJVING,
    alternates: buildAlternates(l, PAD, TALEN),
    openGraph: {
      images: OG_IMAGES,
      type: "website",
      title: TITEL,
      description: BESCHRIJVING,
      url: `/${l}${PAD}`,
      locale: ogLocale(l),
      alternateLocale: alternateOgLocales(l),
    },
  };
}

export default async function LekkageScanPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const l = assertLocale(locale);

  // 404 buiten het Nederlands. Zonder deze poort serveert /en, /de en /es een
  // Nederlandse pagina onder een Engelse hreflang — dunne inhoud met een
  // verkeerd taalsignaal erbij.
  if (!TALEN.includes(l)) notFound();

  const crumbs = breadcrumbSchema([
    { name: "Home", path: `/${l}` },
    { name: "Tools", path: `/${l}${PAD}` },
    { name: TITEL, path: `/${l}${PAD}` },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <header className="page-hero">
        <div className="eyebrow">Gratis · vier minuten · geen e-mail</div>
        <h1>Waar lekt het bij jou?</h1>
        <p>
          De omzet lekt zelden in de markt. Hij lekt tussen de tools — in de overdracht
          naar de buitendienst, in de dagen tussen aanvraag en offerte, in het adres dat
          voor de derde keer wordt overgetypt. Vijftien vragen, en je weet welke drie
          bij jou het eerst lekken.
        </p>
      </header>
      <LekkageScan />
    </>
  );
}
