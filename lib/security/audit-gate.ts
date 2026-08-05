/* Poort op `npm audit`, met uitzonderingen die verlopen.
   ───────────────────────────────────────────────────────────────────────────
   Aanleiding: drie high-kwetsbaarheden hebben tien weken opengestaan zonder
   dat iets erover klaagde. Een poort die alleen "faalt op high" zou hier niet
   werken — soms is een advisory een tijdje niet op te lossen, bijvoorbeeld
   omdat de fix een major bump van een framework vereist. Dan wil je hem
   kunnen accepteren, maar niet stilzwijgend en niet voor onbepaalde tijd.

   Vandaar: elke uitzondering draagt een vervaldatum, en de poort valt om
   zodra die verstrijkt. Het besluit komt daarmee terug op de agenda in plaats
   van te vervagen.

   Pure functies; het script eromheen doet de I/O. */

/** Eén advisory zoals npm hem rapporteert. */
export type Advisory = {
  /** GHSA-id uit de advisory-URL — stabieler dan het numerieke `source`. */
  id: string;
  pakket: string;
  titel: string;
  ernst: Ernst;
  url: string;
};

export type Ernst = "info" | "low" | "moderate" | "high" | "critical";

const ERNST_VOLGORDE: Ernst[] = ["info", "low", "moderate", "high", "critical"];

export function ernstMinstens(ernst: Ernst, drempel: Ernst): boolean {
  return ERNST_VOLGORDE.indexOf(ernst) >= ERNST_VOLGORDE.indexOf(drempel);
}

export type Uitzondering = {
  /** GHSA-id, exact zoals in de advisory-URL. */
  advisory: string;
  /** Waarom dit risico nu aanvaardbaar is. Vrije tekst, wordt niet geparsed —
   *  maar leeg laten mag niet, want dan is de uitzondering onnavolgbaar. */
  reden: string;
  /** ISO-datum. Ná deze dag faalt de poort, ook als er verder niets mis is. */
  vervalt: string;
};

export type Bevinding = {
  ernst: "fout" | "waarschuwing";
  soort: "niet-geaccepteerd" | "vervallen" | "overbodig" | "onvolledig";
  advisory: string;
  detail: string;
};

/** Haalt het GHSA-id uit een advisory-URL. Valt terug op het numerieke
 *  `source` wanneer de URL een andere vorm heeft, zodat een onbekend formaat
 *  niet stil tot een lege sleutel leidt. */
export function advisoryId(url: unknown, source: unknown): string {
  if (typeof url === "string") {
    const m = /(GHSA-[a-z0-9-]+)/i.exec(url);
    if (m) return m[1];
  }
  return typeof source === "number" || typeof source === "string" ? `npm-${source}` : "onbekend";
}

/** Platslaan van `npm audit --json` naar losse advisories.
 *
 *  De structuur is genest: `vulnerabilities[pakket].via[]` bevat óf strings
 *  (verwijzingen naar andere pakketten in dezelfde boom) óf objecten met de
 *  echte advisory. Alleen die objecten tellen; de strings zouden anders
 *  dubbeltellen, want het pakket waar ze naar wijzen staat er zelf ook in.
 *
 *  De ernst komt van de advisory zelf en niet van het pakket: npm rolt per
 *  pakket op naar het zwaarste geval, waardoor een pakket "high" heet terwijl
 *  al zijn advisories moderate zijn. */
export function verzamelAdvisories(auditJson: unknown): Advisory[] {
  const root = auditJson as { vulnerabilities?: Record<string, { via?: unknown[] }> };
  const uit = new Map<string, Advisory>();

  for (const [pakket, v] of Object.entries(root?.vulnerabilities ?? {})) {
    for (const via of v?.via ?? []) {
      if (typeof via !== "object" || via === null) continue;
      const o = via as Record<string, unknown>;
      const id = advisoryId(o.url, o.source);
      // Dezelfde advisory kan onder meerdere pakketten opduiken; één telling.
      if (uit.has(id)) continue;
      uit.set(id, {
        id,
        pakket: typeof o.name === "string" ? o.name : pakket,
        titel: typeof o.title === "string" ? o.title : "(geen titel)",
        ernst: (typeof o.severity === "string" ? o.severity : "info") as Ernst,
        url: typeof o.url === "string" ? o.url : "",
      });
    }
  }
  return [...uit.values()];
}

/** Beoordeelt advisories tegen de uitzonderingenlijst.
 *
 *  `vandaag` wordt meegegeven in plaats van intern bepaald, zodat een test de
 *  klok kan zetten en niet pas over een jaar iets anders doet. */
export function beoordeel(
  advisories: Advisory[],
  uitzonderingen: Uitzondering[],
  vandaag: Date,
  drempel: Ernst = "high",
): Bevinding[] {
  const bevindingen: Bevinding[] = [];
  const perId = new Map(uitzonderingen.map((u) => [u.advisory, u]));
  const gezien = new Set<string>();

  for (const u of uitzonderingen) {
    if (!u.reden?.trim()) {
      bevindingen.push({
        ernst: "fout",
        soort: "onvolledig",
        advisory: u.advisory,
        detail: "uitzondering zonder reden — een risico accepteren zonder motivering is niet na te volgen",
      });
    }
    if (Number.isNaN(Date.parse(u.vervalt))) {
      bevindingen.push({
        ernst: "fout",
        soort: "onvolledig",
        advisory: u.advisory,
        detail: `onleesbare vervaldatum "${u.vervalt}" — verwacht ISO, bijvoorbeeld 2026-09-01`,
      });
    }
  }

  for (const a of advisories) {
    if (!ernstMinstens(a.ernst, drempel)) continue;
    const u = perId.get(a.id);
    if (!u) {
      bevindingen.push({
        ernst: "fout",
        soort: "niet-geaccepteerd",
        advisory: a.id,
        detail: `${a.ernst} in ${a.pakket}: ${a.titel} — ${a.url}`,
      });
      continue;
    }
    gezien.add(a.id);
    const vervalt = Date.parse(u.vervalt);
    if (!Number.isNaN(vervalt) && vandaag.getTime() > vervalt) {
      bevindingen.push({
        ernst: "fout",
        soort: "vervallen",
        advisory: a.id,
        detail: `uitzondering verliep op ${u.vervalt} — los op of verleng met een nieuwe motivering (${a.pakket})`,
      });
    }
  }

  // Een uitzondering die niets meer uitzondert hoort weg. Zonder deze
  // controle groeit de lijst stilletjes uit tot hij de poort uitholt.
  for (const u of uitzonderingen) {
    if (gezien.has(u.advisory)) continue;
    if (advisories.some((a) => a.id === u.advisory)) continue; // wel aanwezig, onder de drempel
    bevindingen.push({
      ernst: "fout",
      soort: "overbodig",
      advisory: u.advisory,
      detail: "staat op de uitzonderingenlijst maar komt niet meer voor — haal hem weg",
    });
  }

  return bevindingen;
}
