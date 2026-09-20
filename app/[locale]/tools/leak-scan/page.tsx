import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";
import { ENKELE_TAAL } from "@/lib/i18n/enkele-taal";
import { breadcrumbSchema } from "@/lib/breadcrumb";
import { LekkageScan } from "@/components/LekkageScan";
import { SCAN_PAD, TEKSTEN, isScanTaal } from "@/lib/lekkage-scan-taal";
import { CONTACT_EMAIL, CONTACT_MAILTO, ogImages } from "@/lib/seo/branding";

/* De lekkage-scan voor EN en DE — beslist door Juan op 2026-09-20.
 *
 * Dezelfde vragen als /nl/tools/lekkage-scan (het aantal komt uit VRAGEN.length), hetzelfde
 * scoremechanisme, dezelfde opvang. Een eigen slug omdat "lekkage-scan" op
 * een Engelse pagina geen vertaling is. Welke talen deze route draagt staat
 * in lib/i18n/enkele-taal.ts, en buiten die talen 404't hij — anders serveert
 * /es een Engelse pagina onder een Spaanse hreflang.
 *
 * De vragen zelf zijn taal- en sectoronafhankelijk: ze gaan over de vorm van
 * het lek (docs/bereik-plan.md §2), en de ene bron eronder is Amerikaans
 * onderzoek. Zie lib/lekkage-scan-taal.ts. */

const PAD = SCAN_PAD.en;
const TALEN = ENKELE_TAAL[PAD].locales;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const l = assertLocale(locale);
  const T = TEKSTEN[isScanTaal(l) ? l : "en"];
  return {
    title: T.titel,
    description: T.beschrijving,
    alternates: buildAlternates(l, PAD, TALEN),
    openGraph: {
      images: ogImages(l),
      type: "website",
      title: T.titel,
      description: T.beschrijving,
      url: `/${l}${PAD}`,
      locale: ogLocale(l),
      alternateLocale: alternateOgLocales(l),
    },
  };
}

export default async function LeakScanPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ uitgeschreven?: string }>;
}) {
  const { locale } = await params;
  // Gezet door app/api/uitschrijven/route.ts na een klik op de afmeldlink.
  const { uitgeschreven } = await searchParams;
  const l = assertLocale(locale);

  // 404 buiten en/de. Zie ENKELE_TAAL en lib/i18n/enkele-taal.test.ts.
  if (!TALEN.includes(l) || !isScanTaal(l)) notFound();
  const T = TEKSTEN[l];

  const crumbs = breadcrumbSchema([
    { name: "Home", path: `/${l}` },
    { name: "Tools", path: `/${l}${PAD}` },
    { name: T.titel, path: `/${l}${PAD}` },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <header className="page-hero">
        <div className="eyebrow">{T.eyebrow}</div>
        <h1>{T.kop}</h1>
        <p>{T.lede}</p>
      </header>
      {uitgeschreven === "klaar" && (
        <div className="nl-msg ok">{T.uitgeschrevenKlaar}</div>
      )}
      {uitgeschreven === "ongeldig" && (
        <div className="nl-msg err">
          {T.uitgeschrevenOngeldig} <a href={CONTACT_MAILTO}>{CONTACT_EMAIL}</a>.
        </div>
      )}
      <LekkageScan taal={l} />
    </>
  );
}
