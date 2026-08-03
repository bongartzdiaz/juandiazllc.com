/* DataForSEO-client.
   ───────────────────────────────────────────────────────────────────────────
   Vervangt Ahrefs als bron voor zoekdata. Ahrefs gaf op 2026-08-03 nog maar
   één bruikbaar getal (Domain Rating, en dat stond op 0.0); élk keyword-,
   rank- en GSC-endpoint antwoordde `Insufficient plan`.

   WAT DIT NIET IS: een vervanging voor Google Search Console. DataForSEO ziet
   de buitenkant — posities, zoekvolumes, backlinks, concurrenten — en schat
   die. GSC ziet jouw echte clicks en zoekopdrachten. Die data is privé voor de
   eigenaar van de property, dus geen enkele derde partij kan erbij. Je hebt ze
   allebei nodig; zie MANUAL_TASKS.md.

   OPZET: alles wat zonder netwerk te toetsen is, staat in pure functies met
   tests (auth-codering, body-vorm, envelop-afhandeling, kostentelling,
   snelheidsbegrenzing). `roep()` is de enige regel die het netwerk raakt.

   API-vorm geverifieerd tegen docs.dataforseo.com op 2026-08-03:
   - POST, body is een JSON-array op topniveau: [ { …taak } ]
   - Basic-auth: base64("login:password"), NIET je accountwachtwoord —
     de API-inloggegevens staan op app.dataforseo.com/api-access
   - één live-taak per verzoek
   - maximaal 12 verzoeken per minuut per account
   ─────────────────────────────────────────────────────────────────────────── */

export const DFS_BASIS = "https://api.dataforseo.com/v3";

/** De endpoints die we gebruiken. Uitbreiden mag; hou de sleutel leesbaar. */
export const DFS_ENDPOINTS = {
  /** Waar rankt dit domein al op? De belangrijkste vraag voor deze site. */
  rankedKeywords: "/dataforseo_labs/google/ranked_keywords/live",
  /** Zoekvolume per zoekwoord, uit Google Ads. */
  searchVolume: "/keywords_data/google_ads/search_volume/live",
  /** Wie rankt er op dezelfde termen? */
  competitors: "/dataforseo_labs/google/competitors_domain/live",
  /** Backlink-samenvatting: het waarschijnlijke gat bij DR 0.0. */
  backlinksSummary: "/backlinks/summary/live",
} as const;

export type DfsEndpoint = keyof typeof DFS_ENDPOINTS;

/** Twaalf verzoeken per minuut = minimaal 5 seconden ertussen. */
export const DFS_MIN_INTERVAL_MS = 5_000;

export type DfsTaak = Record<string, unknown>;

export type DfsResultaat<T = unknown> = {
  ok: boolean;
  /** Kosten in USD van dít verzoek. Altijd rapporteren — dit kost echt geld. */
  kosten: number;
  resultaten: T[];
  /** Leeg wanneer ok. Bevat zowel envelop- als taakfouten, met code. */
  fouten: string[];
};

/**
 * `Authorization`-waarde voor Basic-auth.
 *
 * Bewust een aparte functie: de codering is het enige deel van de auth dat
 * fout kan gaan zonder dat je het ziet, en zo is hij te testen zonder ooit
 * een echt wachtwoord aan te raken.
 */
export function authHeader(login: string, wachtwoord: string): string {
  if (!login || !wachtwoord) {
    throw new Error("DataForSEO: login en wachtwoord zijn allebei verplicht");
  }
  const ruw = `${login}:${wachtwoord}`;
  const base64 = typeof Buffer !== "undefined"
    ? Buffer.from(ruw, "utf8").toString("base64")
    : btoa(unescape(encodeURIComponent(ruw)));
  return `Basic ${base64}`;
}

/**
 * DataForSEO verwacht een array op topniveau, ook bij één taak. Een object
 * eromheen levert `40501 invalid field in POST data` op — een fout die je pas
 * ziet als je hem al betaald hebt.
 */
export function bouwBody(taken: DfsTaak[]): DfsTaak[] {
  if (!Array.isArray(taken) || taken.length === 0) {
    throw new Error("DataForSEO: minstens één taak verplicht");
  }
  return taken;
}

