/* De drie mails achter de lekkage-scan, en wanneer ze verstuurd horen te
 * worden.
 *
 * Dit bestand is de zuivere helft: geen netwerk, geen database, geen env.
 * Het verzenden staat in lib/email/brevo.ts, de vorm in lib/email/huisstijl.ts, het selecteren van rijen en het
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
import { alineaHtml, knopHtml, omhulsel, type Knop } from "@/lib/email/huisstijl";
import { SCAN_PAD, isScanTaal, type ScanTaal } from "@/lib/lekkage-scan-taal";

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
 *  lead terecht, zodat een gesprek uit deze reeks te herkennen is. Sinds
 *  2026-09-20 per taal: een Engelse inzender landt op /en/contact. */
export function gesprekPad(taal: ScanTaal): string {
  return `/${taal}/contact?interest=lekkage-scan`;
}

/** De Nederlandse, voor de route en de test die er al naar wezen. */
export const GESPREK_PAD = gesprekPad("nl");

/** De taal van een rij. Alleen de drie scantalen; alles anders wordt
 *  Nederlands, zoals vóór 2026-09-20 elke rij was. */
export function taalVan(metadata: Record<string, unknown>): ScanTaal {
  const l = metadata.locale;
  return typeof l === "string" && isScanTaal(l) ? l : "nl";
}

export function afmeldLink(token: string): string {
  return `${SITE_URL}${UITSCHRIJF_PAD}?token=${encodeURIComponent(token)}`;
}

export type Mail = { onderwerp: string; text: string; html: string };

/** Wat `bouwMail` van de rij nodig heeft. Niet de hele metadata: een mail
 *  hoort niet meer te weten dan hij gebruikt. */
export type MailInvoer = {
  lekken: number | null;
  unsub_token: string;
  /** Taal van de rij. Ontbreekt hij, dan Nederlands. */
  taal?: ScanTaal;
};

/* De kopij per taal. Eén object per taal met dezelfde velden, zodat een mail
 * die in de ene taal een knop of alinea verliest, dat in de andere niet stil
 * kan doen — scan-reeks.test.ts loopt de drie talen af.
 *
 * Register: NL je, EN you, DE Sie, zoals de pagina zelf. */
type Kopij = {
  lekkenZin: (lekken: number | null) => string;
  onderwerp1: (lekken: number | null) => string;
  onderwerpen: Readonly<Record<Exclude<MailNr, 1>, string>>;
  alinea1: (lekkenZin: string) => string[];
  alinea2: string[];
  alinea3: (gesprekUrl: string) => string[];
  knop1: [tekst: string, ref: string];
  knop2: [tekst: string, ref: string];
  knop3: string;
  kopVoorvoegsel: string;
  vanVoor: string;
  voettekst: (link: string) => string;
  onderwerpVoorvoegsel: string;
};

