/* Technische SEO-audit — analyse.
   ───────────────────────────────────────────────────────────────────────────
   Waarom eigen code en niet LibreCrawl of Screaming Frog: de site is al
   volledig te crawlen vanuit de sitemap, de checks die er hier toe doen zijn
   specifiek (hreflang over vier talen, canonical per locale), en dit draait in
   CI. Een GUI-tool doet dat laatste niet.

   Alles hieronder is een pure functie over al opgehaalde pagina's. Het
   ophalen zelf staat in scripts/seo-audit.ts. Zo is elke regel die een
   oordeel velt te testen zonder netwerk.

   Ernst:
     fout   — kost verkeer of is aantoonbaar kapot
     waarschuwing — verdient aandacht, kost niet direct iets
     notitie — informatief
   ─────────────────────────────────────────────────────────────────────────── */

export type Ernst = "fout" | "waarschuwing" | "notitie";

export type Bevinding = {
  ernst: Ernst;
  soort: string;
  url: string;
  detail: string;
};

export type Pagina = {
  url: string;
  status: number;
  /** Volledige redirect-keten, inclusief de eind-URL. Lengte 1 = geen redirect. */
  keten: string[];
  html: string;
};

/* ── kleine HTML-helpers ───────────────────────────────────────────────────
   Bewust regex en geen DOM-parser: we lezen een handvol velden uit een
   server-gerenderde pagina, geen willekeurige HTML van derden. Scheelt een
   dependency en is snel genoeg voor 176 pagina's. */

const ontsla = (s: string): string =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();

export function haalTitel(html: string): string | null {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return m ? ontsla(m[1].replace(/<[^>]*>/g, "")) : null;
}

export function haalDescription(html: string): string | null {
  const m = /<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i.exec(html);
  return m ? ontsla(m[1]) : null;
}

export function haalCanonical(html: string): string | null {
  const m = /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i.exec(html);
  return m ? m[1] : null;
}

export function haalH1s(html: string): string[] {
  return [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) =>
    ontsla(m[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ")),
  );
}

export function haalLinks(html: string): string[] {
  return [...html.matchAll(/<a[^>]+href=["']([^"']+)["']/gi)].map((m) => m[1]);
}

export function haalAfbeeldingen(html: string): { src: string; heeftAlt: boolean }[] {
  return [...html.matchAll(/<img\b([^>]*)>/gi)].map((m) => {
    const attrs = m[1];
    const src = /src=["']([^"']*)["']/i.exec(attrs)?.[1] ?? "";
    // alt="" is geldig: dat markeert een decoratieve afbeelding. Alleen een
    // volledig ontbrekend alt-attribuut is een fout.
    return { src, heeftAlt: /\balt=/i.test(attrs) };
  });
}

export function haalJsonLd(html: string): unknown[] {
  const uit: unknown[] = [];
  for (const m of html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      uit.push(JSON.parse(m[1]));
    } catch {
      uit.push({ __ongeldig: m[1].slice(0, 120) });
    }
  }
  return uit;
}

/* ── controles ───────────────────────────────────────────────────────────── */

/** Titels moeten uniek zijn: twee pagina's met dezelfde titel concurreren met elkaar. */
export function controleerDubbeleTitels(paginas: Pagina[]): Bevinding[] {
  const perTitel = new Map<string, string[]>();
  for (const p of paginas) {
    const t = haalTitel(p.html);
    if (!t) continue;
    perTitel.set(t, [...(perTitel.get(t) ?? []), p.url]);
  }
  const uit: Bevinding[] = [];
  for (const [titel, urls] of perTitel) {
    if (urls.length < 2) continue;
    uit.push({
      ernst: "fout",
      soort: "dubbele-titel",
      url: urls[0],
      detail: `"${titel}" staat op ${urls.length} URL's: ${urls.slice(0, 4).join(", ")}${urls.length > 4 ? " …" : ""}`,
    });
  }
  return uit;
}

export function controleerDubbeleDescriptions(paginas: Pagina[]): Bevinding[] {
  const per = new Map<string, string[]>();
  for (const p of paginas) {
    const d = haalDescription(p.html);
    if (!d) continue;
    per.set(d, [...(per.get(d) ?? []), p.url]);
  }
  const uit: Bevinding[] = [];
  for (const [desc, urls] of per) {
    if (urls.length < 2) continue;
    uit.push({
      ernst: "waarschuwing",
      soort: "dubbele-description",
      url: urls[0],
      detail: `${urls.length} URL's delen "${desc.slice(0, 60)}…"`,
    });
  }
  return uit;
}

