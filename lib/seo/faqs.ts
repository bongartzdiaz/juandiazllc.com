// FAQ content keyed by page or sector. Answer-box-optimized: every answer
// starts with a definitive sentence so AI overviews can extract a clean
// 1-line citation. Keep answers under 300 chars each — longer and the
// citation gets truncated mid-thought.

import type { FaqItem } from "./schema";
import type { Locale } from "@/lib/i18n/dict";

export const HOME_FAQ: FaqItem[] = [
  {
    q: "Who is Juan Diaz?",
    a: "Juan Diaz (full name: Juan Stefan Bongartz Diaz) is the founder of Juan Diaz, LLC — a holding company that builds revenue engines for operators in energy, real estate and hospitality. Construction-management-trained, operator-built. Based in Amsterdam, Netherlands.",
  },
  {
    q: "Who runs Juan Diaz, LLC?",
    a: "Juan Stefan Bongartz Diaz runs Juan Diaz, LLC as a solo founder. The company ships operator software (Philly CRM, Voltafy, Help Mij Besparen) and takes on a small number of advisory-plus-build engagements per year. No team page because there is no team — one founder, five phases, zero fluff.",
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
    q: "Where are you based?",
    a: "Operating out of the Netherlands with clients across the EU and occasional US engagements. Remote-first, with on-site time for discovery and rollouts when it moves the needle.",
  },
];

export const BRAND_FAQ: FaqItem[] = [
  {
    q: "Who is Juan Diaz?",
    a: "Juan Diaz — formally Juan Stefan Bongartz Diaz — is the founder of Juan Diaz, LLC. Construction-management-trained operator turned systems-builder. Amsterdam-based, building and shipping operator software across energy, real estate and hospitality.",
  },
  {
    q: "Who founded Juan Diaz, LLC?",
    a: "Juan Stefan Bongartz Diaz founded Juan Diaz, LLC as a solo holding company. The firm builds revenue engines for operators through internal ventures (Philly CRM, Voltafy, Help Mij Besparen) and a small number of external engagements per year.",
  },
  {
    q: "What does Juan Diaz, LLC do?",
    a: "Juan Diaz, LLC builds revenue engines for operators — CRM, automation, and growth infrastructure for companies in energy, real estate, hospitality and adjacent industries. Engagement is advisory-plus-build: blueprint, then ship.",
  },
  {
    q: "Who is the right client for a blueprint call?",
    a: "Operator-founders of 10-to-50-person companies whose growth is bottlenecked by missing systems rather than missing demand. Typical profile: profitable, manual, and ready to stop running the business out of WhatsApp and memory.",
  },
  {
    q: "How is Juan Diaz, LLC different from a typical consultancy?",
    a: "We ship the systems we recommend. Every engagement ends with working software — usually a tailored build on top of Philly (our operator CRM) — not a slide deck. Consulting-to-code ratio is roughly 30/70.",
  },
  {
    q: "Which regions do you serve?",
    a: "Primary markets are the Netherlands, Germany, Spain and the United States. Delivery is remote-first with on-site kickoff when the engagement justifies travel. Content and dashboards ship in English, Dutch, German and Spanish.",
  },
  {
    q: "How does pricing work?",
    a: "Blueprint calls are free. Paid engagements are priced per outcome, not per hour — typically a fixed fee for the first 90 days (strategy + build) followed by a monthly retainer for operations. Expect five figures; we are not the cheapest option.",
  },
];