const NL_KOPIJ: Kopij = {
  lekkenZin: (lekken) => {
    if (lekken === null) return "De scan gaf je een uitslag.";
    if (lekken === 0) return "De scan zag bij jou niets lekken.";
    if (lekken === 1) return "De scan vond bij jou één lek.";
    return `De scan vond bij jou ${lekken} lekken, belangrijkste bovenaan.`;
  },
  onderwerp1: (lekken) => {
    if (lekken === null) return "Je scanuitslag, en één ding om deze week te tellen";
    if (lekken === 0) return "Geen lek gevonden. Eén telling om dat te bewijzen";
    if (lekken === 1) return "Eén lek gevonden. Tel hem deze week";
    return `${lekken} lekken gevonden. Tel er deze week één`;
  },
  onderwerpen: {
    2: "Het lek zit niet in het werk. Het zit in het wachten",
    3: "Eén pagina die zegt waar het lekt (laatste mail)",
  },
  alinea1: (zin) => [
    zin,
    "Die uitslag stond op je scherm en is nu weg. Dit is hem in één zin: wat lekt, lekt op de overdracht tussen mensen, niet op de mensen zelf. De status van een deal leeft in hoofden, een aanvraag wacht tot iemand hem ziet, hetzelfde feit wordt twee keer getypt.",
    "Eén ding voor deze week. Kies het bovenste lek en tel het. Niet schatten: tellen. Hoeveel werkdagen zaten er tussen de laatste tien aanvragen en de offerte? Hoeveel uur tot het eerste antwoord? Een geteld getal is het enige cijfer over je bedrijf dat niet van een leverancier komt.",
    "Stuur me dat getal als je het hebt. Ik zeg je wat het meestal betekent, en dat is geen verkooppraatje: het is één zin terug.",
    "Over drie dagen krijg je één mail over wat dat getal meestal laat zien. Daarna nog één, en dan houdt het op.",
  ],
  alinea2: [
    "Wie heeft geteld, ziet nu bijna altijd hetzelfde: de tijd zit niet in het werk maar in het wachten ertussen.",
    "De aanvraag komt binnen, blijft liggen tot de juiste persoon terug is, gaat naar een schouw die in een agenda staat die niemand deelt, en de offerte wordt getypt uit een notitie die al twee keer is overgetypt.",
    "Dat is geen mensenprobleem. Het is een overdrachtsprobleem, en overdrachten laten zich meten. Waar het getal het grootst is, zit het eerste lek. Bijna altijd is dat de stap waar niemand eigenaar van is.",
    "De vraag voor vandaag is dus niet hoe je sneller wordt, maar welke stap geen eigenaar heeft. Schrijf die ene stap op en stuur hem me. Meer hoeft niet.",
  ],
  alinea3: (url) => [
    "Laatste mail uit deze reeks, zoals beloofd.",
    "Als je hebt geteld en één stap zonder eigenaar hebt gevonden, dan heb je nu meer dan de meeste operators die ik spreek: een feit in plaats van een gevoel. De volgende stap is die ene stap uittekenen, van aanvraag tot offerte, en zien waar het instrument moet komen dat de overdracht vasthoudt.",
    "Dat doe ik in een gratis blueprint-gesprek. Je krijgt er een diagnose van één pagina uit: waar je operatie en je cijfers uit elkaar lopen, en wat het eerste onderdeel is dat je zou bouwen. Geen offerte, geen vervolgverplichting. Als het niet bij mij past, zeg ik wie het wel kan.",
    `Boeken kan hier: ${url}`,
    "Antwoorden op deze mail kan ook. Dit adres wordt gelezen.",
  ],
  knop1: ["Stuur me je getal", "mijn getal"],
  knop2: ["Stuur me die ene stap", "de stap zonder eigenaar"],
  knop3: "Plan het blueprint-gesprek",
  kopVoorvoegsel: "Lekkage-scan",
  vanVoor: "van",
  voettekst: (link) =>
    `Je krijgt deze mail omdat je na de lekkage-scan op juandiazllc.com je adres achterliet. Afmelden: ${link}`,
  onderwerpVoorvoegsel: "Scan",
};

const EN_KOPIJ: Kopij = {
  lekkenZin: (lekken) => {
    if (lekken === null) return "The scan gave you a result.";
    if (lekken === 0) return "The scan saw nothing leaking in your business.";
    if (lekken === 1) return "The scan found one leak in your business.";
    return `The scan found ${lekken} leaks in your business, biggest at the top.`;
  },
  onderwerp1: (lekken) => {
    if (lekken === null) return "Your scan result, and one thing to count this week";
    if (lekken === 0) return "No leak found. One count to prove it";
    if (lekken === 1) return "One leak found. Count it this week";
    return `${lekken} leaks found. Count one of them this week`;
  },
  onderwerpen: {
    2: "The leak is not in the work. It is in the waiting",
    3: "One page that says where it leaks (last email)",
  },
  alinea1: (zin) => [
    zin,
    "That result was on your screen and is gone now. Here it is in one sentence: what leaks, leaks in the handover between people, not in the people themselves. The status of a deal lives in heads, an enquiry waits until someone sees it, the same fact gets typed twice.",
    "One thing for this week. Take the top leak and count it. Not estimate: count. How many working days sat between the last ten enquiries and the quote? How many hours to the first reply? A counted number is the only figure about your company that does not come from a vendor.",
    "Send me that number when you have it. I will tell you what it usually means, and that is not a sales pitch: it is one sentence back.",
    "In three days you get one email about what that number usually shows. Then one more, and then it stops.",
  ],
  alinea2: [
    "Whoever has counted now almost always sees the same thing: the time is not in the work but in the waiting in between.",
    "The enquiry comes in, sits until the right person is back, goes to a site visit that lives in a calendar nobody shares, and the quote is typed from a note that has already been retyped twice.",
    "That is not a people problem. It is a handover problem, and handovers can be measured. Where the number is largest, the first leak sits. Almost always that is the step nobody owns.",
    "So today's question is not how to get faster, but which step has no owner. Write down that one step and send it to me. Nothing more is needed.",
  ],
  alinea3: (url) => [
    "Last email in this series, as promised.",
    "If you have counted and found one step without an owner, you now have more than most operators I talk to: a fact instead of a feeling. The next step is to draw out that one step, from enquiry to quote, and see where the instrument should go that holds the handover.",
    "That is what I do in a free blueprint call. You leave with a one-page diagnosis: where your operation and your numbers disagree, and what the first component is that you would build. No quote, no follow-up obligation. If it does not fit me, I tell you who can.",
    `Book it here: ${url}`,
    "Replying to this email works too. This address is read.",
  ],
  knop1: ["Send me your number", "my number"],
  knop2: ["Send me that one step", "the step without an owner"],
  knop3: "Book the blueprint call",
  kopVoorvoegsel: "Leak scan",
  vanVoor: "of",
  voettekst: (link) =>
    `You get this email because you left your address after the leak scan on juandiazllc.com. Unsubscribe: ${link}`,
  onderwerpVoorvoegsel: "Scan",
};

