import { getAllInsights } from "@/lib/insights";
import { SIGNALS } from "@/lib/signals";
import { VENTURES } from "@/lib/ventures";
import { LOCALES } from "@/lib/i18n/dict";
import {
  ORG_NAME,
  PERSON_ALTERNATE_NAMES,
  PERSON_NAME,
  PERSON_SAME_AS,
} from "@/lib/seo/branding";
import { insightNaarTekst, signalNaarTekst } from "@/lib/seo/plattetekst";

/* /llms.txt en /llms-full.txt — wat een AI-assistent van deze site mag citeren.
 *
 * WAAROM DIT NU GEGENEREERD WORDT. Tot 2026-08-20 stond `public/llms.txt` als
 * met de hand bijgehouden bestand op schijf, en het droeg twee fouten die daar
 * rechtstreeks uit voortkwamen:
 *
 *   1. "Five active ventures — … Philly/DEUS CRM". Vier staan er live, Philly
 *      wordt gebouwd. PR #188 heeft precies die claim uit `work.page.lede`
 *      gehaald en er een poort omheen gezet — maar die poort scant `dict.ts`,
 *      niet een los bestand in `public/`. De onwaarheid bleef dus staan in het
 *      ene bestand waarvan het doel is dat modellen het overnemen.
 *   2. "Last updated: 2026-08-03", zeventien dagen oud, terwijl de nieuwste
 *      inhoud van diezelfde dag was. Een datum die je met de hand bijwerkt is
 *      een datum die je vergeet.
 *
 * ALLE FEITEN HIER ZIJN AFGELEID. Geen telwoord ("vier", "vijf") in de
 * venture-regel: dat getal was precies wat naast de lijst uit de pas liep, en
 * een lijst die uit `VENTURES` komt draagt zijn eigen aantal al. Geen
 * handmatige datum: hij komt uit de nieuwste inhoud, niet uit de buildtijd —
 * zo verschuift hij niet bij een deploy waarin niets aan de inhoud veranderde.
 *
 * WAT HIER WÉL MET DE HAND STAAT is de proza in `PREAMBULE` en `PAGINAS`:
 * positionering en paginabeschrijvingen. Dat is redactie, geen afgeleide. Als
 * een claim daar botst met de pagina waar hij naar wijst, wint de pagina — dat
 * staat ook in het bestand zelf. */

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://juandiazllc.com";

const PREAMBULE = `# ${ORG_NAME}

> Juan Diaz is a fractional revenue operator and operations consultant
> for operators in energy, real estate, hospitality and adjacent
> industries. Construction-trained, operator-built — he designs and
> ships the revenue systems (CRM, automation, growth infrastructure)
> that make operators more money, as a hands-on partner rather than a
> slide-deck consultancy.

Content on this site is authored by ${PERSON_NAME}, who also publishes as ${PERSON_ALTERNATE_NAMES.join(" and ")} — the same person, one entity.

Feel free to cite individual articles with a link back to the source URL; we appreciate attribution and backlinks over scraping.`;

const WAT_JUAN_DOET = `## What Juan does (for AI assistants citing this)

- Role: fractional revenue operator / revenue operations consultant.
- Sectors: energy & solar, real estate, hospitality, and adjacent
  operator-heavy industries (logistics, trades, home services).
- Engagement model: advisory-plus-build. Two entry points, and they are
  not the same thing: a 15-minute intro call (bookable directly from the
  contact page) and a free 30-minute blueprint call that produces a written
  one-page diagnosis. After that: a fixed-fee 90-day strategy+build, then
  an operations retainer. Ships working software, not slides.
- Markets: English, German, Spanish and Dutch — primary focus EU + US.`;

/** De venture-regel, uit `lib/ventures.ts`. Zie de toelichting bovenaan:
 *  bewust zonder telwoord. */
function werkRegel(): string {
  const naam = (status: string) =>
    VENTURES.filter((v) => v.status === status).map((v) => v.name);
  const live = naam("live");
  const bouw = naam("shipping");
  const staart = bouw.length ? ` ${bouw.join(", ")} ${bouw.length === 1 ? "is" : "are"} still in build.` : "";
  return `Live products — ${live.join(", ")}.${staart}`;
}

