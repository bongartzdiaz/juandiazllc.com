import type { Locale } from "@/lib/i18n/dict";
import { defined, mergeByIndex } from "@/lib/i18n/merge";

export type Venture = {
  slug: string;
  name: string;
  tagline: string;
  /** Keyword-targeted <title>. Without it the page falls back to
   *  `name — tagline`, which for several ventures runs past the ~60 characters
   *  Google renders once layout.tsx appends TITLE_SUFFIX. Never bake the brand
   *  in here — the layout already does that. */
  seoTitle?: string;
  seoDescription?: string;
  sector: string;
  // Canonical sector-page slug (lib/sectors.ts) this build belongs to.
  // Drives the /work/[slug] → /sectors/[slug] cross-link.
  sectorSlug: string;
  status: "live" | "shipping" | "reserved";
  /** Het adres waar dit ding draait, of `null` zolang het nergens draait.
   *
   *  Een domeinnaam onder een productnaam leest als "ga maar kijken". Philly
   *  droeg hier `philly.juandiazllc.com` terwijl DNS er NXDOMAIN op geeft
   *  (gemeten 2026-08-20 via de eigen resolver én via Cloudflare DoH), en dat
   *  adres stond in vier talen op /work en op de homepage afgedrukt — onder de
   *  zin dat je erop mag klikken en zelf mag oordelen. Wie het intypte kwam
   *  nergens uit.
   *
   *  Dus: geen adres tot er iets te bezoeken is. `ventures.test.ts` bewaakt
   *  dat, en de dagelijkse productie-audit controleert of de adressen die er
   *  wél staan nog oplossen. */
  domain: string | null;
  /** Volledige https-URL naar `domain`, of `null`. Nooit een intern pad: dat
   *  was hoe `/app` hier terechtkwam en bleef staan nadat de surface met
   *  #134-#140 uit deze repo verdween. */
  external: string | null;
  summary: string;
  story: string;
  phases: { title: string; body: string }[];
  stack: string[];
  metrics: { label: string; value: string; hint?: string }[];
  relatedSectors: string[];
  gradient: string;
  /** Real per-locale copy. A missing locale means the English base renders,
   *  which ventures.test.ts fails the build over rather than shipping quietly. */
  i18n?: Partial<Record<Locale, VentureL10n>>;
};

/** Per-locale overrides for a venture's copy.
 *
 *  Deliberately absent: `name` (Voltafy, Philly — product names), `stack`
 *  (framework names), `slug`, `domain`, `external`, `status`, `sectorSlug`,
 *  `gradient`. None of those are copy.
 *
 *  `phases` carries only the body: Survey / Blueprint / Build / Commission /
 *  Operate are the five-phase method's proper nouns and read identically in
 *  every language, so the title stays with the base entry. */
export type VentureL10n = Partial<
  Pick<Venture, "tagline" | "seoTitle" | "seoDescription" | "sector" | "summary" | "story" | "metrics" | "relatedSectors">
> & {
  phases?: { body: string }[];
};