const DE_KOPIJ: Kopij = {
  lekkenZin: (lekken) => {
    if (lekken === null) return "Der Scan hat Ihnen ein Ergebnis gegeben.";
    if (lekken === 0) return "Der Scan sah bei Ihnen nichts lecken.";
    if (lekken === 1) return "Der Scan fand bei Ihnen ein Leck.";
    return `Der Scan fand bei Ihnen ${lekken} Lecks, das wichtigste oben.`;
  },
  onderwerp1: (lekken) => {
    if (lekken === null) return "Ihr Scan-Ergebnis, und eine Sache, die Sie diese Woche zählen";
    if (lekken === 0) return "Kein Leck gefunden. Eine Zählung, um das zu belegen";
    if (lekken === 1) return "Ein Leck gefunden. Zählen Sie es diese Woche";
    return `${lekken} Lecks gefunden. Zählen Sie diese Woche eines davon`;
  },
  onderwerpen: {
    2: "Das Leck sitzt nicht in der Arbeit. Es sitzt im Warten",
    3: "Eine Seite, die sagt, wo es leckt (letzte E-Mail)",
  },
  alinea1: (zin) => [
    zin,
    "Dieses Ergebnis stand auf Ihrem Bildschirm und ist jetzt weg. Hier ist es in einem Satz: Was leckt, leckt in der Übergabe zwischen Menschen, nicht in den Menschen selbst. Der Status eines Deals lebt in Köpfen, eine Anfrage wartet, bis jemand sie sieht, derselbe Fakt wird zweimal getippt.",
    "Eine Sache für diese Woche. Nehmen Sie das oberste Leck und zählen Sie es. Nicht schätzen: zählen. Wie viele Werktage lagen zwischen den letzten zehn Anfragen und dem Angebot? Wie viele Stunden bis zur ersten Antwort? Eine gezählte Zahl ist die einzige Kennzahl über Ihr Unternehmen, die nicht von einem Anbieter stammt.",
    "Schicken Sie mir diese Zahl, wenn Sie sie haben. Ich sage Ihnen, was sie meistens bedeutet, und das ist kein Verkaufsgespräch: es ist ein Satz zurück.",
    "In drei Tagen bekommen Sie eine E-Mail darüber, was diese Zahl meistens zeigt. Danach noch eine, und dann hört es auf.",
  ],
  alinea2: [
    "Wer gezählt hat, sieht jetzt fast immer dasselbe: Die Zeit sitzt nicht in der Arbeit, sondern im Warten dazwischen.",
    "Die Anfrage kommt rein, bleibt liegen, bis die richtige Person zurück ist, geht zu einer Besichtigung, die in einem Kalender steht, den niemand teilt, und das Angebot wird aus einer Notiz getippt, die schon zweimal abgetippt wurde.",
    "Das ist kein Menschenproblem. Es ist ein Übergabeproblem, und Übergaben lassen sich messen. Wo die Zahl am größten ist, sitzt das erste Leck. Fast immer ist das der Schritt, für den niemand zuständig ist.",
    "Die Frage für heute ist also nicht, wie Sie schneller werden, sondern welcher Schritt keinen Zuständigen hat. Schreiben Sie diesen einen Schritt auf und schicken Sie ihn mir. Mehr braucht es nicht.",
  ],
  alinea3: (url) => [
    "Letzte E-Mail dieser Reihe, wie versprochen.",
    "Wenn Sie gezählt und einen Schritt ohne Zuständigen gefunden haben, dann haben Sie jetzt mehr als die meisten Operatoren, mit denen ich spreche: einen Fakt statt eines Gefühls. Der nächste Schritt ist, diesen einen Schritt aufzuzeichnen, von der Anfrage bis zum Angebot, und zu sehen, wo das Instrument hingehört, das die Übergabe festhält.",
    "Das mache ich in einem kostenlosen Blueprint-Gespräch. Sie gehen mit einer einseitigen Diagnose: wo Ihr Betrieb und Ihre Zahlen auseinanderlaufen, und was der erste Baustein ist, den Sie bauen würden. Kein Angebot, keine Folgeverpflichtung. Passt es nicht zu mir, sage ich Ihnen, wer es kann.",
    `Buchen können Sie hier: ${url}`,
    "Auf diese E-Mail zu antworten geht auch. Diese Adresse wird gelesen.",
  ],
  knop1: ["Schicken Sie mir Ihre Zahl", "meine Zahl"],
  knop2: ["Schicken Sie mir diesen einen Schritt", "der Schritt ohne Zuständigen"],
  knop3: "Blueprint-Gespräch buchen",
  kopVoorvoegsel: "Leak-Scan",
  vanVoor: "von",
  voettekst: (link) =>
    `Sie erhalten diese E-Mail, weil Sie nach dem Leak-Scan auf juandiazllc.com Ihre Adresse hinterlassen haben. Abmelden: ${link}`,
  onderwerpVoorvoegsel: "Scan",
};