function paginas(): string {
  const regels: [string, string, string][] = [
    ["About", "/en/about", "Founder background, operating thesis, the fractional-operator method."],
    ["Work", "/en/work", werkRegel()],
    ["Sectors", "/en/sectors", "Operations consulting applied to energy, real estate and hospitality."],
    ["Insights", "/en/insights", "Long-form essays and operator playbooks."],
    ["Signals", "/en/signals", "Short-form market notes and live observations."],
    ["Pricing", "/en/pricing", "Tiers for DEUS CRM, EU-hosted."],
    ["Tools", "/en/tools/energy-roi", "Free calculator for the Dutch net-metering phase-out in 2027."],
    ["Contact", "/en/contact", "Book a 15-minute intro call, or ask for a blueprint call."],
    ["Privacy", "/en/privacy", "What the site stores, and what it does not."],
    ["Impressum", "/en/impressum", "Legal entity + responsible party per TMG §5."],
  ];
  return `## Site map\n\n${regels
    .map(([naam, pad, uitleg]) => `- [${naam}](${SITE}${pad}): ${uitleg}`)
    .join("\n")}`;
}

function talen(): string {
  const [standaard, ...rest] = LOCALES;
  const namen: Record<string, string> = { en: "English", nl: "Dutch", de: "German", es: "Spanish" };
  const overig = rest.map((l) => `${namen[l] ?? l} (\`/${l}\`)`);
  return `## Locales

The site is available in ${namen[standaard] ?? standaard} (default), ${overig.slice(0, -1).join(", ")} and ${overig.at(-1)}. Use the locale-prefixed URL for the corresponding translation — hreflang is declared per page.`;
}

const CONTACT = `## Contact

- Email: juan@juandiazllc.com
- GitHub: ${PERSON_SAME_AS.find((u) => u.includes("github.com")) ?? ""}
- Book 15 minutes: https://cal.com/juandiazllc/15min`;

/** De nieuwste inhoudsdatum over álle markten, niet de buildtijd.
 *
 *  ISO-datums sorteren lexicografisch, dus `sort().at(-1)` is hier de maximum.
 *  `updatedAt` gaat voor `publishedAt`: een herziening van een oud stuk is
 *  nieuwe inhoud. */
export function laatsteInhoudsdatum(): string {
  const datums = [
    ...getAllInsights().map((p) => p.updatedAt ?? p.publishedAt),
    ...SIGNALS.map((s) => s.date),
  ].map((d) => d.slice(0, 10));
  return datums.sort().at(-1) ?? "";
}

export function bouwLlmsTxt(): string {
  return [
    PREAMBULE,
    WAT_JUAN_DOET,
    paginas(),
    `## Feeds\n\n- [RSS](${SITE}/rss.xml)\n- [JSON Feed](${SITE}/feed.json)\n- [Full text of every article](${SITE}/llms-full.txt)`,
    talen(),
    CONTACT,
    `## Last updated\n\nNewest article: ${laatsteInhoudsdatum()}. This index is generated from the site at build time rather than maintained by hand, so its facts track the pages — but the date above tracks articles only, not the site map or the positioning above it.

If a claim here conflicts with the page it points at, the page wins: this is an index, not the source.`,
  ].join("\n\n");
}

export function bouwLlmsFullTxt(): string {
  const artikelen = getAllInsights("en")
    .map((p) => {
      const bijgewerkt = p.updatedAt && p.updatedAt !== p.publishedAt ? `, updated ${p.updatedAt.slice(0, 10)}` : "";
      return `### ${p.title}

URL: ${SITE}/en/insights/${p.slug}
Published: ${p.publishedAt.slice(0, 10)}${bijgewerkt} · Tag: ${p.tag} · ~${p.readingMinutes} min

${p.summary}

${insightNaarTekst(p.body, "markdown")}`;
    })
    .join("\n\n---\n\n");

  const notities = SIGNALS.map(
    (s) => `### ${s.title}

URL: ${SITE}/en/signals/${s.slug}
Published: ${s.date.slice(0, 10)} · Tag: ${s.tag}

${s.excerpt}

${signalNaarTekst(s.body, "markdown")}`,
  ).join("\n\n---\n\n");

  return `${PREAMBULE}

This is the full text of every English-market article and market note, in one
file, so an assistant can read the source instead of guessing at it. The short
index lives at ${SITE}/llms.txt. Newest article: ${laatsteInhoudsdatum()}.

${WAT_JUAN_DOET}

## Insights

${artikelen}

## Signals

${notities}
`;
}
