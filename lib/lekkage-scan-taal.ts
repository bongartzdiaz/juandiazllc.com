/* De lekkage-scan in drie talen: de kopij die de bezoeker leest, en de
 * Engelse en Duitse vragenlijst naast de Nederlandse.
 *
 * WAAROM DIT BESTAND BESTAAT. Tot 2026-09-20 bestond de scan alleen op /nl —
 * bewust, zie docs/lead-magnet.md §1. Juan besliste die dag dat er een
 * tweede taalpaar bij komt, EN en DE, op een eigen route (/tools/leak-scan).
 * De vragen blijven dezelfde: ze gaan over de vórm van het lek
 * (overdracht, wachttijd, dubbele invoer, stapelkosten), niet over een sector
 * of een land — zie docs/bereik-plan.md §2. De ene bron eronder (HBR 2011) is
 * Amerikaans onderzoek en reist dus mee.
 *
 * HOE HET IN ELKAAR ZIT. lib/lekkage-scan.ts blijft de bron voor id's,
 * blokken, `omgekeerd`, de grenswaarde en het scoremechanisme. Dit bestand
 * draagt alleen tekst. `vragenVoor(taal)` legt de vertaling over die
 * structuur heen, zodat een vraag die daar verdwijnt of een grens die daar
 * verandert hier niet stil kan blijven staan: de poort in
 * lekkage-scan.test.ts eist per taal dezelfde id's, dezelfde metingen en
 * dezelfde grenswaarde.
 *
 * GEEN BEDRAGEN. Zelfde regel als in het Nederlands.
 *
 * Register: NL je, EN you, DE Sie — zoals de rest van de site
 * (lib/i18n/duits.test.ts). */

import {
  AANTAL_WOORD,
  AANTAL_WOORD_HOOFD,
  BLOKKEN,
  VRAGEN,
  telwoord,
  type Blok,
  type BlokId,
  type Vraag,
} from "@/lib/lekkage-scan";
import { CONTACT_EMAIL } from "@/lib/seo/branding";
import { TOESTEMMING_TEKST } from "@/lib/scan-opvang";

export type ScanTaal = "nl" | "en" | "de";

export const SCAN_TALEN: readonly ScanTaal[] = ["nl", "en", "de"] as const;

export function isScanTaal(v: string): v is ScanTaal {
  return (SCAN_TALEN as readonly string[]).includes(v);
}

/** Het pad van de scan per taal. Twee routes, want een Nederlandse slug op
 *  een Engelse pagina is geen vertaling. */
export const SCAN_PAD: Readonly<Record<ScanTaal, string>> = {
  nl: "/tools/lekkage-scan",
  en: "/tools/leak-scan",
  de: "/tools/leak-scan",
};

/* ---------------------------------------------------------------------------
 * De vragen in EN en DE
 * ------------------------------------------------------------------------ */

type VraagTekst = {
  vraag: string;
  kost: string;
  meting?: {
    opdracht: string;
    label: string;
    eenheid: string;
    grens?: { duiding: string; bron: string };
  };
};

type BlokTekst = Pick<Blok, "naam" | "spiegelt" | "lek">;

type Vertaling = {
  blokken: Readonly<Record<BlokId, BlokTekst>>;
  vragen: Readonly<Record<string, VraagTekst>>;
};

