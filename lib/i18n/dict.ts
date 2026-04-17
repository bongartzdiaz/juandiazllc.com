export const LOCALES = ["en", "nl", "de", "es"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "EN",
  nl: "NL",
  de: "DE",
  es: "ES",
};

export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  nl: "Nederlands",
  de: "Deutsch",
  es: "Español",
};

type Dict = Record<string, string>;

const en: Dict = {
  // Nav
  "nav.story": "Story",
  "nav.work": "Work",
  "nav.signals": "Signals",
  "nav.contact": "Contact",
  "nav.login": "Login",

  // Hero
  "hero.chip.status": "◉ Available · Amsterdam ↔ Philly",
  "hero.chip.sectors": "Energy · Real Estate · Hospitality",
  "hero.title.1": "I build the systems",
  "hero.title.2": "that make operators",
  "hero.title.3": "more money.",
  "hero.desc": "is the holding I use to ship revenue engines for operators in energy, real estate, hospitality and adjacent industries — as my own products, or as a partner for yours. Construction-trained. Operator-built. One founder, five phases, zero fluff.",
  "hero.cta.primary": "Book a blueprint call",
  "hero.cta.secondary": "See the work",
  "hero.scroll": "Scroll",

  // CTA block
  "cta.label": "◉ Work with me",
  "cta.title.a": "Ready to find the revenue you're",
  "cta.title.b": "leaving on the table?",
  "cta.lede": "One founder. Five phases. Zero fluff. The blueprint call is free and blunt. If I can help, I will. If I can't, I'll tell you who can — and send you on your way.",
  "cta.primary": "Book a blueprint call",
  "cta.secondary": "See the playbook",
  "cta.news.placeholder": "— Your email for the field notes",
  "cta.news.submit": "Subscribe",
  "cta.news.submitted": "✓ Subscribed",
  "cta.news.hint": "◐ Monthly, blunt, useful. No spam, ever.",

  // Contact form
  "contact.title.a": "Tell me what you're",
  "contact.title.b": "building.",
  "contact.lede": "All fields except email + message are optional. Shorter is better. I read every one.",
  "contact.name": "Name",
  "contact.email": "Email",
  "contact.company": "Company",
  "contact.sector": "Sector",
  "contact.sector.pick": "Pick one",
  "contact.message": "What are you trying to solve?",
  "contact.message.placeholder": "Two or three sentences is plenty.",
  "contact.submit": "Send it",
  "contact.submitting": "Sending...",
  "contact.sent": "✓ Sent",
  "contact.alt": "Prefer email directly?",

  // Login
  "login.title.a": "Step into the",
  "login.title.b": "control room.",
  "login.lede": "Sign in with the credentials Juan provided you. No self-signup — accounts are provisioned per client.",
  "login.email": "Email",
  "login.password": "Password",
  "login.submit": "Sign in",
  "login.signing_in": "Signing in...",
  "login.sso_error": "Sign-in couldn't complete. Try again or email Juan.",
  "login.footer.a": "Need a login? Contact",

  // Footer / generic
  "footer.version": "v1.0",
  "lang.label": "Lang",
};

