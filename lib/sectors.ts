import type { Locale } from "@/lib/i18n/dict";
import { defined, mergeByIndex } from "@/lib/i18n/merge";

export type Sector = {
  slug: string;
  name: string;
  tagline: string;
  summary: string;
  // SEO-only overrides. The visible page uses name/tagline/summary
  // (brand voice); generateMetadata prefers these keyword-targeted
  // strings when present, falling back to name+tagline / summary.
  //
  // Do NOT append " | Juan Diaz" here. app/layout.tsx wraps every title in
  // `%s · Juan Diaz`, so a brand suffix baked in at this level renders twice
  // and eats the 60-character budget Google actually displays.
  seoTitle?: string;
  seoDescription?: string;
  leaks: { title: string; body: string }[];
  playbook: { phase: string; applied: string }[];
  proof: { title: string; body: string; href?: string }[];
  tags: string[];
  cta: string;
  gradient: string;
  /** Real per-locale copy. Absent locale = the base (English) strings render,
   *  which is a translation bug rather than a feature — sectors.test.ts fails
   *  the build when a locale is missing, so the gap is loud instead of silent. */
  i18n?: Partial<Record<Locale, SectorL10n>>;
};

/** Per-locale overrides for a sector's copy.
 *
 *  Every field is optional so a locale can translate part of a sector and let
 *  the rest fall back. Structural fields are deliberately NOT translatable:
 *  `slug` and `gradient` never appear here, and `proof[].href` is dropped from
 *  the entry shape — a route is not copy, and a translation that omitted it
 *  would silently break the cross-link to /work. */
export type SectorL10n = Partial<
  Pick<Sector, "name" | "tagline" | "summary" | "seoTitle" | "seoDescription" | "leaks" | "playbook" | "tags" | "cta">
> & {
  proof?: { title: string; body: string }[];
};