const EN: Vertaling = {
  blokken: {
    A: {
      naam: "Handover",
      spiegelt: "3.2× pipeline velocity, once field and office shared one deal status",
      lek: "The status lives in people's heads",
    },
    B: {
      naam: "Response time",
      spiegelt: "−61% time-to-quote, after automating intake → site visit → proposal",
      lek: "You don't know where the time goes",
    },
    C: {
      naam: "Double entry",
      spiegelt: "+38% lead-to-conversation, after replacing four tools with one CRM plus a WhatsApp flow",
      lek: "The same fact gets typed more than once",
    },
    D: {
      naam: "Stacked costs",
      spiegelt: "€0 extra SaaS spend — the tools switched off paid for the rebuild",
      lek: "You pay for overlap",
    },
  },
  vragen: {
    A1: {
      vraag: "Can your field team see the status of an open request without calling someone?",
      kost: "If no, every status change travels through a person. Every handover is a moment it can stall, and you can't see which one it was.",
    },
    A2: {
      vraag: "Does the office know within an hour that a site visit is done?",
      kost: "If no, the quote starts only when someone happens to hear about it. That wait is written down nowhere, so it never gets shorter.",
    },
    A3: {
      vraag: "Is the current status of a deal in one place, and not in several systems side by side?",
      kost: "If several, there is no answer to \"where does this stand\", only opinions. Who was right shows up at the complaint.",
    },
    A4: {
      vraag: "Can a colleague take over the open requests of a sick technician without a handover meeting?",
      kost: "If no, the status sits in a head. Sickness, holiday and resignation are then the same risk under a different name.",
    },
    B1: {
      vraag: "Do you know how many hours, on average, sit between request and quote?",
      kost: "If no, you can't shorten that time, because you wouldn't see the improvement.",
      meting: {
        opdracht:
          "Take your last five quotes sent. For each, count the working days between first customer contact and the moment it went out the door.",
        label: "Average working days to the quote",
        eenheid: "working days",
      },
    },
    B2: {
      vraag: "Does a quote go out without someone retyping data from another system?",
      kost: "If no, you pay twice: the time spent retyping, and the errors that creep in and only show at the customer.",
    },
    B3: {
      vraag: "Does an enquirer get a reply within 24 hours, including at weekends and in a holiday week?",
      kost: "If no, your response time is a function of who happens to be working. Meanwhile the enquirer calls the next one.",
      meting: {
        opdracht:
          "Look up your last ten enquiries that came in outside office hours. Count the hours until the first substantive reply from a human — an auto-acknowledgement doesn't count.",
        label: "Average hours to the first substantive reply",
        eenheid: "hours",
        grens: {
          duiding:
            "Beyond an hour, qualifying gets measurably harder: companies that responded within the hour qualified a lead almost seven times as often as companies that took longer. That is about qualifying, not winning, and it is US research, not a local norm.",
          bron: "Harvard Business Review, 2011 — audit of 2,241 companies",
        },
      },
    },
    B4: {
      vraag: "Can you see which step in the process takes the most time?",
      kost: "If no, you improve on gut feel, and gut feel points at the step that complains loudest — rarely the step that takes longest.",
    },
    B5: {
      vraag: "Can you show a customer a drawing or calculation within a week, even when the colleague who makes it is away?",
      kost: "If no, your lead time is one person's calendar. The customer experiences that as silence, and you only notice when they don't call back.",
    },
    C1: {
      vraag: "Is the name and address of a new enquiry typed only once?",
      kost: "If no, two versions of the same customer exist immediately, and nothing decides which one is real.",
    },
    C2: {
      vraag: "Are WhatsApp conversations with customers stored somewhere a colleague can find them?",
      kost: "If no, the customer history sits on a private phone. When that person leaves, it walks out the door.",
    },
    C3: {
      vraag: "Does an enquiry from your website land automatically in the system you work in?",
      kost: "If no, the enquiry exists only once someone copies it over, and there is no alarm on that step.",
    },
    C4: {
      vraag: "Do you know, for every lead, where it came from?",
      kost: "If no, every statement about what works is a guess. You then stop the channel that is least loud, not the one that yields least.",
    },
    D1: {
      vraag: "Do you know off the top of your head how many software subscriptions you have and what they cost per month together?",
      kost: "If no, that stack grows one loose decision at a time, and nobody ever decides to let it grow.",
    },
    D2: {
      vraag: "Is there a tool you pay for that someone opens less than once a week?",
      kost: "If yes, you pay for a habit nobody has any more. That is the cheapest saving there is, and the easiest to forget.",
    },
    D3: {
      vraag: "When an employee leaves, can you revoke all their access within a day?",
      kost: "If no, your stack is a security problem too, not just a cost line.",
    },
  },
};

