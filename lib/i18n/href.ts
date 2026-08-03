import { LOCALES, type Locale } from "@/lib/i18n/dict";

/** Routes die buiten app/[locale]/ leven en dus nooit een taalprefix krijgen.
 *  Komt overeen met de mappen naast [locale] in app/. */
const ZONDER_PREFIX = ["/philly", "/api", "/auth", "/actions", "/feed.json", "/rss.xml", "/sitemap.xml", "/robots.txt"];

/** Zet de taalprefix voor een intern pad.
 *
 *  De middleware leidt een taalloos pad netjes door, dus zonder deze helper
 *  werkt de site prima — hij kost alleen een 307 per klik. De audit telde 22
 *  van zulke links op elke pagina, wat neerkomt op een omleiding voor vrijwel
 *  elke navigatie, plus een link-equity-lek richting de omgeleide URL.
 *
 *  Laat met rust wat geen interne, taalloze route is: externe adressen,
 *  ankers, mailto en tel, de routes naast app/[locale]/, en paden die de
 *  prefix al dragen. Dat laatste maakt de functie idempotent, zodat hem twee
 *  keer toepassen geen /nl/nl/work oplevert. */
export function localeHref(locale: Locale, href: string): string {
  if (!href.startsWith("/")) return href; // https:, mailto:, tel:, #anker, relatief
  if (href.startsWith("//")) return href; // protocol-relatief, dus extern

  const pad = href.split(/[?#]/)[0];
  if (ZONDER_PREFIX.some((p) => pad === p || pad.startsWith(p + "/"))) return href;

  const eerste = pad.split("/")[1] ?? "";
  if ((LOCALES as readonly string[]).includes(eerste)) return href;

  return href === "/" ? `/${locale}` : `/${locale}${href}`;
}
