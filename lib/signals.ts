import type { Locale } from "@/lib/i18n/dict";
import { defined, mergeByIndex } from "@/lib/i18n/merge";

export type Signal = {
  slug: string;
  date: string; // ISO
  dateLabel: string; // short display
  /** Routeersleutel, geen kopij: toTagSlug(tag) bouwt /signals/tag/[tag].
   *  Vertalen zou per taal een andere URL opleveren, dus dit veld staat
   *  bewust niet in SignalL10n. */
  tag: string;
  readTime: string;
  title: string;
  /** Keyword-titel binnen TITLE_BUDGET. De redactionele `title` mag lang zijn
   *  — "Every business is a construction project…" is 74 tekens — maar wat in
   *  de <title> belandt moet passen. */
  seoTitle?: string;
  excerpt: string;
  body: { type: "p" | "h2" | "quote" | "list"; text: string | string[] }[];
  i18n?: Partial<Record<Locale, SignalL10n>>;
};

/** Per taal de kopij van een signal.
 *
 *  `body` draagt alleen `text`: het `type` van een blok bepaalt hoe het
 *  rendert (alinea, kop, citaat) en is structuur, geen tekst. Een vertaling
 *  kan een citaat dus niet per ongeluk in een kop veranderen. */
export type SignalL10n = Partial<Pick<Signal, "title" | "seoTitle" | "excerpt" | "dateLabel" | "readTime">> & {
  body?: { text: string | string[] }[];
};

