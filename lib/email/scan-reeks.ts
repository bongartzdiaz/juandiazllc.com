/* De drie mails achter de lekkage-scan, en wanneer ze verstuurd horen te
 * worden.
 *
 * Dit bestand is de zuivere helft: geen netwerk, geen database, geen env.
 * Het verzenden staat in lib/email/resend.ts, het selecteren van rijen en het
 * bijwerken van `metadata.verzonden` in app/api/campagne/scan-reeks/route.ts.
 * Zo is de kopij en de planning te testen zonder één mock.
 *
 * WAT DE BELOFTE IS. `TOESTEMMING_TEKST` in lib/scan-opvang.ts zegt tegen de
 * bezoeker: hooguit drie mails over deze lekken, met een afmeldlink onderaan
 * elke mail. Die twee dingen zijn hier hard: `MAIL_NRS` telt er drie, en
 * `bouwMail()` zet in elke mail de link naar /api/uitschrijven met het token
 * uit de rij. lib/email/scan-reeks.test.ts houdt beide vast.
 *
 * GEEN BEDRAGEN. Zelfde regel als op de scanpagina: een voorspelde besparing
 * is een verzonnen cijfer, en docs/claims.md is de enige bron die een getal
 * mag dragen. De mails personaliseren uitsluitend op het aantal gevonden
 * lekken -- het enige feit dat de bezoeker zélf heeft geproduceerd.
 *
 * WAAROM DE PLANNING UIT DE RIJ WORDT AFGELEID. Er is geen wachtrij en geen
 * verzendlog buiten de rij zelf: `metadata.consent_at` zegt wanneer de reeks
 * begon, `metadata.verzonden` welke mails al de deur uit zijn. Een cron die
 * een dag mist haalt dus vanzelf in, en een cron die twee keer draait
 * verstuurt niets dubbel. Dat maakt de route idempotent zonder extra tabel. */

import { CONTACT_EMAIL, SITE_URL } from "@/lib/seo/branding";
import { SCAN_BRON } from "@/lib/scan-opvang";

export type MailNr = 1 | 2 | 3;

/** Alle drie, in volgorde. De lengte is de belofte uit de toestemmingstekst. */
export const MAIL_NRS: readonly MailNr[] = [1, 2, 3] as const;

/** Dagen ná `consent_at` waarop mail n op zijn vroegst mag. */
export const DAGEN_NA_TOESTEMMING: Readonly<Record<MailNr, number>> = {
  1: 0,
  2: 3,
  3: 7,
};

const DAG_MS = 24 * 60 * 60 * 1000;

/** Pad van de uitschrijfroute; de route zelf staat in app/api/uitschrijven. */
export const UITSCHRIJF_PAD = "/api/uitschrijven";

/** Waar mail 3 naartoe leidt. `interest=lekkage-scan` komt in `source` van de
 *  lead terecht, zodat een gesprek uit deze reeks te herkennen is. */
export const GESPREK_PAD = "/nl/contact?interest=lekkage-scan";

export function afmeldLink(token: string): string {
  return `${SITE_URL}${UITSCHRIJF_PAD}?token=${encodeURIComponent(token)}`;
}

export type Mail = { onderwerp: string; text: string; html: string };

/** Wat `bouwMail` van de rij nodig heeft. Niet de hele metadata: een mail
 *  hoort niet meer te weten dan hij gebruikt. */
export type MailInvoer = {
  lekken: number | null;
  unsub_token: string;
};

function lekkenZin(lekken: number | null): string {
  if (lekken === null) return "De scan gaf je een uitslag.";
  if (lekken === 0) return "De scan zag bij jou niets lekken.";
  if (lekken === 1) return "De scan vond bij jou één lek.";
  return `De scan vond bij jou ${lekken} lekken, belangrijkste bovenaan.`;
}

/* De kopij. Nederlands, je-vorm, zoals de scanpagina zelf. Elke mail heeft
 * één vraag of één stap; wie drie dingen tegelijk krijgt doet er nul. */

function alinea1(invoer: MailInvoer): string[] {
  return [
    lekkenZin(invoer.lekken),
    "Die uitslag stond op je scherm en is nu weg. Dit is hem in één zin: wat lekt, lekt op de overdracht tussen mensen, niet op de mensen zelf. De status van een deal leeft in hoofden, een aanvraag wacht tot iemand hem ziet, hetzelfde feit wordt twee keer getypt.",
    "Eén ding voor deze week. Kies het bovenste lek en tel het. Niet schatten: tellen. Hoeveel werkdagen zaten er tussen de laatste tien aanvragen en de offerte? Hoeveel uur tot het eerste antwoord? Een geteld getal is het enige cijfer over je bedrijf dat niet van een leverancier komt.",
    "Over drie dagen krijg je één mail over wat dat getal meestal laat zien. Daarna nog één, en dan houdt het op.",
  ];
}

function alinea2(): string[] {
  return [
    "Wie de vorige mail las en heeft geteld, ziet nu meestal hetzelfde: de tijd zit niet in het werk maar in het wachten ertussen. De aanvraag komt binnen, blijft liggen tot de juiste persoon terug is, gaat naar een schouw die in een agenda staat die niemand deelt, en de offerte wordt getypt uit een notitie die al twee keer is overgetypt.",
    "Dat is geen mensenprobleem. Het is een overdrachtsprobleem, en overdrachten laten zich meten. Waar het getal het grootst is, zit het eerste lek. Bijna altijd is dat de stap waar niemand eigenaar van is.",
    "De vraag voor vandaag is dus niet hoe je sneller wordt, maar welke stap geen eigenaar heeft. Schrijf die ene stap op. Meer hoeft niet.",
  ];
}

