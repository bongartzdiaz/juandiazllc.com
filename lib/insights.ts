// Typed content collection for /insights. Keeps the build simple — no
// MDX runtime, no filesystem reads at request time — but still lets
// each post carry rich metadata (tags, reading time, SEO, OG image)
// so the listing page, RSS feed, sitemap and Article schema can all
// source from one truth.

import type { Locale } from "@/lib/i18n/dict";

/** Localized overrides for a post's user-facing content. */
export type InsightL10n = { title: string; summary: string; body: InsightBlock[] };

export type Insight = {
  slug: string;
  title: string;
  summary: string;
  tag: string;
  publishedAt: string;
  readingMinutes: number;
  body: InsightBlock[];
  seo?: { metaTitle?: string; metaDescription?: string };
  /** Locales this post is published under. Undefined = all four (the default,
   *  used by language-agnostic operator content with EN as the int'l fallback).
   *  Market-specific posts (e.g. Dutch saldering/WhatsApp) set this to ['nl']
   *  so they don't surface as thin content under /en,/de,/es. */
  markets?: Locale[];
  /** Real localized content per locale. When present for the active locale the
   *  detail/listing renders it instead of the base (EN/NL) strings. */
  i18n?: Partial<Record<Locale, InsightL10n>>;
};

const ALL_LOCALES: Locale[] = ["en", "nl", "de", "es"];

export type InsightBlock =
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "quote"; text: string; cite?: string };