export const CONTACT_FAQ: FaqItem[] = [
  {
    q: "How fast do you reply?",
    a: "Within 24 hours on weekdays, often sooner. Blueprint calls are typically scheduled within one business week.",
  },
  {
    q: "What happens on a blueprint call?",
    a: "A 30-minute structured conversation: current bottleneck, what you've already tried, what a working system would look like. You leave with a two-page written plan within 48 hours, whether or not we work together.",
  },
  {
    q: "Do you sign NDAs?",
    a: "Yes — a mutual NDA is available on request and we often initiate it ourselves for sensitive commercial conversations. Standard 2-year term.",
  },
  {
    q: "Can we start small?",
    a: "Yes. Many engagements begin with a 30-day diagnostic sprint so both sides can de-risk before committing to a build. The diagnostic is charged as a flat fee and the full scope is quoted afterward.",
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
        q: "¿Trabajan con instaladores solares y de baterías?",
        a: "Sí. Energía es nuestro sector principal — instaladores solares, distribuidores de baterías, operadores de bombas de calor e híbridos. Build típico: cualificación de leads por WhatsApp, reporte de consumo, despacho de instaladores y puesta en marcha.",
      },
      {
        q: "¿Cómo cambia la normativa española de autoconsumo el modelo?",
        a: "El giro de compensación simplificada a baterías + excedentes desplaza la venta de precio a periodo de retorno. Su funnel necesita una capa de estudio de rendimiento, no solo un presupuesto. Construimos precisamente esa capa.",
      },
      {
        q: "¿Pueden integrarse con ERP o herramientas de field-service existentes?",
        a: "Sí. Integraciones habituales: Holded, Sage 50, A3, Anfix y apps de field-service a medida. Si la integración no existe, la construimos — una capa fina de sincronización que respeta cada herramienta en su dominio.",
      },
    ],
    "real-estate": [
      {
        q: "¿Es para agencias o para agentes individuales?",
        a: "Ambos, pero el sweet spot son equipos de 3 a 25 agentes en una sola agencia. Agentes en solitario se beneficien más de herramientas estándar; las franquicias nacionales necesitan sistemas enterprise que no construimos.",
      },
      {
        q: "¿Integran con Idealista, Fotocasa o MLS?",
        a: "Sí. Philly procesa feeds de Idealista, Fotocasa y MLS locales (además de IDX/RESO para EE. UU.). Cada inmueble es un objeto first-class del CRM con ofertas, visitas, jornadas abiertas y comisiones asociadas.",
      },
      {
        q: "¿Qué pasa con la esfera de influencia y las referencias?",
        a: "La esfera de influencia es un módulo central en Philly. Puntúa cada cliente y lead dormido por recencia, velocidad de referencia y propensión a cerrar, y produce una lista diaria de cuentas a contactar.",
      },
    ],
    hospitality: [
      {
        q: "¿Construyen sistemas PMS?",
        a: "No desde cero — integramos con Mews, Cloudbeds y Apaleo. Encima construimos la capa de revenue e inteligencia de huésped: pricing con IA, orquestación de upsell, funnels de reserva directa y reportes que llegan de verdad al GM.",
      },
      {
        q: "¿Y para alquileres de corta estancia (short-term rentals)?",
        a: "Trabajamos con operadores de STR con 10+ unidades. Build típico: sync de channel manager, mensajería automatizada, pricing dinámico, rotación de limpieza y un dashboard de operaciones que el equipo de campo realmente abre.",
      },
      {
        q: "¿Pueden cubrir F&B y eventos junto a habitaciones?",
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
        q: "¿Pueden ayudar con operaciones de family office?",
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

// Per-locale HOME FAQ. Before this block the homepage FAQ rendered
// English on every locale — same AI-overview citation problem as
// sector FAQs. Native copy for each locale; brand terms (Juan Diaz,
// LLC, Philly CRM, Voltafy, Help Mij Besparen, Salderingsregeling)
// kept untranslated. Name + alternate name in the first sentence of
// the first two entries so Knowledge Panel disambiguation works
// regardless of which locale Google indexes first.
export const HOME_FAQ_BY_LOCALE: Record<Locale, FaqItem[]> = {
  en: HOME_FAQ,
  nl: [
    {
      q: "Wie is Juan Diaz?",
      a: "Juan Diaz (volledige naam: Juan Stefan Bongartz Diaz) is oprichter van Juan Diaz, LLC — een holding die omzetmotoren bouwt voor operators in energie, vastgoed en horeca. Getraind in bouwmanagement, door operators gebouwd. Gevestigd in Amsterdam.",
    },
    {
      q: "Wie runt Juan Diaz, LLC?",
      a: "Juan Stefan Bongartz Diaz runt Juan Diaz, LLC als solo-oprichter. Het bedrijf levert operator-software (Philly CRM, Voltafy, Help Mij Besparen) en neemt een klein aantal advisory-plus-build opdrachten per jaar aan. Geen teampagina want er is geen team — één oprichter, vijf fases, nul gezwets.",
    },
    {
      q: "Wat doet Juan Diaz, LLC eigenlijk?",
      a: "Juan Diaz, LLC bouwt omzetmotoren voor operators — de CRM, automatiseringen en groei-infrastructuur die van een team mensen plus software een samenstellend systeem maken. We opereren als holding met interne ventures (Philly CRM, Voltafy, Help Mij Besparen) en een klein aantal operator-opdrachten per jaar.",
    },
    {
      q: "Met welke sectoren werken jullie?",
      a: "Energie (installateurs, zonnepanelen, batterijen), vastgoed (makelaars, vastgoedbeheer), horeca (multi-locatie) en operator-zware aanverwante sectoren zoals logistiek, ambachten en thuisdiensten. De rode draad: een veldteam dat omzet genereert en een kantoor dat er chocola van probeert te maken.",
    },
    {
      q: "Bouwen jullie vanaf nul of configureren jullie bestaande tools?",
      a: "Allebei — we matchen het gereedschap aan de klus. Kernworkflows die jouw bedrijf onderscheiden worden gebouwd (of zwaar aangepast). Commodity-workflows (mail, boekhouden, payroll) krijgen de goedkoopste betrouwbare tool die je datacontracten niet breekt. De moat zit in de integratielaag plus twee of drie kernflows — niet in het bezitten van elke SaaS-seat.",
    },
    {
      q: "Wat is een blueprint-gesprek?",
      a: "Een gratis gesprek van 30 minuten waarin we jouw huidige omzetstroom van begin tot eind in kaart brengen en de twee of drie hefboompunten identificeren. Recht voor z'n raap, gestructureerd, geen sheets. Je vertrekt met een eenpagina-diagnose, ongeacht of we daarna samenwerken.",
    },
    {
      q: "Waar zitten jullie?",
      a: "We opereren vanuit Nederland met klanten door de EU en af en toe opdrachten in de VS. Remote-first, met on-site tijd voor ontdekking en uitrol als dat de naald beweegt.",
    },
  ],
  de: [
    {
      q: "Wer ist Juan Diaz?",
      a: "Juan Diaz (vollständiger Name: Juan Stefan Bongartz Diaz) ist Gründer von Juan Diaz, LLC — einer Holding, die Umsatzmotoren für Operators in Energie, Immobilien und Gastgewerbe baut. Bauleitungs-geschult, operatorgebaut. Sitz in Amsterdam, Niederlande.",
    },
    {
      q: "Wer leitet Juan Diaz, LLC?",
      a: "Juan Stefan Bongartz Diaz leitet Juan Diaz, LLC als Solo-Gründer. Das Unternehmen liefert Operator-Software (Philly CRM, Voltafy, Help Mij Besparen) und übernimmt pro Jahr eine kleine Anzahl an Advisory-plus-Build-Engagements. Keine Team-Seite, weil es kein Team gibt — ein Gründer, fünf Phasen, null Geschwafel.",
    },
    {
      q: "Was macht Juan Diaz, LLC eigentlich?",
      a: "Juan Diaz, LLC baut Umsatzmotoren für Operators — CRM, Automatisierungen und Wachstumsinfrastruktur, die aus einem Team von Menschen plus Software ein sich verstärkendes System machen. Wir operieren als Holding mit internen Ventures (Philly CRM, Voltafy, Help Mij Besparen) und wenigen Operator-Engagements pro Jahr.",
    },
    {
      q: "Mit welchen Branchen arbeiten Sie?",
      a: "Energie (Installateure, Solar, Batterien), Immobilien (Makler, Hausverwaltung), Gastgewerbe (Multi-Location) und operatorlastige angrenzende Branchen wie Logistik, Handwerk und Haushaltsdienste. Der rote Faden: ein Feldteam, das Umsatz erzeugt, und ein Büro, das Ordnung hineinbringen will.",
    },
    {
      q: "Bauen Sie von Grund auf oder konfigurieren Sie bestehende Tools?",
      a: "Beides — wir passen das Werkzeug zum Auftrag an. Kern-Workflows, die Ihr Unternehmen unterscheiden, werden gebaut (oder stark angepasst). Commodity-Workflows (E-Mail, Buchhaltung, Payroll) bekommen das günstigste verlässliche Tool, das Ihre Datenverträge nicht bricht. Der Burggraben liegt in der Integrationsebene plus zwei bis drei Kern-Flows — nicht darin, jeden SaaS-Platz zu besitzen.",
    },
    {
      q: "Was ist ein Blueprint-Call?",
      a: "Ein kostenloser 30-minütiger Call, in dem wir Ihren aktuellen Umsatzfluss Ende-zu-Ende kartieren und die zwei oder drei Hebelpunkte identifizieren. Direkt, strukturiert, keine Folien. Sie verlassen den Call mit einer einseitigen Diagnose — unabhängig davon, ob wir danach zusammenarbeiten.",
    },
    {
      q: "Wo sitzen Sie?",
      a: "Wir operieren von den Niederlanden aus mit Kunden in der EU und gelegentlichen US-Engagements. Remote-first, mit Vor-Ort-Zeit für Discovery und Rollout, wenn es den Unterschied macht.",
    },
  ],
  es: [
    {
      q: "¿Quién es Juan Diaz?",
      a: "Juan Diaz (nombre completo: Juan Stefan Bongartz Diaz) es el fundador de Juan Diaz, LLC — una holding que construye motores de ingresos para operadores en energía, real estate y hospitality. Formado en gestión de construcción, hecho por operadores. Con sede en Ámsterdam.",
    },
    {
      q: "¿Quién dirige Juan Diaz, LLC?",
      a: "Juan Stefan Bongartz Diaz dirige Juan Diaz, LLC como fundador en solitario. La empresa entrega software para operadores (Philly CRM, Voltafy, Help Mij Besparen) y acepta un número reducido de encargos advisory-plus-build al año. Sin página de equipo porque no hay equipo — un fundador, cinco fases, cero relleno.",
    },
    {
      q: "¿Qué hace Juan Diaz, LLC en realidad?",
      a: "Juan Diaz, LLC construye motores de ingresos para operadores — el CRM, las automatizaciones y la infraestructura de crecimiento que convierten a un equipo de personas más software en un sistema que compone. Operamos como holding con ventures internas (Philly CRM, Voltafy, Help Mij Besparen) y un número reducido de encargos para operadores al año.",
    },
    {
      q: "¿Con qué sectores trabajan?",
      a: "Energía (instaladores, solar, baterías), real estate (inmobiliarias, property management), hospitality (multi-sede) y sectores adyacentes pesados en operadores como logística, oficios y servicios a domicilio. El hilo común: un equipo de campo que genera ingresos y una oficina que intenta entenderlos.",
    },
    {
      q: "¿Construyen desde cero o configuran herramientas existentes?",
      a: "Ambas — adaptamos la herramienta al trabajo. Los flujos que diferencian tu negocio se construyen (o se personalizan a fondo). Los flujos commodity (email, contabilidad, nóminas) se resuelven con la herramienta fiable más barata que no rompa tus contratos de datos. El foso está en la capa de integración más dos o tres flujos centrales — no en poseer cada asiento de cada SaaS.",
    },
    {
      q: "¿Qué es una llamada blueprint?",
      a: "Una llamada gratuita de 30 minutos en la que mapeamos tu flujo de ingresos actual de punta a punta e identificamos los dos o tres puntos de apalancamiento. Directa, estructurada, sin diapositivas. Sales con un diagnóstico de una página, trabajemos juntos después o no.",
    },
    {
      q: "¿Dónde tienen la base?",
      a: "Operamos desde los Países Bajos con clientes por toda la UE y encargos ocasionales en EE. UU. Remote-first, con tiempo presencial para discovery y rollout cuando mueve la aguja.",
    },
  ],
};

// Per-locale CONTACT FAQ — short, practical, pre-call objection-
// handlers. Same translation discipline as HOME_FAQ_BY_LOCALE.
export const CONTACT_FAQ_BY_LOCALE: Record<Locale, FaqItem[]> = {
  en: CONTACT_FAQ,
  nl: [
    {
      q: "Hoe snel reageren jullie?",
      a: "Binnen 24 uur op werkdagen, vaak sneller. Blueprint-gesprekken worden doorgaans binnen één werkweek ingepland.",
    },
    {
      q: "Wat gebeurt er op een blueprint-gesprek?",
      a: "Een gestructureerd gesprek van 30 minuten: huidige bottleneck, wat je al geprobeerd hebt, hoe een werkend systeem eruit zou zien. Je vertrekt met een tweepagina-plan binnen 48 uur, ongeacht of we daarna samenwerken.",
    },
    {
      q: "Tekenen jullie NDA's?",
      a: "Ja — een wederzijdse NDA is op verzoek beschikbaar en we initiëren hem vaak zelf voor gevoelige commerciële gesprekken. Standaard 2-jarige looptijd.",
    },
    {
      q: "Kunnen we klein beginnen?",
      a: "Ja. Veel opdrachten starten met een diagnostische sprint van 30 dagen, zodat beide kanten kunnen de-risken voordat we committeren aan een build. De diagnose wordt als vaste prijs gefactureerd en de volledige scope wordt daarna geoffreerd.",
    },
  ],
  de: [
    {
      q: "Wie schnell antworten Sie?",
      a: "Innerhalb von 24 Stunden an Werktagen, oft schneller. Blueprint-Calls werden in der Regel innerhalb einer Arbeitswoche terminiert.",
    },
    {
      q: "Was passiert auf einem Blueprint-Call?",
      a: "Ein strukturiertes 30-minütiges Gespräch: aktueller Bottleneck, was Sie bereits versucht haben, wie ein funktionierendes System aussähe. Sie gehen mit einem zweiseitigen schriftlichen Plan innerhalb von 48 Stunden — unabhängig davon, ob wir danach zusammenarbeiten.",
    },
    {
      q: "Unterschreiben Sie NDAs?",
      a: "Ja — eine gegenseitige NDA ist auf Anfrage verfügbar und wir initiieren sie häufig selbst bei sensiblen kommerziellen Gesprächen. Standard-Laufzeit: 2 Jahre.",
    },
    {
      q: "Können wir klein anfangen?",
      a: "Ja. Viele Engagements beginnen mit einem 30-tägigen Diagnose-Sprint, damit beide Seiten vor dem Commitment zu einem Build entschärfen können. Die Diagnose wird als Festpreis abgerechnet, der volle Scope wird danach angeboten.",
    },
  ],
  es: [
    {
      q: "¿Con qué rapidez responden?",
      a: "En menos de 24 horas en días laborables, a menudo antes. Las llamadas blueprint se suelen agendar dentro de una semana laboral.",
    },
    {
      q: "¿Qué pasa en una llamada blueprint?",
      a: "Una conversación estructurada de 30 minutos: cuello de botella actual, lo que ya has probado, cómo se vería un sistema que funciona. Sales con un plan escrito de dos páginas en 48 horas, trabajemos juntos después o no.",
    },
    {
      q: "¿Firman NDAs?",
      a: "Sí — un NDA mutuo está disponible a petición y a menudo lo iniciamos nosotros para conversaciones comerciales sensibles. Plazo estándar: 2 años.",
    },
    {
      q: "¿Podemos empezar poco a poco?",
      a: "Sí. Muchos encargos comienzan con un sprint diagnóstico de 30 días para que ambas partes puedan reducir riesgo antes de comprometerse a un build. El diagnóstico se factura como precio cerrado y el alcance completo se cotiza después.",
    },
  ],
};

export function getHomeFaq(locale: Locale): FaqItem[] {
  return HOME_FAQ_BY_LOCALE[locale] ?? HOME_FAQ_BY_LOCALE.en;
}

export function getContactFaq(locale: Locale): FaqItem[] {
  return CONTACT_FAQ_BY_LOCALE[locale] ?? CONTACT_FAQ_BY_LOCALE.en;
}