export const VENTURES: Venture[] = [
  {
    slug: "voltafy",
    name: "Voltafy",
    tagline: "The platform layer.",
    seoTitle: "Voltafy — energy intelligence platform",
    seoDescription:
      "Voltafy is the platform layer of the holding: live monitoring, yield analytics and an operator interface for Dutch households and installers.",
    sector: "Energy",
    sectorSlug: "energy",
    status: "live",
    domain: "voltafy.nl",
    external: "https://voltafy.nl",
    summary:
      "Energy intelligence for Dutch households and installers. Live monitoring, yield analytics, and a tight operator interface for the people keeping solar and battery systems honest.",
    story:
      "Voltafy is the flagship of the holding — the platform that the other three energy products all connect back to. It's what I'd want if I were an installer managing hundreds of systems or a household that refuses to accept vendor-friendly numbers. The interface is deliberately operator-first: keyboard-first where it matters, readable at 3am, and built so that the uncomfortable truth about a system's performance is the first thing you see, not the last.",
    phases: [
      { title: "Survey", body: "Rode along with installers, sat in on owner calls, mapped every data source the Dutch grid exposes and every one it refuses to." },
      { title: "Blueprint", body: "Designed the schema and the operator flows before writing a single line of product UI. Every screen maps to a decision somebody actually has to make." },
      { title: "Build", body: "Shipped the platform surface, the live monitoring backbone, and the installer workspace. Fast, honest, unopinionated about which vendor you use." },
      { title: "Commission", body: "Stress-tested against bad network conditions, partial outages, and the messy reality of mixed-vendor fleets. Nothing goes live until it survives the edge cases." },
      { title: "Operate", body: "Tuning weekly. Shipping incremental improvements straight from installer feedback — this product only gets sharper the more it runs." },
    ],
    stack: ["Next.js", "Supabase", "Postgres", "TypeScript", "Three.js", "Resend"],
    metrics: [
      { label: "Status", value: "Live" },
      { label: "Sector", value: "Energy" },
      { label: "Launched", value: "2024" },
      { label: "Market", value: "NL" },
    ],
    relatedSectors: ["Energy", "Installers", "Grid"],
    i18n: {
      nl: {
        tagline: "De platformlaag.",
        seoTitle: "Voltafy — platform voor energie-inzicht",
        seoDescription:
          "Voltafy is de platformlaag van de holding: live monitoring, opbrengstanalyse en een operatorinterface voor Nederlandse huishoudens en installateurs.",
        sector: "Energie",
        summary:
          "Energie-inzicht voor Nederlandse huishoudens en installateurs. Live monitoring, opbrengstanalyse en een strakke operatorinterface voor de mensen die zonne- en batterijsystemen eerlijk houden.",
        story:
          "Voltafy is het vlaggenschip van de holding — het platform waar de andere drie energieproducten op terugvallen. Het is wat ik zelf zou willen als installateur met honderden systemen, of als huishouden dat weigert genoegen te nemen met cijfers die de leverancier uitkomen. De interface is bewust operator-eerst: toetsenbordgestuurd waar het telt, leesbaar om 3 uur 's nachts, en zo gebouwd dat de ongemakkelijke waarheid over een systeem het eerste is wat je ziet.",
        phases: [
          { body: "Meegereden met installateurs, meegeluisterd met eigenaren, elke databron in kaart gebracht die het Nederlandse net prijsgeeft — en elke bron die dat weigert." },
          { body: "Eerst het schema en de operatorflows ontworpen, pas daarna een regel product-UI. Elk scherm hoort bij een beslissing die iemand echt moet nemen." },
          { body: "Platformlaag, live-monitoringruggengraat en installateurswerkplek opgeleverd. Snel, eerlijk, onverschillig over welk merk je gebruikt." },
          { body: "Getest tegen slechte verbindingen, gedeeltelijke storingen en de rommelige praktijk van vloten met apparatuur van meerdere merken. Niets gaat live voordat het de randgevallen overleeft." },
          { body: "Wekelijks bijstellen. Kleine verbeteringen rechtstreeks uit wat installateurs melden — dit product wordt scherper naarmate het langer draait." },
        ],
        metrics: [
          { label: "Status", value: "Live" },
          { label: "Sector", value: "Energie" },
          { label: "Gelanceerd", value: "2024" },
          { label: "Markt", value: "NL" },
        ],
        relatedSectors: ["Energie", "Installateurs", "Net"],
      },
      de: {
        tagline: "Die Plattformschicht.",
        seoTitle: "Voltafy — Plattform für Energiedaten",
        seoDescription:
          "Voltafy ist die Plattformschicht der Holding: Live-Monitoring, Ertragsanalyse und eine Betreiberoberfläche für Haushalte und Installateure.",
        sector: "Energie",
        summary:
          "Energiedaten für niederländische Haushalte und Installateure. Live-Monitoring, Ertragsanalyse und eine schlanke Betreiberoberfläche für die Menschen, die Solar- und Batteriesysteme ehrlich halten.",
        story:
          "Voltafy ist das Flaggschiff der Holding — die Plattform, auf die die drei anderen Energieprodukte zurückgreifen. Es ist das, was ich selbst wollte: als Installateur mit Hunderten Anlagen oder als Haushalt, der sich mit anbieterfreundlichen Zahlen nicht abfinden will. Die Oberfläche ist bewusst betreiberzentriert — tastaturgeführt, wo es zählt, um drei Uhr nachts lesbar, und so gebaut, dass die unbequeme Wahrheit über eine Anlage zuerst ins Auge fällt.",
        phases: [
          { body: "Mit Installateuren mitgefahren, bei Kundengesprächen zugehört, jede Datenquelle erfasst, die das niederländische Netz offenlegt — und jede, die es verweigert." },
          { body: "Erst Schema und Betreiberabläufe entworfen, dann die erste Zeile Produkt-UI. Jeder Bildschirm gehört zu einer Entscheidung, die jemand treffen muss." },
          { body: "Plattformschicht, Live-Monitoring-Rückgrat und Installateurs-Arbeitsplatz ausgeliefert. Schnell, ehrlich, gleichgültig gegenüber der Herstellerwahl." },
          { body: "Gegen schlechte Verbindungen, Teilausfälle und die unordentliche Realität gemischter Anlagenparks geprüft. Nichts geht live, bevor es die Sonderfälle übersteht." },
          { body: "Wöchentlich justieren. Kleine Verbesserungen direkt aus den Rückmeldungen der Installateure — dieses Produkt wird schärfer, je länger es läuft." },
        ],
        metrics: [
          { label: "Status", value: "Live" },
          { label: "Sektor", value: "Energie" },
          { label: "Start", value: "2024" },
          { label: "Markt", value: "NL" },
        ],
        relatedSectors: ["Energie", "Installateure", "Netz"],
      },
      es: {
        tagline: "La capa de plataforma.",
        seoTitle: "Voltafy — plataforma de datos de energía",
        seoDescription:
          "Voltafy es la capa de plataforma del grupo: monitorización en vivo, análisis de rendimiento y una interfaz de operador para hogares e instaladores.",
        sector: "Energía",
        summary:
          "Inteligencia energética para hogares e instaladores neerlandeses. Monitorización en vivo, análisis de rendimiento y una interfaz de operador precisa para quienes mantienen honestos los sistemas solares y de baterías.",
        story:
          "Voltafy es el buque insignia del grupo: la plataforma a la que se conectan los otros tres productos de energía. Es lo que yo querría siendo instalador con cientos de sistemas, o siendo un hogar que se niega a aceptar cifras que favorecen al proveedor. La interfaz es deliberadamente de operador: gobernada por teclado donde importa, legible a las tres de la madrugada, y construida para que la verdad incómoda sobre una instalación sea lo primero que ves.",
        phases: [
          { body: "Acompañamos a instaladores, escuchamos llamadas de propietarios y mapeamos cada fuente de datos que la red neerlandesa expone, y cada una que se niega a exponer." },
          { body: "Primero el esquema y los flujos de operador, después la primera línea de interfaz. Cada pantalla corresponde a una decisión que alguien tiene que tomar." },
          { body: "Entregamos la capa de plataforma, la columna de monitorización en vivo y el espacio de trabajo del instalador. Rápido, honesto, indiferente a la marca que uses." },
          { body: "Probado contra malas conexiones, cortes parciales y la realidad desordenada de parques con equipos de varias marcas. Nada sale a producción sin superar los casos límite." },
          { body: "Ajuste semanal. Mejoras pequeñas salidas directamente de lo que reportan los instaladores: este producto se afila cuanto más tiempo lleva funcionando." },
        ],
        metrics: [
          { label: "Estado", value: "Activo" },
          { label: "Sector", value: "Energía" },
          { label: "Lanzamiento", value: "2024" },
          { label: "Mercado", value: "NL" },
        ],
        relatedSectors: ["Energía", "Instaladores", "Red"],
      },
    },
    gradient: "radial-gradient(600px 400px at 20% 20%, rgba(94,255,177,.22), transparent 60%)",
  },
  {
    slug: "performance-tracker",
    name: "Performance Tracker",
    tagline: "See what your system is really doing.",
    seoTitle: "Performance Tracker — honest solar yield",
    seoDescription:
      "Real-time yield, loss analysis and alerts for solar owners and installers. Honest numbers, no vendor spin, with the fix attached.",
    sector: "Energy / Dashboard",
    sectorSlug: "energy",
    status: "live",
    domain: "performancetracker.nl",
    external: "https://performancetracker.nl",
    summary:
      "Real-time yield, loss analysis, and alerts for solar owners and installers. Honest numbers, no vendor spin. If your system is underperforming, this tells you — in plain Dutch, with the fix attached.",
    story:
      "Most performance dashboards are built by the same companies selling you the hardware. Performance Tracker is the adversarial counterpart: it exists to tell you what your system is actually doing, in language a homeowner can read and a quote a technician can quote. That framing changed everything about how the product looks and feels.",
    phases: [
      { title: "Survey", body: "Surveyed a few dozen owners who had bought solar in the previous five years and asked them one question: do you trust the number you see? The answer was almost always no." },
      { title: "Blueprint", body: "Designed around two primary users: the homeowner who wants one number, and the installer who wants twenty. Same data, two views, no compromise." },
      { title: "Build", body: "A customer-journey pipeline synced hourly with the CRM that runs much of the Dutch solar trade — with gap detectors, retry queues and a dead-letter table so no lead or status change silently disappears." },
      { title: "Commission", body: "Stress-tested against the API's undocumented limits and permission quirks — a sync layer that fails loudly beats one that fails politely." },
      { title: "Operate", body: "Daily integrity checks and a growing playbook of edge cases. The honest number wins compound trust over time." },
    ],
    stack: ["Next.js", "Postgres", "TimescaleDB", "TypeScript", "Recharts"],
    metrics: [
      { label: "Status", value: "Live" },
      { label: "Sector", value: "Energy" },
      { label: "Users", value: "Owners + installers" },
      { label: "Market", value: "NL" },
    ],
    relatedSectors: ["Energy", "Homeowners", "Installers"],
    i18n: {
      nl: {
        tagline: "Zie wat je systeem werkelijk doet.",
        seoTitle: "Performance Tracker — eerlijke opbrengst",
        seoDescription:
          "Live opbrengst, verliesanalyse en meldingen voor zonne-eigenaren en installateurs. Eerlijke cijfers, geen leveranciersdraai, met de oplossing erbij.",
        sector: "Energie / Dashboard",
        summary:
          "Live opbrengst, verliesanalyse en meldingen voor zonne-eigenaren en installateurs. Eerlijke cijfers, geen leveranciersdraai. Presteert je systeem onder de maat, dan zegt dit het — in gewoon Nederlands, met de oplossing erbij.",
        story:
          "De meeste prestatiedashboards komen van dezelfde bedrijven die je de hardware verkopen. Performance Tracker is de tegenhanger: het bestaat om te vertellen wat je systeem werkelijk doet, in taal die een huiseigenaar kan lezen en een monteur kan citeren. Die insteek veranderde alles aan hoe het product eruitziet en aanvoelt.",
        phases: [
          { body: "Enkele tientallen eigenaren bevraagd die in de vijf jaar ervoor zonnepanelen kochten, met één vraag: vertrouw je het getal dat je ziet? Het antwoord was bijna altijd nee." },
          { body: "Ontworpen rond twee gebruikers: de huiseigenaar die één getal wil en de installateur die er twintig wil. Dezelfde data, twee weergaven, geen compromis." },
          { body: "Een klantreis-pijplijn die elk uur synchroniseert met het CRM waar een groot deel van de Nederlandse zonnebranche op draait — met gatdetectie, herhaalwachtrijen en een dead-lettertabel, zodat geen lead of statuswijziging stil verdwijnt." },
          { body: "Getest tegen de ongedocumenteerde limieten en rechtenkuren van de API. Een synchronisatielaag die luid faalt is beter dan een die beleefd faalt." },
          { body: "Dagelijkse integriteitscontroles en een groeiend draaiboek van randgevallen. Het eerlijke getal bouwt vertrouwen op dat zich opstapelt." },
        ],
        metrics: [
          { label: "Status", value: "Live" },
          { label: "Sector", value: "Energie" },
          { label: "Gebruikers", value: "Eigenaren + installateurs" },
          { label: "Markt", value: "NL" },
        ],
        relatedSectors: ["Energie", "Huiseigenaren", "Installateurs"],
      },
      de: {
        tagline: "Sehen Sie, was Ihre Anlage wirklich tut.",
        seoTitle: "Performance Tracker — ehrlicher Ertrag",
        seoDescription:
          "Laufender Ertrag, Verlustanalyse und Warnungen für Anlagenbesitzer und Installateure. Ehrliche Zahlen ohne Herstellerlack, mit der Lösung dabei.",
        sector: "Energie / Dashboard",
        summary:
          "Laufender Ertrag, Verlustanalyse und Warnungen für Anlagenbesitzer und Installateure. Ehrliche Zahlen ohne Herstellerlack. Wenn Ihre Anlage unterdurchschnittlich läuft, sagt dieses Werkzeug es — in klarer Sprache, mit der Lösung dabei.",
        story:
          "Die meisten Leistungsdashboards stammen von denselben Firmen, die Ihnen die Hardware verkaufen. Performance Tracker ist das Gegenstück: Es existiert, um zu sagen, was Ihre Anlage tatsächlich tut, in einer Sprache, die ein Eigentümer lesen und ein Techniker zitieren kann. Dieser Rahmen hat alles daran verändert, wie das Produkt aussieht und sich anfühlt.",
        phases: [
          { body: "Einige Dutzend Eigentümer befragt, die in den fünf Jahren zuvor Solar gekauft hatten, mit einer Frage: Vertrauen Sie der Zahl, die Sie sehen? Die Antwort war fast immer nein." },
          { body: "Um zwei Nutzer herum entworfen: den Eigentümer, der eine Zahl will, und den Installateur, der zwanzig will. Dieselben Daten, zwei Ansichten, kein Kompromiss." },
          { body: "Eine Kundenreise-Pipeline, die stündlich mit dem CRM abgleicht, auf dem ein großer Teil des niederländischen Solarhandels läuft — mit Lückenerkennung, Wiederholungswarteschlangen und einer Dead-Letter-Tabelle, damit kein Lead und keine Statusänderung still verschwindet." },
          { body: "Gegen die undokumentierten Grenzen und Rechte-Eigenheiten der API geprüft. Eine Synchronisationsschicht, die laut scheitert, schlägt eine, die höflich scheitert." },
          { body: "Tägliche Integritätsprüfungen und ein wachsendes Handbuch von Sonderfällen. Die ehrliche Zahl baut Vertrauen auf, das sich verzinst." },
        ],
        metrics: [
          { label: "Status", value: "Live" },
          { label: "Sektor", value: "Energie" },
          { label: "Nutzer", value: "Eigentümer + Installateure" },
          { label: "Markt", value: "NL" },
        ],
        relatedSectors: ["Energie", "Eigentümer", "Installateure"],
      },
      es: {
        tagline: "Ve lo que tu instalación hace de verdad.",
        seoTitle: "Performance Tracker — rendimiento real",
        seoDescription:
          "Rendimiento en vivo, análisis de pérdidas y avisos para propietarios e instaladores. Cifras honestas, sin maquillaje del fabricante, con la solución.",
        sector: "Energía / Panel",
        summary:
          "Rendimiento en vivo, análisis de pérdidas y avisos para propietarios de solar e instaladores. Cifras honestas, sin maquillaje del fabricante. Si tu instalación rinde por debajo, esto te lo dice en lenguaje llano y con la solución al lado.",
        story:
          "La mayoría de los paneles de rendimiento los construyen las mismas empresas que te venden el equipo. Performance Tracker es la contraparte: existe para decir lo que tu instalación hace realmente, en un lenguaje que un propietario puede leer y un técnico puede citar. Ese enfoque cambió todo en el aspecto y el tacto del producto.",
        phases: [
          { body: "Encuestamos a varias decenas de propietarios que habían comprado solar en los cinco años anteriores, con una sola pregunta: ¿te fías del número que ves? La respuesta era casi siempre no." },
          { body: "Diseñado alrededor de dos usuarios: el propietario que quiere un número y el instalador que quiere veinte. Los mismos datos, dos vistas, sin concesiones." },
          { body: "Una tubería de recorrido de cliente que sincroniza cada hora con el CRM sobre el que funciona buena parte del sector solar neerlandés, con detección de huecos, colas de reintento y una tabla de mensajes muertos para que ningún registro desaparezca en silencio." },
          { body: "Probado contra los límites no documentados y las rarezas de permisos de la API. Una capa de sincronización que falla en voz alta gana a una que falla con educación." },
          { body: "Comprobaciones de integridad diarias y un manual creciente de casos límite. La cifra honesta acumula confianza con el tiempo." },
        ],
        metrics: [
          { label: "Estado", value: "Activo" },
          { label: "Sector", value: "Energía" },
          { label: "Usuarios", value: "Propietarios + instaladores" },
          { label: "Mercado", value: "NL" },
        ],
        relatedSectors: ["Energía", "Propietarios", "Instaladores"],
      },
    },
    gradient: "radial-gradient(600px 400px at 80% 20%, rgba(125,211,252,.18), transparent 60%)",
  },
  {
    slug: "help-mij-besparen",
    name: "Help Mij Besparen",
    tagline: "Lower your energy bill, in plain Dutch.",
    seoTitle: "Help Mij Besparen — lower your energy bill",
    seoDescription:
      "A calm, honest tool that shows Dutch households where their money leaks and which moves actually fix it. No affiliate noise, no fear-mongering.",
    sector: "Energy / Consumer",
    sectorSlug: "energy",
    status: "live",
    domain: "helpmijbesparen.nl",
    external: "https://helpmijbesparen.nl",
    summary:
      "A calm, honest tool that tells Dutch households exactly where their money is leaking — and the moves that actually fix it. No affiliate noise, no fear-mongering, no dashboards that require a degree.",
    story:
      "Dutch energy bills in 2025 looked like a ransom note. Everywhere you turned, a confused household was being pitched a new contract, a new loan, a new insulation package. Help Mij Besparen is the antidote: a simple, opinionated tool that looks at your actual situation and says what would actually save money. Sometimes that's a heat pump. Often it's not. The point is honesty, delivered at the reading level of a tired person at their kitchen table.",
    phases: [
      { title: "Survey", body: "Collected a few hundred energy bills, invoices, and quotes that households had been sent. The gap between what was promised and what was reasonable was the whole product opportunity." },
      { title: "Blueprint", body: "Designed the flow around the tiredness of the user. No jargon, no chrome, no upsells." },
      { title: "Build", body: "A progressive intake that adapts to what the household actually has, paired with a calculator that doesn't cheat in favor of any vendor." },
      { title: "Commission", body: "Tested with mixed-income households across the country. If it couldn't work for a grandmother in Zwolle, it wasn't done." },
      { title: "Operate", body: "Updated as tariffs and rules change. Every time the rules move, this product gets a new weekend of attention." },
    ],
    stack: ["Next.js", "TypeScript", "Supabase", "Forms-by-hand"],
    metrics: [
      { label: "Status", value: "Live" },
      { label: "Sector", value: "Consumer" },
      { label: "Audience", value: "Dutch households" },
      { label: "Language", value: "Dutch" },
    ],
    relatedSectors: ["Energy", "Consumer", "Policy"],
    i18n: {
      nl: {
        tagline: "Een lagere energierekening, in gewoon Nederlands.",
        seoTitle: "Help Mij Besparen — lagere energierekening",
        seoDescription:
          "Een rustige, eerlijke tool die Nederlandse huishoudens laat zien waar hun geld weglekt en welke stappen dat echt oplossen. Geen affiliateruis, geen bangmakerij.",
        sector: "Energie / Consument",
        summary:
          "Een rustige, eerlijke tool die Nederlandse huishoudens precies laat zien waar hun geld weglekt — en welke stappen dat echt oplossen. Geen affiliateruis, geen bangmakerij, geen dashboards waar je een opleiding voor nodig hebt.",
        story:
          "Nederlandse energierekeningen zagen er in 2025 uit als een losgeldbrief. Overal werd een radeloos huishouden een nieuw contract, een nieuwe lening of een nieuw isolatiepakket aangepraat. Help Mij Besparen is het tegengif: een simpele tool met een mening, die naar je werkelijke situatie kijkt en zegt wat echt geld zou schelen. Soms is dat een warmtepomp. Vaak niet. Het gaat om eerlijkheid, op het leesniveau van een moe iemand aan de keukentafel.",
        phases: [
          { body: "Een paar honderd energierekeningen, facturen en offertes verzameld die huishoudens toegestuurd hadden gekregen. Het gat tussen wat beloofd werd en wat redelijk was, was de hele productkans." },
          { body: "De flow ontworpen rond de vermoeidheid van de gebruiker. Geen jargon, geen tierelantijnen, geen upsells." },
          { body: "Een oplopende intake die zich aanpast aan wat het huishouden werkelijk heeft, gekoppeld aan een rekentool die niet in het voordeel van een leverancier vals speelt." },
          { body: "Getest bij huishoudens met uiteenlopende inkomens door het hele land. Werkte het niet voor een oma in Zwolle, dan was het niet af." },
          { body: "Bijgewerkt zodra tarieven en regels veranderen. Elke keer dat de regels schuiven krijgt dit product een weekend aandacht." },
        ],
        metrics: [
          { label: "Status", value: "Live" },
          { label: "Sector", value: "Consument" },
          { label: "Publiek", value: "Nederlandse huishoudens" },
          { label: "Taal", value: "Nederlands" },
        ],
        relatedSectors: ["Energie", "Consument", "Beleid"],
      },
      de: {
        tagline: "Eine niedrigere Stromrechnung, in klarer Sprache.",
        seoTitle: "Help Mij Besparen — niedrigere Stromkosten",
        seoDescription:
          "Ein ruhiges, ehrliches Werkzeug, das niederländischen Haushalten zeigt, wo ihr Geld versickert und welche Schritte das wirklich beheben.",
        sector: "Energie / Verbraucher",
        summary:
          "Ein ruhiges, ehrliches Werkzeug, das niederländischen Haushalten genau zeigt, wo ihr Geld versickert — und welche Schritte das wirklich beheben. Kein Affiliate-Rauschen, keine Panikmache, keine Dashboards, für die man ein Studium braucht.",
        story:
          "Niederländische Stromrechnungen sahen 2025 aus wie ein Erpresserbrief. Überall bekam ein ratloser Haushalt einen neuen Vertrag, einen neuen Kredit oder ein neues Dämmpaket angeboten. Help Mij Besparen ist das Gegenmittel: ein einfaches Werkzeug mit Haltung, das die tatsächliche Lage ansieht und sagt, was wirklich Geld spart. Manchmal ist das eine Wärmepumpe. Oft nicht. Es geht um Ehrlichkeit, auf dem Leseniveau einer müden Person am Küchentisch.",
        phases: [
          { body: "Ein paar hundert Stromrechnungen, Rechnungen und Angebote gesammelt, die Haushalten zugeschickt worden waren. Die Lücke zwischen dem Versprochenen und dem Vernünftigen war die ganze Produktchance." },
          { body: "Den Ablauf um die Müdigkeit der Nutzenden herum entworfen. Kein Fachjargon, kein Zierrat, keine Zusatzverkäufe." },
          { body: "Eine schrittweise Aufnahme, die sich anpasst an das, was der Haushalt tatsächlich hat, gekoppelt an einen Rechner, der nicht zugunsten eines Anbieters schummelt." },
          { body: "Mit Haushalten unterschiedlicher Einkommen im ganzen Land getestet. Funktionierte es nicht für eine Großmutter in Zwolle, war es nicht fertig." },
          { body: "Aktualisiert, sobald Tarife und Regeln sich ändern. Jedes Mal, wenn die Regeln sich verschieben, bekommt dieses Produkt ein Wochenende Aufmerksamkeit." },
        ],
        metrics: [
          { label: "Status", value: "Live" },
          { label: "Sektor", value: "Verbraucher" },
          { label: "Zielgruppe", value: "Niederländische Haushalte" },
          { label: "Sprache", value: "Niederländisch" },
        ],
        relatedSectors: ["Energie", "Verbraucher", "Politik"],
      },
      es: {
        tagline: "Una factura de luz más baja, en lenguaje llano.",
        seoTitle: "Help Mij Besparen — menos factura de luz",
        seoDescription:
          "Una herramienta serena y honesta que muestra a los hogares neerlandeses por dónde se les va el dinero y qué medidas lo arreglan de verdad.",
        sector: "Energía / Consumo",
        summary:
          "Una herramienta serena y honesta que muestra a los hogares neerlandeses exactamente por dónde se les va el dinero, y qué medidas lo arreglan de verdad. Sin ruido de afiliación, sin alarmismo, sin paneles que exijan una carrera.",
        story:
          "Las facturas de luz neerlandesas en 2025 parecían una nota de rescate. En cada esquina, a un hogar desorientado le ofrecían un contrato nuevo, un préstamo nuevo, un paquete de aislamiento nuevo. Help Mij Besparen es el antídoto: una herramienta sencilla y con criterio que mira tu situación real y dice qué ahorraría dinero de verdad. A veces es una bomba de calor. A menudo no. Lo que importa es la honestidad, al nivel de lectura de alguien cansado en la mesa de su cocina.",
        phases: [
          { body: "Reunimos unos cientos de facturas y presupuestos que los hogares habían recibido. La distancia entre lo prometido y lo razonable era toda la oportunidad de producto." },
          { body: "Diseñamos el recorrido alrededor del cansancio del usuario. Sin jerga, sin adornos, sin ventas añadidas." },
          { body: "Una entrada progresiva que se adapta a lo que el hogar realmente tiene, junto a una calculadora que no hace trampas a favor de ningún proveedor." },
          { body: "Probado con hogares de rentas variadas por todo el país. Si no funcionaba para una abuela en Zwolle, no estaba terminado." },
          { body: "Actualizado cuando cambian las tarifas y las normas. Cada vez que las reglas se mueven, este producto recibe un fin de semana de atención." },
        ],
        metrics: [
          { label: "Estado", value: "Activo" },
          { label: "Sector", value: "Consumo" },
          { label: "Público", value: "Hogares neerlandeses" },
          { label: "Idioma", value: "Neerlandés" },
        ],
        relatedSectors: ["Energía", "Consumo", "Normativa"],
      },
    },
    gradient: "radial-gradient(600px 400px at 50% 10%, rgba(255,181,71,.15), transparent 60%)",
  },
  {
    slug: "salderingsregeling-2027",
    name: "Salderingsregeling 2027",
    tagline: "The phase-out, explained.",
    seoTitle: "Salderingsregeling 2027 — the phase-out",
    seoDescription:
      "The public field guide to the Dutch net-metering change: what it means, when it hits, and what solar owners should actually do about it.",
    sector: "Energy / Policy",
    sectorSlug: "energy",
    status: "live",
    domain: "salderingsregeling2027.nl",
    external: "https://salderingsregeling2027.nl",
    summary:
      "The public field guide to the Dutch net-metering change. What it means, when it hits, and what solar owners should actually do about it. Free, apolitical, updated when the rules shift.",
    story:
      "On January 1, 2027, the Dutch net-metering rule (salderingsregeling) that made rooftop solar a no-brainer for a decade ends. Millions of households will wake up on a different economic grid, and most of them have no idea. This product is the field guide — built to be the first thing you find when you search for answers, and the last thing you need to read before you act.",
    phases: [
      { title: "Survey", body: "Read every government communication, every energy-supplier notice, and every forum thread. Nobody was explaining this in a way a household could read in five minutes." },
      { title: "Blueprint", body: "Scoped a simple explainer with a calculator slotted in — enough to turn fear into a decision." },
      { title: "Build", body: "Shipped fast: clear language, one calculator, three branching outcomes, zero ads." },
      { title: "Commission", body: "Had actual homeowners read it before we launched. If they came away with one clear next action, it passed." },
      { title: "Operate", body: "Updates every time the rules change. This page stays authoritative or it doesn't deserve the URL." },
    ],
    stack: ["Next.js", "MDX", "TypeScript"],
    metrics: [
      { label: "Status", value: "Live" },
      { label: "Sector", value: "Policy / Energy" },
      { label: "Audience", value: "Solar owners" },
      { label: "Updates", value: "Rolling" },
    ],
    relatedSectors: ["Energy", "Policy", "Consumer"],
    i18n: {
      nl: {
        tagline: "De afbouw, uitgelegd.",
        seoTitle: "Salderingsregeling 2027 — de afbouw",
        seoDescription:
          "De publieke veldgids voor het einde van de salderingsregeling: wat het betekent, wanneer het ingaat en wat zonne-eigenaren er nu aan moeten doen.",
        sector: "Energie / Beleid",
        summary:
          "De publieke veldgids voor het einde van de Nederlandse salderingsregeling. Wat het betekent, wanneer het ingaat en wat zonne-eigenaren er werkelijk aan moeten doen. Gratis, apolitiek, bijgewerkt zodra de regels schuiven.",
        story:
          "Op 1 januari 2027 eindigt de salderingsregeling die zonnepanelen op het dak een decennium lang een vanzelfsprekendheid maakte. Miljoenen huishoudens worden wakker op een ander economisch net, en de meeste hebben geen idee. Dit product is de veldgids — gebouwd om het eerste te zijn wat je vindt als je zoekt, en het laatste wat je hoeft te lezen voordat je handelt.",
        phases: [
          { body: "Elke overheidscommunicatie, elke brief van een energieleverancier en elke forumdraad gelezen. Niemand legde dit uit op een manier die een huishouden in vijf minuten doorheeft." },
          { body: "Een simpele uitleg afgebakend met een rekentool erin — genoeg om angst om te zetten in een beslissing." },
          { body: "Snel opgeleverd: heldere taal, één rekentool, drie uitkomsten, nul advertenties." },
          { body: "Echte huiseigenaren lieten meelezen vóór de lancering. Kwamen ze eruit met één duidelijke vervolgstap, dan was het goed." },
          { body: "Bijgewerkt zodra de regels veranderen. Deze pagina blijft gezaghebbend of hij verdient de URL niet." },
        ],
        metrics: [
          { label: "Status", value: "Live" },
          { label: "Sector", value: "Beleid / Energie" },
          { label: "Publiek", value: "Zonne-eigenaren" },
          { label: "Updates", value: "Doorlopend" },
        ],
        relatedSectors: ["Energie", "Beleid", "Consument"],
      },
      de: {
        tagline: "Das Auslaufen, erklärt.",
        seoTitle: "Salderingsregeling 2027 — das Ende",
        seoDescription:
          "Der öffentliche Leitfaden zum Ende der niederländischen Saldierungsregelung: was sie bedeutet, wann sie greift und was Anlagenbesitzer jetzt tun sollten.",
        sector: "Energie / Politik",
        summary:
          "Der öffentliche Leitfaden zum Ende der niederländischen Saldierungsregelung. Was sie bedeutet, wann sie greift und was Solarbesitzer wirklich tun sollten. Kostenlos, unpolitisch, aktualisiert, sobald sich die Regeln verschieben.",
        story:
          "Am 1. Januar 2027 endet die niederländische Saldierungsregelung, die Solar auf dem Dach ein Jahrzehnt lang zur Selbstverständlichkeit machte. Millionen Haushalte wachen in einem anderen wirtschaftlichen Netz auf, und die meisten ahnen nichts davon. Dieses Produkt ist der Leitfaden — gebaut, um das Erste zu sein, was man bei der Suche findet, und das Letzte, was man vor dem Handeln lesen muss.",
        phases: [
          { body: "Jede Behördenmitteilung, jedes Anschreiben eines Energieversorgers und jeden Forenbeitrag gelesen. Niemand erklärte das so, dass ein Haushalt es in fünf Minuten erfassen konnte." },
          { body: "Eine einfache Erklärung abgesteckt, mit eingebautem Rechner — genug, um Angst in eine Entscheidung zu verwandeln." },
          { body: "Schnell ausgeliefert: klare Sprache, ein Rechner, drei Ergebniswege, null Werbung." },
          { body: "Echte Eigentümer haben vor dem Start gegengelesen. Gingen sie mit einem klaren nächsten Schritt heraus, war es bestanden." },
          { body: "Aktualisiert, sobald sich die Regeln ändern. Diese Seite bleibt maßgeblich, oder sie verdient die URL nicht." },
        ],
        metrics: [
          { label: "Status", value: "Live" },
          { label: "Sektor", value: "Politik / Energie" },
          { label: "Zielgruppe", value: "Anlagenbesitzer" },
          { label: "Updates", value: "Laufend" },
        ],
        relatedSectors: ["Energie", "Politik", "Verbraucher"],
      },
      es: {
        tagline: "El fin de la regulación, explicado.",
        seoTitle: "Salderingsregeling 2027 — el fin",
        seoDescription:
          "La guía pública del fin del balance neto neerlandés: qué significa, cuándo entra en vigor y qué deberían hacer al respecto los propietarios de solar.",
        sector: "Energía / Normativa",
        summary:
          "La guía pública del cambio en el balance neto neerlandés. Qué significa, cuándo entra en vigor y qué deberían hacer realmente los propietarios de solar. Gratuita, apolítica, actualizada cuando cambian las normas.",
        story:
          "El 1 de enero de 2027 termina la regla neerlandesa de balance neto que durante una década convirtió el solar en tejado en una decisión obvia. Millones de hogares despertarán en una red económica distinta, y la mayoría no lo sabe. Este producto es la guía de campo: construida para ser lo primero que encuentras al buscar respuestas, y lo último que necesitas leer antes de actuar.",
        phases: [
          { body: "Leímos cada comunicación oficial, cada aviso de comercializadora y cada hilo de foro. Nadie lo explicaba de forma que un hogar lo entendiera en cinco minutos." },
          { body: "Acotamos una explicación sencilla con una calculadora encajada dentro, lo justo para convertir el miedo en una decisión." },
          { body: "Entregado rápido: lenguaje claro, una calculadora, tres desenlaces posibles, cero anuncios." },
          { body: "Propietarios reales lo leyeron antes del lanzamiento. Si salían con un siguiente paso claro, estaba aprobado." },
          { body: "Se actualiza cada vez que cambian las normas. Esta página sigue siendo la referencia o no merece la URL." },
        ],
        metrics: [
          { label: "Estado", value: "Activo" },
          { label: "Sector", value: "Normativa / Energía" },
          { label: "Público", value: "Propietarios de solar" },
          { label: "Updates", value: "Continuas" },
        ],
        relatedSectors: ["Energía", "Normativa", "Consumo"],
      },
    },
    gradient: "radial-gradient(600px 400px at 50% 80%, rgba(94,255,177,.16), transparent 60%)",
  },
  {
    slug: "philly",
    name: "Philly",
    tagline: "The US ops dashboard.",
    seoTitle: "Philly — US field ops dashboard",
    seoDescription:
      "Field-first interface for US ground teams: dispatch, routing and live status, built to stay alive on bad networks and long distances.",
    sector: "Logistics / Field",
    sectorSlug: "adjacent",
    status: "shipping",
    domain: null,
    external: null,
    summary:
      "The stateside sibling. Field-first interface for ground teams — dispatch, routing, live status, built to stay alive on bad networks. The first product under Juan Diaz, LLC's US arm.",
    story:
      "Philly is the first product I'm shipping with the US as the primary market. Everything I learned building operator tooling in the Dutch energy vertical transfers — the same five phases, the same refusal to lie to the person doing the actual work. What changes is the physicality: American field operations live on long distances, bad coverage, and trucks that have been running since before the software was written. That's the constraint that shapes everything.",
    phases: [
      { title: "Survey", body: "Shadowing dispatchers and ride-alongs with ground teams. Watching what people do when the software breaks — which it always does." },
      { title: "Blueprint", body: "Designed around offline-first state, tap-friendly flows, and the idea that the truck is always more authoritative than the server." },
      { title: "Build", body: "In progress. Shipping the dispatch surface first, the field client second, the operator hub third." },
      { title: "Commission", body: "Pending — will ship to a pilot team before opening up." },
      { title: "Operate", body: "Post-pilot — weekly operating rhythm with the ground teams themselves." },
    ],
    stack: ["Next.js", "Supabase", "TypeScript", "PWA"],
    metrics: [
      { label: "Status", value: "Shipping" },
      { label: "Sector", value: "Field ops" },
      { label: "Market", value: "US" },
      { label: "Pilot", value: "2026" },
    ],
    relatedSectors: ["Logistics", "Field services", "Dispatch"],
    i18n: {
      nl: {
        tagline: "Het Amerikaanse operationele dashboard.",
        seoTitle: "Philly — buitendienstdashboard VS",
        seoDescription:
          "Interface voor teams op locatie in de VS: planning, routering en live status, gebouwd om overeind te blijven op slechte verbindingen en lange afstanden.",
        sector: "Logistiek / Buitendienst",
        summary:
          "De Amerikaanse tegenhanger. Interface voor teams op locatie — planning, routering, live status, gebouwd om overeind te blijven op slechte verbindingen. Het eerste product onder de Amerikaanse tak van Juan Diaz, LLC.",
        story:
          "Philly is het eerste product dat ik lever met de Verenigde Staten als primaire markt. Alles wat ik leerde bij het bouwen van operatortooling in de Nederlandse energiesector gaat mee — dezelfde vijf fases, dezelfde weigering om te liegen tegen wie het werk doet. Wat verandert is de fysieke werkelijkheid: Amerikaanse buitendienst draait op grote afstanden, slecht bereik en vrachtwagens die al reden voordat de software bestond. Die randvoorwaarde bepaalt alles.",
        phases: [
          { body: "Meegelopen met planners en meegereden met teams op locatie. Gekeken naar wat mensen doen als de software het begeeft — wat altijd gebeurt." },
          { body: "Ontworpen rond offline-eerst, tikvriendelijke flows en het idee dat de vrachtwagen altijd meer gezag heeft dan de server." },
          { body: "In uitvoering. Eerst het planningsscherm, dan de veldclient, dan de operatorhub." },
          { body: "In afwachting — gaat naar een pilotteam voordat het opengaat." },
          { body: "Na de pilot: wekelijks operationeel ritme met de teams op locatie zelf." },
        ],
        metrics: [
          { label: "Status", value: "In uitrol" },
          { label: "Sector", value: "Buitendienst" },
          { label: "Markt", value: "VS" },
          { label: "Pilot", value: "2026" },
        ],
        relatedSectors: ["Logistiek", "Buitendienst", "Planning"],
      },
      de: {
        tagline: "Das US-Betriebsdashboard.",
        seoTitle: "Philly — Außendienst-Dashboard USA",
        seoDescription:
          "Oberfläche für US-Teams vor Ort: Disposition, Routing und Live-Status, gebaut, um bei schlechtem Empfang und langen Wegen zu bestehen.",
        sector: "Logistik / Außendienst",
        summary:
          "Das US-Gegenstück. Oberfläche für Teams vor Ort — Disposition, Routing, Live-Status, gebaut, um bei schlechten Netzen am Leben zu bleiben. Das erste Produkt des US-Arms von Juan Diaz, LLC.",
        story:
          "Philly ist das erste Produkt, das ich mit den USA als Hauptmarkt ausliefere. Alles, was ich beim Bau von Betreiberwerkzeugen im niederländischen Energiesektor gelernt habe, überträgt sich — dieselben fünf Phasen, dieselbe Weigerung, die Person zu belügen, die die eigentliche Arbeit macht. Was sich ändert, ist das Körperliche: Amerikanischer Außendienst lebt von großen Entfernungen, schlechtem Empfang und Lastwagen, die schon fuhren, bevor die Software geschrieben wurde. Diese Randbedingung prägt alles.",
        phases: [
          { body: "Disponenten begleitet und mit Teams vor Ort mitgefahren. Beobachtet, was Menschen tun, wenn die Software ausfällt — was sie immer tut." },
          { body: "Um Offline-First, tippfreundliche Abläufe und den Gedanken herum entworfen, dass der Lastwagen immer mehr Autorität hat als der Server." },
          { body: "In Arbeit. Zuerst die Dispositionsoberfläche, dann der Feld-Client, dann der Betreiber-Hub." },
          { body: "Ausstehend — geht an ein Pilotteam, bevor geöffnet wird." },
          { body: "Nach dem Piloten: wöchentlicher Betriebsrhythmus mit den Teams vor Ort selbst." },
        ],
        metrics: [
          { label: "Status", value: "Im Rollout" },
          { label: "Sektor", value: "Außendienst" },
          { label: "Markt", value: "USA" },
          { label: "Pilot", value: "2026" },
        ],
        relatedSectors: ["Logistik", "Außendienst", "Disposition"],
      },
      es: {
        tagline: "El panel de operaciones en EE. UU.",
        seoTitle: "Philly — panel de operaciones EE. UU.",
        seoDescription:
          "Interfaz para equipos de campo en EE. UU.: despacho, rutas y estado en vivo, construida para aguantar malas coberturas y distancias largas.",
        sector: "Logística / Campo",
        summary:
          "La contraparte estadounidense. Interfaz pensada para el campo — despacho, rutas, estado en vivo, construida para seguir viva con malas coberturas. El primer producto del brazo estadounidense de Juan Diaz, LLC.",
        story:
          "Philly es el primer producto que entrego con Estados Unidos como mercado principal. Todo lo que aprendí construyendo herramientas de operador en el sector energético neerlandés se traslada: las mismas cinco fases, la misma negativa a mentirle a quien hace el trabajo real. Lo que cambia es lo físico: las operaciones de campo estadounidenses viven de distancias largas, mala cobertura y camiones que ya rodaban antes de que se escribiera el software. Esa restricción lo moldea todo.",
        phases: [
          { body: "Acompañamos a los despachadores y salimos con los equipos de campo. Observamos qué hace la gente cuando el software se rompe, que siempre se rompe." },
          { body: "Diseñado alrededor del estado sin conexión, recorridos cómodos con el pulgar y la idea de que el camión siempre manda más que el servidor." },
          { body: "En curso. Primero la superficie de despacho, después el cliente de campo, después el centro del operador." },
          { body: "Pendiente: irá a un equipo piloto antes de abrirse." },
          { body: "Tras el piloto: ritmo operativo semanal con los propios equipos de campo." },
        ],
        metrics: [
          { label: "Estado", value: "En despliegue" },
          { label: "Sector", value: "Operaciones de campo" },
          { label: "Mercado", value: "EE. UU." },
          { label: "Piloto", value: "2026" },
        ],
        relatedSectors: ["Logística", "Servicios de campo", "Despacho"],
      },
    },
    gradient: "radial-gradient(600px 400px at 70% 70%, rgba(125,211,252,.22), transparent 60%)",
  },
];