export const POSTS: Insight[] = [
  {
    slug: "the-automation-roi-myth",
    title: "The automation ROI myth, and what actually pays back",
    summary:
      "Most automation projects save hours nobody was going to spend anyway. Three rules for picking the ones that actually move the P&L — and one test to apply before you buy another tool.",
    tag: "Systems",
    publishedAt: "2026-01-22",
    readingMinutes: 6,
    body: [
      { type: "p", text: "Every operator I meet has a slide deck from some consultant claiming their team will save 400 hours a year. Most of the time that number is arithmetic fiction — hours that would never have been billed, meetings that would never have been booked, work that would never have been done. Real automation ROI is narrower and harsher." },
      { type: "h2", text: "The three questions that separate real ROI from theatre" },
      { type: "ul", items: [
        "Is the work being automated currently being done by a person who is your bottleneck? If no, you are not freeing capacity, you are making the already-idle faster.",
        "Does the automation remove a decision, or does it just speed up data entry? Removed decisions compound; faster data entry saturates at maybe 20 percent of theoretical savings.",
        "If it breaks for a week, does anyone notice? If the answer is no, you automated a museum."
      ]},
      { type: "h2", text: "The test before you buy" },
      { type: "p", text: "Write down the three highest-value hours your top performer spends in a typical week. If your candidate automation does not touch those three hours directly, the ROI is theatre. Shelve it. The gains from automating a bottleneck person for five hours a week dwarf automating ten non-bottlenecks for fifty." },
      { type: "quote", text: "Automation ROI is measured by what gets un-queued, not by what gets done faster." },
      { type: "p", text: "The operators who grow stop confusing activity with throughput. You want fewer automations, pointed at sharper targets, each paying for itself in weeks not quarters." }
    ]
  },
  {
    slug: "whatsapp-first-funnel-nl",
    markets: ["nl"],
    title: "Why your Dutch lead funnel should start on WhatsApp",
    summary:
      "Nederlandse consumenten beantwoorden WhatsApp in 90 seconden en email in een week. Hoe je je funnel inricht zodat het eerste contact altijd WhatsApp is — zonder de lead kwijt te raken in de doorverwijzing.",
    tag: "Growth",
    publishedAt: "2025-12-14",
    readingMinutes: 5,
    body: [
      { type: "p", text: "Als je in Nederland B2C verkoopt en je eerste contact is nog steeds email, je verliest de helft van je funnel aan trage response. WhatsApp-response-rates liggen in Nederland rond de 80 procent, tegenover 15-20 procent voor cold email. De vraag is niet of je WhatsApp inzet, maar hoe je het zo inricht dat je schaalt zonder het persoonlijke karakter te verliezen." },
      { type: "h2", text: "De drie fasen die werken" },
      { type: "ul", items: [
        "WhatsApp first touch — een bot kwalificeert in drie vragen: koopintentie, budget-orde-grootte, tijdlijn. Geen prijzen, geen verkoop.",
        "Telefoongesprek als tweede stap — een mens voert het echte gesprek. De bot verkoopt nooit direct een bezoek. Drie-nee-regel: bij drie afwijzingen sluit het gesprek.",
        "Buitendienst of offerte pas als fase drie — nooit eerder. Elke stap overslaan verdubbelt je no-show rate."
      ]},
      { type: "h2", text: "Wat je niet moet doen" },
      { type: "p", text: "De bot mag nooit onthullen dat het een AI is. Niet omdat het strikt verboden is, maar omdat de meeste Nederlandse consumenten direct uitstappen zodra ze doorhebben dat ze met een chatbot praten. Als je transparanter wilt zijn, zeg dan eerlijk dat je werkt met een voorgedefinieerd kwalificatie-script — dat is acceptabel en vertrouwenwekkend." },
      { type: "p", text: "De funnel die zo ingericht staat, draait bij operators die ik begeleid met CPL onder de 12 euro en een conversie van 35 procent van eerste WhatsApp-contact naar telefoongesprek. Dat zijn aantallen die een normale email-funnel nooit haalt, en de reden is simpel: je bent waar de klant al is, en je maakt geen extra stappen in de weg." }
    ]
  },
  {
    slug: "why-operator-crms-fail",
    title: "Why most operator CRMs fail within 90 days",
    summary:
      "A CRM the team avoids is worse than a spreadsheet. The pattern that kills adoption in energy, real estate and hospitality shops — and five decisions that fix it before rollout.",
    tag: "Systems",
    publishedAt: "2026-04-08",
    readingMinutes: 6,
    body: [
      { type: "p", text: "Every operator I talk to has a story: they bought a CRM, migrated the contacts, ran two training sessions, and within a quarter the deal pipeline was back to WhatsApp and memory. The diagnosis is almost always the same — and it is never the software's fault." },
      { type: "h2", text: "The symptom is adoption. The cause is design." },
      { type: "p", text: "When a CRM gets abandoned, the root cause is usually that it was configured around what the office wanted to see, not around what the field team needed to do. The dashboards are beautiful. The data entry is expensive. So the people who generate revenue stop entering data, the dashboards go blank, and the C-suite calls it a tech problem." },
      { type: "h2", text: "Five decisions that determine whether it sticks" },
      { type: "ul", items: [
        "Who owns the daily pipeline review, and is it ten minutes or an hour?",
        "Is status change a button or a form? The answer has to be 'button.'",
        "Does every field pay for itself in a downstream automation, or is it just a museum?",
        "What happens at stage transitions — nothing, or a visible nudge to the next owner?",
        "Is mobile entry equal to desktop, or is mobile a read-only afterthought?"
      ]},
      { type: "quote", text: "If a sales rep cannot update a deal during the walk from the parking lot to the front door, the CRM is already losing." },
      { type: "h2", text: "The practical move" },
      { type: "p", text: "Before touching a vendor contract, write down the ten actions your team performs most on a typical Tuesday. Prototype those ten actions as one-tap flows. Anything that takes more than three taps gets rethought. The CRM is not the system — the ten flows are. Everything else is reporting." },
      { type: "p", text: "That is the same lens I use when I build Philly — the CRM I ship to operators. Revenue is earned by field teams, so the software has to treat them like the primary user." }
    ]
  },
  {
    slug: "salderingsregeling-2027-wat-operators-nu-moeten-doen",
    markets: ["nl"],
    title: "Salderingsregeling 2027 — wat operators nu moeten doen",
    summary:
      "De afschaffing raakt installateurs harder dan huiseigenaren. Drie aanpassingen in je funnel die het verschil maken tussen een rustig 2027 en een acquisitie-crisis.",
    tag: "Energy",
    publishedAt: "2026-03-24",
    readingMinutes: 5,
    body: [
      { type: "p", text: "De afbouw van de salderingsregeling in 2027 is geen verrassing meer — de wet is rond, de communicatie loopt. Wat operators in de zonne-sector onderschatten is het effect op het koopgedrag: de impulsklant verdwijnt, de rationele klant blijft, en die stelt andere vragen." },
      { type: "h2", text: "Waar je funnel pijn gaat voelen" },
      { type: "p", text: "In 2024 en 2025 was zonnepanelen verkopen grotendeels een prijsgesprek. Vanaf 2026 verschuift dat naar een rendementsgesprek waarin de thuisbatterij centraal staat. Dat betekent langere sales-cycles, meer technische vragen, en meer afhakers in het offerte-stadium omdat de terugverdientijd complexer wordt." },
      { type: "h2", text: "Drie aanpassingen die het nu al oplossen" },
      { type: "ul", items: [
        "Geef elke lead een persoonlijk verbruiksrapport voordat je een prijs noemt — dat sorteert serieuze klanten van prijs-shoppers.",
        "Bouw de thuisbatterij-upsell in de eerste offerte in, niet als aparte fase. Klanten die eerst panelen dan batterij doen, komen vaak niet terug.",
        "Investeer in een contentlaag rond salderingsregeling-2027 die je eigen leads opvoedt voor het telefoongesprek. Minder objecties in het gesprek zelf."
      ]},
      { type: "p", text: "De installateurs die nu al op deze drie punten draaien, vangen 2027 op. De rest gaat proberen de prijs verder te verlagen en merkt dat de marge weg is." }
    ]
  },
  {
    slug: "the-build-vs-buy-trap",
    title: "The build-vs-buy trap operators keep walking into",
    summary:
      "Building looks expensive until you count the workarounds. Buying looks safe until you hit the third integration. A decision framework that matches operator reality.",
    tag: "Strategy",
    publishedAt: "2026-02-17",
    readingMinutes: 7,
    body: [
      { type: "p", text: "Somewhere between a 50-person operator and a 500-person one, every leadership team has the same conversation: we have four vendors, three of them do not talk to each other, and our people spend an hour a day moving data between them. Do we keep buying, or do we build?" },
      { type: "h2", text: "The real question is not build vs buy" },
      { type: "p", text: "The real question is: which two or three capabilities are actually core to how we win, and which fifteen are commodities we just need to work? Operators who get this right buy the commodities (email, calendar, accounting, payroll) and build — or pay someone to build — a thin integration layer plus the two or three core workflows that make them different." },
      { type: "h2", text: "The trap I see most often" },
      { type: "p", text: "Buying a best-of-breed tool for every function and hoping a Zapier graveyard glues them together. This works until you need to answer a real question across three of them, and suddenly the answer is three hours of CSV exports. That is the tax you pay for picking safe fifteen times." },
      { type: "quote", text: "If it takes more than a day to answer a board-level question with your current stack, your stack is no longer your stack — it is a museum." },
      { type: "h2", text: "A framework that actually works" },
      { type: "ul", items: [
        "List the three questions leadership should be able to answer in under a minute. Those are the core.",
        "For each, identify which system is the source of truth — if the answer is a spreadsheet, you have found your build target.",
        "Everything else is commodity. Buy the cheapest tool that does the job without breaking your data contracts.",
        "Invest the saved budget in the integration layer and the three core workflows. That is where the moat lives."
      ]},
      { type: "p", text: "The operators who get this right stop feeling like their tech stack owns them. The ones who do not, eventually hire a Chief of Staff whose job is largely to move CSVs between tools. That is an expensive outcome to accept." }
    ]
  }
  ,{
    slug: "the-field-team-is-the-product",
    title: "The field team is the product — not the dashboard",
    summary:
      "Executives buy software for reporting. Field teams use it to close deals. When the two are in tension, the field team wins by default — they just stop using it. Design for them first.",
    tag: "Systems",
    publishedAt: "2026-04-15",
    readingMinutes: 5,
    body: [
      { type: "p", text: "Walk into any 50-person operator and ask two people the same question: what does the CRM do? The CFO will talk about pipeline visibility and revenue forecasting. The field rep will talk about the eight taps it takes to log a call. Those two answers describe completely different products." },
      { type: "h2", text: "Why the office usually wins the roadmap fight" },
      { type: "p", text: "The office pays for the tool, sits in the demos, and writes the requirements. The field team is busy — generating revenue. So the software gets built for the people who asked for it, not the people who have to use it. Six months later nobody understands why adoption is at 30 percent." },
      { type: "h2", text: "A simple test before any CRM decision" },
      { type: "ul", items: [
        "Sit next to a field rep for one full day. Count the taps per deal update.",
        "If it is more than three, the software is already fighting you.",
        "Ask what they would need to update five deals while walking from car to front door. Build that.",
        "Then show the CFO the dashboard — but only with data the field team can actually produce in three taps."
      ]},
      { type: "quote", text: "A CRM is not the system of record. It is the system of action. If it is not easier than what came before, nothing gets recorded." },
      { type: "p", text: "This is the lens behind Philly. The dashboards came after we got the field flow right. If you reverse the order, you get a museum." }
    ]
  },
  {
    slug: "thuisbatterij-verkoop-na-2027",
    markets: ["nl"],
    title: "Thuisbatterijen verkopen na 2027 — wat werkelijk werkt",
    summary:
      "De salderingsregeling verdwijnt. De batterij-installateurs die 2027 overleven zijn niet de goedkoopste — ze zijn de duidelijkste. Drie patronen uit succesvolle NL installateurs.",
    tag: "Energy",
    publishedAt: "2026-04-02",
    readingMinutes: 6,
    body: [
      { type: "p", text: "Vanaf 2027 is elke zonnepaneel-installatie een gesprek over zelfverbruik, niet over saldering. Dat klinkt technisch, maar het verandert het hele verkoopgesprek. Klanten stellen nieuwe vragen, en de meeste installateurs beantwoorden ze nog met oude antwoorden." },
      { type: "h2", text: "De drie vragen die de verkoop winnen" },
      { type: "ul", items: [
        "Wat bespaart de batterij mij per jaar — in euro's, niet in kWh?",
        "Wanneer heb ik mijn investering terug, met realistische energieprijzen?",
        "Wat gebeurt er als mijn verbruik over vijf jaar verandert (EV, warmtepomp)?"
      ]},
      { type: "p", text: "Installateurs die alle drie beantwoorden met concrete cijfers uit de meterstandenrapportage van de klant, sluiten drie keer zoveel deals als installateurs die met algemene brochures werken. De asymmetrie zit in de voorbereiding, niet in de prijs." },
      { type: "h2", text: "Wat helpmijbesparen.nl ziet in de pipeline" },
      { type: "p", text: "De leads die converteren hebben allemaal één ding gemeen: ze hebben een persoonlijk verbruiksrapport gezien voordat ze met een adviseur spraken. Geen rapport = prijs-shopper. Wel een rapport = serieuze koper die een partner zoekt, niet de goedkoopste offerte." },
      { type: "quote", text: "De prijsoorlog in thuisbatterijen komt eraan. De installateurs die winnen zijn degenen die al een jaar voor die oorlog een sterker narratief hebben opgebouwd." },
      { type: "p", text: "Dat narratief is geen marketing. Het is een funnel die elke lead een rekenmodel geeft voordat er iemand aan de telefoon hangt. Bouw die laag nu — in 2027 is het te laat." }
    ]
  },
  {
    slug: "why-most-operator-dashboards-lie",
    title: "Why most operator dashboards quietly lie to their CEOs",
    summary:
      "The numbers on the dashboard are never wrong — but the frame is. Three patterns that turn clean data into misleading narratives, and how to audit your own dashboard in under an hour.",
    tag: "Systems",
    publishedAt: "2026-03-11",
    readingMinutes: 6,
    body: [
      { type: "p", text: "Every CEO has had the moment: the dashboard looks green, the meeting goes well, and two weeks later a customer churn or a cash crunch lands that nobody saw coming. The dashboard was not wrong. It just was not looking at the right thing." },
      { type: "h2", text: "Three patterns that quietly mislead" },
      { type: "ul", items: [
        "Averages without distributions — 'average deal size €42k' hides that half your revenue is from two accounts.",
        "Lagging indicators dressed as leading — MRR is a lagging indicator. What the CEO needs is pipeline velocity, and that lives two systems away.",
        "Vanity ratios that move on their own — 'activation rate' climbs because you raised the bar for what counts as a signup, not because the product got better."
      ]},
      { type: "h2", text: "A one-hour audit you can run today" },
      { type: "p", text: "For each tile on your dashboard, ask two questions. One: if this number goes green, what board-level decision do I make differently? Two: what would have to be true for this number to look good while the business is actually in trouble? If you cannot answer both in under a minute per tile, that tile is decoration, not instrumentation." },
      { type: "quote", text: "The best dashboards have fewer tiles than people expect. Every tile that is not answering a decision is competing for the attention of the ones that are." },
      { type: "p", text: "When we build reporting inside Philly, we start from the decision, not the data. It forces uncomfortable conversations — 'we actually don't know what we would do if this number moved' — but those are the conversations that make the dashboard worth building." }
    ]
  }

];