export function bouwUrl(endpoint: DfsEndpoint): string {
  const pad = DFS_ENDPOINTS[endpoint];
  if (!pad) throw new Error(`DataForSEO: onbekend endpoint "${endpoint}"`);
  return `${DFS_BASIS}${pad}`;
}

/**
 * Pelt de envelop af.
 *
 * DataForSEO meldt fouten op twee niveaus, en het bovenste kan 20000 (ok)
 * zijn terwijl de taak eronder faalde. Alleen de bovenste controleren is
 * daarom niet genoeg — dan lijkt een mislukt verzoek geslaagd met nul
 * resultaten, en dat is niet te onderscheiden van "geen data gevonden".
 */
export function parseEnvelop<T = unknown>(json: unknown): DfsResultaat<T> {
  const fouten: string[] = [];
  if (!json || typeof json !== "object") {
    return { ok: false, kosten: 0, resultaten: [], fouten: ["lege of ongeldige respons"] };
  }
  const env = json as {
    status_code?: number;
    status_message?: string;
    cost?: number;
    tasks?: Array<{
      status_code?: number;
      status_message?: string;
      result?: T[] | null;
    }>;
  };

  const kosten = typeof env.cost === "number" ? env.cost : 0;

  // 20000 = "Ok" op envelopniveau.
  if (env.status_code !== 20000) {
    fouten.push(`envelop ${env.status_code ?? "?"}: ${env.status_message ?? "onbekend"}`);
  }

  const resultaten: T[] = [];
  for (const [i, taak] of (env.tasks ?? []).entries()) {
    if (taak.status_code !== 20000) {
      fouten.push(`taak ${i} ${taak.status_code ?? "?"}: ${taak.status_message ?? "onbekend"}`);
      continue;
    }
    if (Array.isArray(taak.result)) resultaten.push(...taak.result);
  }

  return { ok: fouten.length === 0, kosten, resultaten, fouten };
}

/** Leest de inloggegevens uit de omgeving. Waarden worden nooit gelogd. */
export function credentialsUitEnv(): { login: string; wachtwoord: string } | null {
  const login = process.env.DATAFORSEO_LOGIN;
  const wachtwoord = process.env.DATAFORSEO_PASSWORD;
  if (!login || !wachtwoord) return null;
  return { login, wachtwoord };
}

/** Houdt de 12-per-minuut-grens aan over opeenvolgende aanroepen. */
let laatsteAanroep = 0;
export async function wachtOpQuotum(nu: () => number = Date.now, slaap = (ms: number) => new Promise((r) => setTimeout(r, ms))): Promise<number> {
  const verstreken = nu() - laatsteAanroep;
  const wachten = Math.max(0, DFS_MIN_INTERVAL_MS - verstreken);
  if (wachten > 0) await slaap(wachten);
  laatsteAanroep = nu() + wachten;
  return wachten;
}

/** Alleen voor tests: zet de quotumteller terug. */
export function _resetQuotum(): void {
  laatsteAanroep = 0;
}

/**
 * De enige functie die het netwerk raakt. Bewust dun gehouden: al het gedrag
 * dat fout kan gaan zit in de pure functies hierboven, die wél getest zijn.
 */
export async function roep<T = unknown>(
  endpoint: DfsEndpoint,
  taken: DfsTaak[],
  opties: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<DfsResultaat<T>> {
  const cred = credentialsUitEnv();
  if (!cred) {
    return {
      ok: false,
      kosten: 0,
      resultaten: [],
      fouten: ["DATAFORSEO_LOGIN en/of DATAFORSEO_PASSWORD niet gezet"],
    };
  }

  const doeFetch = opties.fetchImpl ?? fetch;
  const afbreken = AbortSignal.timeout(opties.timeoutMs ?? 30_000);

  await wachtOpQuotum();

  let res: Response;
  try {
    res = await doeFetch(bouwUrl(endpoint), {
      method: "POST",
      headers: {
        Authorization: authHeader(cred.login, cred.wachtwoord),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bouwBody(taken)),
      signal: afbreken,
    });
  } catch (e) {
    return { ok: false, kosten: 0, resultaten: [], fouten: [`netwerk: ${(e as Error).message}`] };
  }

  if (!res.ok) {
    return { ok: false, kosten: 0, resultaten: [], fouten: [`HTTP ${res.status}`] };
  }

  return parseEnvelop<T>(await res.json());
}