/** Applies a locale's overrides. Returns the base untouched when the locale
 *  has no entry, so callers never have to null-check. */
export function localizeVenture(base: Venture, locale: Locale): Venture {
  const o = base.i18n?.[locale];
  if (!o) return base;

  const { phases, ...copy } = o;
  const merged: Venture = { ...base, ...defined(copy) };
  if (phases) merged.phases = mergeByIndex(base.phases, phases);
  return merged;
}

export function getVenture(slug: string, locale?: Locale) {
  const base = VENTURES.find((v) => v.slug === slug);
  if (!base || !locale) return base;
  return localizeVenture(base, locale);
}

/** Every venture in the requested locale — for the /work listing. Without a
 *  locale the base array comes back unchanged (sitemap only needs slugs). */
export function getVentures(locale?: Locale): Venture[] {
  return locale ? VENTURES.map((v) => localizeVenture(v, locale)) : VENTURES;
}

// Maps an insight tag ("Energy", "Systems", etc.) to the venture that
// most clearly demonstrates the idea in production. Used on insight
// pages to give readers a "see it in the wild" link — concrete proof
// instead of just more writing.
const TAG_TO_VENTURE: Record<string, string> = {
  Energy: "voltafy",
  Systems: "philly",
  Growth: "help-mij-besparen",
  Strategy: "philly",
};

