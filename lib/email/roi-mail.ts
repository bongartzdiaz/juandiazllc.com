/* De ene mail achter de ROI-rekenmachine: de berekening die de bezoeker op
 * het scherm zag, in zijn taal, met een afmeldlink.
 *
 * Zelfde bouw als lib/email/scan-reeks.ts (tekst is de bron, het omhulsel
 * voegt vorm toe), met twee verschillen: er is één mail in plaats van drie,
 * en de kopij komt uit dict.ts (`roi.mail.*`, `roi.f.*`, `roi.sc.*`) omdat
 * de rekenmachine in vier talen staat. De labels van de getallen zijn
 * dezelfde die de pagina toont — één bron, geen tweede vertaling die weg
 * kan drijven.
 *
 * Planning is triviaal: één stempel `metadata.verzonden` en klaar. Geen
 * dagen-na-toestemming, geen volgnummer. */

import { LOCALES, translate, type Locale } from "@/lib/i18n/dict";
import { BOOKING_15MIN } from "@/lib/booking";
import { CONTACT_EMAIL } from "@/lib/seo/branding";
import { afmeldLink } from "@/lib/email/scan-reeks";
import { alineaHtml, escapeHtml, knopHtml, omhulsel } from "@/lib/email/huisstijl";
import { ROI_VELDEN, type RoiGetallen, type RoiVeld } from "@/lib/roi-opvang";

export type RoiMail = { onderwerp: string; text: string; html: string };

export type RoiMailInvoer = {
  locale: string;
  roi: RoiGetallen;
  consent_at: string;
  unsub_token: string;
};

const NUM_LOCALE: Record<Locale, string> = { en: "en-GB", nl: "nl-NL", de: "de-DE", es: "es-ES" };

function isLocale(v: string): v is Locale {
  return (LOCALES as readonly string[]).includes(v);
}

