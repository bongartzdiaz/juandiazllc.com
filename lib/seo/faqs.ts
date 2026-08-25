// FAQ content keyed by page or sector. Answer-box-optimized: every answer
// starts with a definitive sentence so AI overviews can extract a clean
// 1-line citation. Keep answers under 300 chars each — longer and the
// citation gets truncated mid-thought.

import type { FaqItem } from "./schema";
import type { Locale } from "@/lib/i18n/dict";

export const HOME_FAQ: FaqItem[] = [
  {
    q: "What is a fractional revenue operator?",
    a: "A fractional revenue operator is a part-time, hands-on partner who designs and ships a company's revenue systems — CRM, automation, growth infrastructure — without a full-time hire. Juan Diaz works this way with operators in energy, real estate and hospitality: advisory plus build, not slides.",
  },
  {
    q: "What does Juan Diaz, LLC actually do?",
    a: "Juan Diaz, LLC builds revenue engines for operators — the CRM, automations and growth infrastructure that turn a team of humans plus software into a compounding system. We operate as a holding company with internal ventures (Philly CRM, Voltafy, Help Mij Besparen) and a small number of operator engagements per year.",
  },
  {
    q: "Which industries do you work with?",
    a: "Energy (installers, solar, batteries), real estate (brokerages, property management), hospitality (multi-location), and operator-heavy adjacent industries like logistics, trades and home services. The common thread is a field team that generates revenue and an office that tries to make sense of it.",
  },
  {
    q: "Do you build from scratch or configure existing tools?",
    a: "Both — we match the tool to the job. Core workflows that differentiate your business get built (or heavily customised). Commodity workflows (email, accounting, payroll) get the cheapest reliable tool that does not break your data contracts. The moat lives in the integration layer plus two or three core flows — not in owning every seat of every SaaS.",
  },
  {
    q: "What is a blueprint call?",
    a: "A free 30-minute call where we map your current revenue flow end-to-end and identify the two or three leverage points. Blunt, structured, no slides. You leave with a one-page diagnosis regardless of whether we work together afterwards.",
  },
  {
    q: "Is the 15-minute booking the same as a blueprint call?",
    a: "No. The booking link schedules a 15-minute intro: one problem, one direction, no preparation needed. A blueprint call is the longer 30-minute session with a written diagnosis afterwards — we schedule that once we know the intro is worth both our time.",
  },
  {
    q: "Where are you based?",
    a: "Operating out of the Netherlands with clients across the EU and occasional US engagements. Remote-first, with on-site time for discovery and rollouts when it moves the needle.",
  },
];

// BRAND_FAQ stond hier tot 2026-08-03: vijf vragen die nergens werden
// gerenderd of in schema gezet. Verwijderd omdat dode FAQ-tekst stilletjes uit
// de pas gaat lopen met wat de site wél belooft. Git heeft ze nog.

export const CONTACT_FAQ: FaqItem[] = [
  {
    q: "How fast do you reply?",
    a: "Within 24 hours on weekdays, often sooner. A blueprint call is usually scheduled within one business week.",
  },
  {
    q: "What does the booking button actually book?",
    a: "Fifteen minutes. Bring one problem, leave with a direction — no preparation, no sales pitch. If it turns out there is something bigger to map, we schedule a 30-minute blueprint call from there.",
  },
  {
    q: "What happens on a blueprint call?",
    a: "A 30-minute structured conversation: current bottleneck, what you've already tried, what a working system would look like. You leave with a one-page diagnosis, written up within 48 hours, whether or not we work together.",
  },
  {
    q: "Do you sign NDAs?",
    a: "Yes — a mutual NDA is available on request and we often initiate it ourselves for sensitive commercial conversations. Standard 2-year term.",
  },
  {
    q: "Can we start small?",
    a: "Yes. Many engagements begin with a 30-day diagnostic sprint at €2,500 excl. VAT. You end it with the build plan, a number on every phase, and the first component already running. Both stay yours even if someone else executes them, and the fee comes off the build price in full.",
  },
];

// Kept for backwards-compat. New call sites should use SECTOR_FAQ_BY_LOCALE
// so non-English visitors get AI-Overview-citeable answers in their own
// language instead of English leaking through.
export const SECTOR_FAQ: Record<string, FaqItem[]> = {
  energy: [
    {
      q: "Do you work with solar and battery installers?",
      a: "Yes. Energy is our largest sector — solar installers, battery resellers, heat-pump operators and hybrid installers. Typical build: WhatsApp-first lead qualification, energy-consumption reporting, installer dispatch and commissioning.",
    },
    {
      q: "How does the salderingsregeling change things?",
      a: "The Dutch net-metering phase-out in 2027 shifts the sale from price to payback — which means your funnel needs a rendementsgesprek layer, not just a price quote. We build that layer: per-lead consumption reports and battery upsell integration.",
    },
    {
      q: "Can you integrate with existing ERP or field-service tools?",
      a: "Yes. Common integrations include Exact, Afas, Twinfield, Moneybird and bespoke field-service apps. When integrations don't exist we build them — typically a thin sync layer that keeps each tool as the system of record for its own domain.",
    },
  ],
  "real-estate": [
    {
      q: "Is this aimed at brokerages or at individual agents?",
      a: "Both, but the sweet spot is teams of 3-to-25 agents at a single brokerage. Solo agents get better value from off-the-shelf tools; national franchises need enterprise systems we do not build.",
    },
    {
      q: "Do you integrate with MLS feeds?",
      a: "Yes. Philly ingests MLS feeds for the Netherlands (Funda/NVM) and US (IDX/RESO). Each listing becomes a first-class object inside the CRM with offers, showings, open houses and commissions attached.",
    },
    {
      q: "What about sphere-of-influence (SOI) and referrals?",
      a: "SOI is a core Philly module. It scores every past client and dormant lead on recency, referral velocity and deal propensity, then surfaces a daily shortlist of accounts to reach out to. Built for agents who want referrals without a CRM fight.",
    },
  ],
  hospitality: [
    {
      q: "Do you build PMS systems?",
      a: "Not from scratch — we integrate with Mews, Cloudbeds and Apaleo. We build the revenue and guest-intelligence layer on top: AI-driven pricing, upsell orchestration, direct-booking funnels and the reporting that actually reaches the GM.",
    },
    {
      q: "What about short-term rentals?",
      a: "We work with STR operators managing 10-plus units. Typical build: channel-manager sync, automated guest messaging, dynamic pricing, cleaning roster and an ops dashboard the on-the-ground team actually opens.",
    },
    {
      q: "Can you do F&B and events alongside rooms?",
      a: "Yes. Mixed-use operators (boutique hotel with restaurant and private events) are one of our highest-value profiles. We wire rooms, covers and events into one revenue view so the GM sees the full picture in one screen.",
    },
  ],
  adjacent: [
    {
      q: "What counts as 'adjacent'?",
      a: "Sectors that share operator DNA with our primary three — construction, professional services, specialty retail, philanthropy and family offices. If your business is revenue-driven, team-operated and data-fragmented, it probably fits.",
    },
    {
      q: "Is this a fit for non-profits?",
      a: "Yes — specifically operator-run foundations and mid-size grant-makers. Philly has a philanthropy module covering donor scoring, grant lifecycles, impact metrics and volunteer rostering.",
    },
    {
      q: "Can you help with family-office operations?",
      a: "Yes. Typical builds: deal-flow intake, LP relationship management, cross-entity reporting, secure document vault. Not tax or audit — we partner with accountants on those.",
    },
  ],
};