const DE: Vertaling = {
  blokken: {
    A: {
      naam: "Übergabe",
      spiegelt: "3,2× Pipeline-Geschwindigkeit, sobald Außendienst und Büro denselben Deal-Status teilten",
      lek: "Der Status lebt in Köpfen",
    },
    B: {
      naam: "Reaktionszeit",
      spiegelt: "−61 % Zeit bis zum Angebot, nach Automatisierung von Anfrage → Besichtigung → Vorschlag",
      lek: "Sie wissen nicht, wo die Zeit bleibt",
    },
    C: {
      naam: "Doppelte Eingabe",
      spiegelt: "+38 % Lead-zu-Gespräch, nachdem vier Tools durch ein CRM plus einen WhatsApp-Flow ersetzt wurden",
      lek: "Derselbe Fakt wird mehrfach getippt",
    },
    D: {
      naam: "Stapelkosten",
      spiegelt: "0 € zusätzliche SaaS-Ausgaben — die abgeschalteten Tools finanzierten den Umbau",
      lek: "Sie zahlen für Überschneidung",
    },
  },
  vragen: {
    A1: {
      vraag: "Kann Ihr Außendienst den Status einer laufenden Anfrage sehen, ohne jemanden anzurufen?",
      kost: "Bei Nein reist jede Statusänderung über einen Menschen. Jede Übergabe ist ein Moment, an dem sie liegen bleiben kann, und Sie sehen nicht, welcher es war.",
    },
    A2: {
      vraag: "Weiß das Büro innerhalb einer Stunde, dass eine Besichtigung abgeschlossen ist?",
      kost: "Bei Nein beginnt das Angebot erst, wenn jemand zufällig davon hört. Diese Wartezeit steht nirgends, also wird sie auch nie kürzer.",
    },
    A3: {
      vraag: "Steht der aktuelle Status eines Deals an einer Stelle, und nicht in mehreren Systemen nebeneinander?",
      kost: "Bei mehreren gibt es keine Antwort auf \"wie steht es\", nur Meinungen. Wer recht hatte, zeigt sich bei der Beschwerde.",
    },
    A4: {
      vraag: "Kann ein Kollege die laufenden Anfragen eines kranken Monteurs ohne Übergabegespräch übernehmen?",
      kost: "Bei Nein sitzt der Status in einem Kopf. Krankheit, Urlaub und Kündigung sind dann dasselbe Risiko unter anderem Namen.",
    },
    B1: {
      vraag: "Wissen Sie, wie viele Stunden im Schnitt zwischen Anfrage und Angebot liegen?",
      kost: "Bei Nein können Sie diese Zeit nicht verkürzen, denn Sie würden die Verbesserung nicht sehen.",
      meting: {
        opdracht:
          "Nehmen Sie Ihre letzten fünf verschickten Angebote. Zählen Sie pro Angebot die Werktage zwischen dem ersten Kundenkontakt und dem Moment, in dem es rausging.",
        label: "Durchschnittliche Werktage bis zum Angebot",
        eenheid: "Werktage",
      },
    },
    B2: {
      vraag: "Geht ein Angebot raus, ohne dass jemand Daten aus einem anderen System abtippt?",
      kost: "Bei Nein zahlen Sie doppelt: die Zeit fürs Abtippen, und die Fehler, die sich einschleichen und erst beim Kunden auffallen.",
    },
    B3: {
      vraag: "Bekommt ein Anfragender innerhalb von 24 Stunden eine Antwort, auch am Wochenende oder in einer Urlaubswoche?",
      kost: "Bei Nein ist Ihre Reaktionszeit eine Funktion davon, wer gerade arbeitet. Der Anfragende ruft derweil den Nächsten an.",
      meting: {
        opdracht:
          "Suchen Sie Ihre letzten zehn Anfragen heraus, die außerhalb der Bürozeiten eingingen. Zählen Sie die Stunden bis zur ersten inhaltlichen Antwort eines Menschen — eine Eingangsbestätigung zählt nicht.",
        label: "Durchschnittliche Stunden bis zur ersten inhaltlichen Antwort",
        eenheid: "Stunden",
        grens: {
          duiding:
            "Ab einer Stunde wird das Qualifizieren nachweislich schwerer: Unternehmen, die innerhalb der Stunde antworteten, qualifizierten einen Lead fast siebenmal so oft wie Unternehmen, die länger brauchten. Das betrifft das Qualifizieren, nicht das Gewinnen, und es ist US-Forschung, keine deutsche Norm.",
          bron: "Harvard Business Review, 2011 — Audit von 2.241 Unternehmen",
        },
      },
    },
    B4: {
      vraag: "Können Sie sehen, welcher Schritt im Ablauf die meiste Zeit kostet?",
      kost: "Bei Nein verbessern Sie nach Gefühl, und das Gefühl zeigt auf den Schritt, der am lautesten klagt — selten auf den, der am längsten dauert.",
    },
    B5: {
      vraag: "Können Sie einem Kunden innerhalb einer Woche eine Zeichnung oder Kalkulation zeigen, auch wenn der Kollege, der sie erstellt, nicht da ist?",
      kost: "Bei Nein ist Ihre Durchlaufzeit der Kalender einer Person. Der Kunde erlebt das als Stille, und Sie merken es erst, wenn er nicht zurückruft.",
    },
    C1: {
      vraag: "Werden Name und Adresse einer neuen Anfrage nur einmal getippt?",
      kost: "Bei Nein gibt es sofort zwei Versionen desselben Kunden, und nichts entscheidet, welche die echte ist.",
    },
    C2: {
      vraag: "Liegen WhatsApp-Gespräche mit Kunden dort, wo ein Kollege sie wiederfindet?",
      kost: "Bei Nein liegt die Kundenhistorie auf einem privaten Telefon. Beim Weggang geht sie mit zur Tür hinaus.",
    },
    C3: {
      vraag: "Landet eine Anfrage über Ihre Website automatisch in dem System, in dem Sie arbeiten?",
      kost: "Bei Nein existiert die Anfrage erst, wenn jemand sie überträgt, und auf diesem Schritt steht kein Alarm.",
    },
    C4: {
      vraag: "Wissen Sie bei jedem Lead, woher er kam?",
      kost: "Bei Nein ist jede Aussage darüber, was funktioniert, geraten. Sie stellen dann den Kanal ein, der am leisesten ist, nicht den, der am wenigsten bringt.",
    },
    D1: {
      vraag: "Wissen Sie aus dem Kopf, wie viele Software-Abos Sie haben und was sie zusammen pro Monat kosten?",
      kost: "Bei Nein wächst dieser Stapel mit jeder Einzelentscheidung, und niemand beschließt je, ihn wachsen zu lassen.",
    },
    D2: {
      vraag: "Gibt es ein Tool, für das Sie zahlen und das seltener als einmal pro Woche von jemandem geöffnet wird?",
      kost: "Bei Ja zahlen Sie für eine Gewohnheit, die niemand mehr hat. Das ist die billigste Einsparung, die es gibt, und die am leichtesten vergessene.",
    },
    D3: {
      vraag: "Können Sie beim Weggang eines Mitarbeiters innerhalb eines Tages alle seine Zugänge entziehen?",
      kost: "Bei Nein ist Ihr Stapel auch ein Sicherheitsproblem, nicht nur ein Kostenpunkt.",
    },
  },
};

