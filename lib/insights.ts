// Typed content collection for /insights. Keeps the build simple — no
// MDX runtime, no filesystem reads at request time — but still lets
// each post carry rich metadata (tags, reading time, SEO, OG image)
// so the listing page, RSS feed, sitemap and Article schema can all
// source from one truth.

import type { Locale } from "@/lib/i18n/dict";

/** Localized overrides for a post's user-facing content. */
export type InsightL10n = {
  title: string;
  summary: string;
  body: InsightBlock[];
  /** Zoektitel en -beschrijving per taal. Nodig omdat een vertaalde titel een
   *  andere lengte heeft dan het origineel: "Why operator CRMs fail" past,
   *  "Warum Betreiber-CRMs in 90 Tagen scheitern" niet. Ontbreekt hij, dan
   *  valt de pagina terug op het seo-veld van de basispost. */
  seo?: { metaTitle?: string; metaDescription?: string };
};

export type Insight = {
  slug: string;
  title: string;
  summary: string;
  tag: string;
  publishedAt: string;
  /** Last meaningful content update (ISO). Feeds BlogPosting.dateModified for
   *  freshness signals; falls back to publishedAt when absent. */
  updatedAt?: string;
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
  | { type: "quote"; text: string; cite?: string }
  /** Inline call-to-action rendered as a button link. Used for internal links
   *  to tools/pages that the plain-text `p` renderer can't carry (e.g. the
   *  energy-ROI calculator). `href` is locale-less; middleware resolves it. */
  | { type: "cta"; text: string; href: string };

export const POSTS: Insight[] = [
  {
    slug: "the-automation-roi-myth",
    title: "The automation ROI myth, and what actually pays back",
    summary:
      "Most automation projects save hours nobody was going to spend anyway. Three rules for picking the ones that actually move the P&L — and one test to apply before you buy another tool.",
    tag: "Systems",
    publishedAt: "2026-01-22",
    readingMinutes: 6,
    seo: {
      metaTitle: "Automation ROI: what actually pays back",
      metaDescription:
        "Most automation saves hours nobody would have spent. Three questions that separate real ROI from theatre, and one test before you buy.",
    },
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
    ],
    i18n: {
      nl: {
        seo: {
          metaTitle: "Automatiserings-ROI: wat echt terugverdient",
          metaDescription:
            "De meeste automatisering bespaart uren die niemand toch al maakte. Drie vragen die echte ROI van theater scheiden, en een test vooraf.",
        },
        title: "De automatiserings-ROI-mythe, en wat wél terugverdient",
        summary:
          "De meeste automatiseringsprojecten besparen uren die niemand toch al ging maken. Drie regels om de projecten te kiezen die de P&L echt verzetten — en één test vóór je weer een tool koopt.",
        body: [
          { type: "p", text: "Elke operator die ik spreek heeft een slidedeck van een adviseur liggen waarin staat dat het team 400 uur per jaar bespaart. Meestal is dat getal rekenkundige fictie: uren die nooit gefactureerd zouden zijn, afspraken die nooit gepland zouden worden, werk dat nooit gedaan zou worden. Echte automatiserings-ROI is smaller en harder." },
          { type: "h2", text: "De drie vragen die echte ROI van theater scheiden" },
          { type: "ul", items: [
            "Wordt het werk dat je automatiseert nu gedaan door iemand die je knelpunt is? Zo nee, dan maak je geen capaciteit vrij maar iemand die al ruimte had sneller.",
            "Haalt de automatisering een beslissing weg, of versnelt hij alleen invoerwerk? Weggehaalde beslissingen stapelen zich op; snellere invoer loopt vast rond twintig procent van de theoretische besparing.",
            "Merkt iemand het als het een week stukstaat? Is het antwoord nee, dan heb je een museum geautomatiseerd.",
          ] },
          { type: "h2", text: "De test vóór je koopt" },
          { type: "p", text: "Schrijf de drie meest waardevolle uren op die je beste medewerker in een gewone week maakt. Raakt de automatisering die je overweegt die drie uur niet rechtstreeks, dan is de ROI theater. Leg hem weg. De winst van vijf uur per week automatiseren bij een knelpunt is groter dan vijftig uur bij mensen die geen knelpunt zijn." },
          { type: "quote", text: "Automatiserings-ROI meet je aan wat er uit de wachtrij verdwijnt, niet aan wat er sneller gaat." },
          { type: "p", text: "De operators die groeien houden op activiteit met doorstroom te verwarren. Je wilt minder automatiseringen, gericht op scherpere doelen, elk terugverdiend in weken en niet in kwartalen." },
        ],
      },
      de: {
        seo: {
          metaTitle: "Automatisierungs-ROI: was sich rechnet",
          metaDescription:
            "Die meiste Automatisierung spart Stunden, die niemand gearbeitet hätte. Drei Fragen, die echten ROI von Theater trennen, und ein Test vorab.",
        },
        title: "Der Mythos vom Automatisierungs-ROI — und was sich wirklich auszahlt",
        summary:
          "Die meisten Automatisierungsprojekte sparen Stunden, die ohnehin niemand investiert hätte. Drei Regeln, um die auszuwählen, die wirklich die GuV bewegen — und ein Test, bevor Sie das nächste Tool kaufen.",
        body: [
          { type: "p", text: "Jeder Operator, den ich treffe, hat ein Foliendeck von irgendeinem Berater, das behauptet, sein Team werde 400 Stunden pro Jahr sparen. Meistens ist diese Zahl rechnerische Fiktion — Stunden, die nie abgerechnet worden wären, Meetings, die nie gebucht worden wären, Arbeit, die nie erledigt worden wäre. Echter Automatisierungs-ROI ist enger und härter." },
          { type: "h2", text: "Die drei Fragen, die echten ROI von Theater trennen" },
          { type: "ul", items: [
            "Wird die automatisierte Arbeit derzeit von einer Person erledigt, die Ihr Engpass ist? Wenn nein, schaffen Sie keine Kapazität frei, Sie machen die ohnehin Untätigen schneller.",
            "Entfernt die Automatisierung eine Entscheidung, oder beschleunigt sie nur die Dateneingabe? Entfernte Entscheidungen summieren sich; schnellere Dateneingabe sättigt bei vielleicht 20 Prozent der theoretischen Einsparung.",
            "Wenn es eine Woche lang ausfällt, bemerkt es jemand? Wenn nein, haben Sie ein Museum automatisiert."
          ]},
          { type: "h2", text: "Der Test, bevor Sie kaufen" },
          { type: "p", text: "Notieren Sie die drei wertvollsten Stunden, die Ihr Leistungsträger in einer typischen Woche verbringt. Wenn Ihre Kandidaten-Automatisierung diese drei Stunden nicht direkt berührt, ist der ROI Theater. Legen Sie sie zur Seite. Der Gewinn aus der Automatisierung einer Engpass-Person für fünf Stunden pro Woche übertrifft die Automatisierung von zehn Nicht-Engpässen für fünfzig." },
          { type: "quote", text: "Automatisierungs-ROI misst sich daran, was aus der Warteschlange verschwindet — nicht daran, was schneller erledigt wird." },
          { type: "p", text: "Die Operatoren, die wachsen, hören auf, Aktivität mit Durchsatz zu verwechseln. Sie wollen weniger Automatisierungen, auf schärfere Ziele gerichtet, jede zahlt sich in Wochen aus, nicht in Quartalen." }
        ],
      },
      es: {
        seo: {
          metaTitle: "ROI de automatización: qué se paga solo",
          metaDescription:
            "La mayoría de la automatización ahorra horas que nadie iba a dedicar. Tres preguntas que separan el ROI real del teatro, y una prueba previa.",
        },
        title: "El mito del ROI de la automatización, y lo que de verdad se amortiza",
        summary:
          "La mayoría de los proyectos de automatización ahorran horas que nadie iba a invertir de todos modos. Tres reglas para elegir las que sí mueven la cuenta de resultados — y una prueba antes de comprar otra herramienta.",
        body: [
          { type: "p", text: "Todo operador que conozco tiene una presentación de algún consultor que afirma que su equipo ahorrará 400 horas al año. Casi siempre esa cifra es ficción aritmética: horas que nunca se habrían facturado, reuniones que nunca se habrían convocado, trabajo que nunca se habría hecho. El ROI real de la automatización es más estrecho y más duro." },
          { type: "h2", text: "Las tres preguntas que separan el ROI real del teatro" },
          { type: "ul", items: [
            "¿El trabajo que se automatiza lo hace ahora una persona que es tu cuello de botella? Si no, no estás liberando capacidad, estás acelerando a quien ya está ocioso.",
            "¿La automatización elimina una decisión o solo agiliza la introducción de datos? Las decisiones eliminadas se acumulan; la entrada de datos más rápida se satura quizá en el 20 por ciento del ahorro teórico.",
            "Si se rompe durante una semana, ¿alguien lo nota? Si la respuesta es no, has automatizado un museo."
          ]},
          { type: "h2", text: "La prueba antes de comprar" },
          { type: "p", text: "Anota las tres horas de mayor valor que tu mejor profesional dedica en una semana típica. Si tu candidata a automatización no toca esas tres horas directamente, el ROI es teatro. Apártala. La ganancia de automatizar a una persona cuello de botella cinco horas a la semana eclipsa la de automatizar diez no-cuellos de botella durante cincuenta." },
          { type: "quote", text: "El ROI de la automatización se mide por lo que sale de la cola, no por lo que se hace más rápido." },
          { type: "p", text: "Los operadores que crecen dejan de confundir actividad con rendimiento. Quieres menos automatizaciones, apuntadas a objetivos más afilados, cada una amortizándose en semanas, no en trimestres." }
        ],
      },
    },
  },
  {
    slug: "whatsapp-first-funnel-nl",
    markets: ["nl"],
    title: "Waarom je Nederlandse leadfunnel op WhatsApp begint",
    summary:
      "Nederlandse consumenten beantwoorden WhatsApp in 90 seconden en email in een week. Hoe je je funnel inricht zodat het eerste contact altijd WhatsApp is — zonder de lead kwijt te raken in de doorverwijzing.",
    tag: "Growth",
    publishedAt: "2025-12-14",
    readingMinutes: 5,
    seo: {
      metaTitle: "WhatsApp als eerste stap in je leadfunnel",
      metaDescription:
        "Nederlandse consumenten beantwoorden WhatsApp in 90 seconden en e-mail in een week. Zo richt je je funnel in zonder leads te verliezen.",
    },
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
    seo: {
      metaTitle: "Why operator CRMs fail in 90 days",
      metaDescription:
        "A CRM the team avoids is worse than a spreadsheet. The pattern that kills adoption, and five decisions that fix it before rollout.",
    },
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
    ],
    i18n: {
      nl: {
        seo: {
          metaTitle: "Waarom operator-CRM's binnen 90 dagen falen",
          metaDescription:
            "Een CRM dat het team mijdt is slechter dan een spreadsheet. Het patroon dat de invoering nekt, en vijf keuzes die het vooraf oplossen.",
        },
        title: "Waarom operator-CRM's het binnen 90 dagen begeven",
        summary:
          "Een CRM dat het team mijdt is slechter dan een spreadsheet. Het patroon dat de invoering nekt bij energie-, vastgoed- en horecabedrijven — en vijf keuzes die het vóór de uitrol oplossen.",
        body: [
          { type: "p", text: "Elke operator die ik spreek heeft hetzelfde verhaal: ze kochten een CRM, zetten de contacten over, gaven twee trainingen, en binnen een kwartaal liep de pijplijn weer via WhatsApp en het geheugen. De diagnose is bijna altijd dezelfde — en het ligt nooit aan de software." },
          { type: "h2", text: "Het symptoom is gebruik. De oorzaak is ontwerp." },
          { type: "p", text: "Als een CRM wordt verlaten, komt dat meestal doordat hij is ingericht op wat het kantoor wil zien en niet op wat het veldteam moet doen. De dashboards zijn mooi. Het invoeren is duur. Dus de mensen die de omzet maken stoppen met invoeren, de dashboards lopen leeg, en de directie noemt het een technisch probleem." },
          { type: "h2", text: "Vijf keuzes die bepalen of het beklijft" },
          { type: "ul", items: [
            "Wie is eigenaar van het dagelijkse pijplijnoverleg, en duurt dat tien minuten of een uur?",
            "Is een statuswijziging een knop of een formulier? Het antwoord moet 'knop' zijn.",
            "Verdient elk veld zichzelf terug in een automatisering verderop, of is het een museumstuk?",
            "Wat gebeurt er bij een faseovergang: niets, of een zichtbaar duwtje naar de volgende eigenaar?",
            "Is invoeren op mobiel gelijkwaardig aan desktop, of is mobiel een leesbare bijzaak?",
          ] },
          { type: "quote", text: "Kan een verkoper een deal niet bijwerken tijdens het lopen van de parkeerplaats naar de voordeur, dan verliest het CRM al." },
          { type: "h2", text: "Wat je concreet doet" },
          { type: "p", text: "Voordat je een leverancierscontract aanraakt, schrijf je de tien handelingen op die je team op een gewone dinsdag het vaakst doet. Bouw die tien als flows van één tik. Alles wat meer dan drie tikken kost gaat terug naar de tekentafel. Het CRM is niet het systeem — die tien flows zijn het systeem. De rest is rapportage." },
          { type: "p", text: "Datzelfde vizier gebruik ik bij het bouwen van Philly, het CRM dat ik aan operators lever. De omzet wordt gemaakt door veldteams, dus de software hoort ze als hoofdgebruiker te behandelen." },
        ],
      },
      de: {
        seo: {
          metaTitle: "Warum Betreiber-CRMs in 90 Tagen scheitern",
          metaDescription:
            "Ein CRM, das das Team meidet, ist schlechter als eine Tabelle. Das Muster, das die Einführung killt, und fünf Entscheidungen davor.",
        },
        title: "Warum die meisten Operator-CRMs binnen 90 Tagen scheitern",
        summary:
          "Ein CRM, das das Team meidet, ist schlimmer als eine Tabelle. Das Muster, das die Akzeptanz in Energie-, Immobilien- und Hospitality-Betrieben tötet — und fünf Entscheidungen, die es vor dem Rollout beheben.",
        body: [
          { type: "p", text: "Jeder Operator, mit dem ich spreche, hat dieselbe Geschichte: Sie kauften ein CRM, migrierten die Kontakte, hielten zwei Schulungen ab, und binnen eines Quartals lief die Deal-Pipeline wieder über WhatsApp und Gedächtnis. Die Diagnose ist fast immer dieselbe — und sie ist nie die Schuld der Software." },
          { type: "h2", text: "Das Symptom ist die Akzeptanz. Die Ursache ist das Design." },
          { type: "p", text: "Wenn ein CRM aufgegeben wird, liegt die eigentliche Ursache meist darin, dass es um das herum konfiguriert wurde, was das Büro sehen wollte, nicht um das, was das Außendienstteam tun musste. Die Dashboards sind schön. Die Dateneingabe ist teuer. Also hören die Leute, die Umsatz erzeugen, auf, Daten einzugeben, die Dashboards werden leer, und die Geschäftsführung nennt es ein Tech-Problem." },
          { type: "h2", text: "Fünf Entscheidungen, die bestimmen, ob es hält" },
          { type: "ul", items: [
            "Wer verantwortet den täglichen Pipeline-Review, und sind es zehn Minuten oder eine Stunde?",
            "Ist eine Statusänderung ein Knopf oder ein Formular? Die Antwort muss 'Knopf' lauten.",
            "Zahlt sich jedes Feld in einer nachgelagerten Automatisierung aus, oder ist es nur ein Museum?",
            "Was passiert bei Phasenübergängen — nichts, oder ein sichtbarer Anstoß an den nächsten Verantwortlichen?",
            "Ist die mobile Eingabe gleichwertig zum Desktop, oder ist Mobil ein schreibgeschützter Nachgedanke?"
          ]},
          { type: "quote", text: "Wenn ein Vertriebsmitarbeiter einen Deal nicht auf dem Weg vom Parkplatz zur Haustür aktualisieren kann, verliert das CRM bereits." },
          { type: "h2", text: "Der praktische Schritt" },
          { type: "p", text: "Bevor Sie einen Anbietervertrag anfassen, notieren Sie die zehn Aktionen, die Ihr Team an einem typischen Dienstag am häufigsten ausführt. Prototypisieren Sie diese zehn Aktionen als Ein-Tipp-Abläufe. Alles, was mehr als drei Tipps braucht, wird neu gedacht. Das CRM ist nicht das System — die zehn Abläufe sind es. Alles andere ist Reporting." },
          { type: "p", text: "Das ist dieselbe Brille, mit der ich Philly baue — das CRM, das ich an Operatoren ausliefere. Umsatz wird von Außendienstteams erzielt, also muss die Software sie als primäre Nutzer behandeln." }
        ],
      },
      es: {
        seo: {
          metaTitle: "Por qué los CRM de operador fallan",
          metaDescription:
            "Un CRM que el equipo evita es peor que una hoja de cálculo. El patrón que mata la adopción, y cinco decisiones que lo arreglan antes.",
        },
        title: "Por qué la mayoría de los CRM de operadores fracasan en 90 días",
        summary:
          "Un CRM que el equipo evita es peor que una hoja de cálculo. El patrón que mata la adopción en negocios de energía, inmobiliaria y hostelería — y cinco decisiones que lo arreglan antes del despliegue.",
        body: [
          { type: "p", text: "Todo operador con quien hablo tiene la misma historia: compraron un CRM, migraron los contactos, hicieron dos sesiones de formación, y en un trimestre el pipeline de oportunidades volvió a WhatsApp y a la memoria. El diagnóstico es casi siempre el mismo — y nunca es culpa del software." },
          { type: "h2", text: "El síntoma es la adopción. La causa es el diseño." },
          { type: "p", text: "Cuando se abandona un CRM, la causa raíz suele ser que se configuró en torno a lo que la oficina quería ver, no a lo que el equipo de campo necesitaba hacer. Los paneles son preciosos. La introducción de datos es cara. Así que quienes generan ingresos dejan de meter datos, los paneles se quedan en blanco, y la dirección lo llama un problema técnico." },
          { type: "h2", text: "Cinco decisiones que determinan si cuaja" },
          { type: "ul", items: [
            "¿Quién es responsable de la revisión diaria del pipeline, y son diez minutos o una hora?",
            "¿Cambiar de estado es un botón o un formulario? La respuesta tiene que ser 'botón'.",
            "¿Cada campo se amortiza en una automatización posterior, o es solo un museo?",
            "¿Qué ocurre en las transiciones de etapa — nada, o un aviso visible al siguiente responsable?",
            "¿La introducción en móvil es igual que en escritorio, o el móvil es una ocurrencia tardía de solo lectura?"
          ]},
          { type: "quote", text: "Si un comercial no puede actualizar una oportunidad mientras camina del aparcamiento a la puerta, el CRM ya está perdiendo." },
          { type: "h2", text: "El movimiento práctico" },
          { type: "p", text: "Antes de tocar un contrato con un proveedor, anota las diez acciones que tu equipo realiza más en un martes típico. Prototipa esas diez acciones como flujos de un toque. Todo lo que necesite más de tres toques se replantea. El CRM no es el sistema — los diez flujos lo son. Todo lo demás es reporting." },
          { type: "p", text: "Esa es la misma lente con la que construyo Philly — el CRM que entrego a operadores. Los ingresos los ganan los equipos de campo, así que el software debe tratarlos como el usuario principal." }
        ],
      },
    },
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
    seo: {
      metaTitle: "Salderingsregeling 2027 voor installateurs",
      metaDescription:
        "De afschaffing raakt installateurs harder dan huiseigenaren. Drie aanpassingen in je funnel die een acquisitiecrisis in 2027 voorkomen.",
    },
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
    seo: {
      metaTitle: "The build-vs-buy trap for operators",
      metaDescription:
        "Building looks expensive until you count the workarounds. Buying looks safe until the third integration. A framework that matches reality.",
    },
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
    ],
    i18n: {
      nl: {
        seo: {
          metaTitle: "De bouwen-of-kopen-val voor operators",
          metaDescription:
            "Bouwen lijkt duur tot je de omwegen meetelt. Kopen lijkt veilig tot de derde koppeling. Een afwegingskader dat past bij de praktijk.",
        },
        title: "De bouwen-of-kopen-val waar operators in lopen",
        summary:
          "Bouwen lijkt duur tot je de omwegen meetelt. Kopen lijkt veilig tot je bij de derde koppeling komt. Een afwegingskader dat past bij de praktijk van een operator.",
        body: [
          { type: "p", text: "Ergens tussen vijftig en vijfhonderd medewerkers voert elk directieteam hetzelfde gesprek: we hebben vier leveranciers, drie daarvan praten niet met elkaar, en onze mensen zijn een uur per dag bezig data heen en weer te schuiven. Kopen we door, of gaan we bouwen?" },
          { type: "h2", text: "De echte vraag is niet bouwen of kopen" },
          { type: "p", text: "De echte vraag is: welke twee of drie capaciteiten bepalen hoe wij winnen, en welke vijftien zijn gebruiksartikelen die gewoon moeten werken? Operators die dit goed doen kopen de gebruiksartikelen — mail, agenda, boekhouding, salarisadministratie — en bouwen, of laten bouwen, een dunne koppellaag plus de twee of drie kernprocessen die hen onderscheiden." },
          { type: "h2", text: "De val die ik het vaakst zie" },
          { type: "p", text: "Voor elke functie de beste tool kopen en hopen dat een kerkhof van Zapier-koppelingen het aan elkaar plakt. Dat werkt tot je een echte vraag wilt beantwoorden die door drie van die tools loopt, en het antwoord opeens drie uur CSV-exports is. Dat is de prijs van vijftien keer veilig kiezen." },
          { type: "quote", text: "Kost het meer dan een dag om met je huidige stack een directievraag te beantwoorden, dan is die stack niet meer van jou — dan is het een museum." },
          { type: "h2", text: "Een kader dat wel werkt" },
          { type: "ul", items: [
            "Noteer de drie vragen die de directie binnen een minuut moet kunnen beantwoorden. Dat is de kern.",
            "Zoek per vraag welk systeem de bron van waarheid is. Is het antwoord een spreadsheet, dan heb je gevonden wat je moet bouwen.",
            "De rest is gebruiksartikel. Koop de goedkoopste tool die het werk doet zonder je data-afspraken te breken.",
            "Steek het bespaarde budget in de koppellaag en die drie kernprocessen. Daar zit het verdedigbare deel.",
          ] },
          { type: "p", text: "De operators die dit goed doen hebben niet langer het gevoel dat hun stack de baas over hen is. Wie het niet doet, huurt op een dag iemand in wiens werk grotendeels bestaat uit CSV's tussen tools verplaatsen. Dat is een dure uitkomst om te accepteren." },
        ],
      },
      de: {
        seo: {
          metaTitle: "Die Build-vs-Buy-Falle für Betreiber",
          metaDescription:
            "Bauen wirkt teuer, bis man die Umwege zählt. Kaufen wirkt sicher, bis zur dritten Schnittstelle. Ein Rahmen, der zur Praxis passt.",
        },
        title: "Die Build-vs-Buy-Falle, in die Operatoren immer wieder tappen",
        summary:
          "Selbst bauen wirkt teuer, bis man die Workarounds zählt. Einkaufen wirkt sicher, bis zur dritten Integration. Ein Entscheidungsrahmen, der zur Realität von Operatoren passt.",
        body: [
          { type: "p", text: "Irgendwo zwischen einem Betrieb mit 50 und einem mit 500 Mitarbeitern führt jedes Führungsteam dasselbe Gespräch: Wir haben vier Anbieter, drei davon sprechen nicht miteinander, und unsere Leute verbringen täglich eine Stunde damit, Daten zwischen ihnen hin- und herzuschieben. Kaufen wir weiter ein, oder bauen wir selbst?" },
          { type: "h2", text: "Die eigentliche Frage ist nicht Build vs. Buy" },
          { type: "p", text: "Die eigentliche Frage lautet: Welche zwei, drei Fähigkeiten sind wirklich entscheidend dafür, wie wir gewinnen — und welche fünfzehn sind Standardware, die einfach funktionieren muss? Operatoren, die das richtig machen, kaufen die Standardware (E-Mail, Kalender, Buchhaltung, Lohnabrechnung) und bauen — oder lassen bauen — eine dünne Integrationsschicht plus die zwei, drei Kern-Workflows, die sie unterscheidbar machen." },
          { type: "h2", text: "Die Falle, die ich am häufigsten sehe" },
          { type: "p", text: "Für jede Funktion das Best-of-Breed-Tool kaufen und hoffen, dass ein Zapier-Friedhof alles zusammenklebt. Das funktioniert, bis man eine echte Frage über drei davon hinweg beantworten muss — und plötzlich besteht die Antwort aus drei Stunden CSV-Exporten. Das ist die Steuer dafür, fünfzehnmal auf Nummer sicher gegangen zu sein." },
          { type: "quote", text: "Wenn es mit Ihrem aktuellen Stack länger als einen Tag dauert, eine Frage auf Vorstandsebene zu beantworten, ist Ihr Stack kein Stack mehr — er ist ein Museum." },
          { type: "h2", text: "Ein Rahmen, der wirklich funktioniert" },
          { type: "ul", items: [
            "Notieren Sie die drei Fragen, die die Führung in unter einer Minute beantworten können sollte. Das ist der Kern.",
            "Bestimmen Sie für jede, welches System die Quelle der Wahrheit ist — wenn die Antwort eine Tabelle ist, haben Sie Ihr Bauziel gefunden.",
            "Alles andere ist Standardware. Kaufen Sie das günstigste Tool, das die Aufgabe erledigt, ohne Ihre Datenverträge zu brechen.",
            "Investieren Sie das gesparte Budget in die Integrationsschicht und die drei Kern-Workflows. Dort liegt der Burggraben."
          ]},
          { type: "p", text: "Operatoren, die das richtig machen, haben nicht länger das Gefühl, ihr Tech-Stack besitze sie. Die anderen stellen irgendwann einen Chief of Staff ein, dessen Aufgabe größtenteils darin besteht, CSVs zwischen Tools zu verschieben. Das ist ein teures Ergebnis, das man hinnehmen muss." }
        ],
      },
      es: {
        seo: {
          metaTitle: "La trampa de construir o comprar",
          metaDescription:
            "Construir parece caro hasta que cuentas los rodeos. Comprar parece seguro hasta la tercera integración. Un marco que encaja con la realidad.",
        },
        title: "La trampa de construir o comprar en la que los operadores caen una y otra vez",
        summary:
          "Construir parece caro hasta que cuentas los apaños. Comprar parece seguro hasta la tercera integración. Un marco de decisión que encaja con la realidad del operador.",
        body: [
          { type: "p", text: "En algún punto entre un operador de 50 personas y uno de 500, todo equipo directivo tiene la misma conversación: tenemos cuatro proveedores, tres no se hablan entre sí, y nuestra gente pasa una hora al día moviendo datos entre ellos. ¿Seguimos comprando o construimos?" },
          { type: "h2", text: "La verdadera pregunta no es construir o comprar" },
          { type: "p", text: "La verdadera pregunta es: ¿cuáles dos o tres capacidades son realmente esenciales para cómo ganamos, y cuáles quince son commodities que solo necesitan funcionar? Los operadores que aciertan compran las commodities (correo, calendario, contabilidad, nóminas) y construyen —o pagan por construir— una capa de integración ligera más los dos o tres flujos de trabajo centrales que los hacen diferentes." },
          { type: "h2", text: "La trampa que veo con más frecuencia" },
          { type: "p", text: "Comprar la mejor herramienta de su categoría para cada función y esperar que un cementerio de Zapier las pegue. Funciona hasta que necesitas responder una pregunta real que cruza tres de ellas, y de repente la respuesta son tres horas de exportaciones CSV. Ese es el impuesto que pagas por elegir lo seguro quince veces." },
          { type: "quote", text: "Si con tu stack actual cuesta más de un día responder una pregunta a nivel de consejo, tu stack ya no es tu stack: es un museo." },
          { type: "h2", text: "Un marco que sí funciona" },
          { type: "ul", items: [
            "Anota las tres preguntas que la dirección debería poder responder en menos de un minuto. Eso es lo central.",
            "Para cada una, identifica qué sistema es la fuente de la verdad; si la respuesta es una hoja de cálculo, has encontrado tu objetivo de construcción.",
            "Todo lo demás es commodity. Compra la herramienta más barata que haga el trabajo sin romper tus contratos de datos.",
            "Invierte el presupuesto ahorrado en la capa de integración y los tres flujos centrales. Ahí vive la ventaja competitiva."
          ]},
          { type: "p", text: "Los operadores que aciertan dejan de sentir que su stack tecnológico los posee. Los que no, acaban contratando a un Chief of Staff cuyo trabajo es, en gran parte, mover CSVs entre herramientas. Es un resultado caro de aceptar." }
        ],
      },
    },
  }
  ,{
    slug: "the-field-team-is-the-product",
    title: "The field team is the product — not the dashboard",
    summary:
      "Executives buy software for reporting. Field teams use it to close deals. When the two are in tension, the field team wins by default — they just stop using it. Design for them first.",
    tag: "Systems",
    publishedAt: "2026-04-15",
    readingMinutes: 5,
    seo: {
      metaTitle: "The field team is the product",
      metaDescription:
        "Executives buy software for reporting; field teams use it to close deals. When the two clash the field team wins by not opening it.",
    },
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
    ],
    i18n: {
      nl: {
        seo: {
          metaTitle: "Het veldteam is het product",
          metaDescription:
            "Directies kopen software om te rapporteren, veldteams om te sluiten. Botsen die twee, dan wint het veldteam door hem niet te openen.",
        },
        title: "Het veldteam is het product, niet het dashboard",
        summary:
          "Directies kopen software om te rapporteren. Veldteams gebruiken hem om deals te sluiten. Botsen die twee, dan wint het veldteam vanzelf: door hem niet meer te openen. Ontwerp dus eerst voor hen.",
        body: [
          { type: "p", text: "Loop een bedrijf van vijftig man binnen en stel twee mensen dezelfde vraag: wat doet het CRM? De financieel directeur praat over zicht op de pijplijn en omzetprognoses. De veldmedewerker praat over de acht tikken die het kost om een gesprek vast te leggen. Die twee antwoorden beschrijven totaal verschillende producten." },
          { type: "h2", text: "Waarom het kantoor de roadmap meestal wint" },
          { type: "p", text: "Het kantoor betaalt de tool, zit bij de demo's en schrijft de eisen op. Het veldteam heeft het druk — met omzet maken. Dus de software wordt gebouwd voor de mensen die erom vroegen, niet voor de mensen die ermee moeten werken. Een halfjaar later begrijpt niemand waarom nog maar dertig procent hem gebruikt." },
          { type: "h2", text: "Een simpele test vóór elke CRM-beslissing" },
          { type: "ul", items: [
            "Ga een hele dag naast een veldmedewerker zitten. Tel de tikken per bijgewerkte deal.",
            "Zijn het er meer dan drie, dan werkt de software al tegen je.",
            "Vraag wat diegene nodig heeft om vijf deals bij te werken tijdens het lopen van de auto naar de voordeur. Bouw dát.",
            "Laat de financieel directeur daarna het dashboard zien, maar alleen met cijfers die het veldteam in drie tikken kan produceren.",
          ] },
          { type: "quote", text: "Een CRM is niet het systeem van vastlegging. Het is het systeem van handelen. Is het niet makkelijker dan wat er was, dan wordt er niets vastgelegd." },
          { type: "p", text: "Dat is het vizier achter Philly. De dashboards kwamen pas nadat de veldflow klopte. Draai je die volgorde om, dan krijg je een museum." },
        ],
      },
      de: {
        seo: {
          metaTitle: "Das Außendienstteam ist das Produkt",
          metaDescription:
            "Führung kauft Software zum Berichten, der Außendienst schließt damit ab. Kollidiert beides, gewinnt das Feld, indem es sie nicht öffnet.",
        },
        title: "Das Außendienstteam ist das Produkt — nicht das Dashboard",
        summary:
          "Führungskräfte kaufen Software fürs Reporting. Außendienstteams nutzen sie, um Deals abzuschließen. Stehen beide in Spannung, gewinnt das Außendienstteam standardmäßig — indem es sie einfach nicht mehr nutzt. Entwerfen Sie zuerst für sie.",
        body: [
          { type: "p", text: "Gehen Sie in einen beliebigen 50-Personen-Betrieb und stellen Sie zwei Leuten dieselbe Frage: Was macht das CRM? Der CFO spricht über Pipeline-Transparenz und Umsatzprognose. Der Außendienstmitarbeiter spricht über die acht Tipps, die nötig sind, um einen Anruf zu protokollieren. Diese beiden Antworten beschreiben völlig verschiedene Produkte." },
          { type: "h2", text: "Warum das Büro den Roadmap-Kampf meist gewinnt" },
          { type: "p", text: "Das Büro bezahlt das Tool, sitzt in den Demos und schreibt die Anforderungen. Das Außendienstteam ist beschäftigt — mit Umsatz erzeugen. Also wird die Software für die gebaut, die danach gefragt haben, nicht für die, die sie nutzen müssen. Sechs Monate später versteht niemand, warum die Akzeptanz bei 30 Prozent liegt." },
          { type: "h2", text: "Ein einfacher Test vor jeder CRM-Entscheidung" },
          { type: "ul", items: [
            "Setzen Sie sich einen ganzen Tag neben einen Außendienstmitarbeiter. Zählen Sie die Tipps pro Deal-Aktualisierung.",
            "Sind es mehr als drei, kämpft die Software bereits gegen Sie.",
            "Fragen Sie, was sie bräuchten, um fünf Deals auf dem Weg vom Auto zur Haustür zu aktualisieren. Bauen Sie das.",
            "Zeigen Sie dann dem CFO das Dashboard — aber nur mit Daten, die das Außendienstteam tatsächlich in drei Tipps erzeugen kann."
          ]},
          { type: "quote", text: "Ein CRM ist nicht das System der Aufzeichnung. Es ist das System des Handelns. Ist es nicht einfacher als das Vorherige, wird nichts aufgezeichnet." },
          { type: "p", text: "Das ist die Brille hinter Philly. Die Dashboards kamen, nachdem wir den Außendienst-Ablauf richtig hatten. Kehren Sie die Reihenfolge um, bekommen Sie ein Museum." }
        ],
      },
      es: {
        seo: {
          metaTitle: "El equipo de campo es el producto",
          metaDescription:
            "La dirección compra software para reportar; el equipo de campo cierra con él. Si chocan, gana el campo: deja de abrirlo.",
        },
        title: "El equipo de campo es el producto — no el panel",
        summary:
          "Los directivos compran software para reporting. Los equipos de campo lo usan para cerrar tratos. Cuando ambos están en tensión, el equipo de campo gana por defecto — simplemente deja de usarlo. Diséñalo primero para ellos.",
        body: [
          { type: "p", text: "Entra en cualquier operador de 50 personas y haz a dos personas la misma pregunta: ¿qué hace el CRM? El director financiero hablará de visibilidad del pipeline y previsión de ingresos. El comercial de campo hablará de los ocho toques que cuesta registrar una llamada. Esas dos respuestas describen productos completamente distintos." },
          { type: "h2", text: "Por qué la oficina suele ganar la pelea por la hoja de ruta" },
          { type: "p", text: "La oficina paga la herramienta, asiste a las demos y escribe los requisitos. El equipo de campo está ocupado — generando ingresos. Así que el software se construye para quienes lo pidieron, no para quienes tienen que usarlo. Seis meses después nadie entiende por qué la adopción está en el 30 por ciento." },
          { type: "h2", text: "Una prueba sencilla antes de cualquier decisión de CRM" },
          { type: "ul", items: [
            "Siéntate junto a un comercial de campo un día entero. Cuenta los toques por actualización de oportunidad.",
            "Si son más de tres, el software ya está luchando contra ti.",
            "Pregunta qué necesitaría para actualizar cinco oportunidades caminando del coche a la puerta. Construye eso.",
            "Luego enseña al director financiero el panel — pero solo con datos que el equipo de campo pueda producir de verdad en tres toques."
          ]},
          { type: "quote", text: "Un CRM no es el sistema de registro. Es el sistema de acción. Si no es más fácil que lo anterior, no se registra nada." },
          { type: "p", text: "Esta es la lente detrás de Philly. Los paneles llegaron después de acertar con el flujo de campo. Si inviertes el orden, obtienes un museo." }
        ],
      },
    },
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
    seo: {
      metaTitle: "Thuisbatterijen verkopen na 2027",
      metaDescription:
        "De saldering verdwijnt. De batterij-installateurs die 2027 overleven zijn de duidelijkste, niet de goedkoopste. Drie patronen die werken.",
    },
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
    slug: "dynamisch-energiecontract-na-de-salderingsregeling",
    markets: ["nl"],
    title: "Dynamisch energiecontract na de salderingsregeling — reken het écht door",
    summary:
      "Zonder saldering wordt het uur waarop je stroom teruglevert ineens belangrijk. Waarom een dynamisch contract voor de één honderden euro's oplevert en voor de ander geld kost — en hoe je het per klant doorrekent voordat je iets belooft.",
    tag: "Energy",
    publishedAt: "2026-07-20",
    readingMinutes: 6,
    seo: {
      metaTitle: "Dynamisch energiecontract na de saldering",
      metaDescription:
        "Zonder saldering telt het uur waarop je teruglevert. Waarom een dynamisch contract de een honderden euro's oplevert en de ander geld kost.",
    },
    body: [
      { type: "p", text: "Met de salderingsregeling maakte het niet uit wanneer je stroom terugleverde: elke teruggeleverde kilowattuur werd één-op-één weggestreept tegen een afgenomen kilowattuur, tegen je vaste tarief. Vanaf 2027 verdwijnt die streep. Het uur waarop je levert en het uur waarop je verbruikt worden ineens twee verschillende getallen — en precies daar zit het hele verhaal van het dynamische energiecontract." },
      { type: "h2", text: "Waarom 'dynamisch' voor de één wint en voor de ander verliest" },
      { type: "p", text: "Een dynamisch contract rekent per uur af tegen de marktprijs. Zonnepanelen leveren het meest rond het middaguur — precies het moment waarop half Nederland ook levert en de prijs richting nul of negatief zakt. Je afname zit 's ochtends en 's avonds, als de prijs juist hoog is. Zonder batterij of sturing verkoop je dus goedkoop en koop je duur. Dat is de asymmetrie die de meeste verkoopgesprekken overslaan." },
      { type: "ul", items: [
        "Hoog zelfverbruik overdag (thuiswerker, warmtepomp, EV die overdag laadt): dynamisch wint vaak, omdat je de dure avonduren omzeilt.",
        "Klassiek verbruiksprofiel (overdag leeg huis, piek 's avonds): dynamisch zonder batterij kost geld ten opzichte van een vast contract.",
        "Met thuisbatterij of slimme sturing: het profiel kantelt — je schuift levering naar de dure uren en dynamisch wordt bijna altijd de betere keuze."
      ]},
      { type: "p", text: "Het punt is niet dat dynamisch goed of slecht is. Het punt is dat het antwoord per huishouden verschilt, en dat je het niet uit een brochure kunt halen. Je moet het doorrekenen met het echte verbruiksprofiel van de klant en realistische uurprijzen — niet met het jaargemiddelde dat elke aanbieder in zijn folder zet." },
      { type: "cta", text: "Reken een scenario door met de salderings-ROI-calculator", href: "/tools/energy-roi" },
      { type: "h2", text: "Drie dingen die je vastlegt vóór je een dynamisch contract aanraadt" },
      { type: "ul", items: [
        "Het verbruiksprofiel per uur, niet per jaar. Een klant met 3.500 kWh kan twee totaal verschillende contracten nodig hebben, afhankelijk van wánneer die 3.500 kWh valt.",
        "De aanname over toekomstige uurprijzen. Reken minstens één pessimistisch scenario door — negatieve middagprijzen worden structureler, niet minder.",
        "Wat er verandert bij een warmtepomp of EV binnen drie jaar. De helft van je klanten verschuift straks van profiel, en het advies van vandaag moet die verschuiving overleven."
      ]},
      { type: "quote", text: "Een dynamisch contract is geen product dat je verkoopt. Het is een uitkomst die je uitrekent — en de installateur die dat eerlijk laat zien, wint de klant die twijfelt." },
      { type: "p", text: "De aanbieders die na 2027 vertrouwen opbouwen, zijn niet degenen die 'dynamisch' als slimme upsell in elke offerte plakken. Het zijn degenen die per klant laten zien wanneer het níét de moeite waard is. Dat kost je een paar makkelijke deals — en levert je de klant op die je concurrent met een standaardverhaal kwijtraakt." }
    ]
  },
  {
    slug: "thuisbatterij-terugverdientijd-2027",
    markets: ["nl"],
    title: "Thuisbatterij terugverdientijd 2027 — de eerlijke rekensom",
    summary:
      "'Zeven jaar' staat in elke folder, maar dat getal geldt voor bijna niemand. Wat de terugverdientijd van een thuisbatterij écht bepaalt na het wegvallen van de saldering — en hoe je 'm voor jouw situatie uitrekent in plaats van 'm te geloven.",
    tag: "Energy",
    publishedAt: "2026-07-20",
    readingMinutes: 6,
    seo: {
      metaTitle: "Thuisbatterij terugverdientijd 2027",
      metaDescription:
        "Zeven jaar staat in elke folder en geldt voor bijna niemand. Wat de terugverdientijd echt bepaalt, en hoe je hem zelf uitrekent.",
    },
    body: [
      { type: "p", text: "Vraag drie aanbieders naar de terugverdientijd van dezelfde thuisbatterij en je krijgt drie getallen tussen de vijf en de twaalf jaar. Ze liegen geen van allen — ze rekenen alleen met verschillende aannames, en de aanname die je niet ziet, bepaalt het antwoord. Na het wegvallen van de salderingsregeling wordt dat verschil groter, niet kleiner." },
      { type: "h2", text: "Waarom er geen één terugverdientijd bestaat" },
      { type: "p", text: "Een thuisbatterij verdient zichzelf terug op twee manieren: méér zonnestroom zelf gebruiken in plaats van 'm bijna gratis terugleveren, en stroom opslaan als die goedkoop is om 'm te gebruiken als die duur is. Beide effecten hangen volledig af van hoe en wanneer jij verbruikt. Dezelfde batterij die bij het ene huishouden in zes jaar rond is, doet er bij het volgende dertien over." },
      { type: "ul", items: [
        "Je zelfverbruik zonder batterij — verbruik je nu al veel overdag, dan valt er minder winst te halen; verbruik je vooral 's avonds, dan doet de batterij meer.",
        "De prijs die je krijgt voor teruglevering — die daalt na 2027 hard, en juist dáárdoor wordt opslaan aantrekkelijker dan terugleveren.",
        "Het verschil tussen dag- en piektarief (of de spreiding op een dynamisch contract) — hoe groter de spread, hoe sneller de batterij rond is.",
        "Toekomstige apparaten — een warmtepomp of EV verandert je verbruik zo sterk dat een terugverdientijd van vandaag over drie jaar niet meer klopt."
      ]},
      { type: "p", text: "Geen enkele van deze vier staat in de folder. Daarom is elk brochure-getal een gemiddelde van huishoudens die op jou lijken noch bestaan. De enige eerlijke terugverdientijd is die je met je eigen cijfers uitrekent." },
      { type: "cta", text: "Bereken je eigen terugverdientijd met de salderings-ROI-calculator", href: "/tools/energy-roi" },
      { type: "h2", text: "De rekensom die wél klopt" },
      { type: "p", text: "Begin niet bij de prijs van de batterij, maar bij je eigen jaarverbruik en je verbruiksmoment. Reken uit hoeveel van je zonnestroom je nú al zelf gebruikt, en hoeveel een batterij daaraan toevoegt tegen realistische prijzen ná 2027 — niet tegen het salderingsvoordeel van vandaag dat er straks niet meer is." },
      { type: "ul", items: [
        "Neem je werkelijke jaarverbruik en je opwek, niet een schatting per vierkante meter dak.",
        "Reken met de terugleververgoeding zoals die ná 2027 wordt, niet met het huidige saldeertarief.",
        "Doe het twee keer: één keer met de energieprijzen van nu, één keer met een pessimistisch scenario. Als de batterij in beide gevallen rond komt, is het een goede beslissing."
      ]},
      { type: "quote", text: "Een terugverdientijd die je uit een folder overneemt, is een gok met andermans aannames. Eén die je zelf uitrekent, is een beslissing." },
      { type: "p", text: "De klant die na 2027 tevreden blijft, is niet degene die de laagste prijs kreeg, maar degene die vooraf een som zag kloppen die op zijn eigen huis sloeg. Voor installateurs is dat geen extra werk — het is het verschil tussen een prijs-shopper en een koper die tekent." }
    ]
  },
  {
    slug: "salderen-stopt-wat-installateurs-nu-moeten-vertellen",
    markets: ["nl"],
    title: "Salderen stopt: wat installateurs hun klanten nú moeten vertellen",
    summary:
      "Het einde van de salderingsregeling is geen technisch detail dat je in de offerte verstopt — het is een gesprek dat je vóór je concurrent voert. Welke klanten je nu belt, en de drie zinnen die twijfel wegnemen in plaats van 'm te voeden.",
    tag: "Energy",
    publishedAt: "2026-07-20",
    readingMinutes: 5,
    seo: {
      metaTitle: "Salderen stopt: wat je klanten nu horen",
      metaDescription:
        "Het einde van de saldering is een gesprek dat je voor je concurrent voert. Welke klanten je nu belt, en drie zinnen die twijfel wegnemen.",
    },
    body: [
      { type: "p", text: "De meeste installateurs behandelen het einde van de saldering als een voetnoot: een regel onderaan de offerte, een vraag die je beantwoordt als de klant erover begint. Dat is een gemiste kans. De klant die van jóú hoort wat er verandert — voordat hij het van het journaal of van je concurrent hoort — vertrouwt jou met de vervolgstap. De klant die het ergens anders oppikt, komt met wantrouwen terug." },
      { type: "h2", text: "De klanten die je nú belt, bepalen je 2027" },
      { type: "p", text: "Er zijn drie groepen die dit gesprek deze maand nodig hebben, en ze vragen elk iets anders. Wie ze door elkaar haalt, verliest bij alle drie." },
      { type: "ul", items: [
        "Bestaande klanten met alleen panelen — zij denken dat hun rendement gegarandeerd is en schrikken straks. Bel ze vóór 2027, niet erna. Een batterij-upsell aan een tevreden klant is de goedkoopste deal die je dit jaar sluit.",
        "Lopende offertes — hier moet de terugverdiensom nú kloppen met de regels van ná 2027, niet met het saldeervoordeel van vandaag. Een offerte op verouderde aannames wordt een klacht zodra de klant het doorheeft.",
        "Twijfelaars die 'nog even wachten' — voor hen is de deadline juist het argument. Niet als druk, maar als eerlijke rekensom: wat het wachten hen kost."
      ]},
      { type: "p", text: "In alle drie de gesprekken is het sterkste dat je kunt doen niet praten, maar rekenen — de klant zijn eigen cijfers laten zien in plaats van een algemeen verhaal." },
      { type: "cta", text: "Laat de klant zijn eigen som zien met de salderings-ROI-calculator", href: "/tools/energy-roi" },
      { type: "h2", text: "Het eerlijke gesprek in drie zinnen" },
      { type: "ul", items: [
        "Wat er verandert: 'Vanaf 2027 wordt teruggeleverde stroom niet meer één-op-één weggestreept — het moment waarop je verbruikt gaat meetellen.'",
        "Wat dat voor jou betekent: 'Voor jouw verbruik betekent dat concreet dít' — met een getal uit zijn eigen situatie, niet uit een folder.",
        "Wat de opties zijn: 'Je kunt niets doen, je zelfverbruik verhogen, of een batterij overwegen — laten we alle drie doorrekenen voordat je kiest.'"
      ]},
      { type: "quote", text: "De installateur die de deadline gebruikt om te verkopen, wint één deal. De installateur die 'm gebruikt om eerlijk te informeren, wint de klant én zijn buren." },
      { type: "p", text: "Salderen stopt voor iedereen tegelijk. Het verschil tussen de installateurs die er last van hebben en de installateurs die eraan groeien, zit niet in de prijs of het product — het zit in wie het gesprek als eerste voert, en of dat gesprek eerlijk is. Begin deze week, bij de klanten die je al hebt." }
    ]
  },
  {
    slug: "heimspeicher-wirtschaftlichkeit-2026",
    markets: ["de"],
    title: "Heimspeicher-Wirtschaftlichkeit 2026 — die ehrliche Amortisationsrechnung",
    summary:
      "\"Zehn Jahre\" steht in jedem Angebot, gilt aber für kaum jemanden. Was die Amortisation eines Heimspeichers wirklich bestimmt — jetzt, wo die Einspeisevergütung immer weiter sinkt — und wie Sie sie für Ihren eigenen Fall rechnen, statt sie zu glauben.",
    tag: "Energy",
    publishedAt: "2026-07-20",
    readingMinutes: 6,
    seo: {
      metaTitle: "Heimspeicher-Amortisation 2026",
      metaDescription:
        "Zehn Jahre steht in jedem Angebot und gilt für kaum jemanden. Was die Amortisation eines Heimspeichers wirklich bestimmt, und wie Sie rechnen.",
    },
    body: [
      { type: "p", text: "Fragen Sie drei Anbieter nach der Amortisationszeit desselben Heimspeichers, und Sie bekommen drei Zahlen zwischen sieben und fünfzehn Jahren. Keiner von ihnen lügt — sie rechnen nur mit unterschiedlichen Annahmen, und die Annahme, die Sie nicht sehen, entscheidet das Ergebnis. Weil die Einspeisevergütung halbjährlich weiter sinkt, wird dieser Unterschied größer, nicht kleiner." },
      { type: "h2", text: "Warum es die eine Amortisationszeit nicht gibt" },
      { type: "p", text: "Ein Heimspeicher verdient sich über einen einzigen Hebel: die Differenz zwischen dem, was Sie für den Netzbezug zahlen (rund 30 bis 35 Cent), und dem, was Sie für die Einspeisung bekommen (bei Neuanlagen nur noch rund 8 Cent). Jede Kilowattstunde, die der Speicher vom günstigen Einspeisen ins teure Selbstnutzen verschiebt, ist diese Differenz wert. Wie groß dieser Hebel bei Ihnen ausfällt, hängt vollständig davon ab, wann und wie Sie verbrauchen — nicht vom Datenblatt des Speichers." },
      { type: "ul", items: [
        "Ihre Eigenverbrauchsquote ohne Speicher — wer schon tagsüber viel verbraucht, hebt weniger; wer vor allem abends verbraucht, holt mehr aus dem Speicher.",
        "Der Abstand zwischen Strompreis und Einspeisevergütung — er wächst mit jeder Degressionsstufe, und genau das macht Eigenverbrauch attraktiver als Einspeisen.",
        "Ein dynamischer Tarif — mit ihm kann der Speicher zusätzlich günstige Netzstunden laden und teure Stunden überbrücken, was die Rechnung spürbar verkürzt.",
        "Künftige Verbraucher — eine Wärmepumpe oder ein E-Auto verändern Ihr Lastprofil so stark, dass eine heutige Amortisationszeit in drei Jahren nicht mehr stimmt."
      ]},
      { type: "p", text: "Keine dieser vier Größen steht im Angebot. Deshalb ist jede Broschürenzahl ein Mittelwert über Haushalte, die Ihnen weder ähneln noch existieren. Die einzige ehrliche Amortisationszeit ist die, die Sie mit Ihren eigenen Zahlen rechnen." },
      { type: "h2", text: "Die Rechnung, die stimmt" },
      { type: "p", text: "Beginnen Sie nicht beim Speicherpreis, sondern bei Ihrem Jahresverbrauch und Ihrem Verbrauchszeitpunkt. Rechnen Sie aus, wie viel Ihres Solarstroms Sie heute schon selbst nutzen und wie viel ein Speicher dazu beiträgt — bewertet mit der Einspeisevergütung, wie sie in den kommenden Jahren aussieht, nicht mit dem Tarif von heute." },
      { type: "ul", items: [
        "Nehmen Sie Ihren tatsächlichen Jahresverbrauch und Ihre Erzeugung, keine Schätzung pro Quadratmeter Dach.",
        "Rechnen Sie mit der weiter sinkenden Einspeisevergütung, nicht mit dem heutigen Satz — die Degression ist gesetzlich vorgezeichnet.",
        "Tun Sie es zweimal: einmal mit den heutigen Strompreisen, einmal mit einem pessimistischen Szenario. Kommt der Speicher in beiden Fällen heraus, ist es eine gute Entscheidung."
      ]},
      { type: "quote", text: "Eine Amortisationszeit aus der Broschüre ist eine Wette mit fremden Annahmen. Eine, die Sie selbst rechnen, ist eine Entscheidung." },
      { type: "p", text: "Der Kunde, der in fünf Jahren noch zufrieden ist, ist nicht der mit dem niedrigsten Preis, sondern der, dem vorab eine Rechnung vorlag, die auf sein eigenes Haus passte. Für Fachbetriebe ist das keine Zusatzarbeit — es ist der Unterschied zwischen einem Preisvergleicher und einem Kunden, der unterschreibt." }
    ]
  },
  {
    slug: "dynamische-stromtarife-wann-lohnt-es-sich",
    markets: ["de"],
    title: "Dynamische Stromtarife — wann sich der Wechsel wirklich lohnt",
    summary:
      "Seit 2025 muss jeder Versorger einen dynamischen Tarif anbieten. Warum er für den einen hunderte Euro bringt und den anderen Geld kostet — und was Sie mit §14a, Smart Meter und Speicher prüfen müssen, bevor Sie wechseln.",
    tag: "Energy",
    publishedAt: "2026-07-20",
    readingMinutes: 6,
    seo: {
      metaTitle: "Dynamische Stromtarife: lohnt der Wechsel?",
      metaDescription:
        "Seit 2025 muss jeder Versorger einen dynamischen Tarif anbieten. Was Sie mit §14a, Smart Meter und Speicher prüfen sollten, bevor Sie wechseln.",
    },
    body: [
      { type: "p", text: "Seit 2025 ist jeder Stromanbieter gesetzlich verpflichtet, einen dynamischen Tarif anzubieten. Damit ist der Tarif verfügbar — aber verfügbar heißt nicht vorteilhaft. Ein dynamischer Tarif rechnet stündlich zum Börsenpreis ab, und ob das für Sie ein Gewinn oder ein Verlust ist, entscheidet allein Ihr Verbrauchszeitpunkt." },
      { type: "h2", text: "Für wen sich der dynamische Tarif rechnet — und für wen nicht" },
      { type: "p", text: "Photovoltaik speist am meisten rund um die Mittagszeit ein — genau dann, wenn halb Deutschland ebenfalls einspeist und der Börsenpreis gegen null oder ins Negative fällt. Ihr Bezug liegt morgens und abends, wenn der Preis hoch ist. Ohne Speicher oder Steuerung kaufen Sie also teuer und speisen billig ein. Das ist die Asymmetrie, die die meisten Wechselversprechen übergehen." },
      { type: "ul", items: [
        "Hohe Tageslast (Homeoffice, Wärmepumpe, E-Auto, das tagsüber lädt): dynamisch gewinnt oft, weil Sie die teuren Abendstunden umgehen.",
        "Klassisches Verbrauchsprofil (tagsüber leeres Haus, Spitze am Abend): dynamisch ohne Speicher kostet gegenüber einem festen Tarif eher Geld.",
        "Mit Heimspeicher oder steuerbaren Verbrauchern: das Profil kippt — Sie laden in günstigen Stunden und überbrücken die teuren, und dynamisch wird fast immer die bessere Wahl."
      ]},
      { type: "p", text: "Dazu kommt der regulatorische Hebel: Wer eine steuerbare Verbrauchseinrichtung wie Wärmepumpe oder Wallbox nach §14a EnWG anmeldet, bekommt reduzierte Netzentgelte — und mit einem intelligenten Messsystem lässt sich der dynamische Tarif überhaupt erst sauber ausreizen. Ohne Smart Meter bleibt der Tarif eine Blackbox." },
      { type: "h2", text: "Drei Dinge, die Sie vor dem Wechsel festhalten" },
      { type: "ul", items: [
        "Ihr Lastprofil pro Stunde, nicht pro Jahr. Zwei Haushalte mit 4.000 kWh können völlig unterschiedliche Tarife brauchen, je nachdem, wann diese 4.000 kWh anfallen.",
        "Ob ein intelligentes Messsystem verbaut oder beauftragt ist — ohne das funktioniert die stündliche Abrechnung nicht.",
        "Was sich mit Wärmepumpe oder E-Auto in den nächsten Jahren ändert. Beide verschieben Ihr Profil so stark, dass die Wechselentscheidung von heute das überstehen muss."
      ]},
      { type: "quote", text: "Ein dynamischer Tarif ist kein Produkt, das man kauft. Er ist ein Ergebnis, das man ausrechnet — und wer das ehrlich zeigt, gewinnt den Kunden, der zögert." },
      { type: "p", text: "Die Versorger und Fachbetriebe, die hier Vertrauen aufbauen, sind nicht die, die \"dynamisch\" als cleveren Zusatz in jedes Angebot kleben. Es sind die, die pro Haushalt zeigen, wann es sich eben nicht lohnt. Das kostet ein paar einfache Abschlüsse — und bringt den Kunden, den der Wettbewerber mit einem Standardversprechen verliert." }
    ]
  },
  {
    slug: "sinkende-einspeiseverguetung-was-installateure-sagen-muessen",
    markets: ["de"],
    title: "Sinkende Einspeisevergütung: was Installateure ihren Kunden jetzt sagen müssen",
    summary:
      "Die halbjährliche Degression ist kein technisches Detail, das man im Angebot versteckt — sie ist ein Gespräch, das Sie vor dem Wettbewerber führen. Welche Kunden Sie jetzt anrufen, und die drei Sätze, die Zweifel ausräumen statt sie zu nähren.",
    tag: "Energy",
    publishedAt: "2026-07-20",
    readingMinutes: 5,
    seo: {
      metaTitle: "Einspeisevergütung: was Kunden hören",
      metaDescription:
        "Die halbjährliche Degression ist ein Gespräch, das Sie vor dem Wettbewerber führen. Welche Kunden Sie jetzt anrufen, und drei klare Sätze.",
    },
    body: [
      { type: "p", text: "Die meisten Fachbetriebe behandeln die sinkende Einspeisevergütung als Fußnote: eine Zeile unten im Angebot, eine Frage, die man beantwortet, wenn der Kunde davon anfängt. Das ist eine verschenkte Chance. Der Kunde, der von Ihnen hört, was sich ändert — bevor er es aus den Nachrichten oder vom Wettbewerber hört — vertraut Ihnen den nächsten Schritt an. Der Kunde, der es woanders aufschnappt, kommt mit Misstrauen zurück." },
      { type: "h2", text: "Die Kunden, die Sie jetzt anrufen, entscheiden Ihr nächstes Jahr" },
      { type: "p", text: "Drei Gruppen brauchen dieses Gespräch in diesem Monat, und jede fragt etwas anderes. Wer sie verwechselt, verliert bei allen dreien." },
      { type: "ul", items: [
        "Bestandskunden nur mit Modulen — sie halten ihre Rendite für gesichert und erschrecken später. Rufen Sie an, solange die Vergütung noch nicht weiter gefallen ist. Ein Speicher-Nachrüstgeschäft an einen zufriedenen Kunden ist der günstigste Abschluss des Jahres.",
        "Laufende Angebote — hier muss die Amortisationsrechnung jetzt mit der Vergütung von morgen stimmen, nicht mit dem Satz von heute. Ein Angebot auf veralteten Annahmen wird zur Reklamation, sobald der Kunde es merkt.",
        "Zögerer, die \"noch abwarten\" — für sie ist die Degression genau das Argument. Nicht als Druck, sondern als ehrliche Rechnung: was das Warten sie kostet."
      ]},
      { type: "p", text: "In allen drei Gesprächen ist das Stärkste, was Sie tun können, nicht reden, sondern rechnen — dem Kunden seine eigenen Zahlen zeigen statt einer allgemeinen Geschichte." },
      { type: "h2", text: "Das ehrliche Gespräch in drei Sätzen" },
      { type: "ul", items: [
        "Was sich ändert: \"Die Einspeisevergütung sinkt weiter Stufe für Stufe — was Sie fürs Einspeisen bekommen, wird jedes Halbjahr weniger.\"",
        "Was das für Sie heißt: \"Für Ihren Verbrauch bedeutet das konkret dies\" — mit einer Zahl aus seiner eigenen Situation, nicht aus einer Broschüre.",
        "Welche Optionen es gibt: \"Sie können nichts tun, Ihren Eigenverbrauch erhöhen oder einen Speicher prüfen — lassen Sie uns alle drei durchrechnen, bevor Sie wählen.\""
      ]},
      { type: "quote", text: "Wer die Degression nutzt, um zu verkaufen, gewinnt einen Abschluss. Wer sie nutzt, um ehrlich zu informieren, gewinnt den Kunden und seine Nachbarn." },
      { type: "p", text: "Die Einspeisevergütung sinkt für alle gleichzeitig. Der Unterschied zwischen den Fachbetrieben, die darunter leiden, und denen, die daran wachsen, liegt nicht im Preis oder im Produkt — er liegt darin, wer das Gespräch zuerst führt und ob es ehrlich ist. Fangen Sie diese Woche an, bei den Kunden, die Sie schon haben." }
    ]
  },
  {
    slug: "autoconsumo-con-bateria-rentabilidad-2026",
    markets: ["es"],
    title: "Autoconsumo con batería en 2026: la rentabilidad real, no la del folleto",
    summary:
      "\"Diez años\" pone cada presupuesto, pero eso no vale para casi nadie. Qué determina de verdad la rentabilidad de una batería en España — con la compensación de excedentes topada y barata — y cómo calcularla para tu caso en vez de creértela.",
    tag: "Energy",
    publishedAt: "2026-07-20",
    readingMinutes: 6,
    seo: {
      metaTitle: "Rentabilidad de una batería en 2026",
      metaDescription:
        "Diez años pone cada presupuesto y no vale para casi nadie. Qué determina de verdad la rentabilidad de una batería en España, y cómo calcularla.",
    },
    body: [
      { type: "p", text: "Pide a tres instaladores la rentabilidad de la misma batería y te darán tres números entre siete y catorce años. Ninguno miente: solo calculan con supuestos distintos, y el supuesto que no ves es el que decide el resultado. En España, donde la compensación de excedentes está topada y se paga poco, ese margen de error es enorme." },
      { type: "h2", text: "Por qué no existe una única rentabilidad" },
      { type: "p", text: "Una batería gana por un único hueco: la diferencia entre lo que pagas por la energía de la red (unos 0,20-0,25 €/kWh) y lo que te compensan por el excedente que viertes (a menudo 0,05-0,10 €/kWh, y encima con un tope mensual). Cada kilovatio hora que la batería pasa de \"excedente mal pagado\" a \"autoconsumo\" vale esa diferencia. Cuánto de ese hueco aprovechas depende por completo de cuándo y cómo consumes, no de la ficha técnica de la batería." },
      { type: "ul", items: [
        "Tu cuota de autoconsumo sin batería — si ya consumes mucho de día, hay menos que ganar; si consumes sobre todo de noche, la batería hace más.",
        "El tope de la compensación — no puede superar el valor de tu consumo del mes, así que el excedente de más no se paga; la batería convierte ese excedente perdido en ahorro.",
        "La tarifa por horas o el PVPC — con precio horario la batería puede además cargar en horas valle y cubrir las de punta, lo que acorta la cuenta.",
        "Consumos futuros — un aerotermo o un coche eléctrico cambian tanto tu perfil que una rentabilidad de hoy deja de valer en tres años."
      ]},
      { type: "p", text: "Ninguna de estas cuatro variables está en el folleto. Por eso cualquier número de catálogo es una media de hogares que ni se parecen a ti ni existen. La única rentabilidad honesta es la que calculas con tus propios datos." },
      { type: "h2", text: "La cuenta que sí cuadra" },
      { type: "p", text: "No empieces por el precio de la batería, sino por tu consumo anual y tu momento de consumo. Calcula cuánta de tu energía solar autoconsumes ya y cuánto añade una batería, valorado con la compensación real —topada y baja—, no con un balance neto que en España no existe." },
      { type: "ul", items: [
        "Usa tu consumo anual real y tu producción, no una estimación por metro cuadrado de tejado.",
        "Calcula con la compensación real de tu comercializadora y su tope mensual, no con una cifra de balance neto.",
        "Hazlo dos veces: una con los precios de hoy y otra con un escenario pesimista. Si la batería sale a cuenta en ambos, es una buena decisión."
      ]},
      { type: "quote", text: "Una rentabilidad sacada del folleto es una apuesta con supuestos ajenos. Una que calculas tú es una decisión." },
      { type: "p", text: "El cliente que sigue contento a los cinco años no es el del precio más bajo, sino aquel que vio de antemano una cuenta que encajaba con su propia casa. Para el instalador no es trabajo extra: es la diferencia entre un comparador de precios y un cliente que firma." }
    ]
  },
  {
    slug: "compensacion-de-excedentes-no-es-balance-neto",
    markets: ["es"],
    title: "Compensación de excedentes: por qué no es balance neto (y qué cambia al dimensionar)",
    summary:
      "Mucha gente cree que el excedente solar funciona como un contador que gira hacia atrás. En España no es así: la compensación está topada y no se acumula. Qué significa eso de verdad al dimensionar tu instalación — y dónde encaja la batería virtual.",
    tag: "Energy",
    publishedAt: "2026-07-20",
    readingMinutes: 6,
    seo: {
      metaTitle: "Compensación de excedentes no es balance neto",
      metaDescription:
        "En España la compensación está topada y no se acumula: no es un contador que gira hacia atrás. Qué cambia eso al dimensionar tu instalación.",
    },
    body: [
      { type: "p", text: "El error más caro del autoconsumo en España es creer que el excedente que viertes a la red se descuenta como en un contador que va hacia atrás. No es balance neto. Es compensación de excedentes, y las reglas son otras — con un tope que decide cuánta placa te conviene poner." },
      { type: "h2", text: "Compensación no es balance neto" },
      { type: "p", text: "Bajo el RD 244/2019, en la modalidad con excedentes acogida a compensación, la energía que viertes se valora y se resta del término de energía de tu factura del mes. Pero esa compensación nunca puede superar ese término: no descuenta el término de potencia, ni los impuestos, ni se guarda para el mes siguiente. El excedente que supera tu consumo del mes, sencillamente, se regala." },
      { type: "ul", items: [
        "No sobredimensiones para \"vender\" excedente — a partir de cierto punto produces energía que no se te paga.",
        "El óptimo maximiza el autoconsumo, no la producción: cada kWh que consumes vale 0,20-0,25 €, cada kWh vertido apenas 0,05-0,10 € y con tope.",
        "Una batería —o una batería virtual— es lo que convierte ese excedente perdido en valor real."
      ]},
      { type: "p", text: "La batería virtual que ofrecen algunas comercializadoras no es balance neto tampoco: es un producto comercial que guarda tu excedente como saldo en euros para usarlo en meses siguientes o en otros conceptos de la factura. Puede tener sentido, pero tiene letra pequeña — condiciones, permanencias y precios de compensación que conviene leer antes de firmar." },
      { type: "h2", text: "Qué mirar antes de dimensionar" },
      { type: "ul", items: [
        "Tu curva de consumo por horas, no solo el total anual: define cuánto excedente vas a generar realmente.",
        "El precio y el tope de compensación de tu comercializadora — es lo que decide el valor de cada kWh vertido.",
        "Si te interesa más autoconsumo directo, batería física o batería virtual: son tres formas distintas de tratar el mismo excedente, con números distintos."
      ]},
      { type: "quote", text: "En España no vendes tu excedente a la red: lo compensas hasta un tope. Quien dimensiona sin saberlo, paga placas que trabajan gratis." },
      { type: "p", text: "Dimensionar bien no es poner el tejado más grande posible, sino el que mejor encaja con tu consumo y tu forma de tratar el excedente. El instalador que lo explica antes de vender gana el cliente que, al entender la factura, deja de comparar solo el precio." }
    ]
  },
  {
    slug: "autoconsumo-lo-que-los-instaladores-deben-explicar",
    markets: ["es"],
    title: "Autoconsumo: lo que los instaladores deben explicar antes de vender",
    summary:
      "La compensación de excedentes no es un detalle para la letra pequeña — es una conversación que ganas antes que tu competencia. A qué clientes llamar ahora, y las tres frases que despejan la duda en vez de alimentarla.",
    tag: "Energy",
    publishedAt: "2026-07-20",
    readingMinutes: 5,
    seo: {
      metaTitle: "Autoconsumo: qué explicar antes de vender",
      metaDescription:
        "La compensación de excedentes es una conversación que ganas antes que tu competencia. A qué clientes llamar ahora, y tres frases que despejan.",
    },
    body: [
      { type: "p", text: "La mayoría de instaladores tratan la compensación de excedentes como una nota al pie: una línea en el presupuesto, una pregunta que respondes si el cliente la saca. Es una oportunidad desperdiciada. El cliente que se entera por ti de cómo funciona de verdad —antes de oírlo del vecino o de la competencia— te confía el siguiente paso. El que lo pilla por otro lado vuelve con desconfianza." },
      { type: "h2", text: "Los clientes a los que llamas ahora deciden tu año" },
      { type: "p", text: "Hay tres grupos que necesitan esta conversación este mes, y cada uno pregunta algo distinto. Quien los confunde, pierde en los tres." },
      { type: "ul", items: [
        "Clientes solo con placas — creen que su excedente vale mucho más de lo que la compensación paga. Llámalos antes de que les llegue una factura que no esperan; una batería a un cliente contento es la venta más barata del año.",
        "Presupuestos en curso — aquí la cuenta de rentabilidad tiene que cuadrar con la compensación real y topada, no con un balance neto que no existe. Un presupuesto con números inflados acaba en reclamación.",
        "Los que \"esperan un poco\" — para ellos el argumento es la propia cuenta: qué les cuesta esperar, calculado sobre su consumo, no como presión."
      ]},
      { type: "p", text: "En las tres conversaciones lo más fuerte que puedes hacer no es hablar, sino calcular: enseñarle al cliente sus propios números en vez de un discurso general." },
      { type: "h2", text: "La conversación honesta en tres frases" },
      { type: "ul", items: [
        "Qué cambia: \"En España el excedente no gira el contador hacia atrás; se compensa hasta un tope, y lo que sobra no se paga.\"",
        "Qué significa para ti: \"Para tu consumo, eso concretamente es esto\" — con un número de su propia situación, no de un folleto.",
        "Qué opciones hay: \"Puedes no hacer nada, subir tu autoconsumo o valorar una batería —física o virtual—; calculémoslas antes de decidir.\""
      ]},
      { type: "quote", text: "Quien usa la compensación para vender, gana una venta. Quien la usa para informar con honestidad, gana al cliente y a sus vecinos." },
      { type: "p", text: "Las reglas del autoconsumo son iguales para todos a la vez. La diferencia entre los instaladores que sufren y los que crecen no está en el precio ni en el producto — está en quién tiene la conversación primero y en si es honesta. Empieza esta semana, por los clientes que ya tienes." }
    ]
  },
  {
    slug: "the-esg-number-your-asset-manager-cant-defend",
    title: "The ESG number your asset manager can't defend",
    summary:
      "Every real estate operator produces an ESG number once a year. Almost none can defend it line by line when an investor's due-diligence team starts pulling threads. Why the number falls apart under scrutiny — and how to make it reproducible from the meter.",
    tag: "Real estate",
    publishedAt: "2026-07-20",
    readingMinutes: 6,
    seo: {
      metaTitle: "The ESG number you can't defend",
      metaDescription:
        "Every real estate operator produces an ESG number once a year. Almost none survives due diligence. Make it reproducible from the meter.",
    },
    body: [
      { type: "p", text: "Every real estate operator produces an ESG number once a year. Almost none can defend it line by line when an investor's due-diligence team starts pulling threads. The report looks precise — three decimal places, a nice chart — and it is quietly indefensible." },
      { type: "h2", text: "Why the number falls apart under scrutiny" },
      { type: "p", text: "The annual ESG report is assembled in a two-week scramble from data that lives in a dozen property managers' systems, each with its own definition of energy use, occupancy, and common area. Aggregate figures built on inconsistent denominators look authoritative and mean almost nothing. The person who signs it usually knows this — and hopes nobody asks." },
      { type: "h2", text: "Three questions a due-diligence team will ask" },
      { type: "ul", items: [
        "Which meter does this kWh figure come from, and does it reconcile with the utility invoice?",
        "When two assets report the same intensity, are they dividing by the same denominator — lettable area, gross area, or something a property manager invented?",
        "If I re-run this one building from source, do I land on your number?"
      ]},
      { type: "p", text: "If the answer to any of these is a spreadsheet and a phone call to a property manager, the number is a narrative, not a measurement — and a good analyst will find the seam in an afternoon." },
      { type: "h2", text: "Make ESG a live surface, not an annual fire drill" },
      { type: "p", text: "The fix is not a better report. It is defining the numbers once — the exact meter, the exact denominator, the exact period — and computing them continuously from source, so the annual report is a screenshot of something that was already true all year. When the dashboard disagrees with the invoice, the dashboard is wrong, and you find out in March, not in the data room." },
      { type: "quote", text: "An ESG number you assemble once a year is a story. One you can reproduce from the meter on any given Tuesday is an asset." },
      { type: "p", text: "The operators who win the next capital raise are the ones whose numbers survive the due-diligence room. That is a data-architecture decision, made long before the report is due." }
    ],
    i18n: {
      nl: {
        seo: {
          metaTitle: "Het ESG-cijfer dat niemand kan verdedigen",
          metaDescription:
            "Elke vastgoedoperator levert jaarlijks een ESG-cijfer. Bijna geen enkel overleeft een due diligence. Maak het reproduceerbaar vanaf de meter.",
        },
        title: "Het ESG-cijfer dat je assetmanager niet kan verdedigen",
        summary:
          "Elke vastgoedoperator produceert één keer per jaar een ESG-cijfer. Bijna niemand kan het regel voor regel verdedigen zodra een due-diligenceteam aan de draadjes trekt. Waarom het bezwijkt onder onderzoek — en hoe je het reproduceerbaar maakt vanaf de meter.",
        body: [
          { type: "p", text: "Elke vastgoedoperator produceert één keer per jaar een ESG-cijfer. Bijna niemand kan het regel voor regel verdedigen zodra het due-diligenceteam van een investeerder aan de draadjes gaat trekken. Het rapport oogt precies — drie decimalen, een nette grafiek — en is stilletjes onverdedigbaar." },
          { type: "h2", text: "Waarom het cijfer bezwijkt onder onderzoek" },
          { type: "p", text: "Het jaarlijkse ESG-rapport wordt in twee weken haastwerk samengesteld uit data die in de systemen van een stuk of twaalf beheerders leeft, elk met een eigen definitie van energieverbruik, bezetting en algemene ruimte. Totalen die op ongelijke noemers rusten ogen gezaghebbend en betekenen vrijwel niets. Degene die tekent weet dat meestal, en hoopt dat niemand doorvraagt." },
          { type: "h2", text: "Drie vragen die een due-diligenceteam stelt" },
          { type: "ul", items: [
            "Van welke meter komt dit kWh-cijfer, en klopt het met de energienota?",
            "Als twee panden dezelfde intensiteit rapporteren, delen ze dan door dezelfde noemer — verhuurbaar oppervlak, bruto oppervlak, of iets wat een beheerder zelf bedacht?",
            "Als ik dit ene pand vanaf de bron opnieuw doorreken, kom ik dan op jouw getal uit?",
          ] },
          { type: "p", text: "Is het antwoord op een van die drie een spreadsheet en een telefoontje naar de beheerder, dan is het cijfer een verhaal en geen meting — en een goede analist vindt de naad binnen een middag." },
          { type: "h2", text: "Maak van ESG een live scherm, geen jaarlijkse brandoefening" },
          { type: "p", text: "De oplossing is geen beter rapport. De oplossing is de cijfers één keer definiëren — welke meter precies, welke noemer precies, welke periode precies — en ze doorlopend vanaf de bron berekenen, zodat het jaarrapport een schermafdruk is van iets wat het hele jaar al waar was. Wijkt het dashboard af van de factuur, dan heeft het dashboard ongelijk, en dat merk je in maart in plaats van in de dataroom." },
          { type: "quote", text: "Een ESG-cijfer dat je één keer per jaar in elkaar zet is een verhaal. Een cijfer dat je op een willekeurige dinsdag vanaf de meter kunt reproduceren is een bezit." },
          { type: "p", text: "De operators die de volgende financieringsronde winnen zijn de operators van wie de cijfers de dataroom overleven. Dat is een keuze in de data-architectuur, lang voordat het rapport af moet." },
        ],
      },
      de: {
        seo: {
          metaTitle: "Die ESG-Zahl, die niemand verteidigt",
          metaDescription:
            "Jeder Immobilienbetreiber liefert jährlich eine ESG-Zahl. Kaum eine übersteht die Due Diligence. Machen Sie sie am Zähler nachvollziehbar.",
        },
        title: "Die ESG-Zahl, die Ihr Asset Manager nicht verteidigen kann",
        summary:
          "Jeder Immobilienbetreiber produziert einmal im Jahr eine ESG-Zahl. Kaum einer kann sie Zeile für Zeile verteidigen, sobald das Due-Diligence-Team eines Investors nachhakt. Warum die Zahl unter Prüfung zerfällt — und wie Sie sie aus dem Zähler reproduzierbar machen.",
        body: [
          { type: "p", text: "Jeder Immobilienbetreiber produziert einmal im Jahr eine ESG-Zahl. Kaum einer kann sie Zeile für Zeile verteidigen, sobald das Due-Diligence-Team eines Investors anfängt, an den Fäden zu ziehen. Der Bericht sieht präzise aus — drei Nachkommastellen, ein schönes Diagramm — und ist im Stillen nicht haltbar." },
          { type: "h2", text: "Warum die Zahl unter Prüfung zerfällt" },
          { type: "p", text: "Der jährliche ESG-Bericht entsteht in einem zweiwöchigen Kraftakt aus Daten, die in einem Dutzend Systemen verschiedener Property Manager liegen — jedes mit eigener Definition von Energieverbrauch, Belegung und Gemeinschaftsfläche. Aggregate auf uneinheitlichen Nennern wirken maßgeblich und bedeuten fast nichts. Wer unterschreibt, weiß das meist — und hofft, dass niemand nachfragt." },
          { type: "h2", text: "Drei Fragen, die ein Due-Diligence-Team stellen wird" },
          { type: "ul", items: [
            "Aus welchem Zähler stammt diese kWh-Zahl, und stimmt sie mit der Versorgerrechnung überein?",
            "Wenn zwei Objekte dieselbe Intensität melden — teilen sie durch denselben Nenner: vermietbare Fläche, Bruttofläche oder etwas, das ein Property Manager erfunden hat?",
            "Wenn ich dieses eine Gebäude aus der Quelle neu rechne, komme ich auf Ihre Zahl?"
          ]},
          { type: "p", text: "Ist die Antwort auf eine dieser Fragen eine Tabelle und ein Anruf beim Property Manager, ist die Zahl ein Narrativ, keine Messung — und ein guter Analyst findet die Naht an einem Nachmittag." },
          { type: "h2", text: "Machen Sie ESG zu einer lebenden Fläche, nicht zum jährlichen Feueralarm" },
          { type: "p", text: "Die Lösung ist kein besserer Bericht. Sie besteht darin, die Zahlen einmal zu definieren — den exakten Zähler, den exakten Nenner, den exakten Zeitraum — und sie fortlaufend aus der Quelle zu berechnen, sodass der Jahresbericht ein Screenshot von etwas ist, das ohnehin das ganze Jahr galt. Wenn das Dashboard der Rechnung widerspricht, ist das Dashboard falsch — und Sie erfahren es im März, nicht im Datenraum." },
          { type: "quote", text: "Eine ESG-Zahl, die Sie einmal im Jahr zusammensetzen, ist eine Geschichte. Eine, die Sie an einem beliebigen Dienstag aus dem Zähler reproduzieren, ist ein Vermögenswert." },
          { type: "p", text: "Die Betreiber, die die nächste Kapitalrunde gewinnen, sind die, deren Zahlen den Due-Diligence-Raum überstehen. Das ist eine Entscheidung über die Datenarchitektur — lange bevor der Bericht fällig ist." }
        ],
      },
      es: {
        seo: {
          metaTitle: "El número ESG que nadie puede defender",
          metaDescription:
            "Cada operador inmobiliario entrega una cifra ESG al año. Casi ninguna sobrevive a la due diligence. Hazla reproducible desde el contador.",
        },
        title: "El número ESG que tu gestor de activos no puede defender",
        summary:
          "Todo operador inmobiliario produce un número ESG una vez al año. Casi ninguno puede defenderlo línea por línea cuando el equipo de due diligence de un inversor empieza a tirar del hilo. Por qué el número se desmorona bajo escrutinio — y cómo hacerlo reproducible desde el contador.",
        body: [
          { type: "p", text: "Todo operador inmobiliario produce un número ESG una vez al año. Casi ninguno puede defenderlo línea por línea cuando el equipo de due diligence de un inversor empieza a tirar del hilo. El informe parece preciso —tres decimales, un gráfico bonito— y es, en silencio, indefendible." },
          { type: "h2", text: "Por qué el número se desmorona bajo escrutinio" },
          { type: "p", text: "El informe ESG anual se monta en dos semanas a la carrera con datos que viven en los sistemas de una docena de gestores de fincas, cada uno con su propia definición de consumo energético, ocupación y zona común. Los agregados construidos sobre denominadores inconsistentes parecen autorizados y no significan casi nada. Quien lo firma normalmente lo sabe — y espera que nadie pregunte." },
          { type: "h2", text: "Tres preguntas que hará un equipo de due diligence" },
          { type: "ul", items: [
            "¿De qué contador sale esta cifra de kWh, y cuadra con la factura de la compañía?",
            "Cuando dos activos reportan la misma intensidad, ¿dividen por el mismo denominador —superficie alquilable, superficie bruta o algo que se inventó un gestor?",
            "Si recalculo este edificio desde el origen, ¿llego a tu número?"
          ]},
          { type: "p", text: "Si la respuesta a alguna de estas es una hoja de cálculo y una llamada al gestor de fincas, el número es un relato, no una medición — y un buen analista encuentra la costura en una tarde." },
          { type: "h2", text: "Haz del ESG una superficie viva, no un simulacro anual" },
          { type: "p", text: "La solución no es un informe mejor. Es definir los números una vez —el contador exacto, el denominador exacto, el periodo exacto— y calcularlos de forma continua desde el origen, de modo que el informe anual sea una captura de algo que ya era cierto todo el año. Cuando el panel contradice la factura, el panel está mal, y te enteras en marzo, no en la sala de datos." },
          { type: "quote", text: "Un número ESG que montas una vez al año es un cuento. Uno que puedes reproducir desde el contador un martes cualquiera es un activo." },
          { type: "p", text: "Los operadores que ganan la siguiente ronda de capital son aquellos cuyos números sobreviven a la sala de due diligence. Eso es una decisión de arquitectura de datos, tomada mucho antes de que venza el informe." }
        ],
      },
    },
  },
  {
    slug: "the-ten-minutes-before-check-in",
    title: "The ten minutes before check-in where your margin leaks",
    summary:
      "Ask a hotel revenue manager where the margin is and they point at the rate card. Ask where it leaks and the honest answer is the ten minutes before check-in — the upsell not offered, the room assigned by habit, the rate held too long. Most of it is decided on gut feel.",
    tag: "Hospitality",
    publishedAt: "2026-07-20",
    readingMinutes: 5,
    seo: {
      metaTitle: "The ten minutes before check-in",
      metaDescription:
        "Hotel margin leaks at the front desk, not in the spreadsheet: the upsell not offered, the room assigned by habit, the rate held too long.",
    },
    body: [
      { type: "p", text: "Ask a hotel revenue manager where the margin is, and they point at the rate card. Ask where it leaks, and the honest answer is the ten minutes before check-in — the upsell not offered, the room assigned by habit, the rate held two days too long. Most of that is decided on gut feel, by someone with no instrument to check the call against." },
      { type: "h2", text: "The most valuable ten minutes in the building have no instrument" },
      { type: "p", text: "Hospitality is one of the last industries where a senior operator makes call-by-call revenue decisions without a tool to check them against. The revenue manager knows this week's numbers. They rarely know why — and by the time they do, next week is already pricing." },
      { type: "h2", text: "Where the leak actually is" },
      { type: "ul", items: [
        "Upsells offered inconsistently, because nothing prompts the front desk at the one moment the guest is standing there ready to say yes.",
        "Rooms assigned by convenience, not by yield — the premium room handed to a standard-rate guest because it was next in the list.",
        "Rates that move on the revenue manager's gut, two days after the market already moved."
      ]},
      { type: "p", text: "None of these are pricing-tool problems. They are decision-support problems at the frontline, where the actual revenue event happens and where almost no software is pointed." },
      { type: "h2", text: "Build the instrument, not another dashboard" },
      { type: "p", text: "The revenue manager doesn't need a prettier report of last week. They need a live instrument that makes the right call obvious in the ten minutes it matters — and frontline tools the staff actually open. Run it in parallel to the existing process for two cycles and prove the number before you flip the default." },
      { type: "quote", text: "In hospitality the margin doesn't leak in the spreadsheet. It leaks at the front desk, ten minutes before check-in, one gut-feel decision at a time." },
      { type: "p", text: "The operators who pull ahead stop treating revenue as something you review after the week, and start treating it as something you instrument during it." }
    ],
    i18n: {
      nl: {
        seo: {
          metaTitle: "De tien minuten vóór check-in",
          metaDescription:
            "De marge lekt weg aan de balie, niet in de spreadsheet: de upsell die niet kwam, de kamer op gewoonte, de prijs die bleef staan.",
        },
        title: "De tien minuten vóór check-in waar je marge weglekt",
        summary:
          "Vraag een revenue manager waar de marge zit en hij wijst naar de prijslijst. Vraag waar hij weglekt en het eerlijke antwoord is: in de tien minuten vóór check-in. De upsell die niet kwam, de kamer die uit gewoonte werd toegewezen, de prijs die te lang bleef staan.",
        body: [
          { type: "p", text: "Vraag een revenue manager waar de marge zit en hij wijst naar de prijslijst. Vraag waar hij weglekt en het eerlijke antwoord is: in de tien minuten vóór check-in. De upsell die niet werd aangeboden, de kamer die uit gewoonte werd toegewezen, de prijs die twee dagen te lang bleef staan. Dat wordt grotendeels op gevoel beslist, door iemand zonder instrument om die beslissing aan te toetsen." },
          { type: "h2", text: "De waardevolste tien minuten in het pand hebben geen instrument" },
          { type: "p", text: "Horeca is een van de laatste sectoren waar een ervaren operator per geval omzetbeslissingen neemt zonder gereedschap om ze aan te toetsen. De revenue manager kent de cijfers van deze week. Waarom die zo zijn weet hij zelden, en tegen de tijd dat hij het weet staat de prijs voor volgende week al." },
          { type: "h2", text: "Waar het lek werkelijk zit" },
          { type: "ul", items: [
            "Upsells die wisselend worden aangeboden, omdat niets de receptie herinnert op het ene moment dat de gast er klaar voor staat.",
            "Kamers die op gemak worden toegewezen in plaats van op opbrengst — de betere kamer naar een gast op standaardtarief, omdat die boven aan de lijst stond.",
            "Prijzen die op het gevoel van de revenue manager bewegen, twee dagen nadat de markt al bewoog.",
          ] },
          { type: "p", text: "Geen van drieën is een probleem van je prijstool. Het zijn beslissingsproblemen aan de balie, waar de omzet daadwerkelijk ontstaat en waar vrijwel geen software op gericht is." },
          { type: "h2", text: "Bouw het instrument, niet nog een dashboard" },
          { type: "p", text: "De revenue manager heeft geen mooier rapport over vorige week nodig. Hij heeft een live instrument nodig dat de juiste keuze duidelijk maakt in de tien minuten dat het telt, plus tools die het vloerteam uit zichzelf opent. Draai dat twee cycli parallel aan het bestaande proces en bewijs het cijfer voordat je de standaard omzet." },
          { type: "quote", text: "In de horeca lekt de marge niet weg in de spreadsheet. Hij lekt weg aan de balie, tien minuten vóór check-in, één onderbuikbeslissing tegelijk." },
          { type: "p", text: "De operators die uitlopen behandelen omzet niet langer als iets wat je na afloop van de week bekijkt, maar als iets waar je tijdens die week een instrument op zet." },
        ],
      },
      de: {
        seo: {
          metaTitle: "Die zehn Minuten vor dem Check-in",
          metaDescription:
            "Die Marge versickert an der Rezeption, nicht in der Tabelle: der Upsell ohne Angebot, das Zimmer aus Gewohnheit, der Preis zu lange gehalten.",
        },
        title: "Die zehn Minuten vor dem Check-in, in denen Ihre Marge verloren geht",
        summary:
          "Fragen Sie einen Revenue Manager, wo die Marge steckt, zeigt er auf die Preisliste. Fragen Sie, wo sie verloren geht, ist die ehrliche Antwort: in den zehn Minuten vor dem Check-in — das nicht angebotene Upgrade, das aus Gewohnheit vergebene Zimmer, der zu lange gehaltene Preis. Meist aus dem Bauch entschieden.",
        body: [
          { type: "p", text: "Fragen Sie einen Hotel-Revenue-Manager, wo die Marge steckt, zeigt er auf die Preisliste. Fragen Sie, wo sie verloren geht, ist die ehrliche Antwort: in den zehn Minuten vor dem Check-in — das nicht angebotene Upgrade, das aus Gewohnheit vergebene Zimmer, der zwei Tage zu lange gehaltene Preis. Das meiste davon wird aus dem Bauch entschieden, von jemandem ohne Instrument, um die Entscheidung zu prüfen." },
          { type: "h2", text: "Die wertvollsten zehn Minuten im Haus haben kein Instrument" },
          { type: "p", text: "Hospitality ist eine der letzten Branchen, in der ein erfahrener Operator Umsatzentscheidungen von Fall zu Fall trifft, ohne ein Werkzeug zur Gegenprüfung. Der Revenue Manager kennt die Zahlen dieser Woche. Warum sie so sind, weiß er selten — und wenn er es weiß, kalkuliert die nächste Woche schon." },
          { type: "h2", text: "Wo die Marge wirklich verloren geht" },
          { type: "ul", items: [
            "Upgrades werden uneinheitlich angeboten, weil nichts die Rezeption in genau dem Moment anstößt, in dem der Gast bereit ist, ja zu sagen.",
            "Zimmer werden nach Bequemlichkeit vergeben, nicht nach Ertrag — das Premiumzimmer geht an einen Standardtarif-Gast, weil es als Nächstes in der Liste stand.",
            "Preise bewegen sich nach dem Bauchgefühl des Revenue Managers, zwei Tage nachdem sich der Markt schon bewegt hat."
          ]},
          { type: "p", text: "Nichts davon ist ein Problem des Preistools. Es sind Probleme der Entscheidungsunterstützung an der Front, wo das eigentliche Umsatzereignis stattfindet — und wohin kaum eine Software zeigt." },
          { type: "h2", text: "Bauen Sie das Instrument, nicht noch ein Dashboard" },
          { type: "p", text: "Der Revenue Manager braucht keinen hübscheren Bericht der letzten Woche. Er braucht ein lebendiges Instrument, das die richtige Entscheidung in den zehn Minuten offensichtlich macht, in denen sie zählt — und Frontline-Werkzeuge, die das Personal tatsächlich öffnet. Lassen Sie es zwei Zyklen parallel zum bestehenden Prozess laufen und beweisen Sie die Zahl, bevor Sie umschalten." },
          { type: "quote", text: "In der Hotellerie geht die Marge nicht in der Tabelle verloren. Sie geht an der Rezeption verloren, zehn Minuten vor dem Check-in, eine Bauchentscheidung nach der anderen." },
          { type: "p", text: "Die Betreiber, die vorbeiziehen, behandeln Umsatz nicht mehr als etwas, das man nach der Woche prüft, sondern als etwas, das man während der Woche instrumentiert." }
        ],
      },
      es: {
        seo: {
          metaTitle: "Los diez minutos antes del check-in",
          metaDescription:
            "El margen se escapa en recepción, no en la hoja de cálculo: el upsell que no se ofrece, la habitación por costumbre, la tarifa estancada.",
        },
        title: "Los diez minutos antes del check-in donde se te escapa el margen",
        summary:
          "Pregunta a un revenue manager dónde está el margen y señala la tarifa. Pregunta dónde se escapa y la respuesta honesta son los diez minutos antes del check-in — el upselling no ofrecido, la habitación asignada por costumbre, la tarifa mantenida demasiado tiempo. Casi todo se decide a ojo.",
        body: [
          { type: "p", text: "Pregunta a un revenue manager de hotel dónde está el margen y señala la tarifa. Pregunta dónde se escapa y la respuesta honesta son los diez minutos antes del check-in — el upselling no ofrecido, la habitación asignada por costumbre, la tarifa mantenida dos días de más. Casi todo eso se decide a ojo, por alguien sin un instrumento para contrastar la decisión." },
          { type: "h2", text: "Los diez minutos más valiosos del edificio no tienen instrumento" },
          { type: "p", text: "La hostelería es uno de los últimos sectores donde un operador con experiencia toma decisiones de ingresos caso por caso sin una herramienta con la que contrastarlas. El revenue manager conoce los números de esta semana. Rara vez sabe por qué — y para cuando lo sabe, la semana siguiente ya está tarificando." },
          { type: "h2", text: "Dónde se escapa el margen de verdad" },
          { type: "ul", items: [
            "Los upsellings se ofrecen de forma inconsistente, porque nada avisa a la recepción en el único momento en que el huésped está delante, listo para decir que sí.",
            "Las habitaciones se asignan por comodidad, no por rentabilidad — la habitación premium va a un huésped de tarifa estándar porque era la siguiente de la lista.",
            "Las tarifas se mueven según la intuición del revenue manager, dos días después de que el mercado ya se moviera."
          ]},
          { type: "p", text: "Nada de esto es un problema de la herramienta de precios. Son problemas de apoyo a la decisión en primera línea, donde ocurre el verdadero evento de ingresos — y a donde casi ningún software apunta." },
          { type: "h2", text: "Construye el instrumento, no otro panel" },
          { type: "p", text: "El revenue manager no necesita un informe más bonito de la semana pasada. Necesita un instrumento vivo que haga obvia la decisión correcta en los diez minutos que importan — y herramientas de primera línea que el personal abra de verdad. Hazlo funcionar en paralelo al proceso actual durante dos ciclos y demuestra el número antes de cambiar el valor por defecto." },
          { type: "quote", text: "En hostelería el margen no se escapa en la hoja de cálculo. Se escapa en recepción, diez minutos antes del check-in, una decisión a ojo cada vez." },
          { type: "p", text: "Los operadores que se adelantan dejan de tratar los ingresos como algo que se revisa después de la semana y empiezan a tratarlos como algo que se instrumenta durante ella." }
        ],
      },
    },
  },
  {
    slug: "the-retrofit-roi-model-that-doesnt-survive-the-building",
    title: "The retrofit ROI model that doesn't survive the building",
    summary:
      "Every retrofit decision — insulation, heat pump, solar — comes with an ROI model, and almost all of them run on regional averages. That's where retrofit money quietly dies. Why the model breaks against the actual asset, and how to build one from the meter.",
    tag: "Real estate",
    publishedAt: "2026-07-20",
    readingMinutes: 6,
    seo: {
      metaTitle: "The retrofit ROI model that breaks",
      metaDescription:
        "Insulation, heat pump, solar: almost every payback model runs on regional averages. That is where retrofit money dies. Model from the meter.",
    },
    body: [
      { type: "p", text: "Every retrofit decision — insulation, heat pump, solar — comes with an ROI model. Almost all of them are built on regional averages, and regional averages are where retrofit money quietly dies. The number looks bankable and describes a building that isn't yours." },
      { type: "h2", text: "The model is regional. The building is specific." },
      { type: "p", text: "A heat-pump payback calculated on \"average\" heating demand assumes an envelope, an occupancy pattern, and a climate your specific asset may not share. Be off by 20 percent on the demand assumption and a nine-year payback becomes fourteen — or the reverse, and you skip a retrofit that would have paid back in six." },
      { type: "h2", text: "Where the models break" },
      { type: "ul", items: [
        "Heating and cooling demand pulled from building-type averages, not the asset's own meter history.",
        "Occupancy assumed at design spec, not what tenants actually do.",
        "Energy prices held flat — when they are the single most volatile input in the whole model.",
        "Grants assumed at the headline rate, not what the building actually qualifies for."
      ]},
      { type: "p", text: "Each assumption is defensible in isolation and catastrophic in combination. A retrofit business case is the product of four assumptions, so a 20 percent error on each doesn't add — it compounds." },
      { type: "h2", text: "Model from the meter, not the brochure" },
      { type: "p", text: "The retrofits that pay back are the ones modeled on the building's own consumption history, its real occupancy, and a price scenario you actually believe. It is slower than the brochure calculator. It is also the difference between a capex decision and a guess wearing a spreadsheet." },
      { type: "quote", text: "A retrofit ROI built on regional averages is precise about a building that doesn't exist. Model the one you own." },
      { type: "p", text: "The asset managers who retrofit well don't have better contractors. They have better inputs — and they know which of their buildings to leave alone." }
    ],
    i18n: {
      nl: {
        seo: {
          metaTitle: "Het verduurzamingsmodel dat breekt",
          metaDescription:
            "Isolatie, warmtepomp, zon: bijna elk terugverdienmodel draait op regionale gemiddelden. Daar sterft het geld. Reken vanaf de meter.",
        },
        title: "Het verduurzamingsmodel dat het pand niet overleeft",
        summary:
          "Elke verduurzamingsbeslissing — isolatie, warmtepomp, zon — komt met een terugverdienmodel, en bijna allemaal draaien ze op regionale gemiddelden. Daar sterft verduurzamingsgeld stilletjes. Hoe je er een bouwt vanaf de meter.",
        body: [
          { type: "p", text: "Elke verduurzamingsbeslissing — isolatie, warmtepomp, zon — komt met een terugverdienmodel. Bijna allemaal staan ze op regionale gemiddelden, en regionale gemiddelden zijn waar verduurzamingsgeld stilletjes sterft. Het getal ziet er financierbaar uit en beschrijft een pand dat niet het jouwe is." },
          { type: "h2", text: "Het model is regionaal. Het pand is specifiek." },
          { type: "p", text: "Een terugverdientijd voor een warmtepomp, berekend op 'gemiddelde' warmtevraag, veronderstelt een schil, een gebruikspatroon en een klimaat die jouw pand misschien niet deelt. Zit je er twintig procent naast op die vraag, dan wordt negen jaar terugverdientijd veertien. Of andersom, en sla je een ingreep over die zich in zes jaar had terugbetaald." },
          { type: "h2", text: "Waar de modellen breken" },
          { type: "ul", items: [
            "Warmte- en koudevraag uit gemiddelden per gebouwtype, niet uit de meterhistorie van het pand zelf.",
            "Bezetting aangenomen op ontwerpwaarde, niet op wat huurders werkelijk doen.",
            "Energieprijzen vlak gehouden, terwijl dat de meest beweeglijke invoer van het hele model is.",
            "Subsidies gerekend op het bedrag uit de kop, niet op waar het pand echt voor in aanmerking komt.",
          ] },
          { type: "p", text: "Elke aanname is op zichzelf verdedigbaar en in combinatie rampzalig. Een verduurzamingsbusinesscase is het product van vier aannames, dus een fout van twintig procent per stuk telt niet op — die vermenigvuldigt." },
          { type: "h2", text: "Modelleer vanaf de meter, niet vanuit de brochure" },
          { type: "p", text: "De ingrepen die zich terugbetalen zijn gemodelleerd op het eigen verbruik van het pand, de werkelijke bezetting en een prijsscenario waar je zelf in gelooft. Dat kost meer tijd dan de rekentool van de brochure. Het is ook het verschil tussen een investeringsbeslissing en een gok in een spreadsheetjasje." },
          { type: "quote", text: "Een terugverdienmodel op regionale gemiddelden is precies over een pand dat niet bestaat. Reken het pand door dat je bezit." },
          { type: "p", text: "De assetmanagers die goed verduurzamen hebben geen betere aannemers. Ze hebben betere invoer — en ze weten van welke panden ze af moeten blijven." },
        ],
      },
      de: {
        seo: {
          metaTitle: "Das Sanierungs-ROI-Modell, das bricht",
          metaDescription:
            "Dämmung, Wärmepumpe, Solar: fast jede Amortisationsrechnung läuft auf Regionalmittelwerten. Dort stirbt das Geld. Rechnen Sie am Zähler.",
        },
        title: "Das Sanierungs-ROI-Modell, das am echten Gebäude scheitert",
        summary:
          "Jede Sanierungsentscheidung — Dämmung, Wärmepumpe, Solar — kommt mit einem ROI-Modell, und fast alle laufen auf regionalen Durchschnitten. Genau da verschwindet das Sanierungsgeld leise. Warum das Modell am echten Objekt scheitert, und wie Sie es aus dem Zähler bauen.",
        body: [
          { type: "p", text: "Jede Sanierungsentscheidung — Dämmung, Wärmepumpe, Solar — kommt mit einem ROI-Modell. Fast alle sind auf regionalen Durchschnitten gebaut, und regionale Durchschnitte sind der Ort, an dem Sanierungsgeld leise verschwindet. Die Zahl wirkt belastbar und beschreibt ein Gebäude, das nicht Ihres ist." },
          { type: "h2", text: "Das Modell ist regional. Das Gebäude ist konkret." },
          { type: "p", text: "Eine Wärmepumpen-Amortisation auf \"durchschnittlichem\" Heizbedarf setzt eine Gebäudehülle, ein Nutzungsmuster und ein Klima voraus, die Ihr konkretes Objekt vielleicht nicht teilt. Liegen Sie beim Bedarf um 20 Prozent daneben, wird aus neun Jahren Amortisation vierzehn — oder umgekehrt, und Sie lassen eine Sanierung aus, die sich in sechs gerechnet hätte." },
          { type: "h2", text: "Wo die Modelle brechen" },
          { type: "ul", items: [
            "Heiz- und Kühlbedarf aus Gebäudetyp-Durchschnitten statt aus der Zählerhistorie des Objekts.",
            "Belegung nach Planungssoll angenommen, nicht nach dem, was die Mieter tatsächlich tun.",
            "Energiepreise konstant gehalten — obwohl sie die volatilste Größe im ganzen Modell sind.",
            "Förderung zum Schlagzeilensatz angenommen, nicht zu dem, was das Gebäude wirklich erhält."
          ]},
          { type: "p", text: "Jede Annahme ist für sich vertretbar und in Kombination katastrophal. Ein Sanierungs-Business-Case ist das Produkt von vier Annahmen, also addiert sich ein 20-Prozent-Fehler bei jeder nicht — er potenziert sich." },
          { type: "h2", text: "Rechnen Sie aus dem Zähler, nicht aus der Broschüre" },
          { type: "p", text: "Die Sanierungen, die sich rechnen, sind die, die auf der eigenen Verbrauchshistorie des Gebäudes, seiner echten Belegung und einem Preisszenario modelliert sind, das Sie tatsächlich glauben. Das ist langsamer als der Broschürenrechner. Es ist auch der Unterschied zwischen einer Investitionsentscheidung und einer als Tabelle verkleideten Vermutung." },
          { type: "quote", text: "Ein Sanierungs-ROI auf regionalen Durchschnitten ist präzise über ein Gebäude, das es nicht gibt. Modellieren Sie das, das Ihnen gehört." },
          { type: "p", text: "Die Asset Manager, die gut sanieren, haben keine besseren Handwerker. Sie haben bessere Eingangsdaten — und sie wissen, welche ihrer Gebäude sie in Ruhe lassen." }
        ],
      },
      es: {
        seo: {
          metaTitle: "El modelo de ROI de reforma que falla",
          metaDescription:
            "Aislamiento, bomba de calor, solar: casi todo modelo de amortización usa medias regionales. Ahí muere el dinero. Modela desde el contador.",
        },
        title: "El modelo de ROI de reforma que no sobrevive al edificio",
        summary:
          "Cada decisión de reforma —aislamiento, aerotermia, solar— viene con un modelo de ROI, y casi todos funcionan con medias regionales. Ahí es donde el dinero de la reforma desaparece en silencio. Por qué el modelo se rompe contra el activo real, y cómo construirlo desde el contador.",
        body: [
          { type: "p", text: "Cada decisión de reforma —aislamiento, aerotermia, solar— viene con un modelo de ROI. Casi todos se construyen sobre medias regionales, y las medias regionales son donde el dinero de la reforma desaparece en silencio. El número parece fiable y describe un edificio que no es el tuyo." },
          { type: "h2", text: "El modelo es regional. El edificio es concreto." },
          { type: "p", text: "Una amortización de aerotermia calculada sobre una demanda de calefacción \"media\" presupone una envolvente, un patrón de ocupación y un clima que tu activo concreto quizá no comparta. Fállate un 20 por ciento en la demanda y una amortización de nueve años se convierte en catorce — o al revés, y descartas una reforma que se habría pagado en seis." },
          { type: "h2", text: "Dónde se rompen los modelos" },
          { type: "ul", items: [
            "Demanda de calefacción y refrigeración sacada de medias por tipo de edificio, no del histórico del propio contador.",
            "Ocupación asumida según proyecto, no según lo que los inquilinos hacen de verdad.",
            "Precios de la energía mantenidos planos — cuando son la variable más volátil de todo el modelo.",
            "Subvención asumida al tipo de titular, no a lo que el edificio realmente cumple."
          ]},
          { type: "p", text: "Cada supuesto es defendible por separado y catastrófico en combinación. Un caso de negocio de reforma es el producto de cuatro supuestos, así que un error del 20 por ciento en cada uno no se suma — se multiplica." },
          { type: "h2", text: "Modela desde el contador, no desde el folleto" },
          { type: "p", text: "Las reformas que se pagan son las que se modelan sobre el histórico de consumo del propio edificio, su ocupación real y un escenario de precios que de verdad te creas. Es más lento que la calculadora del folleto. También es la diferencia entre una decisión de inversión y una suposición disfrazada de hoja de cálculo." },
          { type: "quote", text: "Un ROI de reforma construido sobre medias regionales es preciso sobre un edificio que no existe. Modela el que tienes." },
          { type: "p", text: "Los gestores de activos que reforman bien no tienen mejores instaladores. Tienen mejores datos de entrada — y saben qué edificios dejar en paz." }
        ],
      },
    },
  },
  {
    slug: "what-your-channel-mix-hides-about-your-best-guests",
    title: "What your channel mix hides about your best guests",
    summary:
      "Every hotel knows its channel mix. Almost none know what a guest from each channel is actually worth after the channel takes its cut. That gap — spread across five dashboards that never reconcile — is where the margin story falls apart.",
    tag: "Hospitality",
    publishedAt: "2026-07-20",
    readingMinutes: 5,
    seo: {
      metaTitle: "What your channel mix hides",
      metaDescription:
        "Every hotel knows its channel mix. Almost none knows what a guest is worth after the channel takes its cut. Price by contribution, not rate.",
    },
    body: [
      { type: "p", text: "Every hotel knows its channel mix — this much OTA, this much direct, this much corporate. Almost none know what a guest from each channel is actually worth after the channel takes its cut. That gap is where the margin story quietly falls apart." },
      { type: "h2", text: "The headline number and the real number" },
      { type: "p", text: "An OTA booking at the same nightly rate as a direct booking is not the same revenue. Strip out the commission, the higher cancellation rate, the lower ancillary spend, and the shorter stay, and two identical-looking bookings can differ by a quarter in contribution. The channel mix report shows none of that." },
      { type: "h2", text: "What the five dashboards never reconcile" },
      { type: "ul", items: [
        "Commission and payment fees — which live in finance, not in the channel report.",
        "Cancellation and no-show rates by channel — which live in operations.",
        "Ancillary spend (F&B, spa, upsells) by channel — which lives nowhere in particular.",
        "Repeat rate by channel — the number that decides lifetime value, and that almost nobody tracks."
      ]},
      { type: "p", text: "Each dashboard is internally consistent and collectively useless, because a guest's true value is the product of numbers that never sit in the same table." },
      { type: "h2", text: "Price the channel by contribution, not by rate" },
      { type: "p", text: "The move is to compute contribution per booking per channel — net of commission, weighted by cancellation, plus ancillary and repeat value — and let that, not gross rate, drive how hard you fight for direct. Sometimes the OTA guest is worth more than you assumed. More often, the direct guest is worth far more than the rate card suggests." },
      { type: "quote", text: "Your channel mix report ranks bookings by rate. Your P&L ranks them by contribution. Until those two agree, you're optimizing the wrong number." },
      { type: "p", text: "The revenue teams that pull ahead stop defending the channel mix and start defending the contribution per guest — a different, and much more profitable, fight." }
    ],
    i18n: {
      nl: {
        seo: {
          metaTitle: "Wat je kanaalmix verzwijgt",
          metaDescription:
            "Elk hotel kent zijn kanaalmix. Bijna geen enkel weet wat een gast waard is na de commissie. Waardeer op bijdrage, niet op tarief.",
        },
        title: "Wat je kanaalmix verzwijgt over je beste gasten",
        summary:
          "Elk hotel kent zijn kanaalmix. Bijna geen enkel hotel weet wat een gast per kanaal werkelijk waard is nadat dat kanaal zijn deel heeft genomen. Dat gat, verspreid over vijf dashboards die nooit op elkaar aansluiten, is waar het margeverhaal uiteenvalt.",
        body: [
          { type: "p", text: "Elk hotel kent zijn kanaalmix — zoveel via OTA's, zoveel direct, zoveel zakelijk. Bijna geen enkel hotel weet wat een gast per kanaal werkelijk waard is nadat dat kanaal zijn deel heeft genomen. Daar valt het margeverhaal stilletjes uit elkaar." },
          { type: "h2", text: "Het getal in de kop en het echte getal" },
          { type: "p", text: "Een OTA-boeking tegen hetzelfde nachttarief als een directe boeking is niet dezelfde omzet. Haal de commissie eraf, het hogere annuleringspercentage, de lagere besteding ter plaatse en het kortere verblijf, en twee boekingen die er identiek uitzien kunnen een kwart schelen in bijdrage. Het kanaalmixrapport laat daar niets van zien." },
          { type: "h2", text: "Wat die vijf dashboards nooit met elkaar rijmen" },
          { type: "ul", items: [
            "Commissie en betaalkosten — die leven bij finance, niet in het kanaalrapport.",
            "Annuleringen en no-shows per kanaal — die leven bij operations.",
            "Besteding ter plaatse, van eten en drinken tot spa en upsells, per kanaal — die leeft nergens in het bijzonder.",
            "Terugkeerpercentage per kanaal — het getal dat de klantwaarde bepaalt, en dat vrijwel niemand bijhoudt.",
          ] },
          { type: "p", text: "Elk dashboard klopt in zichzelf en samen zijn ze nutteloos, want de werkelijke waarde van een gast is het product van getallen die nooit in dezelfde tabel staan." },
          { type: "h2", text: "Waardeer het kanaal op bijdrage, niet op tarief" },
          { type: "p", text: "De stap is de bijdrage per boeking per kanaal uitrekenen — na commissie, gewogen naar annuleringen, plus besteding ter plaatse en de waarde van terugkeer — en dát laten bepalen hoe hard je voor direct vecht, in plaats van het brutotarief. Soms is de OTA-gast meer waard dan je aannam. Vaker is de directe gast veel meer waard dan de prijslijst suggereert." },
          { type: "quote", text: "Je kanaalmixrapport rangschikt boekingen op tarief. Je P&L rangschikt ze op bijdrage. Zolang die twee het oneens zijn, optimaliseer je het verkeerde getal." },
          { type: "p", text: "De revenueteams die uitlopen stoppen met het verdedigen van de kanaalmix en beginnen de bijdrage per gast te verdedigen — een ander, en veel winstgevender, gevecht." },
        ],
      },
      de: {
        seo: {
          metaTitle: "Was Ihr Channel-Mix verschweigt",
          metaDescription:
            "Jedes Hotel kennt seinen Channel-Mix. Kaum eines weiß, was ein Gast nach Provision wert ist. Bewerten Sie nach Beitrag, nicht nach Rate.",
        },
        title: "Was Ihr Channel-Mix über Ihre besten Gäste verschweigt",
        summary:
          "Jedes Hotel kennt seinen Channel-Mix. Kaum eines weiß, was ein Gast aus jedem Kanal tatsächlich wert ist, nachdem der Kanal seinen Schnitt genommen hat. Diese Lücke — verteilt auf fünf Dashboards, die nie zusammenpassen — ist der Ort, an dem die Margengeschichte zerfällt.",
        body: [
          { type: "p", text: "Jedes Hotel kennt seinen Channel-Mix — so viel OTA, so viel Direkt, so viel Corporate. Kaum eines weiß, was ein Gast aus jedem Kanal tatsächlich wert ist, nachdem der Kanal seinen Schnitt genommen hat. Diese Lücke ist der Ort, an dem die Margengeschichte leise zerfällt." },
          { type: "h2", text: "Die Schlagzeilenzahl und die echte Zahl" },
          { type: "p", text: "Eine OTA-Buchung zum gleichen Übernachtungspreis wie eine Direktbuchung ist nicht derselbe Umsatz. Rechnen Sie Provision, höhere Stornoquote, geringere Zusatzausgaben und kürzere Aufenthaltsdauer heraus, und zwei identisch aussehende Buchungen können sich im Deckungsbeitrag um ein Viertel unterscheiden. Der Channel-Mix-Bericht zeigt davon nichts." },
          { type: "h2", text: "Was die fünf Dashboards nie in Einklang bringen" },
          { type: "ul", items: [
            "Provision und Zahlungsgebühren — die in der Finanzabteilung liegen, nicht im Channel-Bericht.",
            "Storno- und No-Show-Quoten je Kanal — die im Betrieb liegen.",
            "Zusatzausgaben (F&B, Spa, Upgrades) je Kanal — die nirgendwo richtig liegen.",
            "Wiederkehrrate je Kanal — die Zahl, die den Lebenszeitwert entscheidet und die kaum jemand erfasst."
          ]},
          { type: "p", text: "Jedes Dashboard ist in sich stimmig und zusammen nutzlos, weil der wahre Wert eines Gastes das Produkt von Zahlen ist, die nie in derselben Tabelle stehen." },
          { type: "h2", text: "Bewerten Sie den Kanal nach Deckungsbeitrag, nicht nach Preis" },
          { type: "p", text: "Der richtige Schritt ist, den Deckungsbeitrag je Buchung je Kanal zu berechnen — netto nach Provision, gewichtet nach Storno, plus Zusatz- und Wiederkehrwert — und das, nicht den Bruttopreis, entscheiden zu lassen, wie hart Sie um Direktbuchungen kämpfen. Manchmal ist der OTA-Gast mehr wert als angenommen. Häufiger ist der Direktgast weit mehr wert, als die Preisliste vermuten lässt." },
          { type: "quote", text: "Ihr Channel-Mix-Bericht sortiert Buchungen nach Preis. Ihre GuV sortiert sie nach Deckungsbeitrag. Solange die beiden nicht übereinstimmen, optimieren Sie die falsche Zahl." },
          { type: "p", text: "Die Revenue-Teams, die vorbeiziehen, verteidigen nicht mehr den Channel-Mix, sondern den Deckungsbeitrag je Gast — ein anderer und weit profitablerer Kampf." }
        ],
      },
      es: {
        seo: {
          metaTitle: "Lo que tu mix de canales oculta",
          metaDescription:
            "Todo hotel conoce su mix de canales. Casi ninguno sabe cuánto vale un huésped tras la comisión. Valora por contribución, no por tarifa.",
        },
        title: "Lo que tu mix de canales oculta sobre tus mejores huéspedes",
        summary:
          "Todo hotel conoce su mix de canales. Casi ninguno sabe cuánto vale de verdad un huésped de cada canal después de que el canal se lleve su parte. Ese hueco —repartido en cinco paneles que nunca cuadran— es donde se desmorona la historia del margen.",
        body: [
          { type: "p", text: "Todo hotel conoce su mix de canales — tanto de OTA, tanto directo, tanto corporativo. Casi ninguno sabe cuánto vale de verdad un huésped de cada canal después de que el canal se lleve su parte. Ese hueco es donde la historia del margen se desmorona en silencio." },
          { type: "h2", text: "El número de titular y el número real" },
          { type: "p", text: "Una reserva de OTA a la misma tarifa por noche que una directa no es el mismo ingreso. Quita la comisión, la mayor tasa de cancelación, el menor gasto accesorio y la estancia más corta, y dos reservas idénticas en apariencia pueden diferir en un cuarto de su contribución. El informe de mix de canales no muestra nada de eso." },
          { type: "h2", text: "Lo que los cinco paneles nunca cuadran" },
          { type: "ul", items: [
            "Comisión y comisiones de pago — que viven en finanzas, no en el informe de canales.",
            "Tasas de cancelación y no-show por canal — que viven en operaciones.",
            "Gasto accesorio (restauración, spa, upsellings) por canal — que no vive en ningún sitio concreto.",
            "Tasa de repetición por canal — el número que decide el valor de vida y que casi nadie mide."
          ]},
          { type: "p", text: "Cada panel es coherente por dentro e inútil en conjunto, porque el valor real de un huésped es el producto de números que nunca están en la misma tabla." },
          { type: "h2", text: "Valora el canal por contribución, no por tarifa" },
          { type: "p", text: "El movimiento es calcular la contribución por reserva y por canal —neta de comisión, ponderada por cancelación, más valor accesorio y de repetición— y dejar que eso, no la tarifa bruta, decida cuánto peleas por lo directo. A veces el huésped de OTA vale más de lo que suponías. Más a menudo, el directo vale mucho más de lo que sugiere la tarifa." },
          { type: "quote", text: "Tu informe de mix de canales ordena las reservas por tarifa. Tu cuenta de resultados las ordena por contribución. Hasta que ambos coincidan, estás optimizando el número equivocado." },
          { type: "p", text: "Los equipos de ingresos que se adelantan dejan de defender el mix de canales y empiezan a defender la contribución por huésped — una pelea distinta y mucho más rentable." }
        ],
      },
    },
  },
  {
    slug: "why-most-operator-dashboards-lie",
    title: "Why most operator dashboards quietly lie to their CEOs",
    summary:
      "The numbers on the dashboard are never wrong — but the frame is. Three patterns that turn clean data into misleading narratives, and how to audit your own dashboard in under an hour.",
    tag: "Systems",
    publishedAt: "2026-03-11",
    readingMinutes: 6,
    seo: {
      metaTitle: "Why operator dashboards quietly lie",
      metaDescription:
        "The numbers are never wrong; the frame is. Three patterns that turn clean data into a misleading story, and a one-hour audit you can run.",
    },
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
    ],
    i18n: {
      nl: {
        seo: {
          metaTitle: "Waarom dashboards stilletjes voorliegen",
          metaDescription:
            "De cijfers kloppen altijd, het kader niet. Drie patronen die schone data misleidend maken, en een doorlichting van een uur.",
        },
        title: "Waarom dashboards hun directeur stilletjes voorliegen",
        summary:
          "De cijfers op het dashboard kloppen altijd; het kader eromheen niet. Drie patronen die schone data in een misleidend verhaal veranderen, en hoe je je eigen dashboard in een uur doorlicht.",
        body: [
          { type: "p", text: "Elke directeur heeft dat moment gehad: het dashboard staat groen, de vergadering loopt goed, en twee weken later valt er een klant weg of komt de kas in de knel zonder dat iemand het zag aankomen. Het dashboard had geen ongelijk. Het keek alleen niet naar het juiste." },
          { type: "h2", text: "Drie patronen die stilletjes misleiden" },
          { type: "ul", items: [
            "Gemiddelden zonder spreiding — 'gemiddelde dealwaarde € 42.000' verbergt dat de helft van je omzet uit twee klanten komt.",
            "Achterlopende indicatoren die voor voorlopende doorgaan — MRR loopt achter. Wat de directeur nodig heeft is de snelheid van de pijplijn, en die woont twee systemen verderop.",
            "IJdele verhoudingen die uit zichzelf bewegen — de activatiegraad stijgt omdat je de lat voor wat als aanmelding telt hoger legde, niet omdat het product beter werd.",
          ] },
          { type: "h2", text: "Een doorlichting van een uur die je vandaag kunt doen" },
          { type: "p", text: "Stel bij elke tegel op je dashboard twee vragen. Eén: welke directiebeslissing neem ik anders als dit getal groen wordt? Twee: wat zou er waar moeten zijn om dit getal er goed uit te laten zien terwijl het bedrijf in de problemen zit? Kun je die twee niet binnen een minuut per tegel beantwoorden, dan is die tegel versiering en geen instrument." },
          { type: "quote", text: "De beste dashboards hebben minder tegels dan mensen verwachten. Elke tegel die geen beslissing beantwoordt, vecht om de aandacht van de tegels die dat wel doen." },
          { type: "p", text: "Als we rapportage in Philly bouwen, beginnen we bij de beslissing en niet bij de data. Dat dwingt ongemakkelijke gesprekken af — 'we weten eigenlijk niet wat we zouden doen als dit getal beweegt' — maar dat zijn precies de gesprekken die het dashboard de moeite waard maken." },
        ],
      },
      de: {
        seo: {
          metaTitle: "Warum Dashboards leise lügen",
          metaDescription:
            "Die Zahlen stimmen immer, der Rahmen nicht. Drei Muster, die saubere Daten irreführend machen, und eine Prüfung in einer Stunde.",
        },
        title: "Warum die meisten Operator-Dashboards ihre CEOs leise belügen",
        summary:
          "Die Zahlen auf dem Dashboard sind nie falsch — aber der Rahmen ist es. Drei Muster, die saubere Daten in irreführende Narrative verwandeln, und wie Sie Ihr eigenes Dashboard in unter einer Stunde prüfen.",
        body: [
          { type: "p", text: "Jeder CEO kennt den Moment: Das Dashboard ist grün, das Meeting läuft gut, und zwei Wochen später schlägt eine Kundenabwanderung oder ein Liquiditätsengpass ein, den niemand kommen sah. Das Dashboard war nicht falsch. Es schaute nur nicht auf das Richtige." },
          { type: "h2", text: "Drei Muster, die leise in die Irre führen" },
          { type: "ul", items: [
            "Durchschnitte ohne Verteilungen — 'durchschnittliche Deal-Größe 42.000 €' verbirgt, dass die Hälfte Ihres Umsatzes von zwei Kunden kommt.",
            "Nachlaufende Indikatoren als vorlaufende verkleidet — MRR ist ein nachlaufender Indikator. Was der CEO braucht, ist Pipeline-Geschwindigkeit, und die liegt zwei Systeme entfernt.",
            "Vanity-Kennzahlen, die sich von selbst bewegen — die 'Aktivierungsrate' steigt, weil Sie die Messlatte dafür angehoben haben, was als Anmeldung zählt, nicht weil das Produkt besser wurde."
          ]},
          { type: "h2", text: "Ein einstündiges Audit, das Sie heute durchführen können" },
          { type: "p", text: "Stellen Sie für jede Kachel Ihres Dashboards zwei Fragen. Erstens: Wenn diese Zahl grün wird, welche Entscheidung auf Vorstandsebene treffe ich anders? Zweitens: Was müsste wahr sein, damit diese Zahl gut aussieht, während das Geschäft tatsächlich in Schwierigkeiten steckt? Können Sie nicht beides in unter einer Minute pro Kachel beantworten, ist diese Kachel Dekoration, keine Instrumentierung." },
          { type: "quote", text: "Die besten Dashboards haben weniger Kacheln, als man erwartet. Jede Kachel, die keine Entscheidung beantwortet, konkurriert um die Aufmerksamkeit derer, die es tun." },
          { type: "p", text: "Wenn wir das Reporting in Philly bauen, beginnen wir bei der Entscheidung, nicht bei den Daten. Das erzwingt unbequeme Gespräche — 'wir wissen eigentlich nicht, was wir täten, wenn sich diese Zahl bewegt' — aber genau diese Gespräche machen das Dashboard bauenswert." }
        ],
      },
      es: {
        seo: {
          metaTitle: "Por qué los paneles mienten en voz baja",
          metaDescription:
            "Las cifras nunca están mal; el marco sí. Tres patrones que vuelven engañosos los datos limpios, y una auditoría de una hora.",
        },
        title: "Por qué la mayoría de los paneles de operadores mienten en voz baja a sus CEO",
        summary:
          "Los números del panel nunca están mal — pero el encuadre sí. Tres patrones que convierten datos limpios en narrativas engañosas, y cómo auditar tu propio panel en menos de una hora.",
        body: [
          { type: "p", text: "Todo CEO ha vivido el momento: el panel se ve verde, la reunión va bien, y dos semanas después llega una fuga de clientes o un apuro de caja que nadie vio venir. El panel no estaba mal. Simplemente no miraba lo correcto." },
          { type: "h2", text: "Tres patrones que engañan en voz baja" },
          { type: "ul", items: [
            "Promedios sin distribuciones — 'tamaño medio de operación 42.000 €' oculta que la mitad de tus ingresos viene de dos cuentas.",
            "Indicadores rezagados disfrazados de adelantados — el MRR es un indicador rezagado. Lo que el CEO necesita es la velocidad del pipeline, y eso vive a dos sistemas de distancia.",
            "Ratios de vanidad que se mueven solos — la 'tasa de activación' sube porque subiste el listón de lo que cuenta como alta, no porque el producto mejorara."
          ]},
          { type: "h2", text: "Una auditoría de una hora que puedes hacer hoy" },
          { type: "p", text: "Para cada casilla de tu panel, haz dos preguntas. Una: si este número se pone verde, ¿qué decisión a nivel de consejo tomo distinta? Dos: ¿qué tendría que ser cierto para que este número se vea bien mientras el negocio está realmente en problemas? Si no puedes responder ambas en menos de un minuto por casilla, esa casilla es decoración, no instrumentación." },
          { type: "quote", text: "Los mejores paneles tienen menos casillas de las que la gente espera. Cada casilla que no responde a una decisión compite por la atención de las que sí." },
          { type: "p", text: "Cuando construimos el reporting dentro de Philly, partimos de la decisión, no de los datos. Obliga a conversaciones incómodas — 'en realidad no sabemos qué haríamos si este número se moviera' — pero son esas conversaciones las que hacen que el panel merezca construirse." }
        ],
      },
    },
  },

  {
    slug: "energielabel-2030-de-meetlat-verandert-mee",
    markets: ["nl"],
    title: "Uw deadline is 2030. Uw meetlat verandert datzelfde jaar.",
    summary:
      "De slechtst presterende utiliteitsgebouwen moeten uiterlijk 1 januari 2030 op energielabel D. In datzelfde jaar wordt de labelschaal opnieuw ingedeeld en de bepalingsmethode gemoderniseerd. U plant dus tegen een getal dat gaat verschuiven, met data die u nu al niet vertrouwt.",
    tag: "Real estate",
    publishedAt: "2026-08-23",
    readingMinutes: 6,
    seo: {
      metaTitle: "Energielabel D in 2030: de meetlat verandert mee",
      metaDescription:
        "Label D uiterlijk 1-1-2030 voor de slechtste utiliteitsgebouwen. In hetzelfde jaar wijzigt de labelschaal. Hoe u dan toch een rangorde bouwt die standhoudt.",
    },
    body: [
      { type: "p", text: "Een portefeuille verduurzamen begint bijna altijd met dezelfde vraag: welk pand eerst? Het antwoord daarop is een rangorde, en die rangorde komt uit cijfers. Precies daar wringt het, want de meeste vastgoedeigenaren weten al jaren dat hun verbruiksdata rammelt. Zolang er geen wettelijke deadline aan hing, was dat een ongemak. Vanaf nu is het een planningsrisico." },

      { type: "h2", text: "Wat er vaststaat, en het is minder dan u denkt" },
      { type: "p", text: "De slechtst presterende utiliteitsgebouwen moeten uiterlijk 1 januari 2030 voldoen aan energielabel D. Dat is de eis zoals de RVO hem vandaag beschrijft, en het is de enige harde datum in dit dossier. De eisen voor 2033 zijn nog niet vastgesteld. En de exacte verplichtingen worden pas uiterlijk in 2027 in het Besluit bouwwerken leefomgeving opgenomen." },
      { type: "p", text: "Lees die laatste zin nog een keer. De regels waaraan u in 2030 moet voldoen liggen pas in 2027 vast. Dat is drie jaar voorbereidingstijd voor een portefeuille waarin een enkele renovatie al snel twee jaar kost aan vergunning, aanbesteding en uitvoering." },
      { type: "p", text: "Voor kantoren staat er wel een bruikbare aanwijzing: wie uiterlijk december 2029 op label C zit, voldoet daarmee al aan de eisen die vanaf 2033 gaan gelden. Dat is geen verplichting maar een advies van de uitvoerder zelf, en het is het enige houvast dat er nu is voor de tweede ronde." },

      { type: "h2", text: "De meetlat verandert in hetzelfde jaar als de deadline" },
      { type: "p", text: "In 2030 komt er een nieuwe indeling van het energielabel. De schaal loopt dan weer van A tot en met G en de A-labels met plussen vervallen. Tegelijk wordt een gemoderniseerde methode ingevoerd om het label te bepalen." },
      { type: "p", text: "Dat is de kern van het probleem, en het wordt zelden zo benoemd. U plant kapitaal tegen een getal dat in het jaar van uw deadline opnieuw wordt gedefinieerd, met een andere rekenmethode eronder. Het label op uw huidige rapportage en het label waarop u straks wordt afgerekend zijn niet hetzelfde instrument." },
      { type: "p", text: "Hoe die twee zich tot elkaar verhouden weet vandaag niemand precies, en wie beweert van wel verkoopt u iets. Wat u wel kunt doen is zorgen dat u de vertaalslag straks in een week maakt in plaats van in een kwartaal." },

      { type: "h2", text: "De rangorde die u nodig heeft bestaat nog niet" },
      { type: "p", text: "Om te weten welk pand eerst moet, heeft u per object een betrouwbaar verbruikscijfer nodig. In de praktijk staat dat verspreid over vier of vijf plekken die elkaar tegenspreken:" },
      { type: "ul", items: [
        "de meterstanden bij de leverancier, per aansluiting en niet per gebouw",
        "de doorbelasting aan huurders, die vaak op oppervlakte is gebaseerd en niet op werkelijk verbruik",
        "de labelregistratie, met een opnamedatum die jaren oud kan zijn",
        "de rapportage van de propertymanager, opgebouwd in een spreadsheet die elk jaar opnieuw wordt gemaakt",
        "de facturen zelf, het enige bestand dat compleet is en het minst gestructureerd",
      ] },
      { type: "p", text: "Vier van die vijf zijn afgeleiden. Een rangorde bouwen op afgeleiden werkt precies zolang niemand hem controleert. Zodra er een wettelijke verplichting aan hangt en een investeringsbesluit uit volgt, is de vraag niet meer of het cijfer ongeveer klopt maar of u kunt laten zien waar het vandaan komt." },

      { type: "h2", text: "Reproduceerbaar is belangrijker dan precies" },
      { type: "p", text: "Dit is de reflex die u het meeste geld bespaart, en hij is contra-intuitief. De verleiding is om te wachten tot 2027, als de eisen in het Bbl staan, en dan een adviesbureau een nulmeting te laten doen. Dat levert een rapport op dat klopt op de dag van oplevering en daarna langzaam veroudert, precies zoals het vorige rapport dat deed." },
      { type: "p", text: "De bruikbare variant is een rangorde die u zelf opnieuw kunt draaien. Niet omdat u het beter weet dan het adviesbureau, maar omdat de invoer nog twee keer gaat veranderen: als het Bbl in 2027 de eisen vastlegt, en als in 2030 de methode wijzigt. Wie zijn rangorde in een week opnieuw kan produceren, neemt beide wijzigingen mee zonder een nieuw traject te starten." },
      { type: "p", text: "Concreet betekent dat vier dingen. Leid het verbruik per gebouw af uit de facturen en de meterstanden, niet uit de doorbelasting. Leg bij elk cijfer vast waar het vandaan komt en op welke datum het is gemeten. Noteer welke aannames u heeft gedaan bij panden met ontbrekende data, in plaats van ze weg te middelen. En zorg dat de hele bewerking in code of in een gedocumenteerde processtap staat, zodat iemand anders hem over een jaar kan herhalen." },

      { type: "h2", text: "Wat dit niet is" },
      { type: "p", text: "Dit is geen pleidooi voor een dashboard. De meeste vastgoedportefeuilles hebben er al twee, en het probleem zit niet in de weergave maar in de herkomst van het getal. Een dashboard boven onbetrouwbare invoer maakt de onbetrouwbaarheid alleen sneller zichtbaar voor meer mensen." },
      { type: "p", text: "Het is ook geen voorspelling over wat er in 2027 in het Bbl komt te staan. Dat weet ik niet en u ook niet. De hele redenering hierboven gaat er juist van uit dat de eisen nog schuiven, en dat is geen risico dat u wegneemt maar een eigenschap waar u omheen bouwt." },
      { type: "p", text: "De vraag om mee te beginnen is klein genoeg om deze week te stellen. Kunt u vandaag, zonder iemand te bellen, per gebouw laten zien waar het verbruikscijfer vandaan komt en wanneer het is gemeten? Als het antwoord nee is, dan is dat het eerste dat verandert. De deadline is 2030, maar het werk begint bij de herkomst van een getal." },
    ],
  },
  {
    slug: "ets2-de-gasrekening-krijgt-een-component-erbij",
    markets: ["nl"],
    title: "Uw gasrekening krijgt een component erbij, en die zit niet in uw begroting",
    summary:
      "ETS2 beprijst vanaf 2027 de CO2 in aardgas voor gebouwen. De verplichting ligt bij uw leverancier, niet bij u, en dat maakt het lastiger in plaats van makkelijker: u ziet niet wanneer het in uw tarief terechtkomt of hoeveel het is.",
    tag: "Real estate",
    publishedAt: "2026-08-23",
    readingMinutes: 5,
    seo: {
      metaTitle: "ETS2 en uw gasrekening: wat er echt vaststaat",
      metaDescription:
        "ETS2 beprijst vanaf 2027 CO2 in gebouwgas. De verplichting ligt bij de leverancier. Wat vaststaat, wat gepland is, en waarom uw tarief het pas later verraadt.",
    },
    body: [
      { type: "p", text: "Er is een tweede regelgevingsspoor dat gebouwen raakt, en het werkt heel anders dan het energielabel. Waar de labelverplichting een investeringsbeslissing afdwingt, verandert dit spoor stilletjes uw exploitatie. Het heet ETS2 en het beprijst de CO2 die vrijkomt bij het gebruik van fossiele brandstoffen in de gebouwde omgeving en het wegvervoer." },

      { type: "h2", text: "Wat er vaststaat, en wat alleen gepland is" },
      { type: "p", text: "Vanaf 2027 vallen brandstofleveranciers onder ETS2 en moeten zij jaarlijks hun emissiecijfer opgeven in het register. De eerste veiling van rechten is op dit moment gepland voor januari 2027. Het woord gepland staat er niet voor de sier: het is een voornemen, geen vastgelegde datum." },
      { type: "p", text: "En er zit een vertraging in die vrijwel niemand meeneemt. De eerste keer dat er daadwerkelijk rechten worden ingeleverd is in 2029, over de emissies van 2028. Tussen de start van de veilingen en het moment dat een leverancier moet afrekenen zit dus bijna twee jaar." },

      { type: "h2", text: "De verplichting ligt niet bij u, en dat is het lastige deel" },
      { type: "p", text: "U hoeft niets te doen. Geen vergunning, geen rapportage, geen registeraccount. De verplichting ligt formeel bij de partij die u de brandstof levert, en die koopt de rechten en verwerkt de kosten in het tarief." },
      { type: "p", text: "Dat klinkt als goed nieuws en het is het tegenovergestelde. Bij een heffing die u zelf afdraagt weet u de datum, het tarief en de grondslag. Bij een kostenpost die via een derde binnenkomt, weet u geen van drieen. U ziet een tarief, en of daar CO2-kosten in zitten en hoeveel is niet af te lezen aan uw factuur." },
      { type: "p", text: "Wanneer leveranciers het gaan doorberekenen is bovendien een commerciele beslissing, geen wettelijke. Sommige beginnen zodra ze rechten inkopen. Andere spreiden het uit. Weer andere hebben het al ingeprijsd in een contract dat u vorig jaar heeft getekend, zonder dat het als aparte regel zichtbaar is." },

      { type: "h2", text: "Waarom dit een meetprobleem is en geen inkoopprobleem" },
      { type: "p", text: "De gebruikelijke reactie is scherper inkopen: langer vastzetten, meer offertes, een adviseur op de tender. Dat helpt marginaal, maar het lost het onderliggende probleem niet op. U kunt namelijk niet controleren of het aanbod dat u krijgt goed of slecht is, omdat u uw eigen basislijn niet scherp heeft." },
      { type: "ul", items: [
        "wat verbruikt elk pand werkelijk aan gas, per maand, gecorrigeerd voor buitentemperatuur",
        "welk deel van dat verbruik gaat naar verwarming en welk deel naar iets anders",
        "welk deel belandt bij een huurder en welk deel blijft bij u hangen",
        "hoe reageert die kostenpost als het tarief tien of twintig procent beweegt",
      ] },
      { type: "p", text: "Wie die vier antwoorden heeft, ziet een tariefstijging binnen een maand terug in zijn eigen cijfers en kan hem toerekenen. Wie ze niet heeft, ziet een hogere factuur en heeft een discussie in plaats van een analyse." },

      { type: "h2", text: "Het raakvlak met het energielabel, en dat is geen toeval" },
      { type: "p", text: "Deze twee sporen vragen om dezelfde onderliggende data. Voor de labelverplichting heeft u per gebouw een betrouwbaar verbruikscijfer nodig om een rangorde te bouwen. Voor ETS2 heeft u per gebouw een betrouwbaar gasverbruik nodig om een kostenstijging te kunnen toerekenen." },
      { type: "p", text: "Dat is een keer werk voor twee verplichtingen, en het is de enige reden waarom ik ze in hetzelfde adem noem. Wie de dataherkomst een keer goed regelt, bedient daarmee zowel de investeringsvraag als de exploitatievraag. Wie het twee keer los oppakt, bouwt twee spreadsheets die over drie jaar niet meer met elkaar te rijmen zijn." },

      { type: "h2", text: "Wat ik hier niet beweer" },
      { type: "p", text: "Ik heb geen bedrag. Wat ETS2 per kubieke meter gaat kosten hangt af van een veilingprijs die nog niet bestaat en van hoe uw leverancier hem doorberekent. Iedere partij die u nu een tabel met eurocijfers voorlegt, extrapoleert een aanname en presenteert hem als prognose." },
      { type: "p", text: "Wat wel vaststaat is de richting en de reden dat u het laat gaat zien. Het beleid is bedoeld om fossiel duurder te maken, de kosten komen via een derde binnen, en uw factuur splitst het niet uit. Dat is voldoende om nu uw basislijn op orde te brengen, en het is te weinig om nu een investering op te baseren." },
    ],
  },
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
  return t ? { ...p, title: t.title, summary: t.summary, body: t.body, seo: t.seo ?? p.seo } : p;
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