const nl: Dict = {
  "nav.story": "Verhaal",
  "nav.work": "Werk",
  "nav.signals": "Signalen",
  "nav.contact": "Contact",
  "nav.login": "Inloggen",

  "hero.chip.status": "◉ Beschikbaar · Amsterdam ↔ Philly",
  "hero.chip.sectors": "Energie · Vastgoed · Hospitality",
  "hero.title.1": "Ik bouw de systemen",
  "hero.title.2": "die operators meer",
  "hero.title.3": "geld laten verdienen.",
  "hero.desc": "is de holding waarmee ik revenue engines bouw voor operators in energie, vastgoed, hospitality en aangrenzende industrieën — als eigen producten of als partner voor die van jou. Geschoold in de bouw. Gebouwd door een operator. Eén oprichter, vijf fases, nul ruis.",
  "hero.cta.primary": "Plan een blueprint-gesprek",
  "hero.cta.secondary": "Bekijk het werk",
  "hero.scroll": "Scrollen",

  "cta.label": "◉ Samenwerken",
  "cta.title.a": "Klaar om de omzet te vinden die je",
  "cta.title.b": "laat liggen?",
  "cta.lede": "Eén oprichter. Vijf fases. Geen ruis. Het blueprint-gesprek is gratis en eerlijk. Als ik kan helpen, doe ik dat. Zo niet, dan vertel ik je wie dat wel kan.",
  "cta.primary": "Plan een blueprint-gesprek",
  "cta.secondary": "Bekijk de aanpak",
  "cta.news.placeholder": "— E-mail voor de veldnotities",
  "cta.news.submit": "Aanmelden",
  "cta.news.submitted": "✓ Aangemeld",
  "cta.news.hint": "◐ Maandelijks, eerlijk, bruikbaar. Geen spam.",

  "contact.title.a": "Vertel me wat je aan het",
  "contact.title.b": "bouwen bent.",
  "contact.lede": "Alles behalve e-mail en bericht is optioneel. Korter is beter. Ik lees alles.",
  "contact.name": "Naam",
  "contact.email": "E-mail",
  "contact.company": "Bedrijf",
  "contact.sector": "Sector",
  "contact.sector.pick": "Kies er één",
  "contact.message": "Wat probeer je op te lossen?",
  "contact.message.placeholder": "Twee of drie zinnen is genoeg.",
  "contact.submit": "Verzenden",
  "contact.submitting": "Bezig met verzenden...",
  "contact.sent": "✓ Verzonden",
  "contact.alt": "Liever direct mailen?",

  "login.title.a": "Stap in de",
  "login.title.b": "control room.",
  "login.lede": "Log in met de gegevens die Juan je heeft gegeven. Geen zelfregistratie — accounts worden per klant aangemaakt.",
  "login.email": "E-mail",
  "login.password": "Wachtwoord",
  "login.submit": "Inloggen",
  "login.signing_in": "Bezig met inloggen...",
  "login.sso_error": "Inloggen is niet gelukt. Probeer opnieuw of mail Juan.",
  "login.footer.a": "Account nodig? Contact",

  "footer.version": "v1.0",
  "lang.label": "Taal",
};

const de: Dict = {
  "nav.story": "Story",
  "nav.work": "Arbeit",
  "nav.signals": "Signale",
  "nav.contact": "Kontakt",
  "nav.login": "Login",

  "hero.chip.status": "◉ Verfügbar · Amsterdam ↔ Philly",
  "hero.chip.sectors": "Energie · Immobilien · Hospitality",
  "hero.title.1": "Ich baue die Systeme,",
  "hero.title.2": "die Operatoren mehr",
  "hero.title.3": "Umsatz bringen.",
  "hero.desc": "ist die Holding, unter der ich Revenue-Engines für Operatoren in Energie, Immobilien, Hospitality und angrenzenden Branchen baue — als eigene Produkte oder als Partner für Ihre. Im Bauwesen ausgebildet. Von einem Operator gebaut. Ein Gründer, fünf Phasen, null Geschwätz.",
  "hero.cta.primary": "Blueprint-Call buchen",
  "hero.cta.secondary": "Die Arbeit ansehen",
  "hero.scroll": "Scrollen",

  "cta.label": "◉ Zusammenarbeiten",
  "cta.title.a": "Bereit, den Umsatz zu finden,",
  "cta.title.b": "den Sie liegen lassen?",
  "cta.lede": "Ein Gründer. Fünf Phasen. Null Geschwätz. Der Blueprint-Call ist kostenlos und direkt. Wenn ich helfen kann, tue ich das. Sonst sage ich Ihnen, wer es kann.",
  "cta.primary": "Blueprint-Call buchen",
  "cta.secondary": "Vorgehen ansehen",
  "cta.news.placeholder": "— Ihre E-Mail für die Feldnotizen",
  "cta.news.submit": "Abonnieren",
  "cta.news.submitted": "✓ Abonniert",
  "cta.news.hint": "◐ Monatlich, direkt, nützlich. Kein Spam.",

  "contact.title.a": "Erzählen Sie mir, was Sie",
  "contact.title.b": "bauen.",
  "contact.lede": "Alles außer E-Mail und Nachricht ist optional. Kürzer ist besser. Ich lese alles.",
  "contact.name": "Name",
  "contact.email": "E-Mail",
  "contact.company": "Firma",
  "contact.sector": "Branche",
  "contact.sector.pick": "Wählen Sie eine",
  "contact.message": "Was versuchen Sie zu lösen?",
  "contact.message.placeholder": "Zwei oder drei Sätze reichen.",
  "contact.submit": "Senden",
  "contact.submitting": "Wird gesendet...",
  "contact.sent": "✓ Gesendet",
  "contact.alt": "Lieber direkt per E-Mail?",

  "login.title.a": "Treten Sie in den",
  "login.title.b": "Kontrollraum.",
  "login.lede": "Melden Sie sich mit den von Juan bereitgestellten Zugangsdaten an. Keine Selbstregistrierung — Konten werden pro Kunde eingerichtet.",
  "login.email": "E-Mail",
  "login.password": "Passwort",
  "login.submit": "Anmelden",
  "login.signing_in": "Anmeldung läuft...",
  "login.sso_error": "Anmeldung fehlgeschlagen. Versuchen Sie es erneut oder mailen Sie Juan.",
  "login.footer.a": "Zugang benötigt? Kontakt",

  "footer.version": "v1.0",
  "lang.label": "Sprache",
};