export const VERTALING: Readonly<Record<"en" | "de", Vertaling>> = { en: EN, de: DE };

/** De vragenlijst en de blokken in een taal. Structuur uit lib/lekkage-scan.ts,
 *  tekst van hier. Nederlands geeft de bron zelf terug. */
export function vragenVoor(taal: ScanTaal): { vragen: Vraag[]; blokken: Blok[] } {
  if (taal === "nl") return { vragen: [...VRAGEN], blokken: [...BLOKKEN] };
  const v = VERTALING[taal];
  const blokken = BLOKKEN.map((b) => ({ ...b, ...v.blokken[b.id] }));
  const vragen = VRAGEN.map((q) => {
    const t = v.vragen[q.id];
    if (!t) throw new Error(`lekkage-scan-taal: geen ${taal}-tekst voor vraag ${q.id}`);
    if (!!q.meting !== !!t.meting) throw new Error(`lekkage-scan-taal: meting van ${q.id} wijkt af in ${taal}`);
    if (!!q.meting?.grens !== !!t.meting?.grens) throw new Error(`lekkage-scan-taal: grens van ${q.id} wijkt af in ${taal}`);
    return {
      ...q,
      vraag: t.vraag,
      kost: t.kost,
      ...(q.meting && t.meting
        ? {
            meting: {
              ...q.meting,
              opdracht: t.meting.opdracht,
              label: t.meting.label,
              eenheid: t.meting.eenheid,
              ...(q.meting.grens && t.meting.grens
                ? { grens: { ...q.meting.grens, ...t.meting.grens } }
                : {}),
            },
          }
        : {}),
    };
  });
  return { vragen, blokken };
}