/* ── lengtes ──────────────────────────────────────────────────────────────
   Google kapt de titel in de zoekresultaten af op breedte, niet op tekens:
   ongeveer 600 pixels. Een tekental is daar een benadering van, want een titel
   vol hoofdletters en W's past er eerder over dan een met i's en l's. De
   grenzen hieronder zijn dus een signaal om naar te kijken, geen harde regel —
   vandaar waarschuwing en notitie, en geen fout.

   Ontbreken van een titel is wél een fout: dan verzint Google er zelf een. */

export const TITEL_MAX = 60;
export const TITEL_MIN = 15;
export const DESC_MAX = 160;
export const DESC_MIN = 70;

export function controleerTitelLengte(pagina: Pagina): Bevinding[] {
  const t = haalTitel(pagina.html);
  if (!t) {
    return [{ ernst: "fout", soort: "geen-titel", url: pagina.url, detail: "pagina heeft geen <title>" }];
  }
  // haalTitel ontslaat entiteiten al, dus &amp; telt hier als één teken en
  // niet als vijf. Zonder dat zou elke titel met een & vals alarm geven.
  if (t.length > TITEL_MAX) {
    return [{
      ernst: "waarschuwing",
      soort: "titel-te-lang",
      url: pagina.url,
      detail: `${t.length} tekens, ${t.length - TITEL_MAX} boven de ${TITEL_MAX} die Google doorgaans toont: "${t}"`,
    }];
  }
  if (t.length < TITEL_MIN) {
    return [{
      ernst: "notitie",
      soort: "titel-te-kort",
      url: pagina.url,
      detail: `${t.length} tekens: "${t}" — te weinig om een zoekopdracht mee te winnen`,
    }];
  }
  return [];
}

export function controleerDescriptionLengte(pagina: Pagina): Bevinding[] {
  const d = haalDescription(pagina.html);
  if (!d) {
    return [{
      ernst: "waarschuwing",
      soort: "geen-description",
      url: pagina.url,
      detail: "geen <meta name=description>, dus Google knipt zelf een fragment uit de pagina",
    }];
  }
  if (d.length > DESC_MAX) {
    return [{
      ernst: "waarschuwing",
      soort: "description-te-lang",
      url: pagina.url,
      detail: `${d.length} tekens, ${d.length - DESC_MAX} boven de ${DESC_MAX}; de staart valt weg: "${d.slice(DESC_MAX - 20, DESC_MAX + 25)}…"`,
    }];
  }
  if (d.length < DESC_MIN) {
    return [{
      ernst: "notitie",
      soort: "description-te-kort",
      url: pagina.url,
      detail: `${d.length} tekens: "${d}" — laat ruimte liggen`,
    }];
  }
  return [];
}

/** Precies één h1 per pagina. Nul is een gemiste kans, meer dan één is rommel. */
export function controleerH1(pagina: Pagina): Bevinding[] {
  const h1s = haalH1s(pagina.html);
  if (h1s.length === 0) {
    return [{ ernst: "fout", soort: "geen-h1", url: pagina.url, detail: "pagina heeft geen <h1>" }];
  }
  if (h1s.length > 1) {
    return [
      {
        ernst: "waarschuwing",
        soort: "meerdere-h1",
        url: pagina.url,
        detail: `${h1s.length} h1's: ${h1s.map((h) => `"${h.slice(0, 30)}"`).join(", ")}`,
      },
    ];
  }
  return [];
}

export function controleerCanonical(pagina: Pagina): Bevinding[] {
  const c = haalCanonical(pagina.html);
  if (!c) {
    return [{ ernst: "waarschuwing", soort: "geen-canonical", url: pagina.url, detail: "geen <link rel=canonical>" }];
  }
  if (c !== pagina.url) {
    return [
      {
        ernst: "fout",
        soort: "canonical-wijkt-af",
        url: pagina.url,
        detail: `canonical wijst naar ${c}`,
      },
    ];
  }
  return [];
}