// Per-locale sector FAQ. Keys must match slugs in lib/sectors; copy is
// written natively, not machine-translated, so each language reads like
// a local wrote it. Missing locales fall back to English via the
// getSectorFaq() helper below.
export const SECTOR_FAQ_BY_LOCALE: Record<Locale, Record<string, FaqItem[]>> = {
  en: SECTOR_FAQ,
  nl: {
    energy: [
      {
        q: "Werken jullie met zonnepaneel- en batterijinstallateurs?",
        a: "Ja. Energie is onze grootste sector — zonnepaneelinstallateurs, batterijpartners, warmtepompoperators en hybride installateurs. Typische build: WhatsApp-first leadkwalificatie, verbruiksrapportage, installateursdispatch en oplevering.",
      },
      {
        q: "Hoe verandert de salderingsregeling alles?",
        a: "De afschaffing van saldering in 2027 verschuift de verkoop van prijs naar terugverdientijd — dus je funnel heeft een rendementsgesprek nodig, geen prijsopgave. Wij bouwen die laag: verbruiksrapporten per lead en batterij-upsell-integratie.",
      },
      {
        q: "Kunnen jullie integreren met bestaande ERP of field-service tools?",
        a: "Ja. Veelvoorkomende integraties: Exact, Afas, Twinfield, Moneybird en op maat gemaakte field-service-apps. Als de integratie niet bestaat bouwen we hem — een dunne synclaag die elk systeem authoritative houdt voor zijn eigen domein.",
      },
    ],
    "real-estate": [
      {
        q: "Is dit voor kantoren of voor individuele makelaars?",
        a: "Allebei, maar de sweet spot zijn teams van 3 tot 25 makelaars op één kantoor. Solo-makelaars halen meer uit standaardtools; landelijke ketens hebben enterprise-systemen nodig die wij niet bouwen.",
      },
      {
        q: "Integreren jullie met Funda / NVM?",
        a: "Ja. Philly leest Funda- en NVM-feeds in (en IDX/RESO voor de VS). Elke woning wordt een eersteklas object in het CRM met biedingen, bezichtigingen, open dagen en courtages aangekoppeld.",
      },
      {
        q: "Hoe zit het met warme-relatiebeheer en referrals?",
        a: "Sphere-of-influence is een kernmodule in Philly. Scoort elke klant en slapende lead op recency, referral-snelheid en dealkans, en toont een dagelijkse shortlist. Gebouwd voor makelaars die referrals willen zonder CRM-gevecht.",
      },
    ],
    hospitality: [
      {
        q: "Bouwen jullie PMS-systemen?",
        a: "Niet vanaf nul — wij integreren met Mews, Cloudbeds en Apaleo. Wij bouwen de revenue- en guest-intelligence-laag erbovenop: AI-pricing, upsell-orchestratie, direct-booking-funnels en rapportages die ook daadwerkelijk de GM bereiken.",
      },
      {
        q: "En voor short-stay verhuurders?",
        a: "Wij werken met STR-operators met 10+ units. Typische build: channel-manager-sync, geautomatiseerde gastberichten, dynamic pricing, schoonmaakrooster en een ops-dashboard dat het team ter plaatse ook daadwerkelijk opent.",
      },
      {
        q: "Kunnen jullie F&B en events naast kamers?",
        a: "Ja. Mixed-use operators (boutique hotel + restaurant + events) zijn een van onze meest waardevolle profielen. Wij brengen kamers, couverts en events samen in één revenue-view, zodat de GM alles in één scherm ziet.",
      },
    ],
    adjacent: [
      {
        q: "Wat valt onder 'aangrenzend'?",
        a: "Sectoren met operator-DNA vergelijkbaar met onze kernsectoren — bouw, professionele dienstverlening, specialty retail, filantropie en family offices. Als je bedrijf omzetgedreven, team-geleid en data-gefragmenteerd is, past het waarschijnlijk.",
      },
      {
        q: "Passen non-profits hierbij?",
        a: "Ja — met name operator-geleide stichtingen en middelgrote subsidiegevers. Philly heeft een filantropiemodule voor donorscoring, subsidie-cycli, impactmetrics en vrijwilligersplanning.",
      },
      {
        q: "Kunnen jullie helpen met family-office-operaties?",
        a: "Ja. Typische builds: dealflow-intake, LP-relatiebeheer, cross-entity-rapportage, beveiligde documentenkluis. Geen fiscaliteit of audit — daarvoor werken we samen met accountants.",
      },
    ],
  },
  de: {
    energy: [
      {
        q: "Arbeiten Sie mit Solar- und Batterieinstallateuren?",
        a: "Ja. Energie ist unsere größte Sparte — Solarteure, Batteriehändler, Wärmepumpen-Betriebe und Hybridinstallateure. Typischer Build: WhatsApp-first-Leadqualifizierung, Verbrauchsreports, Monteurdisposition und Inbetriebnahme.",
      },
      {
        q: "Wie verändert der EEG-Umbruch bzw. Netzengpass alles?",
        a: "Der Übergang vom Einspeise- zum Eigenverbrauchs-Modell verschiebt den Verkauf von Preis auf Amortisation — Ihr Funnel braucht eine Wirtschaftlichkeitsberatung, keine reine Angebotsstrecke. Genau diese Schicht bauen wir.",
      },
      {
        q: "Können Sie an bestehende ERP- oder Field-Service-Tools andocken?",
        a: "Ja. Übliche Integrationen: DATEV, SAP Business One, Lexware, sevDesk sowie proprietäre Field-Service-Apps. Existiert die Schnittstelle nicht, bauen wir sie — eine schlanke Sync-Schicht, die jedes Tool in seiner Domäne autoritativ lässt.",
      },
    ],
    "real-estate": [
      {
        q: "Richtet sich das an Maklerbüros oder Einzelmakler?",
        a: "Beides, optimal für Teams von 3 bis 25 Maklern an einem Standort. Einzelmakler fahren mit Standard-Tools besser; deutschlandweite Ketten brauchen Enterprise-Systeme, die wir bewusst nicht bauen.",
      },
      {
        q: "Integrieren Sie IS24, immowelt oder MLS-Feeds?",
        a: "Ja. Philly liest IS24-, immowelt- und vergleichbare Feeds ein (plus IDX/RESO für die USA). Jedes Objekt wird zum First-Class-Objekt im CRM, inkl. Angeboten, Besichtigungen, Tagen der offenen Tür und Provisionen.",
      },
      {
        q: "Wie sieht es mit Empfehlungsmanagement (SOI) aus?",
        a: "Sphere-of-Influence ist ein Kernmodul in Philly. Bewertet jeden Bestandskunden und schlafenden Lead nach Aktualität, Empfehlungsgeschwindigkeit und Abschlusswahrscheinlichkeit — und liefert täglich eine Shortlist.",
      },
    ],
    hospitality: [
      {
        q: "Bauen Sie PMS-Systeme?",
        a: "Nicht von Grund auf — wir integrieren Mews, Cloudbeds und Apaleo. Darauf bauen wir die Revenue- und Guest-Intelligence-Schicht: KI-Pricing, Upsell-Orchestrierung, Direktbucher-Funnels und Reportings, die wirklich beim GM ankommen.",
      },
      {
        q: "Und Ferienwohnungen / Short-Term-Rentals?",
        a: "Wir arbeiten mit STR-Betreibern ab 10 Einheiten. Typischer Build: Channel-Manager-Sync, automatisierte Gästekommunikation, Dynamic Pricing, Reinigungsplan und ein Ops-Dashboard, das das Team vor Ort tatsächlich öffnet.",
      },
      {
        q: "Geht auch F&B + Events parallel zum Zimmergeschäft?",
        a: "Ja. Mixed-Use-Betreiber (Boutique-Hotel + Restaurant + Event) sind eines unserer profitabelsten Profile. Wir führen Zimmer, Couverts und Events zu einer Revenue-Ansicht zusammen — ein Screen für den GM.",
      },
    ],
    adjacent: [
      {
        q: "Was zählt als 'angrenzend'?",
        a: "Branchen mit ähnlicher Operator-DNA — Bau, professionelle Dienstleistungen, Specialty Retail, Philanthropie, Family Offices. Wenn Ihr Geschäft umsatzgetrieben, teamgeführt und datentechnisch zersplittert ist, passt es wahrscheinlich.",
      },
      {
        q: "Passt das zu gemeinnützigen Organisationen?",
        a: "Ja — insbesondere operativ geführte Stiftungen und mittelgroße Förderer. Philly hat ein Philanthropie-Modul für Donor-Scoring, Fördercyklen, Wirkungskennzahlen und Freiwilligenplanung.",
      },
      {
        q: "Können Sie bei Family-Office-Operationen helfen?",
        a: "Ja. Typische Builds: Dealflow-Intake, LP-Beziehungsmanagement, Cross-Entity-Reporting, sicherer Dokumententresor. Keine Steuer- oder Wirtschaftsprüfung — dafür arbeiten wir mit Partnern.",
      },
    ],
  },
  es: {
    energy: [
      {
        q: "¿Trabajáis con instaladores solares y de baterías?",
        a: "Sí. Energía es nuestro sector principal — instaladores solares, distribuidores de baterías, operadores de bombas de calor e híbridos. Build típico: cualificación de leads por WhatsApp, reporte de consumo, despacho de instaladores y puesta en marcha.",
      },
      {
        q: "¿Cómo cambia la normativa española de autoconsumo el modelo?",
        a: "El giro de compensación simplificada a baterías + excedentes desplaza la venta de precio a periodo de retorno. Tu funnel necesita una capa de estudio de rendimiento, no solo un presupuesto. Construimos precisamente esa capa.",
      },
      {
        q: "¿Podéis integraros con ERP o herramientas de field-service existentes?",
        a: "Sí. Integraciones habituales: Holded, Sage 50, A3, Anfix y apps de field-service a medida. Si la integración no existe, la construimos — una capa fina de sincronización que respeta cada herramienta en su dominio.",
      },
    ],
    "real-estate": [
      {
        q: "¿Es para agencias o para agentes individuales?",
        a: "Ambos, pero el sweet spot son equipos de 3 a 25 agentes en una sola agencia. Agentes en solitario se benefician más de herramientas estándar; las franquicias nacionales necesitan sistemas enterprise que no construimos.",
      },
      {
        q: "¿Integráis con Idealista, Fotocasa o MLS?",
        a: "Sí. Philly procesa feeds de Idealista, Fotocasa y MLS locales (además de IDX/RESO para EE. UU.). Cada inmueble es un objeto first-class del CRM con ofertas, visitas, jornadas abiertas y comisiones asociadas.",
      },
      {
        q: "¿Qué pasa con la esfera de influencia y las referencias?",
        a: "La esfera de influencia es un módulo central en Philly. Puntúa cada cliente y lead dormido por recencia, velocidad de referencia y propensión a cerrar, y produce una lista diaria de cuentas a contactar.",
      },
    ],
    hospitality: [
      {
        q: "¿Construís sistemas PMS?",
        a: "No desde cero — integramos con Mews, Cloudbeds y Apaleo. Encima construimos la capa de revenue e inteligencia de huésped: pricing con IA, orquestación de upsell, funnels de reserva directa y reportes que llegan de verdad al GM.",
      },
      {
        q: "¿Y para alquileres de corta estancia (short-term rentals)?",
        a: "Trabajamos con operadores de STR con 10+ unidades. Build típico: sync de channel manager, mensajería automatizada, pricing dinámico, rotación de limpieza y un dashboard de operaciones que el equipo de campo realmente abre.",
      },
      {
        q: "¿Podéis cubrir F&B y eventos junto a habitaciones?",
        a: "Sí. Operadores de uso mixto (hotel boutique + restaurante + eventos privados) son uno de nuestros perfiles más valiosos. Unificamos habitaciones, cubiertos y eventos en una única vista de revenue para el GM.",
      },
    ],
    adjacent: [
      {
        q: "¿Qué cuenta como 'adyacente'?",
        a: "Sectores con ADN operador similar a nuestros tres principales — construcción, servicios profesionales, specialty retail, filantropía y family offices. Si tu negocio es revenue-driven, team-operated y data-fragmented, probablemente encaje.",
      },
      {
        q: "¿Encaja con entidades sin ánimo de lucro?",
        a: "Sí — en particular fundaciones operadas por sus patronos y financiadores medianos. Philly tiene un módulo de filantropía con scoring de donantes, ciclos de subvención, métricas de impacto y gestión de voluntarios.",
      },
      {
        q: "¿Podéis ayudar con operaciones de family office?",
        a: "Sí. Builds típicos: intake de dealflow, gestión de relaciones con LPs, reporte cross-entidad, bóveda de documentos segura. No impuestos ni auditoría — para eso colaboramos con despachos.",
      },
    ],
  },
};