function alinea3(): string[] {
  return [
    "Laatste mail uit deze reeks, zoals beloofd.",
    "Als je hebt geteld en één stap zonder eigenaar hebt gevonden, dan heb je nu meer dan de meeste operators die ik spreek: een feit in plaats van een gevoel. De volgende stap is die ene stap uittekenen, van aanvraag tot offerte, en zien waar het instrument moet komen dat de overdracht vasthoudt.",
    "Dat doe ik in een gratis blueprint-gesprek. Je krijgt er een diagnose van één pagina uit: waar je operatie en je cijfers uit elkaar lopen, en wat het eerste onderdeel is dat je zou bouwen. Geen offerte, geen vervolgverplichting. Als het niet bij mij past, zeg ik wie het wel kan.",
    `Boeken kan hier: ${SITE_URL}${GESPREK_PAD}`,
    "Antwoorden op deze mail kan ook. Dit adres wordt gelezen.",
  ];
}

const ONDERWERPEN: Readonly<Record<MailNr, string>> = {
  1: "Je scanuitslag, en één ding om deze week te tellen",
  2: "Waar de tijd blijft tussen aanvraag en offerte",
  3: "Eén pagina die zegt waar het lekt",
};

function voettekst(token: string): string[] {
  return [
    `Je krijgt deze mail omdat je na de lekkage-scan op juandiazllc.com je adres achterliet. Afmelden: ${afmeldLink(token)}`,
  ];
}

function alinea(nr: MailNr, invoer: MailInvoer): string[] {
  switch (nr) {
    case 1:
      return alinea1(invoer);
    case 2:
      return alinea2();
    case 3:
      return alinea3();
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Zet een kale URL in een alinea om naar een link; verder blijft de tekst
 *  tekst. Bewust geen markdown-parser: twee vormen van dezelfde kopij lopen
 *  uit elkaar, en de tekstversie is de bron. */
function naarHtmlAlinea(s: string): string {
  const veilig = escapeHtml(s);
  return `<p>${veilig.replace(/https?:\/\/[^\s]+/g, (url) => `<a href="${url}">${url}</a>`)}</p>`;
}

export function bouwMail(nr: MailNr, invoer: MailInvoer): Mail {
  const body = alinea(nr, invoer);
  const voet = voettekst(invoer.unsub_token);
  const groet = ["Juan", CONTACT_EMAIL];

  const text = [...body, "", ...groet, "", ...voet].join("\n");
  const html = [
    `<!doctype html><html lang="nl"><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.6;color:#1a1a1a;max-width:560px">`,
    ...body.map(naarHtmlAlinea),
    `<p>Juan<br>${CONTACT_EMAIL}</p>`,
    `<p style="font-size:12px;color:#666">${naarHtmlAlinea(voet[0]).slice(3, -4)}</p>`,
    `</body></html>`,
  ].join("\n");

  return { onderwerp: ONDERWERPEN[nr], text, html };
}

/* Planning. */

export type Verzonden = Partial<Record<MailNr, string>>;

function leesVerzonden(metadata: Record<string, unknown>): Verzonden {
  const v = metadata.verzonden;
  if (!v || typeof v !== "object") return {};
  const uit: Verzonden = {};
  for (const nr of MAIL_NRS) {
    const stempel = (v as Record<string, unknown>)[String(nr)];
    if (typeof stempel === "string") uit[nr] = stempel;
  }
  return uit;
}

function leesConsent(metadata: Record<string, unknown>): Date | null {
  const c = metadata.consent_at;
  if (typeof c !== "string") return null;
  const d = new Date(c);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Welke mail nu aan de beurt is voor deze rij, of null.
 *
 *  - afgemeld → null, ongeacht wat er nog openstaat;
 *  - geen bruikbare `consent_at` → null, want dan is er geen begin;
 *  - anders de laagste mail die nog niet verstuurd is én waarvan de dag is
 *    aangebroken. Laagste eerst, zodat een gemiste dag nul wordt ingehaald
 *    vóór drie -- de volgorde is inhoud, niet alleen tijd. */
export function bepaalVolgende(metadata: Record<string, unknown>, nu: Date): MailNr | null {
  if (typeof metadata.unsubscribed_at === "string") return null;
  const consent = leesConsent(metadata);
  if (!consent) return null;
  const verzonden = leesVerzonden(metadata);
  for (const nr of MAIL_NRS) {
    if (verzonden[nr]) continue;
    const vanaf = consent.getTime() + DAGEN_NA_TOESTEMMING[nr] * DAG_MS;
    return nu.getTime() >= vanaf ? nr : null;
  }
  return null;
}

/** De nieuwe metadata na een geslaagde verzending. Geeft een nieuw object
 *  terug; de rij zelf wordt niet aangeraakt. */
export function markeerVerzonden(
  metadata: Record<string, unknown>,
  nr: MailNr,
  nu: Date,
): Record<string, unknown> {
  return {
    ...metadata,
    verzonden: { ...leesVerzonden(metadata), [nr]: nu.toISOString() },
  };
}

/** Herexport zodat de route en de test dezelfde bron gebruiken als de
 *  inschrijving voor het `source`-filter. */
export const REEKS_BRON = SCAN_BRON;