/** Een redirect in de sitemap kost elke crawl een extra ronde. */
export function controleerRedirect(pagina: Pagina): Bevinding[] {
  if (pagina.keten.length <= 1) return [];
  return [
    {
      ernst: pagina.keten.length > 2 ? "fout" : "waarschuwing",
      soort: "redirect",
      url: pagina.url,
      detail: `${pagina.keten.length - 1} hop(s): ${pagina.keten.join(" → ")}`,
    },
  ];
}

export function controleerAfbeeldingen(pagina: Pagina): Bevinding[] {
  const zonder = haalAfbeeldingen(pagina.html).filter((i) => !i.heeftAlt);
  if (zonder.length === 0) return [];
  return [
    {
      ernst: "waarschuwing",
      soort: "img-zonder-alt",
      url: pagina.url,
      detail: `${zonder.length} <img> zonder alt-attribuut (bv. ${zonder[0].src.slice(0, 50)})`,
    },
  ];
}

/** Ankers die geen link zijn: geen href, of een href waar niets achter zit.
 *
 *  Een `<a>` zonder href is geen link — hij is niet crawlbaar, krijgt geen
 *  linkrol en is niet met het toetsenbord bereikbaar, terwijl hij er precies
 *  hetzelfde uitziet als zijn buren. Dat is hoe de homepage op 2026-08-20 van
 *  0,95+ naar 0,92 zakte op Lighthouse' SEO-categorie: PR #188 haalde terecht
 *  een dood adres weg, maar liet `<a href={undefined}>` staan.
 *
 *  Fragmentlinks (`#main`) tellen NIET mee: een skip-link is een geldige,
 *  bereikbare link naar dezelfde pagina. Alleen een kale `#` is leeg. */
export function haalAnkers(html: string): { attrs: string; bruikbaar: boolean }[] {
  return [...html.matchAll(/<a\b([^>]*)>/gi)].map((m) => {
    const attrs = m[1];
    const href = /href=["']([^"']*)["']/i.exec(attrs)?.[1];
    const bruikbaar =
      href !== undefined && href.trim() !== "" && href.trim() !== "#" &&
      !/^javascript:/i.test(href.trim());
    return { attrs: attrs.trim(), bruikbaar };
  });
}

export function controleerAnkers(pagina: Pagina): Bevinding[] {
  const kapot = haalAnkers(pagina.html).filter((a) => !a.bruikbaar);
  if (kapot.length === 0) return [];
  return [
    {
      ernst: "waarschuwing",
      soort: "anker-zonder-href",
      url: pagina.url,
      detail: `${kapot.length} <a> zonder bruikbare href (bv. <a ${kapot[0].attrs.slice(0, 60)}>)`,
    },
  ];
}

/** Heeft dit JSON-LD-knooppunt een bruikbaar type? */
function heeftType(knoop: unknown): boolean {
  if (Array.isArray(knoop)) return knoop.every(heeftType);
  if (!knoop || typeof knoop !== "object") return false;
  return "@type" in knoop || "@graph" in knoop;
}

export function controleerJsonLd(pagina: Pagina): Bevinding[] {
  const uit: Bevinding[] = [];
  for (const blok of haalJsonLd(pagina.html)) {
    if (blok && typeof blok === "object" && "__ongeldig" in blok) {
      uit.push({
        ernst: "fout",
        soort: "json-ld-kapot",
        url: pagina.url,
        detail: `JSON-LD parseert niet: ${(blok as { __ongeldig: string }).__ongeldig}`,
      });
      continue;
    }
    // Een array van knooppunten is geldige JSON-LD — zo staan breadcrumbs op
    // deze site. Mijn eerste versie keek alleen naar objecten en meldde
    // daardoor op alle 176 pagina's een probleem dat er niet was.
    if (!heeftType(blok)) {
      uit.push({
        ernst: "waarschuwing",
        soort: "json-ld-zonder-type",
        url: pagina.url,
        detail: "JSON-LD-blok zonder @type",
      });
    }
  }
  return uit;
}

/**
 * Pagina's die in de sitemap staan maar nergens vandaan gelinkt worden.
 *
 * Google vindt ze wel via de sitemap, maar zonder interne links krijgen ze
 * geen enkel signaal mee — dat is het verschil tussen "geïndexeerd" en
 * "geïndexeerd en telt mee".
 */