const KOPIJ: Readonly<Record<ScanTaal, Kopij>> = { nl: NL_KOPIJ, en: EN_KOPIJ, de: DE_KOPIJ };

/* Elke mail heeft één vraag of één stap, en één knop die precies die stap
 * is; wie drie dingen tegelijk krijgt doet er nul. De eerste regel van elke
 * mail staat óók als preheader in de inbox, dus die regel moet op zichzelf
 * staan.
 *
 * Mail 1 en 2 vragen om een antwoord per mail (mailto met een voorgevuld
 * onderwerp, zodat het antwoord te herkennen is). Mail 3 leidt naar het
 * gesprek. Er is met opzet geen "lees meer op de site": de reeks is de
 * inhoud, niet een wegwijzer ernaartoe. */

function taalVanInvoer(invoer: MailInvoer): ScanTaal {
  return invoer.taal ?? "nl";
}

export function onderwerp(nr: MailNr, invoer: MailInvoer): string {
  const k = KOPIJ[taalVanInvoer(invoer)];
  return nr === 1 ? k.onderwerp1(invoer.lekken) : k.onderwerpen[nr];
}

/** Antwoord-knop: mailto naar het contactadres met een onderwerp dat de mail
 *  aanwijst, zodat een antwoord uit deze reeks in de inbox te herkennen is. */
function antwoordKnop(k: Kopij, [tekst, ref]: [string, string]): Knop {
  return {
    tekst,
    url: `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`${k.onderwerpVoorvoegsel}: ${ref}`)}`,
  };
}

function gesprekUrl(taal: ScanTaal): string {
  return `${SITE_URL}${gesprekPad(taal)}`;
}

function knop(nr: MailNr, taal: ScanTaal): Knop {
  const k = KOPIJ[taal];
  switch (nr) {
    case 1:
      return antwoordKnop(k, k.knop1);
    case 2:
      return antwoordKnop(k, k.knop2);
    case 3:
      return { tekst: k.knop3, url: gesprekUrl(taal) };
  }
}

function kop(nr: MailNr, taal: ScanTaal): string {
  const k = KOPIJ[taal];
  return `${k.kopVoorvoegsel} · ${nr} ${k.vanVoor} ${MAIL_NRS.length}`;
}

function alinea(nr: MailNr, invoer: MailInvoer): string[] {
  const taal = taalVanInvoer(invoer);
  const k = KOPIJ[taal];
  switch (nr) {
    case 1:
      return k.alinea1(k.lekkenZin(invoer.lekken));
    case 2:
      return k.alinea2;
    case 3:
      return k.alinea3(gesprekUrl(taal));
  }
}

export function bouwMail(nr: MailNr, invoer: MailInvoer): Mail {
  const taal = taalVanInvoer(invoer);
  const body = alinea(nr, invoer);
  const voet = KOPIJ[taal].voettekst(afmeldLink(invoer.unsub_token));
  const groet = ["Juan", CONTACT_EMAIL];

  const text = [body.join("\n\n"), "", ...groet, "", voet].join("\n");
  const html = omhulsel({
    taal,
    kop: kop(nr, taal),
    preheader: body[0],
    blokken: [...body.map(alineaHtml), knopHtml(knop(nr, taal))],
    groet,
    // alineaHtml zet de afmeld-URL om naar een link en escapet de rest.
    voet: alineaHtml(voet).replace(/^<p[^>]*>/, "").replace(/<\/p>$/, ""),
  });

  return { onderwerp: onderwerp(nr, invoer), text, html };
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