export function getSectorFaq(locale: Locale, slug: string): FaqItem[] {
  const byLocale = SECTOR_FAQ_BY_LOCALE[locale]?.[slug];
  if (byLocale && byLocale.length > 0) return byLocale;
  // Fallback to English so a new sector without translations still ships.
  return SECTOR_FAQ_BY_LOCALE.en[slug] ?? [];
}

/* ─────────────────────────────────────────────────────────────────────────
   Home- en contact-FAQ per taal.

   Gemeten op 2026-08-03 op de productiebuild: /en, /nl, /de en /es serveerden
   exact dezelfde Engelse vragen en antwoorden — zowel in de zichtbare
   accordeon als in de FAQPage-JSON-LD. Sector-FAQ's waren wél vertaald, deze
   twee sets niet.

   Dat weegt zwaarder dan gewone paginatekst: dit is precies wat AI-overzichten
   citeren, en het stond in structured data op pagina's die zichzelf `lang="nl"`
   noemen. Native geschreven, niet machinaal vertaald — DE in Sie-vorm, ES
   informeel, NL zoals de rest van de site.
   ───────────────────────────────────────────────────────────────────────── */

export const HOME_FAQ_BY_LOCALE: Record<Locale, FaqItem[]> = {
  en: HOME_FAQ,
  nl: [
    {
      q: "Wat is een fractional revenue operator?",
      a: "Een fractional revenue operator is een parttime partner die je omzetsystemen ontwerpt én bouwt — CRM, automatisering, groei-infrastructuur — zonder dat je iemand fulltime aanneemt. Juan Diaz werkt zo met operators in energie, vastgoed en hospitality: advies plus bouw, geen slides.",
    },
    {
      q: "Wat doet Juan Diaz, LLC precies?",
      a: "Juan Diaz, LLC bouwt omzetmotoren voor operators: de CRM, automatiseringen en groei-infrastructuur die van mensen plus software één systeem maken dat zichzelf versterkt. We zijn een holding met eigen ventures (Philly CRM, Voltafy, Help Mij Besparen) en een klein aantal klantopdrachten per jaar.",
    },
    {
      q: "Met welke sectoren werken jullie?",
      a: "Energie (installateurs, zon, batterijen), vastgoed (makelaars, beheer), hospitality met meerdere locaties, en aanverwante sectoren met veel mensen in het veld: logistiek, techniek, klusbedrijven. De rode draad is een buitendienst die omzet maakt en een kantoor dat er grip op probeert te krijgen.",
    },
    {
      q: "Bouwen jullie vanaf nul of richten jullie bestaande tools in?",
      a: "Allebei — het gereedschap volgt de klus. Werkstromen die je onderscheiden bouwen we (of passen we zwaar aan). Standaardwerk zoals mail, boekhouding en loon krijgt de goedkoopste betrouwbare tool die je data niet gijzelt. De voorsprong zit in de koppellaag en twee of drie kernstromen.",
    },
    {
      q: "Wat is een blueprint-gesprek?",
      a: "Een gratis gesprek van 30 minuten waarin we je omzetstroom van begin tot eind in kaart brengen en de twee of drie hefbomen benoemen. Direct, gestructureerd, geen slides. Je gaat weg met een diagnose van één pagina, of we daarna samenwerken of niet.",
    },
    {
      q: "Is het kwartier dat ik kan boeken hetzelfde als een blueprint-gesprek?",
      a: "Nee. De boekingsknop plant een kennismaking van 15 minuten: één vraagstuk, één richting, geen voorbereiding nodig. Het blueprint-gesprek is de langere sessie van 30 minuten met een schriftelijke diagnose achteraf — die plannen we pas als de kennismaking dat waard blijkt.",
    },
    {
      q: "Waar zitten jullie?",
      a: "We werken vanuit Nederland, met klanten door de hele EU en af en toe in de VS. Remote-first, met tijd op locatie voor verkenning en uitrol wanneer dat echt verschil maakt.",
    },
  ],
  de: [
    {
      q: "Was ist ein Fractional Revenue Operator?",
      a: "Ein Fractional Revenue Operator ist ein Teilzeit-Partner, der Ihre Umsatzsysteme entwirft und baut — CRM, Automatisierung, Wachstumsinfrastruktur — ohne dass Sie jemanden fest einstellen. Juan Diaz arbeitet so mit Betreibern in Energie, Immobilien und Hospitality: Beratung plus Umsetzung, keine Folien.",
    },
    {
      q: "Was macht Juan Diaz, LLC konkret?",
      a: "Juan Diaz, LLC baut Umsatzmaschinen für Betreiber: das CRM, die Automatisierungen und die Wachstumsinfrastruktur, die aus Menschen plus Software ein System machen, das sich selbst verstärkt. Wir sind eine Holding mit eigenen Ventures (Philly CRM, Voltafy, Help Mij Besparen) und wenigen Kundenprojekten pro Jahr.",
    },
    {
      q: "Mit welchen Branchen arbeiten Sie?",
      a: "Energie (Installateure, Solar, Speicher), Immobilien (Makler, Verwaltung), Hospitality mit mehreren Standorten sowie angrenzende Branchen mit vielen Leuten im Feld: Logistik, Handwerk, Haustechnik. Gemeinsam ist ihnen ein Außenteam, das Umsatz macht, und ein Büro, das den Überblick behalten will.",
    },
    {
      q: "Bauen Sie von Grund auf oder richten Sie bestehende Tools ein?",
      a: "Beides — das Werkzeug richtet sich nach der Aufgabe. Prozesse, die Sie im Wettbewerb unterscheiden, bauen wir (oder passen sie stark an). Standardkram wie Mail, Buchhaltung und Lohn bekommt das günstigste zuverlässige Tool, das Ihre Daten nicht einsperrt. Der Vorsprung liegt in der Integrationsschicht.",
    },
    {
      q: "Was ist ein Blueprint-Gespräch?",
      a: "Ein kostenloses 30-Minuten-Gespräch, in dem wir Ihren Umsatzfluss von Anfang bis Ende aufzeichnen und die zwei oder drei Hebel benennen. Direkt, strukturiert, ohne Folien. Sie gehen mit einer einseitigen Diagnose heraus — unabhängig davon, ob wir danach zusammenarbeiten.",
    },
    {
      q: "Ist die 15-Minuten-Buchung dasselbe wie ein Blueprint-Gespräch?",
      a: "Nein. Der Buchungslink plant ein 15-minütiges Kennenlernen: ein Problem, eine Richtung, keine Vorbereitung nötig. Das Blueprint-Gespräch ist die längere Sitzung von 30 Minuten mit schriftlicher Diagnose danach — die planen wir erst, wenn sich das Kennenlernen gelohnt hat.",
    },
    {
      q: "Wo sitzen Sie?",
      a: "Wir arbeiten von den Niederlanden aus, mit Kunden in der ganzen EU und gelegentlich in den USA. Remote-first, mit Zeit vor Ort für Analyse und Rollout, wenn es wirklich einen Unterschied macht.",
    },
  ],
  es: [
    {
      q: "¿Qué es un revenue operator fraccional?",
      a: "Un revenue operator fraccional es un socio a tiempo parcial que diseña y construye tus sistemas de ingresos — CRM, automatización, infraestructura de crecimiento — sin que contrates a nadie a jornada completa. Juan Diaz trabaja así con operadores de energía, inmobiliario y hostelería: asesoría más construcción, no diapositivas.",
    },
    {
      q: "¿Qué hace exactamente Juan Diaz, LLC?",
      a: "Juan Diaz, LLC construye motores de ingresos para operadores: el CRM, las automatizaciones y la infraestructura de crecimiento que convierten personas más software en un sistema que se refuerza solo. Somos un holding con productos propios (Philly CRM, Voltafy, Help Mij Besparen) y pocos proyectos de cliente al año.",
    },
    {
      q: "¿Con qué sectores trabajáis?",
      a: "Energía (instaladores, solar, baterías), inmobiliario (agencias, gestión), hostelería con varios locales y sectores afines con mucha gente en campo: logística, oficios, servicios a domicilio. El hilo común es un equipo de campo que genera ingresos y una oficina que intenta entenderlos.",
    },
    {
      q: "¿Construís desde cero o configuráis herramientas existentes?",
      a: "Las dos cosas — la herramienta la decide el trabajo. Lo que te diferencia lo construimos (o lo adaptamos a fondo). Lo genérico (correo, contabilidad, nóminas) se lleva la herramienta fiable más barata que no secuestre tus datos. La ventaja vive en la capa de integración y en dos o tres flujos clave.",
    },
    {
      q: "¿Qué es una llamada blueprint?",
      a: "Una llamada gratuita de 30 minutos en la que trazamos tu flujo de ingresos de principio a fin y señalamos las dos o tres palancas. Directa, estructurada, sin diapositivas. Sales con un diagnóstico de una página, trabajemos juntos después o no.",
    },
    {
      q: "¿La reserva de 15 minutos es lo mismo que una llamada blueprint?",
      a: "No. El enlace de reserva agenda una toma de contacto de 15 minutos: un problema, una dirección, sin preparación. La llamada blueprint es la sesión larga de 30 minutos con diagnóstico escrito después — esa la agendamos cuando la toma de contacto lo justifica.",
    },
    {
      q: "¿Dónde estáis?",
      a: "Trabajamos desde los Países Bajos, con clientes por toda la UE y algún proyecto en EE. UU. Remote-first, con tiempo presencial para el análisis y el despliegue cuando de verdad cambia algo.",
    },
  ],
};