/** Interne links van één pagina, absoluut gemaakt en zonder slotslash. */
function interneLinks(pagina: Pagina, basis: string): string[] {
  const uit: string[] = [];
  for (const href of haalLinks(pagina.html)) {
    if (/^(#|mailto:|tel:|javascript:)/i.test(href)) continue;
    try {
      const absoluut = new URL(href, pagina.url).toString().replace(/\/$/, "");
      if (absoluut.startsWith(basis)) uit.push(absoluut);
    } catch {
      /* onparseerbare href: negeren */
    }
  }
  return uit;
}

/**
 * Interne links zonder taalprefix.
 *
 * De navigatie linkt naar `/about`, niet naar `/en/about`. De middleware
 * stuurt dat met een 307 door, dus het wérkt — maar elke interne link kost
 * daardoor een extra ronde, en een redirect geeft niet hetzelfde signaal door
 * als een directe link. Gemeten op 2026-08-03: /about → 307 → /en/about.
 */
export function controleerLocaleLozeLinks(
  paginas: Pagina[],
  basis: string,
  locales: string[],
): Bevinding[] {
  const bekend = new Set(paginas.map((p) => p.url.replace(/\/$/, "")));
  const uit: Bevinding[] = [];
  for (const p of paginas) {
    const slecht = new Set<string>();
    for (const link of interneLinks(p, basis)) {
      if (bekend.has(link)) continue;
      const pad = link.slice(basis.length) || "/";
      // Wordt het een bekende pagina zodra er een taalprefix voor staat?
      const wordtRedirect = locales.some((l) =>
        bekend.has(`${basis}/${l}${pad === "/" ? "" : pad}`),
      );
      if (wordtRedirect) slecht.add(pad);
    }
    if (slecht.size > 0) {
      uit.push({
        ernst: "waarschuwing",
        soort: "link-zonder-taal",
        url: p.url,
        detail: `${slecht.size} interne link(s) zonder taalprefix, die dus via een redirect gaan: ${[...slecht].slice(0, 5).join(", ")}`,
      });
    }
  }
  return uit;
}

/**
 * Pagina's die in de sitemap staan maar nergens vandaan gelinkt worden.
 *
 * Telt een link zonder taalprefix wél mee: `/about` bereikt `/en/about` via de
 * middleware. Mijn eerste versie deed dat niet en meldde daardoor alle 176
 * pagina's als wees — een getal dat zó onwaarschijnlijk was dat het de check
 * verdacht maakte in plaats van de site.
 */
export function vindWezen(paginas: Pagina[], basis: string, locales: string[] = []): Bevinding[] {
  const gelinkt = new Set<string>();
  for (const p of paginas) {
    for (const link of interneLinks(p, basis)) {
      gelinkt.add(link);
      const pad = link.slice(basis.length) || "/";
      for (const l of locales) gelinkt.add(`${basis}/${l}${pad === "/" ? "" : pad}`);
    }
  }
  return paginas
    .filter((p) => !gelinkt.has(p.url.replace(/\/$/, "")))
    .map((p) => ({
      ernst: "waarschuwing" as Ernst,
      soort: "wees",
      url: p.url,
      detail: "staat in de sitemap maar wordt nergens vandaan gelinkt",
    }));
}

/** Alle per-pagina-controles achter elkaar. */
export function auditPagina(pagina: Pagina): Bevinding[] {
  if (pagina.status !== 200) {
    return [
      { ernst: "fout", soort: "status", url: pagina.url, detail: `HTTP ${pagina.status}` },
    ];
  }
  return [
    ...controleerTitelLengte(pagina),
    ...controleerDescriptionLengte(pagina),
    ...controleerH1(pagina),
    ...controleerCanonical(pagina),
    ...controleerRedirect(pagina),
    ...controleerAfbeeldingen(pagina),
    ...controleerAnkers(pagina),
    ...controleerJsonLd(pagina),
  ];
}

/** Alles, inclusief de controles die de hele set nodig hebben. */
export function auditAlles(paginas: Pagina[], basis: string, locales: string[] = []): Bevinding[] {
  return [
    ...paginas.flatMap(auditPagina),
    ...controleerDubbeleTitels(paginas),
    ...controleerDubbeleDescriptions(paginas),
    ...controleerLocaleLozeLinks(paginas, basis, locales),
    ...vindWezen(paginas, basis, locales),
  ];
}

export function telPerErnst(bevindingen: Bevinding[]): Record<Ernst, number> {
  const uit: Record<Ernst, number> = { fout: 0, waarschuwing: 0, notitie: 0 };
  for (const b of bevindingen) uit[b.ernst]++;
  return uit;
}