export const SECTORS: Sector[] = [
  {
    slug: "energy",
    name: "Energy & solar",
    tagline: "The grid is about to change. Most operators are not ready.",
    seoTitle: "Energy & Solar Operations Consultant",
    seoDescription:
      "Fractional revenue operator and operations consultant for energy and solar operators — honest tooling, CRM and revenue systems built for the post-2027 grid.",
    summary:
      "Dutch households, installers, and grid operators are heading into the 2027 net-metering phase-out with software that was built for a different economic reality. Real revenue will be won by whoever ships honest tooling first.",
    leaks: [
      { title: "Vendor-friendly numbers", body: "Most performance dashboards are built by the company that sold you the system. The number you see is not the number that's real." },
      { title: "Pre-2027 assumptions", body: "Every ROI calculator and every customer journey still assumes salderingsregeling. That math is about to break for millions." },
      { title: "Installer tooling", body: "The field teams keeping these systems alive are managing fleets on spreadsheets. At 3am, on bad coverage, with vendor apps that don't talk to each other." },
    ],
    playbook: [
      { phase: "Survey", applied: "Ride along with installers. Read government comms. Map every inverter API the Dutch market actually exposes." },
      { phase: "Blueprint", applied: "Design the operator surface before the consumer surface. Every screen maps to a decision a human actually has to make." },
      { phase: "Build", applied: "Ship the platform layer that the consumer products all connect back to. Don't build four disconnected things — build one honest system." },
      { phase: "Commission", applied: "Stress-test across seasons, across regions, across weird mixed-vendor fleets. Honest numbers or nothing goes live." },
      { phase: "Operate", applied: "Update every time the regulations shift. Ship weekly from installer feedback, not roadmap theater." },
    ],
    proof: [
      { title: "Voltafy", body: "The flagship platform — energy intelligence for Dutch households and installers.", href: "/work/voltafy" },
      { title: "Performance Tracker", body: "Honest yield numbers for owners and installers.", href: "/work/performance-tracker" },
      { title: "Salderingsregeling 2027", body: "Public field guide to the phase-out.", href: "/work/salderingsregeling-2027" },
    ],
    tags: ["Solar", "Installers", "Metering", "Post-2027"],
    cta: "Your installer operation needs a blueprint?",
    i18n: {
      nl: {
        name: "Energie & zon",
        tagline: "Het net verandert. De meeste operators zijn er niet klaar voor.",
        seoTitle: "Operations consultant energie & zon",
        seoDescription:
          "Fractioneel revenue operator en operations consultant voor energie- en zonne-operators — eerlijke tooling, CRM en omzetsystemen voor het net na 2027.",
        summary:
          "Nederlandse huishoudens, installateurs en netbeheerders gaan de afbouw van de salderingsregeling in 2027 in met software die voor een andere economische werkelijkheid is gebouwd. De omzet gaat naar wie als eerste eerlijke tooling levert.",
        leaks: [
          { title: "Cijfers die de leverancier uitkomen", body: "De meeste prestatiedashboards zijn gebouwd door het bedrijf dat je het systeem verkocht. Het getal dat je ziet is niet het getal dat klopt." },
          { title: "Aannames van vóór 2027", body: "Elke terugverdienrekentool en elke klantreis gaat nog uit van saldering. Die rekensom breekt binnenkort voor miljoenen huishoudens." },
          { title: "Tooling voor installateurs", body: "De monteurs die deze systemen draaiend houden beheren hun vloot in spreadsheets. Om 3 uur 's nachts, met slecht bereik, in leveranciersapps die niet met elkaar praten." },
        ],
        playbook: [
          { phase: "Survey", applied: "Meerijden met installateurs. Overheidscommunicatie lezen. Elke omvormer-API in kaart brengen die de Nederlandse markt daadwerkelijk blootgeeft." },
          { phase: "Blueprint", applied: "Ontwerp het scherm voor de operator vóór dat voor de consument. Elk scherm hoort bij een beslissing die iemand echt moet nemen." },
          { phase: "Build", applied: "Lever de platformlaag waar de consumentenproducten op aansluiten. Eén eerlijk systeem in plaats van vier losse dingen." },
          { phase: "Commission", applied: "Testen over seizoenen, over regio's, over rommelige vloten met apparatuur van meerdere merken. Eerlijke cijfers, anders gaat het niet live." },
          { phase: "Operate", applied: "Bijwerken zodra de regels schuiven. Wekelijks leveren op wat installateurs melden, niet op wat de roadmap belooft." },
        ],
        proof: [
          { title: "Voltafy", body: "Het vlaggenschip — energie-intelligentie voor Nederlandse huishoudens en installateurs." },
          { title: "Performance Tracker", body: "Eerlijke opbrengstcijfers voor eigenaren en installateurs." },
          { title: "Salderingsregeling 2027", body: "Publieke veldgids voor de afbouw." },
        ],
        tags: ["Zon", "Installateurs", "Meten", "Na 2027"],
        cta: "Heeft je installatiebedrijf een blueprint nodig?",
      },
      de: {
        name: "Energie & Solar",
        tagline: "Das Netz verändert sich. Die meisten Betreiber sind nicht bereit.",
        seoTitle: "Operations-Consultant Energie & Solar",
        seoDescription:
          "Fractional Revenue Operator und Operations-Consultant für Energie- und Solarbetreiber — ehrliche Werkzeuge, CRM und Umsatzsysteme für das Netz nach 2027.",
        summary:
          "Niederländische Haushalte, Installateure und Netzbetreiber steuern auf das Ende der Saldierungsregelung 2027 zu, mit Software, die für eine andere wirtschaftliche Realität gebaut wurde. Den Umsatz macht, wer zuerst ehrliche Werkzeuge liefert.",
        leaks: [
          { title: "Zahlen im Sinne des Anbieters", body: "Die meisten Leistungsdashboards stammen von dem Unternehmen, das Ihnen die Anlage verkauft hat. Die Zahl, die Sie sehen, ist nicht die Zahl, die stimmt." },
          { title: "Annahmen von vor 2027", body: "Jeder Amortisationsrechner und jede Kundenreise setzt noch Net-Metering voraus. Diese Rechnung bricht bald für Millionen." },
          { title: "Werkzeuge für Installateure", body: "Die Teams im Feld verwalten Hunderte Anlagen in Tabellen. Um drei Uhr nachts, bei schlechtem Empfang, in Hersteller-Apps, die nicht miteinander sprechen." },
        ],
        playbook: [
          { phase: "Survey", applied: "Mit Installateuren mitfahren. Behördenmitteilungen lesen. Jede Wechselrichter-API erfassen, die der niederländische Markt tatsächlich offenlegt." },
          { phase: "Blueprint", applied: "Die Betreiberoberfläche vor der Verbraucheroberfläche entwerfen. Jeder Bildschirm gehört zu einer Entscheidung, die ein Mensch treffen muss." },
          { phase: "Build", applied: "Die Plattformschicht liefern, an die alle Verbraucherprodukte andocken. Ein ehrliches System statt vier loser Bausteine." },
          { phase: "Commission", applied: "Über Jahreszeiten, Regionen und gemischte Anlagenparks testen. Ehrliche Zahlen, sonst geht nichts live." },
          { phase: "Operate", applied: "Aktualisieren, sobald sich die Regeln ändern. Wöchentlich ausliefern nach Rückmeldung der Installateure, nicht nach Roadmap." },
        ],
        proof: [
          { title: "Voltafy", body: "Das Flaggschiff — Energieintelligenz für niederländische Haushalte und Installateure." },
          { title: "Performance Tracker", body: "Ehrliche Ertragszahlen für Eigentümer und Installateure." },
          { title: "Salderingsregeling 2027", body: "Öffentlicher Leitfaden zum Auslaufen der Regelung." },
        ],
        tags: ["Solar", "Installateure", "Messung", "Nach 2027"],
        cta: "Braucht Ihr Installationsbetrieb einen Blueprint?",
      },
      es: {
        name: "Energía y solar",
        tagline: "La red va a cambiar. Casi ningún operador está preparado.",
        seoTitle: "Consultor de operaciones en energía solar",
        seoDescription:
          "Revenue operator fraccional y consultor de operaciones para energía y solar — herramientas honestas, CRM y sistemas de ingresos para la red posterior a 2027.",
        summary:
          "Los hogares, instaladores y operadores de red neerlandeses llegan al fin del net metering en 2027 con software construido para otra realidad económica. Los ingresos serán de quien entregue herramientas honestas primero.",
        leaks: [
          { title: "Cifras que favorecen al proveedor", body: "La mayoría de los paneles de rendimiento los construye la empresa que te vendió la instalación. El número que ves no es el número real." },
          { title: "Supuestos anteriores a 2027", body: "Cada calculadora de amortización y cada recorrido de cliente sigue asumiendo net metering. Esa cuenta está a punto de romperse para millones." },
          { title: "Herramientas para instaladores", body: "Los equipos de campo gestionan cientos de instalaciones en hojas de cálculo. A las tres de la madrugada, con mala cobertura, en apps de fabricantes que no se hablan." },
        ],
        playbook: [
          { phase: "Survey", applied: "Acompañar a los instaladores. Leer las comunicaciones oficiales. Mapear cada API de inversor que el mercado neerlandés expone de verdad." },
          { phase: "Blueprint", applied: "Diseñar la superficie del operador antes que la del consumidor. Cada pantalla corresponde a una decisión que alguien tiene que tomar." },
          { phase: "Build", applied: "Entregar la capa de plataforma a la que se conectan los productos de consumo. Un sistema honesto en lugar de cuatro piezas sueltas." },
          { phase: "Commission", applied: "Probar en distintas estaciones, regiones y parques con equipos de varias marcas. Cifras honestas o no sale a producción." },
          { phase: "Operate", applied: "Actualizar en cuanto cambia la norma. Entregar cada semana según lo que reportan los instaladores, no según la hoja de ruta." },
        ],
        proof: [
          { title: "Voltafy", body: "El buque insignia — inteligencia energética para hogares e instaladores neerlandeses." },
          { title: "Performance Tracker", body: "Cifras de rendimiento honestas para propietarios e instaladores." },
          { title: "Salderingsregeling 2027", body: "Guía pública sobre el fin de la regulación." },
        ],
        tags: ["Solar", "Instaladores", "Medición", "Post-2027"],
        cta: "¿Tu empresa instaladora necesita un plan?",
      },
    },
    gradient: "radial-gradient(600px 400px at 20% 20%, rgba(94,255,177,.22), transparent 60%)",
  },
  {
    slug: "real-estate",
    name: "Real estate",
    tagline: "Numbers the asset manager can actually trust.",
    seoTitle: "Real Estate Operations Consultant",
    seoDescription:
      "Operations consultant and fractional revenue operator for real estate — unified portfolio data, ESG reporting and asset numbers the manager can actually trust.",
    summary:
      "Real estate runs on numbers that everyone quietly knows are wrong. Utilities data is patchy, tenant ops live in email threads, ESG reporting is produced under deadline pressure once a year. The operators know — the software doesn't.",
    leaks: [
      { title: "Portfolio blindness", body: "You cannot compare two assets on the dimensions that matter because the data came from two different property managers with two different definitions." },
      { title: "Retrofit math fiction", body: "ROI models for insulation, heat pumps, solar are built on regional assumptions that don't match the actual building." },
      { title: "Tenant ops in email", body: "Service requests, maintenance history, tenant sentiment — all locked in inboxes no one reads fully." },
      { title: "ESG as a scramble", body: "Once-a-year panic to produce numbers that should have been live all along." },
    ],
    playbook: [
      { phase: "Survey", applied: "Site visits. Property manager interviews. Read the last five ESG reports and find where the data came from." },
      { phase: "Blueprint", applied: "Unified asset model across every property manager's data format. Define the numbers first, then build the UI." },
      { phase: "Build", applied: "Portfolio dashboard that works for the asset manager AND the ops team. Same source of truth." },
      { phase: "Commission", applied: "Verify every aggregate against the underlying utility bills. If the dashboard disagrees with the invoice, the dashboard is wrong." },
      { phase: "Operate", applied: "Weekly cadence with the ops team. ESG reporting becomes a live surface, not an annual fire drill." },
    ],
    proof: [
      { title: "Available", body: "Looking for the first live real estate portfolio engagement. Early collaborations get named as founding partners." },
    ],
    tags: ["Retrofit", "Portfolio", "Tenant ops", "ESG"],
    cta: "Running a portfolio on trust and spreadsheets?",
    i18n: {
      nl: {
        name: "Vastgoed",
        tagline: "Cijfers waar de assetmanager op kan bouwen.",
        seoTitle: "Operations consultant vastgoed",
        seoDescription:
          "Operations consultant en fractioneel revenue operator voor vastgoed — één portefeuillemodel, ESG-rapportage en assetcijfers waar de manager op kan bouwen.",
        summary:
          "Vastgoed draait op cijfers waarvan iedereen stilletjes weet dat ze niet kloppen. Meterstanden zijn onvolledig, huurderszaken leven in mailthreads, ESG-rapportage komt één keer per jaar onder tijdsdruk tot stand. De mensen op de vloer weten het; de software niet.",
        leaks: [
          { title: "Blind op portefeuilleniveau", body: "Je kunt twee panden niet vergelijken op wat ertoe doet, omdat de data van twee beheerders komt met twee definities." },
          { title: "Verzonnen verduurzamingsrekensom", body: "Terugverdienmodellen voor isolatie, warmtepompen en zon staan op regionale aannames die niet bij het werkelijke pand passen." },
          { title: "Huurderszaken in de mail", body: "Serviceverzoeken, onderhoudshistorie, huurderssignalen — allemaal opgesloten in postvakken die niemand helemaal leest." },
          { title: "ESG als jaarlijkse paniek", body: "Eén keer per jaar haastwerk om cijfers te produceren die het hele jaar live hadden moeten staan." },
        ],
        playbook: [
          { phase: "Survey", applied: "Panden bezoeken. Beheerders spreken. De laatste vijf ESG-rapportages lezen en uitzoeken waar die cijfers vandaan kwamen." },
          { phase: "Blueprint", applied: "Eén assetmodel over elk dataformaat van elke beheerder heen. Eerst de cijfers definiëren, dan pas de interface bouwen." },
          { phase: "Build", applied: "Portefeuilledashboard dat werkt voor de assetmanager én het beheerteam. Eén bron van waarheid." },
          { phase: "Commission", applied: "Elk totaal narekenen tegen de onderliggende energienota. Wijkt het dashboard af van de factuur, dan heeft het dashboard ongelijk." },
          { phase: "Operate", applied: "Wekelijks ritme met het beheerteam. ESG-rapportage wordt een live scherm in plaats van een jaarlijkse brandoefening." },
        ],
        proof: [
          { title: "Beschikbaar", body: "Op zoek naar de eerste live vastgoedportefeuille. Wie vroeg instapt wordt genoemd als founding partner." },
        ],
        tags: ["Verduurzaming", "Portefeuille", "Huurderszaken", "ESG"],
        cta: "Draait je portefeuille op vertrouwen en spreadsheets?",
      },
      de: {
        name: "Immobilien",
        tagline: "Zahlen, auf die sich der Assetmanager verlassen kann.",
        seoTitle: "Operations-Consultant Immobilien",
        seoDescription:
          "Operations-Consultant und Fractional Revenue Operator für Immobilien — einheitliche Portfoliodaten, ESG-Berichte und Kennzahlen, auf die Verlass ist.",
        summary:
          "Immobilien laufen auf Zahlen, von denen alle still wissen, dass sie nicht stimmen. Verbrauchsdaten sind lückenhaft, Mieteranliegen leben in E-Mail-Verläufen, der ESG-Bericht entsteht einmal im Jahr unter Termindruck. Die Praxis weiß das; die Software nicht.",
        leaks: [
          { title: "Blind auf Portfolioebene", body: "Sie können zwei Objekte nicht auf den entscheidenden Dimensionen vergleichen, weil die Daten von zwei Verwaltern mit zwei Definitionen stammen." },
          { title: "Erfundene Sanierungsrechnung", body: "Amortisationsmodelle für Dämmung, Wärmepumpen und Solar beruhen auf regionalen Annahmen, die nicht zum konkreten Gebäude passen." },
          { title: "Mieteranliegen im Postfach", body: "Serviceanfragen, Wartungshistorie, Mieterstimmung — eingeschlossen in Postfächern, die niemand vollständig liest." },
          { title: "ESG als jährliche Hektik", body: "Einmal im Jahr Panik um Zahlen, die das ganze Jahr über hätten vorliegen müssen." },
        ],
        playbook: [
          { phase: "Survey", applied: "Objekte begehen. Verwalter befragen. Die letzten fünf ESG-Berichte lesen und die Herkunft jeder Zahl klären." },
          { phase: "Blueprint", applied: "Ein Asset-Modell über alle Datenformate der Verwalter hinweg. Erst die Kennzahlen definieren, dann die Oberfläche bauen." },
          { phase: "Build", applied: "Portfolio-Dashboard für den Assetmanager und das Betriebsteam. Eine Quelle der Wahrheit." },
          { phase: "Commission", applied: "Jede Summe gegen die zugrunde liegende Rechnung prüfen. Weicht das Dashboard von der Rechnung ab, irrt das Dashboard." },
          { phase: "Operate", applied: "Wöchentlicher Takt mit dem Betriebsteam. ESG-Berichte werden zur laufenden Ansicht statt zur jährlichen Feuerübung." },
        ],
        proof: [
          { title: "Verfügbar", body: "Auf der Suche nach dem ersten Immobilienportfolio. Wer früh einsteigt, wird als Gründungspartner genannt." },
        ],
        tags: ["Sanierung", "Portfolio", "Mieterbetrieb", "ESG"],
        cta: "Läuft Ihr Portfolio auf Vertrauen und Tabellen?",
      },
      es: {
        name: "Inmobiliario",
        tagline: "Cifras en las que el gestor de activos puede confiar.",
        seoTitle: "Consultor de operaciones inmobiliarias",
        seoDescription:
          "Consultor de operaciones y revenue operator fraccional para inmobiliario — datos de cartera unificados, informes ESG y cifras de activos fiables.",
        summary:
          "El inmobiliario funciona con cifras que todos saben en voz baja que están mal. Los datos de suministros son irregulares, la gestión de inquilinos vive en hilos de correo y el informe ESG se produce una vez al año contra reloj. Quien opera lo sabe; el software no.",
        leaks: [
          { title: "Ceguera de cartera", body: "No puedes comparar dos activos en lo que importa porque los datos vienen de dos gestores con dos definiciones distintas." },
          { title: "Cuentas de rehabilitación ficticias", body: "Los modelos de amortización de aislamiento, bombas de calor y solar se apoyan en supuestos regionales que no encajan con el edificio real." },
          { title: "Inquilinos en el correo", body: "Incidencias, historial de mantenimiento y quejas, encerrados en buzones que nadie lee entero." },
          { title: "ESG como carrera anual", body: "Pánico una vez al año para producir cifras que deberían haber estado disponibles todo el año." },
        ],
        playbook: [
          { phase: "Survey", applied: "Visitar los inmuebles. Entrevistar a los gestores. Leer los últimos cinco informes ESG y rastrear de dónde salió cada cifra." },
          { phase: "Blueprint", applied: "Un modelo de activo común para todos los formatos de datos de los gestores. Primero definir las cifras, después construir la interfaz." },
          { phase: "Build", applied: "Panel de cartera que sirva al gestor de activos y al equipo de operaciones. Una sola fuente de verdad." },
          { phase: "Commission", applied: "Contrastar cada agregado con la factura de suministro. Si el panel discrepa de la factura, el panel se equivoca." },
          { phase: "Operate", applied: "Ritmo semanal con el equipo de operaciones. El informe ESG pasa a ser una vista viva en lugar de un simulacro anual." },
        ],
        proof: [
          { title: "Disponible", body: "Buscando la primera cartera inmobiliaria en activo. Quien entre pronto figurará como socio fundador." },
        ],
        tags: ["Rehabilitación", "Cartera", "Inquilinos", "ESG"],
        cta: "¿Tu cartera funciona con confianza y hojas de cálculo?",
      },
    },
    gradient: "radial-gradient(600px 400px at 70% 30%, rgba(125,211,252,.18), transparent 60%)",
  },
  {
    slug: "hospitality",
    name: "Hospitality & revenue",
    tagline: "From gut-feel pricing to an honest instrument.",
    seoTitle: "Hospitality Revenue & Operations Consultant",
    seoDescription:
      "Revenue operations consultant for hospitality operators — channel intelligence, a pricing instrument and frontline tools that replace gut-feel decisions.",
    summary:
      "Hospitality is one of the few industries where the revenue manager still makes call-by-call judgment decisions without a real instrument to check them against. The biggest margin lives in the 10 minutes before check-in, and most of it is slipping through on gut feel.",
    leaks: [
      { title: "Channel chaos", body: "OTAs, direct, corporate rates, seasonal promos — all managed in five dashboards that don't reconcile." },
      { title: "Revenue blindness", body: "You know this week's numbers. You don't know why. By the time you do, the next week is already pricing." },
      { title: "Staff tooling", body: "Frontline staff — the people who actually make the guest experience happen — are on systems built for the 2010s." },
      { title: "Guest data not used", body: "Every guest touchpoint is a data point. Almost none of it flows back to the next stay." },
    ],
    playbook: [
      { phase: "Survey", applied: "Shadow the revenue manager through a full pricing cycle. Watch the front desk on a Friday night. Map every system touched." },
      { phase: "Blueprint", applied: "Single operator surface with three views: revenue, channels, staff. Same data, role-specific." },
      { phase: "Build", applied: "Live channel intelligence, a pricing instrument the revenue manager trusts, and frontline tools staff actually want to open." },
      { phase: "Commission", applied: "Run in parallel to the existing process for two cycles. Prove the number before flipping the default." },
      { phase: "Operate", applied: "Weekly tune with the revenue manager. Quarterly review with operations. Guest data loop closes at checkout." },
    ],
    proof: [
      { title: "Available", body: "Open to the first hospitality operator who wants to build the instrument instead of buying another dashboard." },
    ],
    tags: ["Revenue ops", "Channels", "Staff", "Guest data"],
    cta: "Pricing on gut feel is costing you — let's measure it.",
    i18n: {
      nl: {
        name: "Horeca & revenue",
        tagline: "Van prijzen op onderbuik naar een eerlijk instrument.",
        seoTitle: "Revenue- en operations consultant horeca",
        seoDescription:
          "Revenue operations consultant voor hotels en horeca — kanaalinzicht, een prijsinstrument en tools voor de vloer die onderbuikbeslissingen vervangen.",
        summary:
          "Horeca is een van de weinige sectoren waar de revenue manager nog per geval beslist zonder instrument om zich aan te toetsen. De grootste marge zit in de tien minuten vóór check-in, en het meeste daarvan lekt weg op gevoel.",
        leaks: [
          { title: "Kanaalchaos", body: "OTA's, direct, zakelijke tarieven, seizoensacties — beheerd in vijf dashboards die niet op elkaar aansluiten." },
          { title: "Blind op omzet", body: "Je kent de cijfers van deze week. Je weet niet waarom. Tegen de tijd dat je het weet, staat de prijs voor volgende week al vast." },
          { title: "Tooling voor de vloer", body: "De medewerkers die de gastervaring feitelijk maken werken op systemen uit de jaren tien." },
          { title: "Gastdata blijft liggen", body: "Elk contactmoment met een gast is een datapunt. Bijna niets daarvan komt terug bij het volgende verblijf." },
        ],
        playbook: [
          { phase: "Survey", applied: "Een volledige prijscyclus meelopen met de revenue manager. De receptie observeren op vrijdagavond. Elk systeem in kaart brengen dat wordt aangeraakt." },
          { phase: "Blueprint", applied: "Eén operatorscherm met drie weergaven: omzet, kanalen, personeel. Dezelfde data, per rol." },
          { phase: "Build", applied: "Live kanaalinzicht, een prijsinstrument waar de revenue manager op vertrouwt, en tools die het vloerteam uit zichzelf opent." },
          { phase: "Commission", applied: "Twee cycli parallel aan het bestaande proces draaien. Eerst het cijfer bewijzen, dan pas de standaard omzetten." },
          { phase: "Operate", applied: "Wekelijks bijstellen met de revenue manager. Elk kwartaal evalueren met operations. De gastdata sluit zich bij het uitchecken." },
        ],
        proof: [
          { title: "Beschikbaar", body: "Open voor de eerste horeca-operator die het instrument wil bouwen in plaats van nog een dashboard te kopen." },
        ],
        tags: ["Revenue ops", "Kanalen", "Personeel", "Gastdata"],
        cta: "Prijzen op gevoel kost je geld — laten we het meten.",
      },
      de: {
        name: "Hotellerie & Revenue",
        tagline: "Vom Bauchgefühl zum ehrlichen Instrument.",
        seoTitle: "Revenue- und Operations-Consultant Hotellerie",
        seoDescription:
          "Revenue-Operations-Consultant für Hotellerie und Gastronomie — Kanalübersicht, ein Preisinstrument und Werkzeuge für das Team am Gast.",
        summary:
          "Die Hotellerie ist eine der wenigen Branchen, in denen der Revenue Manager noch Fall für Fall entscheidet, ohne Instrument zum Gegenprüfen. Die größte Marge liegt in den zehn Minuten vor dem Check-in, und das meiste davon versickert im Bauchgefühl.",
        leaks: [
          { title: "Kanalchaos", body: "OTAs, Direktbuchung, Firmenraten, Saisonaktionen — verwaltet in fünf Dashboards, die nicht zusammenpassen." },
          { title: "Blind beim Umsatz", body: "Sie kennen die Zahlen dieser Woche. Sie wissen nicht, warum. Bis Sie es wissen, steht der Preis der nächsten Woche bereits." },
          { title: "Werkzeuge am Gast", body: "Die Mitarbeitenden, die das Gasterlebnis tatsächlich erzeugen, arbeiten auf Systemen aus den 2010er-Jahren." },
          { title: "Gastdaten bleiben liegen", body: "Jeder Kontaktpunkt ist ein Datenpunkt. Fast nichts davon fließt in den nächsten Aufenthalt zurück." },
        ],
        playbook: [
          { phase: "Survey", applied: "Einen vollständigen Preiszyklus mit dem Revenue Manager begleiten. Die Rezeption an einem Freitagabend beobachten. Jedes berührte System erfassen." },
          { phase: "Blueprint", applied: "Eine Betreiberoberfläche mit drei Ansichten: Umsatz, Kanäle, Team. Dieselben Daten, rollenspezifisch." },
          { phase: "Build", applied: "Laufende Kanalübersicht, ein Preisinstrument, dem der Revenue Manager vertraut, und Werkzeuge, die das Team von sich aus öffnet." },
          { phase: "Commission", applied: "Zwei Zyklen parallel zum bestehenden Prozess laufen lassen. Erst die Zahl beweisen, dann den Standard umstellen." },
          { phase: "Operate", applied: "Wöchentlich mit dem Revenue Manager justieren. Quartalsweise mit dem Betrieb prüfen. Der Gastdatenkreis schließt sich beim Check-out." },
        ],
        proof: [
          { title: "Verfügbar", body: "Offen für den ersten Hotelbetrieb, der das Instrument bauen statt ein weiteres Dashboard kaufen will." },
        ],
        tags: ["Revenue Ops", "Kanäle", "Team", "Gastdaten"],
        cta: "Preise nach Bauchgefühl kosten Sie Geld — messen wir es.",
      },
      es: {
        name: "Hostelería e ingresos",
        tagline: "Del precio por intuición a un instrumento honesto.",
        seoTitle: "Consultor de revenue para hostelería",
        seoDescription:
          "Consultor de revenue operations para hostelería — inteligencia de canales, un instrumento de precios y herramientas para el equipo de sala.",
        summary:
          "La hostelería es uno de los pocos sectores donde el revenue manager sigue decidiendo caso por caso sin un instrumento con el que contrastar. El mayor margen está en los diez minutos antes del check-in, y la mayor parte se escapa por intuición.",
        leaks: [
          { title: "Caos de canales", body: "OTAs, directo, tarifas corporativas, promociones de temporada — gestionados en cinco paneles que no cuadran entre sí." },
          { title: "Ceguera de ingresos", body: "Conoces las cifras de esta semana. No sabes por qué. Para cuando lo sabes, el precio de la semana siguiente ya está puesto." },
          { title: "Herramientas de sala", body: "Las personas que crean la experiencia del huésped trabajan con sistemas de la década pasada." },
          { title: "Datos del huésped sin usar", body: "Cada punto de contacto es un dato. Casi ninguno vuelve a la siguiente estancia." },
        ],
        playbook: [
          { phase: "Survey", applied: "Acompañar un ciclo completo de precios con el revenue manager. Observar la recepción un viernes por la noche. Mapear cada sistema que se toca." },
          { phase: "Blueprint", applied: "Una superficie de operador con tres vistas: ingresos, canales, equipo. Los mismos datos, según el rol." },
          { phase: "Build", applied: "Inteligencia de canales en vivo, un instrumento de precios en el que el revenue manager confíe y herramientas que el equipo abra por voluntad propia." },
          { phase: "Commission", applied: "Dos ciclos en paralelo al proceso actual. Primero demostrar la cifra, después cambiar el valor por defecto." },
          { phase: "Operate", applied: "Ajuste semanal con el revenue manager. Revisión trimestral con operaciones. El circuito de datos del huésped se cierra en el check-out." },
        ],
        proof: [
          { title: "Disponible", body: "Abierto al primer operador hotelero que quiera construir el instrumento en lugar de comprar otro panel." },
        ],
        tags: ["Revenue ops", "Canales", "Equipo", "Datos de huésped"],
        cta: "Poner precio a ojo te cuesta dinero — vamos a medirlo.",
      },
    },
    gradient: "radial-gradient(600px 400px at 30% 70%, rgba(255,181,71,.15), transparent 60%)",
  },
  {
    slug: "adjacent",
    name: "Adjacent sectors",
    tagline: "Anywhere operators have a P&L and bad software.",
    seoTitle: "Operations Consultant for Operators",
    seoDescription:
      "Fractional revenue operator and operations consultant for logistics, retail and field-service operators running real P&Ls on software that lies to them.",
    summary:
      "Logistics, retail, field services, frontier industries — the five-phase method doesn't care what industry your building sits in. If there are operators running real operations against a real P&L on software that lies to them, the playbook applies.",
    leaks: [
      { title: "Tooling that's a decade behind", body: "The operators doing the hardest work are often the ones handed the oldest software." },
      { title: "Data silos", body: "The dispatcher knows things the analyst doesn't. The analyst knows things the exec doesn't. Nobody's sharing." },
      { title: "Tribal knowledge", body: "The thing that keeps the operation alive is in one person's head. When they leave, chaos." },
    ],
    playbook: [
      { phase: "Survey", applied: "Same as always: walk the site, watch the work, find the workarounds, capture the tribal knowledge." },
      { phase: "Blueprint", applied: "Design for the person doing the work, not the person reporting on it." },
      { phase: "Build", applied: "Ship the surface that matters first. The analytics can come later — the ops team needs tools now." },
      { phase: "Commission", applied: "Break it on purpose. Bad networks. Mid-shift changes. Every edge case the ops team already knows is coming." },
      { phase: "Operate", applied: "Weekly rhythm. Forever." },
    ],
    proof: [
      { title: "Philly", body: "First US adjacent build — field ops dashboard for ground teams.", href: "/work/philly" },
    ],
    tags: ["Field ops", "Fleet", "Retail", "Services"],
    cta: "Your operators are stuck on bad software?",
    i18n: {
      nl: {
        name: "Aangrenzende sectoren",
        tagline: "Overal waar operators een P&L hebben en slechte software.",
        seoTitle: "Operations consultant voor operators",
        seoDescription:
          "Fractioneel revenue operator en operations consultant voor logistiek, retail en buitendienst — operators met een echte P&L op software die tegen ze liegt.",
        summary:
          "Logistiek, retail, buitendienst, nieuwe industrieën — de vijffasenmethode trekt zich niets aan van de sector waarin je pand staat. Zijn er operators die een echte operatie draaien tegen een echte P&L op software die tegen ze liegt, dan geldt het draaiboek.",
        leaks: [
          { title: "Tooling van tien jaar terug", body: "De mensen met het zwaarste werk krijgen vaak de oudste software." },
          { title: "Datasilo's", body: "De planner weet dingen die de analist niet weet. De analist weet dingen die de directie niet weet. Niemand deelt." },
          { title: "Kennis in één hoofd", body: "Wat de operatie draaiend houdt zit bij één persoon tussen de oren. Vertrekt die, dan is het chaos." },
        ],
        playbook: [
          { phase: "Survey", applied: "Zoals altijd: over de vloer lopen, het werk bekijken, de omwegen vinden, de ongeschreven kennis vastleggen." },
          { phase: "Blueprint", applied: "Ontwerp voor wie het werk doet, niet voor wie erover rapporteert." },
          { phase: "Build", applied: "Lever eerst het scherm dat ertoe doet. Analyse kan later — het operationele team heeft nú gereedschap nodig." },
          { phase: "Commission", applied: "Breek het met opzet. Slechte verbinding. Wisselingen midden in de dienst. Elke uitzondering die het team allang ziet aankomen." },
          { phase: "Operate", applied: "Wekelijks ritme. Voor altijd." },
        ],
        proof: [
          { title: "Philly", body: "Eerste Amerikaanse build in deze hoek — buitendienstdashboard voor teams op locatie." },
        ],
        tags: ["Buitendienst", "Vloot", "Retail", "Services"],
        cta: "Zitten je operators vast op slechte software?",
      },
      de: {
        name: "Angrenzende Branchen",
        tagline: "Überall, wo Betreiber eine GuV haben und schlechte Software.",
        seoTitle: "Operations-Consultant für Betreiber",
        seoDescription:
          "Fractional Revenue Operator und Operations-Consultant für Logistik, Handel und Außendienst — Betreiber mit echter GuV auf Software, die sie belügt.",
        summary:
          "Logistik, Handel, Außendienst, junge Industrien — die Fünf-Phasen-Methode fragt nicht, in welcher Branche Ihr Gebäude steht. Wo Betreiber einen echten Betrieb gegen eine echte GuV fahren, auf Software, die sie belügt, greift das Playbook.",
        leaks: [
          { title: "Werkzeuge von vor zehn Jahren", body: "Wer die härteste Arbeit macht, bekommt oft die älteste Software." },
          { title: "Datensilos", body: "Der Disponent weiß Dinge, die der Analyst nicht weiß. Der Analyst weiß Dinge, die die Geschäftsführung nicht weiß. Niemand teilt." },
          { title: "Wissen in einem Kopf", body: "Was den Betrieb am Laufen hält, steckt in einem einzigen Kopf. Geht diese Person, folgt Chaos." },
        ],
        playbook: [
          { phase: "Survey", applied: "Wie immer: durch den Betrieb gehen, die Arbeit ansehen, die Umwege finden, das ungeschriebene Wissen festhalten." },
          { phase: "Blueprint", applied: "Für die Person entwerfen, die die Arbeit macht, nicht für die, die darüber berichtet." },
          { phase: "Build", applied: "Zuerst die Oberfläche liefern, auf die es ankommt. Auswertung kann warten — das Betriebsteam braucht jetzt Werkzeug." },
          { phase: "Commission", applied: "Absichtlich kaputt machen. Schlechte Verbindung. Wechsel mitten in der Schicht. Jeder Sonderfall, den das Team längst kommen sieht." },
          { phase: "Operate", applied: "Wöchentlicher Takt. Dauerhaft." },
        ],
        proof: [
          { title: "Philly", body: "Erster US-Build in diesem Umfeld — Außendienst-Dashboard für Teams vor Ort." },
        ],
        tags: ["Außendienst", "Flotte", "Handel", "Services"],
        cta: "Hängen Ihre Betreiber an schlechter Software fest?",
      },
      es: {
        name: "Sectores adyacentes",
        tagline: "Donde haya operadores con una cuenta de resultados y mal software.",
        seoTitle: "Consultor de operaciones para operadores",
        seoDescription:
          "Revenue operator fraccional y consultor de operaciones para logística, retail y servicios de campo — operadores con cuenta real sobre software que miente.",
        summary:
          "Logística, retail, servicios de campo, industrias emergentes — el método de cinco fases no pregunta en qué sector está tu edificio. Si hay operadores llevando una operación real contra una cuenta real sobre software que les miente, el manual aplica.",
        leaks: [
          { title: "Herramientas de hace una década", body: "Quien hace el trabajo más duro suele recibir el software más viejo." },
          { title: "Silos de datos", body: "El planificador sabe cosas que el analista no sabe. El analista sabe cosas que la dirección no sabe. Nadie comparte." },
          { title: "Conocimiento en una cabeza", body: "Lo que mantiene viva la operación está en la cabeza de una persona. Si se va, llega el caos." },
        ],
        playbook: [
          { phase: "Survey", applied: "Como siempre: recorrer las instalaciones, mirar el trabajo, encontrar los atajos, capturar el conocimiento no escrito." },
          { phase: "Blueprint", applied: "Diseñar para quien hace el trabajo, no para quien informa sobre él." },
          { phase: "Build", applied: "Entregar primero la superficie que importa. La analítica puede esperar — el equipo de operaciones necesita herramientas ya." },
          { phase: "Commission", applied: "Romperlo a propósito. Mala cobertura. Cambios a mitad de turno. Cada caso límite que el equipo ya ve venir." },
          { phase: "Operate", applied: "Ritmo semanal. Siempre." },
        ],
        proof: [
          { title: "Philly", body: "Primer desarrollo estadounidense en este ámbito — panel de operaciones de campo para equipos sobre el terreno." },
        ],
        tags: ["Operaciones de campo", "Flota", "Retail", "Servicios"],
        cta: "¿Tus operadores están atrapados en mal software?",
      },
    },
    gradient: "radial-gradient(600px 400px at 50% 50%, rgba(94,255,177,.16), transparent 60%)",
  },
];

/** Applies a locale's overrides to a sector. Returns the base untouched when
 *  the locale has no entry, so callers never have to null-check. */
export function localizeSector(base: Sector, locale: Locale): Sector {
  const o = base.i18n?.[locale];
  if (!o) return base;

  const { proof, ...copy } = o;
  const merged: Sector = { ...base, ...defined(copy) };

  // Merge proof by index and keep the base entry's href: the translation
  // supplies title/body only, so the /work cross-link survives a partial or
  // shorter translated array.
  if (proof) {
    merged.proof = mergeByIndex(base.proof, proof);
  }
  return merged;
}

export function getSector(slug: string, locale?: Locale) {
  const base = SECTORS.find((s) => s.slug === slug);
  if (!base || !locale) return base;
  return localizeSector(base, locale);
}

/** Every sector in the requested locale — for the /sectors listing. Without a
 *  locale it returns the base array unchanged (sitemap only needs slugs). */
export function getSectors(locale?: Locale): Sector[] {
  return locale ? SECTORS.map((s) => localizeSector(s, locale)) : SECTORS;
}