export const CONTACT_FAQ_BY_LOCALE: Record<Locale, FaqItem[]> = {
  en: CONTACT_FAQ,
  nl: [
    {
      q: "Hoe snel reageren jullie?",
      a: "Binnen 24 uur op werkdagen, meestal sneller. Een blueprint-gesprek staat doorgaans binnen een werkweek in de agenda.",
    },
    {
      q: "Wat boek ik precies met die knop?",
      a: "Een kwartier. Kom met één vraagstuk, ga weg met een richting — geen voorbereiding, geen verkooppraatje. Blijkt er iets groters in kaart te brengen, dan plannen we van daaruit een blueprint-gesprek van 30 minuten.",
    },
    {
      q: "Wat gebeurt er in een blueprint-gesprek?",
      a: "Een gestructureerd gesprek van 30 minuten: waar het nu vastloopt, wat je al geprobeerd hebt, hoe een werkend systeem eruit zou zien. Binnen 48 uur krijg je de diagnose van één pagina op papier, of we daarna samenwerken of niet.",
    },
    {
      q: "Tekenen jullie een geheimhoudingsverklaring?",
      a: "Ja — een wederzijdse NDA is op verzoek beschikbaar en bij gevoelige commerciële gesprekken stellen we hem vaak zelf voor. Standaardtermijn twee jaar.",
    },
    {
      q: "Kunnen we klein beginnen?",
      a: "Ja. Veel trajecten starten met een diagnosesprint van 30 dagen voor €2.500 excl. btw. Je eindigt met het bouwplan, een getal per fase, en het eerste onderdeel dat al draait. Allebei blijven van jou, ook als een ander ze uitvoert, en de prijs gaat volledig van de bouw af.",
    },
  ],
  de: [
    {
      q: "Wie schnell antworten Sie?",
      a: "Innerhalb von 24 Stunden an Werktagen, meist schneller. Ein Blueprint-Gespräch steht in der Regel binnen einer Arbeitswoche im Kalender.",
    },
    {
      q: "Was genau buche ich mit diesem Button?",
      a: "Fünfzehn Minuten. Bringen Sie ein Problem mit und gehen Sie mit einer Richtung — ohne Vorbereitung, ohne Verkaufsgespräch. Zeigt sich etwas Größeres, planen wir von dort aus ein 30-minütiges Blueprint-Gespräch.",
    },
    {
      q: "Was passiert in einem Blueprint-Gespräch?",
      a: "Ein strukturiertes Gespräch über 30 Minuten: wo es gerade klemmt, was Sie schon versucht haben, wie ein funktionierendes System aussähe. Innerhalb von 48 Stunden erhalten Sie die einseitige Diagnose schriftlich — unabhängig davon, ob wir danach zusammenarbeiten.",
    },
    {
      q: "Unterzeichnen Sie eine Geheimhaltungsvereinbarung?",
      a: "Ja — eine gegenseitige NDA gibt es auf Anfrage, und bei sensiblen kommerziellen Gesprächen schlagen wir sie oft selbst vor. Standardlaufzeit zwei Jahre.",
    },
    {
      q: "Können wir klein anfangen?",
      a: "Ja. Viele Projekte beginnen mit einem 30-tägigen Diagnose-Sprint für 2.500 € zzgl. MwSt. Am Ende haben Sie den Bauplan mit einer Zahl je Phase und die erste laufende Komponente. Beides bleibt Ihnen, auch wenn es jemand anderes umsetzt, und der Festpreis wird auf den Aufbau voll angerechnet.",
    },
  ],
  es: [
    {
      q: "¿Con qué rapidez respondéis?",
      a: "En menos de 24 horas en días laborables, normalmente antes. Una llamada blueprint suele agendarse dentro de la misma semana laboral.",
    },
    {
      q: "¿Qué reservo exactamente con ese botón?",
      a: "Quince minutos. Trae un problema y sal con una dirección — sin preparación y sin discurso de ventas. Si aparece algo más grande que trazar, agendamos desde ahí una llamada blueprint de 30 minutos.",
    },
    {
      q: "¿Qué pasa en una llamada blueprint?",
      a: "Una conversación estructurada de 30 minutos: dónde se atasca ahora, qué has probado ya, cómo sería un sistema que funcione. En 48 horas recibes el diagnóstico de una página por escrito, trabajemos juntos después o no.",
    },
    {
      q: "¿Firmáis acuerdos de confidencialidad?",
      a: "Sí — hay un NDA mutuo a petición, y en conversaciones comerciales delicadas solemos proponerlo nosotros. Plazo estándar de dos años.",
    },
    {
      q: "¿Podemos empezar poco a poco?",
      a: "Sí. Muchos proyectos arrancan con un sprint de diagnóstico de 30 días por 2.500 € más IVA. Terminas con el plan de obra, una cifra por fase, y el primer componente ya funcionando. Ambos siguen siendo tuyos aunque los ejecute otro, y el precio se descuenta íntegro de la construcción.",
    },
  ],
};