/* ---------------------------------------------------------------------------
 * De kopij om de vragen heen
 * ------------------------------------------------------------------------ */

export type ScanTeksten = {
  /** <title> en meta description. */
  titel: string;
  beschrijving: string;
  /** Hero. */
  eyebrow: string;
  kop: string;
  lede: string;
  /** Meldingen na de afmeldlink (app/api/uitschrijven). */
  uitgeschrevenKlaar: string;
  uitgeschrevenOngeldig: string;
  /** De vragen. */
  ja: string;
  nee: string;
  metingOptioneel: string;
  knopToon: string;
  alleBeantwoord: string;
  nogTeGaan: (open: number) => string;
  /** De uitslag. */
  printkopTitel: string;
  printkopBron: string;
  nulKop: string;
  nulP: string;
  lekKopEen: string;
  lekKopMeer: (n: number) => string;
  /** "3 van de 4 vragen onder" — de bloknaam komt er in het component achter. */
  lekMeta: (aantal: number, totaal: number) => string;
  gemetenKop: string;
  gemetenSlot: string;
  grensKop: string;
  grensP: string;
  /** De opvang. */
  bewaarKop: string;
  bewaarP1: string;
  bewaarP2: string;
  emailLabel: string;
  placeholder: string;
  toestemming: string;
  knopStuur: string;
  bezig: string;
  knopPrint: string;
  /** De uitnodiging. */
  ctaP: string;
  liever: string;
};