export const SIGNALS: Signal[] = [
  {
    slug: "instruments-not-saas",
    date: "2026-04-12",
    dateLabel: "2026.04 · Essay",
    tag: "Design",
    readTime: "6 min read",
    title: "Why operator tools should feel like instruments, not SaaS.",
    seoTitle: "Operator tools should be instruments",
    excerpt:
      "A pilot doesn't want a dashboard. A pilot wants an altimeter. Most software for operators has confused those two things for fifteen years.",
    body: [
      { type: "p", text: "I spent a long time watching field operators use software before I realized what they actually want it to be. They don't want a dashboard. They want an altimeter." },
      { type: "p", text: "Dashboards assume you have the time to look around. An altimeter assumes you need one number, now, and that number had better be right. Almost all operator software is built as the former. Almost all operators would pay more for the latter." },
      { type: "h2", text: "What instruments actually are." },
      { type: "p", text: "An instrument has three properties that almost no SaaS product has. The primary number is exactly where your eye lands first. The secondary numbers are available but never in front. And the whole thing reads correctly when you're distracted, tired, or out of context." },
      { type: "p", text: "None of that is a design preference. It's a consequence of the environment. A cockpit has finite attention. A control room has finite attention. A Friday night at a busy hotel front desk has finite attention. The software that survives those environments is the software designed around attention scarcity, not feature richness." },
      { type: "h2", text: "The test I run." },
      { type: "quote", text: "Can the operator pull the one number they need in three seconds, on bad lighting, while someone is talking to them? If not, it's not an instrument yet." },
      { type: "p", text: "Every product I've shipped for operators runs that test before anything else. Voltafy. Performance Tracker. Philly. If you can't pass the three-second rule, every other design decision is downstream of the wrong priority." },
      { type: "h2", text: "Why this matters commercially." },
      { type: "p", text: "SaaS has trained an entire generation of builders to optimize for feature velocity. That's the right optimization for the tools people choose to use. It's the wrong optimization for the tools people are forced to use. Operators are forced to use their software. That changes what good means." },
      { type: "p", text: "The business outcome, in my experience: when you stop trying to be a dashboard and start trying to be an instrument, adoption goes up and support tickets drop. Operators stop fighting the tool and start leaning on it. That's when revenue starts compounding from retained attention instead of churned trials." },
    ],
    i18n: {
      nl: {
        title: "Waarom operatortools instrumenten horen te zijn, geen SaaS.",
        seoTitle: "Operatortools horen instrumenten te zijn",
        excerpt: "Een piloot wil geen dashboard. Een piloot wil een hoogtemeter. Software voor operators verwart die twee dingen al vijftien jaar.",
        dateLabel: "2026.04 · Essay",
        readTime: "6 min lezen",
        body: [
          { text: "Ik heb lang naar operators in het veld gekeken voordat ik doorhad wat ze de software eigenlijk wilden laten zijn. Geen dashboard. Een hoogtemeter." },
          { text: "Een dashboard gaat ervan uit dat je tijd hebt om rond te kijken. Een hoogtemeter gaat ervan uit dat je één getal nodig hebt, nu, en dat dat getal maar beter kan kloppen. Bijna alle operatorsoftware is als het eerste gebouwd. Bijna elke operator zou meer betalen voor het tweede." },
          { text: "Wat een instrument werkelijk is." },
          { text: "Een instrument heeft drie eigenschappen die vrijwel geen SaaS-product heeft. Het belangrijkste getal staat precies waar je oog als eerste landt. De bijzaken zijn beschikbaar maar nooit op de voorgrond. En het geheel leest goed als je afgeleid, moe of buiten je context bent." },
          { text: "Dat is geen ontwerpvoorkeur maar een gevolg van de omgeving. Een cockpit heeft eindige aandacht. Een controlekamer heeft eindige aandacht. Een vrijdagavond aan een drukke hotelbalie heeft eindige aandacht. De software die dat overleeft is ontworpen rond aandachtsschaarste, niet rond functierijkdom." },
          { text: "De test die ik draai." },
          { text: "Haalt de operator het ene getal dat hij nodig heeft binnen drie seconden, bij slecht licht, terwijl iemand tegen hem praat? Zo niet, dan is het nog geen instrument." },
          { text: "Elk product dat ik voor operators heb opgeleverd draait die test vóór al het andere. Voltafy. Performance Tracker. Philly. Kom je niet door de drie-secondenregel, dan staat elke volgende ontwerpkeuze op de verkeerde prioriteit." },
          { text: "Waarom dit commercieel uitmaakt." },
          { text: "SaaS heeft een hele generatie bouwers geleerd te optimaliseren op functiesnelheid. Dat klopt voor gereedschap dat mensen kiezen. Het klopt niet voor gereedschap dat mensen moeten gebruiken. Operators moeten hun software gebruiken. Dat verandert wat goed betekent." },
          { text: "De zakelijke uitkomst, in mijn ervaring: zodra je stopt met een dashboard willen zijn en begint met een instrument willen zijn, gaat het gebruik omhoog en dalen de supportvragen. Operators vechten niet langer tegen het gereedschap maar leunen erop. Vanaf dat moment stapelt omzet zich op uit vastgehouden aandacht in plaats van afgehaakte proefperiodes." },
        ],
      },
      de: {
        title: "Warum Betreiberwerkzeuge Instrumente sein sollten, keine SaaS.",
        seoTitle: "Betreiberwerkzeuge sind Instrumente",
        excerpt: "Ein Pilot will kein Dashboard. Ein Pilot will einen Höhenmesser. Software für Betreiber verwechselt beides seit fünfzehn Jahren.",
        dateLabel: "2026.04 · Essay",
        readTime: "6 Min. Lesezeit",
        body: [
          { text: "Ich habe Betreibern im Feld lange bei der Arbeit mit Software zugesehen, bevor mir klar wurde, was sie eigentlich wollen. Kein Dashboard. Einen Höhenmesser." },
          { text: "Ein Dashboard setzt voraus, dass Sie Zeit zum Umsehen haben. Ein Höhenmesser setzt voraus, dass Sie eine Zahl brauchen, jetzt, und dass diese Zahl besser stimmt. Fast alle Betreibersoftware ist als Ersteres gebaut. Fast jeder Betreiber würde mehr für Letzteres zahlen." },
          { text: "Was ein Instrument wirklich ausmacht." },
          { text: "Ein Instrument hat drei Eigenschaften, die kaum ein SaaS-Produkt besitzt. Die wichtigste Zahl steht genau dort, wo das Auge zuerst landet. Die Nebenzahlen sind verfügbar, aber nie im Vordergrund. Und das Ganze liest sich richtig, wenn man abgelenkt, müde oder außerhalb des Kontexts ist." },
          { text: "Das ist keine Gestaltungsvorliebe, sondern eine Folge der Umgebung. Ein Cockpit hat endliche Aufmerksamkeit. Eine Leitwarte hat endliche Aufmerksamkeit. Ein Freitagabend an einer vollen Hotelrezeption hat endliche Aufmerksamkeit. Software, die das übersteht, ist um Aufmerksamkeitsknappheit herum entworfen, nicht um Funktionsfülle." },
          { text: "Der Test, den ich fahre." },
          { text: "Holt der Betreiber die eine Zahl, die er braucht, in drei Sekunden, bei schlechtem Licht, während jemand mit ihm spricht? Wenn nicht, ist es noch kein Instrument." },
          { text: "Jedes Produkt, das ich für Betreiber ausgeliefert habe, durchläuft diesen Test vor allem anderen. Voltafy. Performance Tracker. Philly. Wer die Drei-Sekunden-Regel nicht besteht, hat jede weitere Gestaltungsentscheidung auf der falschen Priorität aufgebaut." },
          { text: "Warum das kaufmännisch zählt." },
          { text: "SaaS hat einer ganzen Generation von Entwicklern beigebracht, auf Funktionsgeschwindigkeit zu optimieren. Für Werkzeuge, die Menschen sich aussuchen, ist das richtig. Für Werkzeuge, die Menschen benutzen müssen, ist es falsch. Betreiber müssen ihre Software benutzen. Das verändert, was gut bedeutet." },
          { text: "Das geschäftliche Ergebnis, nach meiner Erfahrung: Sobald man aufhört, ein Dashboard sein zu wollen, und anfängt, ein Instrument sein zu wollen, steigt die Nutzung und die Zahl der Supportanfragen sinkt. Betreiber kämpfen nicht mehr gegen das Werkzeug, sondern stützen sich darauf. Ab da wächst Umsatz aus gehaltener Aufmerksamkeit statt aus abgebrochenen Testphasen." },
        ],
      },
      es: {
        title: "Por qué las herramientas de operador deberían ser instrumentos, no SaaS.",
        seoTitle: "Las herramientas de operador son instrumentos",
        excerpt: "Un piloto no quiere un panel. Un piloto quiere un altímetro. El software para operadores lleva quince años confundiendo esas dos cosas.",
        dateLabel: "2026.04 · Ensayo",
        readTime: "6 min de lectura",
        body: [
          { text: "Estuve mucho tiempo mirando cómo los operadores de campo usan el software antes de entender qué querían realmente que fuera. No un panel. Un altímetro." },
          { text: "Un panel da por hecho que tienes tiempo de mirar alrededor. Un altímetro da por hecho que necesitas un número, ahora, y que más vale que ese número sea correcto. Casi todo el software de operador está construido como lo primero. Casi todos los operadores pagarían más por lo segundo." },
          { text: "Qué es de verdad un instrumento." },
          { text: "Un instrumento tiene tres propiedades que casi ningún producto SaaS tiene. El número principal está exactamente donde el ojo aterriza primero. Los secundarios están disponibles pero nunca delante. Y el conjunto se lee bien cuando estás distraído, cansado o fuera de contexto." },
          { text: "Eso no es una preferencia de diseño sino una consecuencia del entorno. Una cabina tiene atención finita. Una sala de control tiene atención finita. Un viernes por la noche en una recepción llena tiene atención finita. El software que sobrevive a esos entornos está diseñado alrededor de la escasez de atención, no de la abundancia de funciones." },
          { text: "La prueba que aplico." },
          { text: "¿Puede el operador sacar el único número que necesita en tres segundos, con mala luz, mientras alguien le habla? Si no, todavía no es un instrumento." },
          { text: "Cada producto que he entregado para operadores pasa esa prueba antes que nada. Voltafy. Performance Tracker. Philly. Si no superas la regla de los tres segundos, todas las demás decisiones de diseño cuelgan de la prioridad equivocada." },
          { text: "Por qué esto importa comercialmente." },
          { text: "El SaaS ha enseñado a toda una generación a optimizar la velocidad de funciones. Es la optimización correcta para las herramientas que la gente elige usar. Es la equivocada para las que la gente está obligada a usar. Los operadores están obligados. Eso cambia lo que significa bueno." },
          { text: "El resultado de negocio, en mi experiencia: en cuanto dejas de querer ser un panel y empiezas a querer ser un instrumento, el uso sube y las incidencias de soporte bajan. Los operadores dejan de pelearse con la herramienta y empiezan a apoyarse en ella. Ahí es cuando los ingresos se acumulan por atención retenida en lugar de por pruebas abandonadas." },
        ],
      },
    },
  },
  {
    slug: "five-phases",
    date: "2026-03-20",
    dateLabel: "2026.03 · Build log",
    tag: "Method",
    readTime: "7 min read",
    title: "Every business is a construction project. Here's the five-phase build plan.",
    seoTitle: "The five-phase build plan for a business",
    excerpt:
      "Construction managers know something most SaaS founders don't: you can't ship a building on vibes. The method transfers cleanly to revenue engines — and here's exactly how.",
    body: [
      { type: "p", text: "When I trained as a construction manager, the lesson that stuck hardest wasn't about concrete or schedules or bills of quantities. It was the five-phase rhythm: Survey, Blueprint, Build, Commission, Operate." },
      { type: "p", text: "You can't ship a building on vibes. Every building that got shipped ran that rhythm or something structurally identical. Skip a phase and the building gets finished late, over budget, or — worst of all — finished on time and quietly wrong." },
      { type: "p", text: "What I've realized building operator tools is that every business runs the same rhythm too. Most just don't know it, so they skip phases and wonder why the revenue leaks." },
      { type: "h2", text: "01 — Survey" },
      { type: "p", text: "Before you build anything, walk the site. In a building that means levels, soil, existing services, neighbor constraints. In a business it means: shadow the operators, read the last quarter's data, find the workarounds, capture the tribal knowledge. Every real plan starts with seeing what's actually there." },
      { type: "h2", text: "02 — Blueprint" },
      { type: "p", text: "Draw the plan. Sequence the moves. Every phase has a number attached — how long, how much, who's responsible. In construction this is the drawing set. In a business it's the build plan that a contractor (or a new hire) could read and execute without asking you what you meant." },
      { type: "p", text: "Most businesses I meet have a strategy deck. Nobody has a blueprint. That's the gap." },
      { type: "h2", text: "03 — Build" },
      { type: "p", text: "Ship the systems that unlock the number. Dashboards, automations, products, whole engines. In construction: pour concrete, frame the building, run the services. In a business: ship operator surfaces that run when nothing else does." },
      { type: "h2", text: "04 — Commission" },
      { type: "p", text: "This is the phase most teams skip and it's where the most revenue evaporates. You stress-test. Verify every number. Run the edges. Nothing gets called 'live' until the system is honest under load. In construction, commissioning is why the heating works when the first tenant moves in. In a business, commissioning is why the dashboard tells the truth when the first customer asks for a quote." },
      { type: "h2", text: "05 — Operate" },
      { type: "p", text: "A building doesn't stop working once the ribbon is cut. Neither does a revenue engine. Phase five is the control room: monitor, tune, improve weekly. The operators who win long term are the ones who treat operations as a living discipline, not a project that finished." },
      { type: "h2", text: "The compounding effect." },
      { type: "p", text: "Every skipped phase becomes a tax you pay later, with interest. Survey you skip becomes surprise-cost in Build. Blueprint you skip becomes rework in Commission. Commission you skip becomes damage to customer trust in Operate. The businesses that look effortless from the outside are the ones that never took the shortcut." },
    ],
    i18n: {
      nl: {
        title: "Elk bedrijf is een bouwproject. Dit is het vijffasenplan.",
        seoTitle: "Het vijffasenplan voor een bedrijf",
        excerpt: "Bouwmanagers weten iets wat de meeste softwareoprichters niet weten: een gebouw lever je niet op gevoel op. De methode gaat schoon over naar omzetmotoren.",
        dateLabel: "2026.03 · Bouwlog",
        readTime: "7 min lezen",
        body: [
          { text: "Toen ik me tot bouwmanager liet opleiden, was de les die het hardst bleef hangen niet die over beton, planningen of hoeveelhedenstaten. Het was het ritme van vijf fases: Survey, Blueprint, Build, Commission, Operate." },
          { text: "Een gebouw lever je niet op gevoel op. Elk gebouw dat werd opgeleverd draaide dat ritme of iets wat er structureel op leek. Sla een fase over en het gebouw komt te laat, te duur, of — het ergst van al — op tijd en stilletjes verkeerd." },
          { text: "Wat ik doorkreeg bij het bouwen van operatortools, is dat elk bedrijf hetzelfde ritme draait. De meeste weten dat alleen niet, slaan dus fases over, en vragen zich af waar de omzet weglekt." },
          { text: "01 — Survey" },
          { text: "Voordat je iets bouwt, loop je over de kavel. Bij een gebouw betekent dat: hoogteligging, grondslag, bestaande leidingen, beperkingen van de buren. Bij een bedrijf: meelopen met de operators, de cijfers van het afgelopen kwartaal lezen, de omwegen vinden, de ongeschreven kennis vastleggen. Elk echt plan begint met zien wat er werkelijk staat." },
          { text: "02 — Blueprint" },
          { text: "Teken het plan. Zet de stappen op volgorde. Aan elke fase hangt een getal: hoe lang, hoeveel, wie is verantwoordelijk. In de bouw is dat de tekeningenset. In een bedrijf is het het bouwplan dat een aannemer — of een nieuwe medewerker — kan lezen en uitvoeren zonder jou te vragen wat je bedoelde." },
          { text: "De meeste bedrijven die ik tegenkom hebben een strategiedeck. Niemand heeft een blueprint. Daar zit het gat." },
          { text: "03 — Build" },
          { text: "Lever de systemen die het getal vrijmaken. Dashboards, automatiseringen, producten, hele motoren. In de bouw: beton storten, casco zetten, installaties trekken. In een bedrijf: operatorschermen opleveren die draaien als de rest het begeeft." },
          { text: "04 — Commission" },
          { text: "Dit is de fase die de meeste teams overslaan en waar de meeste omzet verdampt. Je test onder belasting. Je controleert elk getal. Je draait de randen. Niets heet 'live' voordat het systeem eerlijk blijft onder druk. In de bouw zorgt inbedrijfstelling ervoor dat de verwarming werkt als de eerste huurder erin trekt. In een bedrijf zorgt het ervoor dat het dashboard de waarheid vertelt als de eerste klant om een offerte vraagt." },
          { text: "05 — Operate" },
          { text: "Een gebouw stopt niet met werken zodra het lint is doorgeknipt. Een omzetmotor ook niet. Fase vijf is de controlekamer: monitoren, bijstellen, wekelijks verbeteren. De operators die op lange termijn winnen, behandelen de exploitatie als een levend vak in plaats van een project dat af is." },
          { text: "Het effect dat zich opstapelt." },
          { text: "Elke overgeslagen fase wordt een belasting die je later betaalt, met rente. Een overgeslagen Survey wordt een verrassingspost in Build. Een overgeslagen Blueprint wordt herstelwerk in Commission. Een overgeslagen Commission wordt schade aan het klantvertrouwen in Operate. De bedrijven die van buiten moeiteloos lijken, zijn de bedrijven die de sluiproute nooit namen." },
        ],
      },
      de: {
        title: "Jedes Unternehmen ist ein Bauprojekt. Hier ist der Fünf-Phasen-Plan.",
        seoTitle: "Der Fünf-Phasen-Bauplan fürs Geschäft",
        excerpt: "Bauleiter wissen etwas, das den meisten Software-Gründern fehlt: Ein Gebäude liefert man nicht nach Gefühl aus. Die Methode überträgt sich sauber auf Umsatzmotoren.",
        dateLabel: "2026.03 · Baulog",
        readTime: "7 Min. Lesezeit",
        body: [
          { text: "Als ich mich zum Bauleiter ausbilden ließ, war die Lektion, die am stärksten haften blieb, keine über Beton, Terminpläne oder Leistungsverzeichnisse. Es war der Rhythmus aus fünf Phasen: Survey, Blueprint, Build, Commission, Operate." },
          { text: "Ein Gebäude liefert man nicht nach Gefühl aus. Jedes Gebäude, das fertig wurde, lief diesen Rhythmus oder etwas strukturell Gleiches. Lassen Sie eine Phase aus, und das Gebäude wird zu spät fertig, zu teuer, oder — am schlimmsten — pünktlich und still falsch." },
          { text: "Beim Bau von Betreiberwerkzeugen wurde mir klar, dass jedes Unternehmen denselben Rhythmus fährt. Die meisten wissen es nur nicht, überspringen Phasen und wundern sich, wo der Umsatz versickert." },
          { text: "01 — Survey" },
          { text: "Bevor Sie etwas bauen, gehen Sie über das Grundstück. Beim Gebäude heißt das: Höhenlage, Baugrund, vorhandene Leitungen, Auflagen der Nachbarn. Im Unternehmen: den Betreibern über die Schulter schauen, die Zahlen des letzten Quartals lesen, die Umwege finden, das ungeschriebene Wissen festhalten. Jeder echte Plan beginnt damit, zu sehen, was tatsächlich da ist." },
          { text: "02 — Blueprint" },
          { text: "Zeichnen Sie den Plan. Ordnen Sie die Schritte. An jeder Phase hängt eine Zahl: wie lange, wie viel, wer verantwortlich ist. Im Bau ist das der Plansatz. Im Unternehmen ist es der Bauplan, den ein Auftragnehmer — oder eine neue Kollegin — lesen und ausführen kann, ohne Sie zu fragen, was Sie gemeint haben." },
          { text: "Die meisten Unternehmen, die ich treffe, haben ein Strategiedeck. Niemand hat einen Bauplan. Genau da klafft die Lücke." },
          { text: "03 — Build" },
          { text: "Liefern Sie die Systeme, die die Zahl freisetzen. Dashboards, Automatisierungen, Produkte, ganze Motoren. Im Bau: Beton gießen, Rohbau stellen, Leitungen ziehen. Im Unternehmen: Betreiberoberflächen ausliefern, die laufen, wenn sonst nichts läuft." },
          { text: "04 — Commission" },
          { text: "Das ist die Phase, die die meisten Teams auslassen, und dort verdampft der meiste Umsatz. Sie prüfen unter Last. Sie verifizieren jede Zahl. Sie fahren die Ränder ab. Nichts heißt 'live', bevor das System unter Druck ehrlich bleibt. Im Bau sorgt die Inbetriebnahme dafür, dass die Heizung läuft, wenn der erste Mieter einzieht. Im Unternehmen sorgt sie dafür, dass das Dashboard die Wahrheit sagt, wenn der erste Kunde ein Angebot verlangt." },
          { text: "05 — Operate" },
          { text: "Ein Gebäude hört nicht auf zu funktionieren, sobald das Band durchschnitten ist. Ein Umsatzmotor auch nicht. Phase fünf ist die Leitwarte: überwachen, justieren, wöchentlich verbessern. Wer langfristig gewinnt, behandelt den Betrieb als lebendige Disziplin statt als abgeschlossenes Projekt." },
          { text: "Der Zinseszinseffekt." },
          { text: "Jede übersprungene Phase wird zu einer Steuer, die Sie später zahlen, mit Zinsen. Ein ausgelassener Survey wird zur Überraschungsposition im Build. Ein ausgelassener Blueprint wird zur Nacharbeit im Commission. Ein ausgelassenes Commission wird zum Schaden am Kundenvertrauen im Operate. Die Unternehmen, die von außen mühelos wirken, sind die, die nie die Abkürzung genommen haben." },
        ],
      },
      es: {
        title: "Toda empresa es un proyecto de obra. Este es el plan de cinco fases.",
        seoTitle: "El plan de cinco fases para un negocio",
        excerpt: "Los jefes de obra saben algo que a la mayoría de fundadores de software se les escapa: un edificio no se entrega a ojo. El método se traslada limpiamente.",
        dateLabel: "2026.03 · Registro de obra",
        readTime: "7 min de lectura",
        body: [
          { text: "Cuando me formé como jefe de obra, la lección que más se me quedó no fue sobre hormigón, plazos ni mediciones. Fue el ritmo de cinco fases: Survey, Blueprint, Build, Commission, Operate." },
          { text: "Un edificio no se entrega a ojo. Todo edificio que llegó a entregarse siguió ese ritmo o algo estructuralmente idéntico. Sáltate una fase y el edificio se acaba tarde, por encima de presupuesto o, lo peor de todo, a tiempo y silenciosamente mal." },
          { text: "Lo que entendí construyendo herramientas de operador es que toda empresa sigue el mismo ritmo. La mayoría simplemente no lo sabe, se salta fases y luego se pregunta por dónde se le escapan los ingresos." },
          { text: "01 — Survey" },
          { text: "Antes de construir nada, recorre la parcela. En un edificio eso significa cotas, terreno, servicios existentes, condicionantes de los vecinos. En una empresa significa acompañar a los operadores, leer los datos del último trimestre, encontrar los atajos, capturar el conocimiento no escrito. Todo plan real empieza por ver lo que hay de verdad." },
          { text: "02 — Blueprint" },
          { text: "Dibuja el plan. Ordena los movimientos. Cada fase lleva un número asociado: cuánto tarda, cuánto cuesta, quién responde. En obra eso es el juego de planos. En una empresa es el plan de construcción que un contratista, o alguien recién incorporado, puede leer y ejecutar sin preguntarte qué querías decir." },
          { text: "Casi todas las empresas que conozco tienen una presentación de estrategia. Ninguna tiene un plano. Ahí está el hueco." },
          { text: "03 — Build" },
          { text: "Entrega los sistemas que desbloquean la cifra. Paneles, automatizaciones, productos, motores enteros. En obra: verter hormigón, levantar estructura, pasar instalaciones. En una empresa: entregar superficies de operador que funcionan cuando no funciona nada más." },
          { text: "04 — Commission" },
          { text: "Esta es la fase que más equipos se saltan y donde más ingresos se evaporan. Pruebas bajo carga. Verificas cada cifra. Recorres los extremos. Nada se llama 'en producción' hasta que el sistema sigue siendo honesto bajo presión. En obra, la puesta en marcha es la razón de que la calefacción funcione cuando entra el primer inquilino. En una empresa, es la razón de que el panel diga la verdad cuando el primer cliente pide un presupuesto." },
          { text: "05 — Operate" },
          { text: "Un edificio no deja de funcionar cuando se corta la cinta. Un motor de ingresos tampoco. La fase cinco es la sala de control: monitorizar, ajustar, mejorar cada semana. Los operadores que ganan a largo plazo tratan la operación como una disciplina viva, no como un proyecto terminado." },
          { text: "El efecto acumulado." },
          { text: "Cada fase saltada se convierte en un impuesto que pagas más tarde, con intereses. El Survey que te saltas se vuelve sobrecoste en Build. El Blueprint que te saltas se vuelve retrabajo en Commission. El Commission que te saltas se vuelve daño a la confianza del cliente en Operate. Las empresas que desde fuera parecen no esforzarse son las que nunca cogieron el atajo." },
        ],
      },
    },
  },
  {
    slug: "holding-as-container",
    date: "2026-02-18",
    dateLabel: "2026.02 · Note",
    tag: "Operations",
    readTime: "4 min read",
    title: "A holding company as a creative container.",
    seoTitle: "A holding as a creative container",
    excerpt:
      "Starting a holding for my work changed more than the legal wrapper. It changed what I was willing to build — and what I wasn't.",
    body: [
      { type: "p", text: "Setting up Juan Diaz, LLC was on my list for a long time before I actually did it. When I finally moved, the thing that surprised me was how much the legal structure changed the creative work, not just the accounting." },
      { type: "p", text: "Before the holding existed, every new product had to justify itself as a business in isolation. Voltafy had to be a company. Performance Tracker had to be a company. Each had to carry its own overhead, its own brand, its own survival." },
      { type: "p", text: "Once there was a holding, the calculation flipped. Each product could be a product. The holding was the business. That tiny change — product instead of company — rearranged what was worth building." },
      { type: "h2", text: "The products got braver." },
      { type: "p", text: "The first visible effect was that I started shipping more specific, more opinionated tools. Salderingsregeling 2027 wouldn't be a business. As a free public guide under the holding, it makes perfect sense. Help Mij Besparen wouldn't pass a venture-scale business test either. Under the holding, it earns its keep by strengthening the overall portfolio's credibility." },
      { type: "h2", text: "The positioning got cleaner." },
      { type: "p", text: "When the holding is the brand, every individual product inherits the holding's credibility. The five-phase playbook that runs through everything becomes a throughline, not a marketing claim. Customers on one product feel the trust that was earned on another." },
      { type: "h2", text: "The creative container effect." },
      { type: "p", text: "The thing I didn't expect: the holding made me a better builder. Because everything lives under one name, the output has to age well. No short-term trend-chasing. No one-off experiments that would embarrass the holding in two years. The structure enforces a longer time horizon than any internal discipline could." },
      { type: "quote", text: "A holding is not a legal wrapper. It's a creative discipline dressed as a tax structure." },
      { type: "p", text: "If you're a solo operator shipping more than one thing, start the holding. Not for the accounting. For the way it rearranges what you'll let yourself build." },
    ],
    i18n: {
      nl: {
        title: "Een holding als creatieve omgeving.",
        seoTitle: "Een holding als creatieve omgeving",
        excerpt: "Een holding oprichten voor mijn werk veranderde meer dan de juridische verpakking. Het veranderde wat ik bereid was te bouwen — en wat niet.",
        dateLabel: "2026.02 · Notitie",
        readTime: "4 min lezen",
        body: [
          { text: "Juan Diaz, LLC oprichten stond lang op mijn lijst voordat ik het werkelijk deed. Toen ik eenmaal bewoog, verraste me vooral hoezeer de juridische structuur het creatieve werk veranderde, niet alleen de boekhouding." },
          { text: "Voordat de holding bestond, moest elk nieuw product zich op zichzelf als bedrijf verantwoorden. Voltafy moest een bedrijf zijn. Performance Tracker moest een bedrijf zijn. Elk moest zijn eigen overhead dragen, zijn eigen merk, zijn eigen overleven." },
          { text: "Zodra er een holding was, kantelde de rekensom. Elk product mocht een product zijn. De holding was het bedrijf. Dat kleine verschil — product in plaats van bedrijf — verschoof wat de moeite waard was om te bouwen." },
          { text: "De producten werden moediger." },
          { text: "Het eerste zichtbare effect was dat ik specifiekere, uitgesprokener tools ging opleveren. Salderingsregeling 2027 zou geen bedrijf zijn. Als gratis publieke gids onder de holding klopt het precies. Help Mij Besparen zou een toets op ondernemingsschaal ook niet doorstaan. Onder de holding verdient het zijn plek door de geloofwaardigheid van het geheel te versterken." },
          { text: "De positionering werd schoner." },
          { text: "Als de holding het merk is, erft elk afzonderlijk product de geloofwaardigheid van de holding. Het vijffasendraaiboek dat overal doorheen loopt wordt een rode draad in plaats van een marketingclaim. Klanten van het ene product voelen het vertrouwen dat op het andere is verdiend." },
          { text: "Het effect van de creatieve omgeving." },
          { text: "Wat ik niet had verwacht: de holding maakte me een betere bouwer. Omdat alles onder één naam leeft, moet het werk goed verouderen. Geen trends najagen op korte termijn. Geen eenmalige experimenten waar de holding zich over twee jaar voor schaamt. De structuur dwingt een langere tijdshorizon af dan welke interne discipline dan ook." },
          { text: "Een holding is geen juridische verpakking. Het is een creatieve discipline, verkleed als fiscale structuur." },
          { text: "Ben je een solo-operator die meer dan één ding oplevert, richt dan de holding op. Niet om de boekhouding. Om hoe het verschuift wat je jezelf toestaat te bouwen." },
        ],
      },
      de: {
        title: "Eine Holding als kreativer Rahmen.",
        seoTitle: "Eine Holding als kreativer Rahmen",
        excerpt: "Eine Holding für meine Arbeit zu gründen veränderte mehr als die rechtliche Hülle. Es veränderte, was ich zu bauen bereit war — und was nicht.",
        dateLabel: "2026.02 · Notiz",
        readTime: "4 Min. Lesezeit",
        body: [
          { text: "Juan Diaz, LLC zu gründen stand lange auf meiner Liste, bevor ich es tatsächlich tat. Als ich mich endlich bewegte, überraschte mich vor allem, wie sehr die rechtliche Struktur die kreative Arbeit veränderte, nicht nur die Buchhaltung." },
          { text: "Bevor die Holding existierte, musste sich jedes neue Produkt für sich allein als Unternehmen rechtfertigen. Voltafy musste eine Firma sein. Performance Tracker musste eine Firma sein. Jedes musste seinen eigenen Aufwand tragen, seine eigene Marke, sein eigenes Überleben." },
          { text: "Sobald es eine Holding gab, kippte die Rechnung. Jedes Produkt durfte ein Produkt sein. Die Holding war das Unternehmen. Dieser kleine Unterschied — Produkt statt Firma — verschob, was sich zu bauen lohnte." },
          { text: "Die Produkte wurden mutiger." },
          { text: "Der erste sichtbare Effekt war, dass ich spezifischere, meinungsstärkere Werkzeuge auslieferte. Salderingsregeling 2027 wäre kein Unternehmen. Als kostenloser öffentlicher Leitfaden unter der Holding ergibt es vollkommen Sinn. Help Mij Besparen würde einen Test auf Wagniskapitalgröße ebenfalls nicht bestehen. Unter der Holding verdient es seinen Platz, indem es die Glaubwürdigkeit des Ganzen stärkt." },
          { text: "Die Positionierung wurde klarer." },
          { text: "Wenn die Holding die Marke ist, erbt jedes einzelne Produkt ihre Glaubwürdigkeit. Das Fünf-Phasen-Playbook, das durch alles hindurchläuft, wird zum roten Faden statt zur Marketingbehauptung. Kunden eines Produkts spüren das Vertrauen, das an einem anderen verdient wurde." },
          { text: "Der Effekt des kreativen Rahmens." },
          { text: "Womit ich nicht gerechnet hatte: Die Holding machte mich zu einem besseren Entwickler. Weil alles unter einem Namen lebt, muss die Arbeit gut altern. Kein kurzfristiges Trendjagen. Keine einmaligen Experimente, für die sich die Holding in zwei Jahren schämen würde. Die Struktur erzwingt einen längeren Zeithorizont, als es jede innere Disziplin könnte." },
          { text: "Eine Holding ist keine rechtliche Hülle. Sie ist eine kreative Disziplin, verkleidet als Steuerkonstruktion." },
          { text: "Wenn Sie als Einzelunternehmer mehr als eine Sache ausliefern, gründen Sie die Holding. Nicht wegen der Buchhaltung. Wegen der Art, wie sie verschiebt, was Sie sich selbst zu bauen erlauben." },
        ],
      },
      es: {
        title: "Un holding como contenedor creativo.",
        seoTitle: "Un holding como contenedor creativo",
        excerpt: "Crear un holding para mi trabajo cambió más que la envoltura legal. Cambió lo que estaba dispuesto a construir, y lo que no.",
        dateLabel: "2026.02 · Nota",
        readTime: "4 min de lectura",
        body: [
          { text: "Montar Juan Diaz, LLC llevaba mucho tiempo en mi lista antes de que lo hiciera de verdad. Cuando por fin me moví, lo que me sorprendió fue cuánto cambió la estructura legal el trabajo creativo, no solo la contabilidad." },
          { text: "Antes de que existiera el holding, cada producto nuevo tenía que justificarse como empresa por sí solo. Voltafy tenía que ser una empresa. Performance Tracker tenía que ser una empresa. Cada uno debía cargar con sus propios gastos, su propia marca, su propia supervivencia." },
          { text: "En cuanto hubo un holding, el cálculo se dio la vuelta. Cada producto podía ser un producto. El holding era el negocio. Ese pequeño cambio, producto en lugar de empresa, reordenó lo que merecía la pena construir." },
          { text: "Los productos se volvieron más valientes." },
          { text: "El primer efecto visible fue que empecé a entregar herramientas más específicas y con más criterio. Salderingsregeling 2027 no sería un negocio. Como guía pública y gratuita bajo el holding, tiene todo el sentido. Help Mij Besparen tampoco pasaría una prueba de escala de capital riesgo. Bajo el holding se gana su sitio reforzando la credibilidad del conjunto." },
          { text: "El posicionamiento quedó más limpio." },
          { text: "Cuando el holding es la marca, cada producto hereda su credibilidad. El manual de cinco fases que recorre todo se convierte en un hilo conductor en lugar de una afirmación de marketing. Los clientes de un producto notan la confianza que se ganó en otro." },
          { text: "El efecto del contenedor creativo." },
          { text: "Lo que no esperaba: el holding me hizo mejor constructor. Como todo vive bajo un mismo nombre, el resultado tiene que envejecer bien. Nada de perseguir tendencias a corto plazo. Nada de experimentos sueltos que avergüencen al holding dentro de dos años. La estructura impone un horizonte temporal más largo del que lograría cualquier disciplina interna." },
          { text: "Un holding no es una envoltura legal. Es una disciplina creativa disfrazada de estructura fiscal." },
          { text: "Si eres un operador en solitario que entrega más de una cosa, monta el holding. No por la contabilidad. Por cómo reordena lo que te permites construir." },
        ],
      },
    },
  },
];

export function localizeSignal(base: Signal, locale: Locale): Signal {
  const o = base.i18n?.[locale];
  if (!o) return base;

  const { body, ...copy } = o;
  const merged: Signal = { ...base, ...defined(copy) };
  if (body) merged.body = mergeByIndex(base.body, body);
  return merged;
}

export function getSignal(slug: string, locale?: Locale) {
  const base = SIGNALS.find((s) => s.slug === slug);
  if (!base || !locale) return base;
  return localizeSignal(base, locale);
}

/** Alle signals in de gevraagde taal — voor de lijst, de vorige/volgende-links
 *  en de homepage-sectie. Zonder taal komt de basis ongewijzigd terug (de
 *  sitemap en de feeds hebben alleen slugs en datums nodig). */
export function getSignals(locale?: Locale): Signal[] {
  return locale ? SIGNALS.map((s) => localizeSignal(s, locale)) : SIGNALS;
}
