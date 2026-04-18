// Typed content collection for /insights. Keeps the build simple — no
// MDX runtime, no filesystem reads at request time — but still lets
// each post carry rich metadata (tags, reading time, SEO, OG image)
// so the listing page, RSS feed, sitemap and Article schema can all
// source from one truth.

export type Insight = {
  slug: string;
  title: string;
  summary: string;
  tag: string;
  publishedAt: string;
  readingMinutes: number;
  body: InsightBlock[];
  seo?: { metaTitle?: string; metaDescription?: string };
};

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
];

export function getAllInsights(): Insight[] {
  return [...POSTS].sort((a, b) => (a.publishedAt > b.publishedAt ? -1 : 1));
}

export function getInsight(slug: string): Insight | undefined {
  return POSTS.find((p) => p.slug === slug);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