const NL: ScanTeksten = {
  titel: "Lekkage-scan: waar je omzet weglekt",
  beschrijving:
    `${AANTAL_WOORD_HOOFD} ja/nee-vragen over je stack. Je ziet direct welke drie ` +
    "dingen bij jou het eerst lekken. Geen e-mail nodig, geen verkooppraat.",
  eyebrow: "Gratis · vier minuten · geen e-mail",
  kop: "Waar lekt het bij jou?",
  lede:
    "De omzet lekt zelden in de markt. Hij lekt tussen de tools — in de overdracht " +
    "naar de buitendienst, in de dagen tussen aanvraag en offerte, in het adres dat " +
    `voor de derde keer wordt overgetypt. ${AANTAL_WOORD_HOOFD} vragen, en je weet ` +
    "welke drie bij jou het eerst lekken.",
  uitgeschrevenKlaar: "Je staat uitgeschreven. Er komt geen mail meer.",
  uitgeschrevenOngeldig: "Deze afmeldlink werkt niet meer. Mail",
  ja: "Ja",
  nee: "Nee",
  metingOptioneel: "Optioneel. Sla over als je het nu niet kunt opzoeken.",
  knopToon: "Toon wat er lekt",
  alleBeantwoord: `Alle ${VRAGEN.length} beantwoord.`,
  nogTeGaan: (open) => `Nog ${open} ${open === 1 ? "vraag" : "vragen"} te gaan.`,
  printkopTitel: "Lekkage-scan",
  printkopBron: `juandiazllc.com/nl${SCAN_PAD.nl} · ${CONTACT_EMAIL}`,
  nulKop: "Deze scan ziet niets lekken.",
  nulP:
    `Dat is een echte uitkomst en geen beleefdheid. ${AANTAL_WOORD_HOOFD} ` +
    "ja/nee-vragen vinden de lekken die met overdracht, wachttijd, dubbele " +
    "invoer en overlappende tools te maken hebben. Zitten die goed, dan zit " +
    "je probleem ergens anders.",
  lekKopEen: "Dit lekt bij jou het eerst",
  lekKopMeer: (n) => `Dit lekt bij jou het eerst — ${n} plekken, belangrijkste bovenaan`,
  lekMeta: (aantal, totaal) => `${aantal} van de ${totaal} vragen onder`,
  gemetenKop: "Wat je zelf hebt gemeten",
  gemetenSlot:
    "Dit zijn de enige getallen in deze scan die over jouw bedrijf gaan, en " +
    "je hebt ze zelf opgezocht. Alles hierboven is een ja of een nee.",
  grensKop: "Wat deze scan niet ziet",
  grensP:
    "Geen marge per project, geen kwaliteit van de instroom, geen bezetting, " +
    "en niets over of je mensen een nieuw systeem zouden gebruiken. " +
    `${AANTAL_WOORD_HOOFD} ja/nee-vragen dragen hun eigen reikwijdte, en dit is hem.`,
  bewaarKop: "Neem deze uitslag mee",
  bewaarP1:
    "Eén pagina met jouw antwoorden erop. Je bewaart hem zelf, en je " +
    "kunt hem doorsturen naar wie er bij jou over gaat.",
  bewaarP2:
    "Wil je er de komende weken drie mails over? Per lek één: wat het " +
    "kost, wat je er zelf aan kunt doen, en wanneer het tijd is voor " +
    "hulp. Laat dan hieronder je adres achter. Zonder vinkje gebeurt " +
    "er niets.",
  emailLabel: "E-mailadres",
  placeholder: "jij@bedrijf.nl",
  // Dezelfde string als de opslag gebruikt; scan-reeks.test.ts leest hem daar.
  toestemming: TOESTEMMING_TEKST,
  knopStuur: "Stuur me de drie mails",
  bezig: "Bezig…",
  knopPrint: "Opslaan of printen",
  ctaP:
    "Wil je dit nagelopen hebben op je eigen cijfers in plaats van op " +
    `${AANTAL_WOORD} vragen? Dat is het blueprint-gesprek: dertig minuten, en er ` +
    "komt een diagnose van één pagina uit.",
  liever: "Liever direct?",
};

const N_EN = telwoord(VRAGEN.length, "en");
const N_EN_HOOFD = N_EN[0].toUpperCase() + N_EN.slice(1);