const es: Dict = {
  "nav.story": "Historia",
  "nav.work": "Trabajo",
  "nav.signals": "Señales",
  "nav.contact": "Contacto",
  "nav.login": "Acceder",

  "hero.chip.status": "◉ Disponible · Amsterdam ↔ Philly",
  "hero.chip.sectors": "Energía · Inmobiliario · Hostelería",
  "hero.title.1": "Construyo los sistemas",
  "hero.title.2": "que hacen ganar más",
  "hero.title.3": "a los operadores.",
  "hero.desc": "es el holding bajo el que envío motores de ingresos para operadores en energía, inmobiliario, hostelería e industrias adyacentes — como productos propios o como socio para los tuyos. Formado en construcción. Construido por un operador. Un fundador, cinco fases, cero ruido.",
  "hero.cta.primary": "Reservar una llamada blueprint",
  "hero.cta.secondary": "Ver el trabajo",
  "hero.scroll": "Bajar",

  "cta.label": "◉ Trabajemos",
  "cta.title.a": "¿Listo para encontrar los ingresos que estás",
  "cta.title.b": "dejando sobre la mesa?",
  "cta.lede": "Un fundador. Cinco fases. Cero ruido. La llamada blueprint es gratis y directa. Si puedo ayudar, lo haré. Si no, te diré quién puede.",
  "cta.primary": "Reservar llamada blueprint",
  "cta.secondary": "Ver el método",
  "cta.news.placeholder": "— Tu email para las notas de campo",
  "cta.news.submit": "Suscribirse",
  "cta.news.submitted": "✓ Suscrito",
  "cta.news.hint": "◐ Mensual, directo, útil. Sin spam.",

  "contact.title.a": "Cuéntame qué estás",
  "contact.title.b": "construyendo.",
  "contact.lede": "Todo excepto email y mensaje es opcional. Cuanto más corto, mejor. Leo todos.",
  "contact.name": "Nombre",
  "contact.email": "Email",
  "contact.company": "Empresa",
  "contact.sector": "Sector",
  "contact.sector.pick": "Elige uno",
  "contact.message": "¿Qué intentas resolver?",
  "contact.message.placeholder": "Dos o tres frases es suficiente.",
  "contact.submit": "Enviar",
  "contact.submitting": "Enviando...",
  "contact.sent": "✓ Enviado",
  "contact.alt": "¿Prefieres escribir directamente?",

  "login.title.a": "Entra en la",
  "login.title.b": "sala de control.",
  "login.lede": "Inicia sesión con las credenciales que Juan te proporcionó. Sin registro abierto — las cuentas se crean por cliente.",
  "login.email": "Email",
  "login.password": "Contraseña",
  "login.submit": "Entrar",
  "login.signing_in": "Entrando...",
  "login.sso_error": "No se pudo iniciar sesión. Inténtalo de nuevo o escribe a Juan.",
  "login.footer.a": "¿Necesitas acceso? Contacto",

  "footer.version": "v1.0",
  "lang.label": "Idioma",
};

export const DICT: Record<Locale, Dict> = { en, nl, de, es };

export function translate(locale: Locale, key: string): string {
  return DICT[locale]?.[key] ?? DICT.en[key] ?? key;
}