/* ─────────────────────────────────────────────────────────────────────────
   Services-FAQ.

   /services beschrijft vier diensten maar beantwoordde geen enkele koopvraag:
   waar begin je, wat kost het, moet mijn huidige CRM eruit. Dat is de pagina
   met de hoogste intentie zonder FAQ (gemeten 2026-08-03: zeven publieke
   pagina's hadden er geen).

   Elk antwoord hieronder staat op een claim die de site al publiek maakt:
   het gratis blueprint-gesprek van 30 minuten, de diagnosesprint van 30 dagen
   tegen vaste prijs (contact-FAQ), en het traject van 90 dagen met vaste prijs
   gevolgd door een maandelijkse retainer (llms.txt). Er staat bewust GEEN
   bedrag in: het enige prijsgetal dat ik in de codebase vond ("expect five
   figures") stond in BRAND_FAQ, en dat werd nergens gerenderd — een nooit
   gepubliceerde claim ga ik niet alsnog live zetten.
   ───────────────────────────────────────────────────────────────────────── */

export const SERVICES_FAQ_BY_LOCALE: Record<Locale, FaqItem[]> = {
  en: [
    {
      q: "Which of the four services do I need?",
      a: "Start from the symptom, not the service. Numbers you don't trust points to a revenue-engine build. A system nobody runs points to fractional operations. A vendor contract on your desk points to build-vs-buy advisory. A field team guessing points to instruments. If two fit, say so on the call.",
    },
    {
      q: "How does an engagement start?",
      a: "With a free 30-minute blueprint call that ends in a one-page diagnosis. If there is real work, the usual next step is a 30-day diagnostic sprint at €2,500 excl. VAT, which ends in the build plan and the first component already running. The full scope is quoted after that, not before.",
    },
    {
      q: "How is this priced?",
      a: "Per outcome, not per hour. The diagnostic sprint is €2,500 excl. VAT, and it comes off the build price in full if the build follows. A build is a fixed fee for the first 90 days of strategy and construction, followed by a monthly retainer for operations. You get the number after the diagnosis, when it can be honest.",
    },
    {
      q: "Do we have to replace our current CRM?",
      a: "Usually not. Commodity workflows — email, accounting, payroll — should keep the cheapest reliable tool that doesn't hold your data hostage. What gets built is the integration layer plus the two or three flows that actually differentiate you. Replacing everything is rarely the cheapest path.",
    },
    {
      q: "Can I hire you for the advice only?",
      a: "Yes. Build-vs-buy advisory is a standalone engagement: you get a written answer on what to buy, what to build, and where the integration cost really lands. No obligation to have us build it afterwards — plenty of clients take the answer and execute in-house.",
    },
  ],
  nl: [
    {
      q: "Welke van de vier heb ik nodig?",
      a: "Begin bij het symptoom, niet bij de dienst. Cijfers die je niet vertrouwt wijzen op een revenue-engine build. Een systeem dat niemand bijhoudt wijst op fractional operations. Een leverancierscontract op je bureau wijst op build-vs-buy-advies. Een buitendienst die gokt wijst op instrumenten.",
    },
    {
      q: "Hoe begint een traject?",
      a: "Met een gratis blueprint-gesprek van 30 minuten dat eindigt in een diagnose van één pagina. Is er echt werk, dan volgt meestal een diagnosesprint van 30 dagen voor €2.500 excl. btw, die eindigt in het bouwplan en het eerste onderdeel dat al draait. De volledige scope offreren we daarna.",
    },
    {
      q: "Hoe wordt dit geprijsd?",
      a: "Per uitkomst, niet per uur. De diagnosesprint kost €2.500 excl. btw, en dat bedrag gaat er volledig vanaf als de bouw volgt. Een build is een vaste prijs voor de eerste 90 dagen strategie en bouw, gevolgd door een maandelijkse retainer voor beheer. Het bedrag krijg je ná de diagnose, wanneer het eerlijk kan zijn.",
    },
    {
      q: "Moet ons huidige CRM eruit?",
      a: "Meestal niet. Standaardwerk — mail, boekhouding, loon — houdt de goedkoopste betrouwbare tool die je data niet gijzelt. Wat we bouwen is de koppellaag plus de twee of drie stromen die je écht onderscheiden. Alles vervangen is zelden de goedkoopste route.",
    },
    {
      q: "Kan ik jullie alleen voor het advies inhuren?",
      a: "Ja. Build-vs-buy-advies is een losse opdracht: je krijgt een schriftelijk antwoord op wat je koopt, wat je bouwt, en waar de integratiekosten echt landen. Zonder verplichting om het daarna door ons te laten bouwen — genoeg klanten voeren het zelf uit.",
    },
  ],
  de: [
    {
      q: "Welche der vier Leistungen brauche ich?",
      a: "Gehen Sie vom Symptom aus, nicht von der Leistung. Zahlen, denen Sie nicht trauen, deuten auf einen Revenue-Engine-Build. Ein System, das niemand pflegt, auf Fractional Operations. Ein Anbietervertrag auf dem Tisch auf Build-vs-Buy-Beratung. Ein ratender Außendienst auf Instrumente.",
    },
    {
      q: "Wie beginnt ein Projekt?",
      a: "Mit einem kostenlosen 30-minütigen Blueprint-Gespräch, das mit einer einseitigen Diagnose endet. Gibt es echte Arbeit, folgt meist ein 30-tägiger Diagnose-Sprint für 2.500 € zzgl. MwSt., der mit dem Bauplan und der ersten laufenden Komponente endet. Der volle Umfang wird danach kalkuliert.",
    },
    {
      q: "Wie wird das kalkuliert?",
      a: "Nach Ergebnis, nicht nach Stunde. Der Diagnose-Sprint kostet 2.500 € zzgl. MwSt., die voll angerechnet werden, wenn der Aufbau folgt. Ein Build ist ein Festpreis für die ersten 90 Tage Strategie und Umsetzung, danach ein monatliches Retainer für den Betrieb. Die Zahl bekommen Sie nach der Diagnose — dann, wenn sie ehrlich sein kann.",
    },
    {
      q: "Müssen wir unser jetziges CRM ersetzen?",
      a: "Meistens nicht. Standardprozesse — Mail, Buchhaltung, Lohn — behalten das günstigste zuverlässige Werkzeug, das Ihre Daten nicht einsperrt. Gebaut wird die Integrationsschicht plus die zwei oder drei Abläufe, die Sie wirklich unterscheiden. Alles zu ersetzen ist selten der günstigste Weg.",
    },
    {
      q: "Kann ich Sie nur für die Beratung buchen?",
      a: "Ja. Die Build-vs-Buy-Beratung ist ein eigenständiges Mandat: Sie erhalten eine schriftliche Antwort darauf, was zu kaufen, was zu bauen ist und wo die Integrationskosten wirklich anfallen. Ohne Verpflichtung, danach bei uns zu bauen — viele setzen es intern um.",
    },
  ],
  es: [
    {
      q: "¿Cuál de los cuatro servicios necesito?",
      a: "Parte del síntoma, no del servicio. Números en los que no confías apuntan a construir el motor de ingresos. Un sistema que nadie mantiene apunta a operaciones fraccionales. Un contrato de proveedor sobre tu mesa apunta a asesoría build-vs-buy. Un equipo de campo que adivina apunta a instrumentos.",
    },
    {
      q: "¿Cómo empieza un proyecto?",
      a: "Con una llamada blueprint gratuita de 30 minutos que termina en un diagnóstico de una página. Si hay trabajo real, lo habitual es un sprint de diagnóstico de 30 días por 2.500 € más IVA, que termina en el plan de obra y el primer componente ya funcionando. El alcance completo se presupuesta después.",
    },
    {
      q: "¿Cómo se fija el precio?",
      a: "Por resultado, no por hora. El sprint de diagnóstico cuesta 2.500 € más IVA, y se descuenta íntegro si sigue la construcción. Una construcción es precio fijo para los primeros 90 días de estrategia y desarrollo, seguido de una cuota mensual de operación. Recibes la cifra tras el diagnóstico, cuando puede ser honesta.",
    },
    {
      q: "¿Hay que sustituir nuestro CRM actual?",
      a: "Normalmente no. Lo genérico — correo, contabilidad, nóminas — se queda con la herramienta fiable más barata que no secuestre tus datos. Lo que se construye es la capa de integración y los dos o tres flujos que de verdad te diferencian. Sustituirlo todo rara vez sale más barato.",
    },
    {
      q: "¿Puedo contrataros solo para el consejo?",
      a: "Sí. La asesoría build-vs-buy es un encargo independiente: recibes una respuesta escrita sobre qué comprar, qué construir y dónde caen de verdad los costes de integración. Sin obligación de que lo construyamos después — muchos clientes lo ejecutan internamente.",
    },
  ],
};