const EN_TEKSTEN: ScanTeksten = {
  titel: "Leak scan: where your revenue leaks",
  beschrijving:
    `${N_EN_HOOFD} yes/no questions about your stack. You see straight away which three ` +
    "things leak first in your business. No email needed, no sales pitch.",
  eyebrow: "Free · four minutes · no email",
  kop: "Where does it leak in your business?",
  lede:
    "Revenue rarely leaks in the market. It leaks between the tools — in the handover " +
    "to the field team, in the days between enquiry and quote, in the address that gets " +
    `retyped for the third time. ${N_EN_HOOFD} questions, and you know ` +
    "which three leak first in your business.",
  uitgeschrevenKlaar: "You're unsubscribed. No more emails will follow.",
  uitgeschrevenOngeldig: "This unsubscribe link no longer works. Email",
  ja: "Yes",
  nee: "No",
  metingOptioneel: "Optional. Skip it if you can't look it up right now.",
  knopToon: "Show what leaks",
  alleBeantwoord: `All ${VRAGEN.length} answered.`,
  nogTeGaan: (open) => `${open} ${open === 1 ? "question" : "questions"} to go.`,
  printkopTitel: "Leak scan",
  printkopBron: `juandiazllc.com/en${SCAN_PAD.en} · ${CONTACT_EMAIL}`,
  nulKop: "This scan sees nothing leaking.",
  nulP:
    `That is a real outcome, not politeness. ${N_EN_HOOFD} ` +
    "yes/no questions find the leaks that come from handover, waiting, double " +
    "entry and overlapping tools. If those are in order, your problem is somewhere else.",
  lekKopEen: "This leaks first in your business",
  lekKopMeer: (n) => `This leaks first in your business — ${n} places, biggest at the top`,
  lekMeta: (aantal, totaal) => `${aantal} of the ${totaal} questions under`,
  gemetenKop: "What you measured yourself",
  gemetenSlot:
    "These are the only numbers in this scan that are about your company, and " +
    "you looked them up yourself. Everything above is a yes or a no.",
  grensKop: "What this scan does not see",
  grensP:
    "No margin per project, no quality of inbound, no capacity, " +
    "and nothing about whether your people would use a new system. " +
    `${N_EN_HOOFD} yes/no questions carry their own reach, and this is it.`,
  bewaarKop: "Take this result with you",
  bewaarP1:
    "One page with your answers on it. You keep it yourself, and you " +
    "can forward it to whoever owns this at your company.",
  bewaarP2:
    "Want three emails about it over the coming weeks? One per leak: what it " +
    "costs, what you can do about it yourself, and when it is time for " +
    "help. Then leave your address below. Without the tick, nothing happens.",
  emailLabel: "Email address",
  placeholder: "you@company.com",
  toestemming:
    "Yes, send me at most three emails about these leaks. Every email has an unsubscribe link at the bottom.",
  knopStuur: "Send me the three emails",
  bezig: "Sending…",
  knopPrint: "Save or print",
  ctaP:
    "Want this checked against your own numbers instead of " +
    `${N_EN} questions? That is the blueprint call: thirty minutes, and a ` +
    "one-page diagnosis comes out of it.",
  liever: "Prefer to write directly?",
};

const N_DE = telwoord(VRAGEN.length, "de");
const N_DE_HOOFD = N_DE[0].toUpperCase() + N_DE.slice(1);