export function getVentureForTag(tag: string, locale?: Locale) {
  const slug = TAG_TO_VENTURE[tag];
  return slug ? getVenture(slug, locale) : undefined;
}

/* ─────────────────────────────────────────────────────────────
   Wat de homepage-kaarten nodig hebben, en niets meer.

   `components/sections/Ventures.tsx` droeg tot 2026-08-21 zijn eigen lijst
   van vijf ventures, met adres en statusvlag erin. Twee lijsten voor dezelfde
   feiten, en `ventures.test.ts` las de andere — dus de poort die bewaakt dat
   een venture zonder adres er ook geen toont, dekte niet wat de homepage
   werkelijk rendert. Dezelfde vorm als #199, waar llms.txt de claim nog droeg
   die #188 er net had uitgehaald.

   Waarom een afgeleide en geen rechtstreekse import: dat component draagt
   "use client". Leest het VENTURES zelf, dan reist dit hele bestand mee in de
   homepage-bundel — honderden regels kopij in vier talen, voor vier velden per
   kaart. Tree-shaking helpt daar niet, want VENTURES is één aaneengesloten
   literal. De server-pagina roept `ventureKaarten()` aan en geeft het resultaat
   door als prop; het component importeert alleen het type, en dat is bij het
   compileren weg.
   ───────────────────────────────────────────────────────────── */
export type VentureKaart = {
  slug: string;
  /** `status === "live"`. De kaart toont geen pijl en geen domein als dit
   *  onwaar is — zie de gate in `ventures.test.ts` die adres en status aan
   *  elkaar koppelt. */
  live: boolean;
  domain: string | null;
  external: string | null;
};

export function ventureKaarten(): VentureKaart[] {
  return VENTURES.map((v) => ({
    slug: v.slug,
    live: v.status === "live",
    domain: v.domain,
    external: v.external,
  }));
}