function eur(n: number | null, loc: Locale): string {
  if (n === null) return "—";
  return new Intl.NumberFormat(NUM_LOCALE[loc], {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

function getal(n: number | null, loc: Locale, decimalen = 0): string {
  if (n === null) return "—";
  return new Intl.NumberFormat(NUM_LOCALE[loc], { maximumFractionDigits: decimalen }).format(n);
}

function jaren(n: number | null, loc: Locale): string {
  if (n === null || n <= 0) return "—";
  return `${getal(n, loc, 1)} ${translate(loc, "roi.years")}`;
}

type Vorm = "getal" | "eur" | "prijs" | "aandeel";

/** Welke invoervelden in de mail komen, met hun paginalabel en opmaak. De
 *  batterijvelden alleen als de bezoeker de batterij aanzette. */
const INVOER: ReadonlyArray<{ veld: RoiVeld; key: string; vorm: Vorm; batterij?: true }> = [
  { veld: "consumption", key: "roi.f.consumption", vorm: "getal" },
  { veld: "systemSize", key: "roi.f.systemSize", vorm: "getal" },
  { veld: "systemPrice", key: "roi.f.systemPrice", vorm: "eur" },
  { veld: "consumerPrice", key: "roi.f.consumerPrice", vorm: "prijs" },
  { veld: "feedInPrice", key: "roi.f.feedInPrice", vorm: "prijs" },
  { veld: "yieldPerKwp", key: "roi.f.yield", vorm: "getal" },
  { veld: "scNoBat", key: "roi.f.scNoBat", vorm: "aandeel" },
  { veld: "batterySize", key: "roi.f.batterySize", vorm: "getal", batterij: true },
  { veld: "batteryPrice", key: "roi.f.batteryPrice", vorm: "eur", batterij: true },
  { veld: "scWithBat", key: "roi.f.scWithBat", vorm: "aandeel", batterij: true },
];

function toon(vorm: Vorm, n: number | null, loc: Locale): string {
  switch (vorm) {
    case "eur":
      return eur(n, loc);
    case "prijs":
      return n === null ? "—" : `€ ${getal(n, loc, 2)}`;
    case "aandeel":
      return getal(n, loc, 2);
    default:
      return getal(n, loc);
  }
}

/** Compile-tijd-controle dat de tabel hierboven alleen velden noemt die het
 *  formulier ook stuurt (RoiVeld is afgeleid van ROI_VELDEN). */
const _velden: Record<RoiVeld, unknown> = ROI_VELDEN;
void _velden;

type Regel = { label: string; waarde: string };

function invoerRegels(inv: RoiMailInvoer, loc: Locale): Regel[] {
  const metBatterij = inv.roi.withBattery === 1;
  return INVOER.filter((r) => !r.batterij || metBatterij).map((r) => ({
    label: translate(loc, r.key),
    waarde: toon(r.vorm, inv.roi[r.veld], loc),
  }));
}

function uitkomstRegels(inv: RoiMailInvoer, loc: Locale): Regel[] {
  const r = inv.roi;
  const scenario = (titelKey: string, jaar: number | null, terug: number | null): Regel => ({
    label: translate(loc, titelKey),
    waarde: `${eur(jaar, loc)} / ${translate(loc, "roi.years")} · ${translate(loc, "roi.payback").toLowerCase()} ${jaren(terug, loc)}`,
  });
  const regels = [
    scenario("roi.sc.saldering", r.savingsSald, r.paybackSald),
    scenario("roi.sc.noBat", r.savingsNoBat, r.paybackNoBat),
  ];
  if (r.withBattery === 1) regels.push(scenario("roi.sc.withBat", r.savingsWithBat, r.paybackWithBat));
  regels.push({
    label: translate(loc, "roi.production").replace("{kwh}", getal(r.production, loc)),
    waarde: "",
  });
  return regels;
}

function regelsText(regels: Regel[]): string {
  return regels.map((r) => (r.waarde ? `${r.label}: ${r.waarde}` : r.label)).join("\n");
}

function regelsHtml(regels: Regel[]): string {
  const rijen = regels
    .map((r) =>
      r.waarde
        ? `<tr><td style="padding:5px 12px 5px 0;color:#5F6F67;font-size:14px;vertical-align:top">${escapeHtml(r.label)}</td><td style="padding:5px 0;font-size:15px;white-space:nowrap">${escapeHtml(r.waarde)}</td></tr>`
        : `<tr><td colspan="2" style="padding:8px 0 0;color:#5F6F67;font-size:13px">${escapeHtml(r.label)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;border-collapse:collapse">${rijen}</table>`;
}

function kopjeHtml(s: string): string {
  return `<p style="margin:0 0 6px;font-size:13px;letter-spacing:.4px;text-transform:uppercase;color:#5F6F67">${escapeHtml(s)}</p>`;
}

function datum(iso: string, loc: Locale): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(NUM_LOCALE[loc], { dateStyle: "long", timeZone: "Europe/Amsterdam" }).format(d);
}

export function bouwRoiMail(inv: RoiMailInvoer): RoiMail {
  const loc: Locale = isLocale(inv.locale) ? inv.locale : "en";
  const t = (k: string) => translate(loc, k);

  const invoer = invoerRegels(inv, loc);
  const uitkomst = uitkomstRegels(inv, loc);
  const link = afmeldLink(inv.unsub_token);
  const voet = t("roi.mail.voet").replace("{datum}", datum(inv.consent_at, loc)).replace("{link}", link);
  const groet = ["Juan", CONTACT_EMAIL];
  // Het onderwerp draagt de terugverdientijd van het scenario dat de bezoeker
  // koos: mét batterij als die aanstond, anders zonder. Alleen het getal.
  const terug = inv.roi.withBattery === 1 ? inv.roi.paybackWithBat : inv.roi.paybackNoBat;
  const payback = terug === null || terug <= 0 ? "—" : getal(terug, loc, 1);

  const text = [
    t("roi.mail.intro"),
    "",
    t("roi.mail.invoer").toUpperCase(),
    regelsText(invoer),
    "",
    t("roi.mail.uitkomst").toUpperCase(),
    regelsText(uitkomst),
    "",
    t("roi.mail.slot"),
    `${t("roi.mail.knop")}: ${BOOKING_15MIN}`,
    "",
    ...groet,
    "",
    voet,
  ].join("\n");

  const html = omhulsel({
    taal: loc,
    kop: t("roi.mail.kop"),
    preheader: t("roi.mail.intro"),
    blokken: [
      alineaHtml(t("roi.mail.intro")),
      kopjeHtml(t("roi.mail.invoer")),
      regelsHtml(invoer),
      kopjeHtml(t("roi.mail.uitkomst")),
      regelsHtml(uitkomst),
      alineaHtml(t("roi.mail.slot")),
      knopHtml({ tekst: t("roi.mail.knop"), url: BOOKING_15MIN }),
    ],
    groet,
    // alineaHtml zet de afmeld-URL om naar een link en escapet de rest.
    voet: alineaHtml(voet).replace(/^<p[^>]*>/, "").replace(/<\/p>$/, ""),
  });

  return { onderwerp: t("roi.mail.onderwerp").replace("{payback}", payback), text, html };
}

/** Eén stempel. `verzonden` is een ISO-tijdstip; staat hij, dan is de mail
 *  weg. `unsubscribed_at` telt ook als klaar: wie zich afmeldde vóór de cron
 *  liep, krijgt niets. */
export function roiMailNodig(metadata: Record<string, unknown>): boolean {
  if (typeof metadata.verzonden === "string" && metadata.verzonden) return false;
  if (typeof metadata.unsubscribed_at === "string" && metadata.unsubscribed_at) return false;
  return true;
}

export function markeerRoiVerzonden(metadata: Record<string, unknown>, nu: Date): Record<string, unknown> {
  return { ...metadata, verzonden: nu.toISOString() };
}