const DE_TEKSTEN: ScanTeksten = {
  titel: "Leak-Scan: wo Ihr Umsatz versickert",
  beschrijving:
    `${N_DE_HOOFD} Ja/Nein-Fragen zu Ihrem Stack. Sie sehen sofort, welche drei ` +
    "Dinge bei Ihnen zuerst lecken. Keine E-Mail nötig, kein Verkaufsgespräch.",
  eyebrow: "Kostenlos · vier Minuten · keine E-Mail",
  kop: "Wo leckt es bei Ihnen?",
  lede:
    "Umsatz versickert selten im Markt. Er versickert zwischen den Tools — in der Übergabe " +
    "an den Außendienst, in den Tagen zwischen Anfrage und Angebot, in der Adresse, die " +
    `zum dritten Mal abgetippt wird. ${N_DE_HOOFD} Fragen, und Sie wissen, ` +
    "welche drei bei Ihnen zuerst lecken.",
  uitgeschrevenKlaar: "Sie sind abgemeldet. Es folgt keine E-Mail mehr.",
  uitgeschrevenOngeldig: "Dieser Abmeldelink funktioniert nicht mehr. Schreiben Sie an",
  ja: "Ja",
  nee: "Nein",
  metingOptioneel: "Optional. Überspringen Sie es, wenn Sie es jetzt nicht nachsehen können.",
  knopToon: "Zeigen, was leckt",
  alleBeantwoord: `Alle ${VRAGEN.length} beantwortet.`,
  nogTeGaan: (open) => `Noch ${open} ${open === 1 ? "Frage" : "Fragen"}.`,
  printkopTitel: "Leak-Scan",
  printkopBron: `juandiazllc.com/de${SCAN_PAD.de} · ${CONTACT_EMAIL}`,
  nulKop: "Dieser Scan sieht nichts lecken.",
  nulP:
    `Das ist ein echtes Ergebnis und keine Höflichkeit. ${N_DE_HOOFD} ` +
    "Ja/Nein-Fragen finden die Lecks, die mit Übergabe, Wartezeit, doppelter " +
    "Eingabe und sich überschneidenden Tools zu tun haben. Sitzen die, liegt " +
    "Ihr Problem woanders.",
  lekKopEen: "Das leckt bei Ihnen zuerst",
  lekKopMeer: (n) => `Das leckt bei Ihnen zuerst — ${n} Stellen, die wichtigste oben`,
  lekMeta: (aantal, totaal) => `${aantal} von ${totaal} Fragen unter`,
  gemetenKop: "Was Sie selbst gemessen haben",
  gemetenSlot:
    "Das sind die einzigen Zahlen in diesem Scan, die Ihr Unternehmen betreffen, und " +
    "Sie haben sie selbst nachgesehen. Alles darüber ist ein Ja oder ein Nein.",
  grensKop: "Was dieser Scan nicht sieht",
  grensP:
    "Keine Marge pro Projekt, keine Qualität des Zulaufs, keine Auslastung, " +
    "und nichts darüber, ob Ihre Leute ein neues System nutzen würden. " +
    `${N_DE_HOOFD} Ja/Nein-Fragen tragen ihre eigene Reichweite, und das ist sie.`,
  bewaarKop: "Nehmen Sie dieses Ergebnis mit",
  bewaarP1:
    "Eine Seite mit Ihren Antworten. Sie bewahren sie selbst auf und " +
    "können sie an die Person weiterleiten, die bei Ihnen dafür zuständig ist.",
  bewaarP2:
    "Möchten Sie in den nächsten Wochen drei E-Mails dazu? Pro Leck eine: was es " +
    "kostet, was Sie selbst dagegen tun können, und wann es Zeit für " +
    "Hilfe ist. Dann hinterlassen Sie unten Ihre Adresse. Ohne Häkchen passiert nichts.",
  emailLabel: "E-Mail-Adresse",
  placeholder: "sie@firma.de",
  toestemming:
    "Ja, senden Sie mir höchstens drei E-Mails zu diesen Lecks. Am Ende jeder E-Mail steht ein Abmeldelink.",
  knopStuur: "Die drei E-Mails senden",
  bezig: "Wird gesendet…",
  knopPrint: "Speichern oder drucken",
  ctaP:
    "Möchten Sie das an Ihren eigenen Zahlen prüfen lassen statt an " +
    `${N_DE} Fragen? Das ist das Blueprint-Gespräch: dreißig Minuten, und heraus ` +
    "kommt eine einseitige Diagnose.",
  liever: "Lieber direkt?",
};

export const TEKSTEN: Readonly<Record<ScanTaal, ScanTeksten>> = {
  nl: NL,
  en: EN_TEKSTEN,
  de: DE_TEKSTEN,
};

/** De toestemmingstekst die in de rij wordt opgeslagen (`consent_tekst`),
 *  precies zoals de bezoeker hem zag. */
export const TOESTEMMING_TEKSTEN: Readonly<Record<ScanTaal, string>> = {
  nl: NL.toestemming,
  en: EN_TEKSTEN.toestemming,
  de: DE_TEKSTEN.toestemming,
};