/** Locales a post is published under (default: all four). */
export function insightMarkets(p: Insight): Locale[] {
  return p.markets ?? ALL_LOCALES;
}

export function isInMarket(p: Insight, locale: Locale): boolean {
  return insightMarkets(p).includes(locale);
}

/** Apply localized content for `locale` if present; otherwise return the base
 *  post unchanged. `markets` is preserved so callers can still gate. */
export function localizedInsight(p: Insight, locale: Locale): Insight {
  const t = p.i18n?.[locale];
  return t ? { ...p, title: t.title, summary: t.summary, body: t.body } : p;
}

/** All posts (newest first). With a locale: only posts published in that
 *  market, with localized content applied. */
export function getAllInsights(locale?: Locale): Insight[] {
  const sorted = [...POSTS].sort((a, b) => (a.publishedAt > b.publishedAt ? -1 : 1));
  if (!locale) return sorted;
  return sorted.filter((p) => isInMarket(p, locale)).map((p) => localizedInsight(p, locale));
}

export function getInsight(slug: string, locale?: Locale): Insight | undefined {
  const p = POSTS.find((x) => x.slug === slug);
  if (!p) return undefined;
  return locale ? localizedInsight(p, locale) : p;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function headingSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export function tocFromBody(blocks: InsightBlock[]): Array<{ id: string; text: string }> {
  const seen = new Map<string, number>();
  const out: Array<{ id: string; text: string }> = [];
  for (const b of blocks) {
    if (b.type !== "h2") continue;
    const base = headingSlug(b.text);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    out.push({ id: n === 1 ? base : `${base}-${n}`, text: b.text });
  }
  return out;
}