export function getServicesFaq(locale: Locale): FaqItem[] {
  return SERVICES_FAQ_BY_LOCALE[locale] ?? SERVICES_FAQ_BY_LOCALE.en;
}

export function getHomeFaq(locale: Locale): FaqItem[] {
  return HOME_FAQ_BY_LOCALE[locale] ?? HOME_FAQ_BY_LOCALE.en;
}

export function getContactFaq(locale: Locale): FaqItem[] {
  return CONTACT_FAQ_BY_LOCALE[locale] ?? CONTACT_FAQ_BY_LOCALE.en;
}

/** Elke FAQ-string van één taal, met het veldpad als sleutel.
 *
 *  Bestaat zodat de drie taalpoorten dit bestand kunnen lezen. Tot 24 augustus
 *  deed geen enkele dat: 58 strings per taal die in geen poort stonden. Het
 *  kostte wat je verwacht — de vier sector-FAQ's spraken het bedrijf met
 *  ustedes aan terwijl HOME, CONTACT en SERVICES in ditzelfde bestand vosotros
 *  zeiden, en dat stond er maanden.
 *
 *  Wordt deze lijst niet bijgewerkt bij een nieuwe *_BY_LOCALE-export, dan
 *  leest de poort stil minder. `lib/seo/faq-dekking.test.ts` telt daarom de
 *  exports in de bestandstekst en legt dat naast wat hier wordt uitgelezen —
 *  een module-import kan een export die hij niet noemt per definitie niet zien. */
export function faqStrings(locale: Locale): Array<[pad: string, waarde: string]> {
  const uit: Array<[string, string]> = [];
  const vlak = (naam: string, xs: FaqItem[]) =>
    xs.forEach((it, i) => {
      uit.push([`${naam}[${i}].q`, it.q]);
      uit.push([`${naam}[${i}].a`, it.a]);
    });
  vlak("HOME", HOME_FAQ_BY_LOCALE[locale] ?? []);
  vlak("CONTACT", CONTACT_FAQ_BY_LOCALE[locale] ?? []);
  vlak("SERVICES", SERVICES_FAQ_BY_LOCALE[locale] ?? []);
  const sectoren = SECTOR_FAQ_BY_LOCALE[locale] ?? {};
  for (const slug of Object.keys(sectoren)) vlak(`SECTOR.${slug}`, sectoren[slug] ?? []);
  return uit;
}

