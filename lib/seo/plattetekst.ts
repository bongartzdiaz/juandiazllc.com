import type { InsightBlock } from "@/lib/insights";
import type { Signal } from "@/lib/signals";

/* Één afvlakker voor alle tekst-afnemers van de contentlaag.
 *
 * WAAROM DIT GEDEELD IS. Toen `cta` als bloktype werd toegevoegd (PR #82) moest
 * `app/feed.json/route.ts` met de hand worden bijgewerkt, anders had die feed
 * dat blok stil als lege string doorgegeven. Dat werkte omdat er precies één
 * afnemer was. Met `/llms-full.txt` erbij zijn het er twee, en dan is "vergeet
 * de tweede" geen hypothese meer maar een kwestie van tijd.
 *
 * De `never`-tak hieronder maakt er een compileerfout van in plaats van een
 * test die je moet onthouden te draaien: voeg je een zesde bloktype toe, dan
 * valt `npm run typecheck` om op de regel die zegt welk type je vergat.
 *
 * TWEE VORMEN, ÉÉN SWITCH. JSON Feed's `content_text` is per specificatie
 * platte tekst, dus daar wordt een kop een gewone regel. `/llms-full.txt` wordt
 * juist gelezen om geparseerd te worden; daar blijft de structuur staan en
 * overleeft de href van een `cta` — die viel in de platte vorm helemaal weg. */

export type Vorm = "plat" | "markdown";

export function insightNaarTekst(body: InsightBlock[], vorm: Vorm = "plat"): string {
  const md = vorm === "markdown";
  return body
    .map((blok): string => {
      switch (blok.type) {
        case "h2":
          return md ? `#### ${blok.text}` : blok.text;
        case "p":
          return blok.text;
        case "quote":
          return md ? `> ${blok.text}${blok.cite ? ` — ${blok.cite}` : ""}` : blok.text;
        case "cta":
          return md ? `[${blok.text}](${blok.href})` : blok.text;
        case "ul":
          return blok.items.map((i) => `${md ? "-" : "•"} ${i}`).join("\n");
        default: {
          const onbehandeld: never = blok;
          return onbehandeld;
        }
      }
    })
    .filter(Boolean)
    .join("\n\n");
}

/** Signals dragen een lossere vorm dan Insight: `text` is `string | string[]`,
 *  en het bloktype bepaalt alleen hoe het rendert. Een uitputtingscontrole is
 *  hier dus niet mogelijk op `type` — de scheiding zit op de vorm van `text`. */
export function signalNaarTekst(body: Signal["body"], vorm: Vorm = "plat"): string {
  const md = vorm === "markdown";
  return body
    .map((blok) => {
      if (Array.isArray(blok.text)) {
        return blok.text.map((i) => `${md ? "-" : "•"} ${i}`).join("\n");
      }
      if (md && blok.type === "h2") return `#### ${blok.text}`;
      if (md && blok.type === "quote") return `> ${blok.text}`;
      return blok.text;
    })
    .filter(Boolean)
    .join("\n\n");
}
