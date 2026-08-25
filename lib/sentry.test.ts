import { describe, it, expect, vi, afterEach } from "vitest";

/* Een gezette SENTRY_DSN is geen werkende Sentry.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * AANLEIDING. Gemeten op productie (`juandiazllc-com`, 2026-08-25) stond
 * `SENTRY_DSN` op de letterlijke tekst `optional`. Het runtime-log toonde
 * `Invalid Sentry Dsn: optional`. Dat leest als één verkeerde
 * omgevingsvariabele, maar de schade zat in de code eronder.
 *
 * `initSentry()` ving de worp op en waarschuwde. Daarna controleerde élke
 * capture-functie alleen `!process.env.SENTRY_DSN` — en `"optional"` is
 * truthy, dus die guard liet ze door naar een NIET-GEÏNITIALISEERDE client,
 * waar hun eigen lege `catch` ze opslokte. `isSentryEnabled()` gaf al die tijd
 * `true` terug.
 *
 * DE OMVANG. `instrumentation.ts:onRequestError` is Next 16's foutenhaak:
 * elke onafgevangen render- of routefout op de Node-runtime gaat naar
 * `captureException`. Die hele weg lag stil, en niets meldde het.
 *
 * DE REGEL DIE DEZE POORT BEWAAKT. Een DSN die gezet maar onbruikbaar is,
 * gedraagt zich exact als een ongezette: uit, en luid. Nooit als een werkende.
 * De guard is daarom `active` — of de init werkelijk slaagde — en nooit de
 * omgevingsvariabele.
 *
 * WAAROM EEN INJECTIE-NAAD. `initSentry(injected?)` neemt een neptclient aan,
 * zodat de toestandsmachine te meten is zonder `@sentry/node` te laden. Zonder
 * die naad zou een test die "er is niets verstuurd" beweert net zo goed kunnen
 * slagen doordat de module niet resolvet — een lege uitkomst uit een kapot
 * instrument leest hetzelfde als een schone meting. De teller op de nepclient
 * is de positieve controle: bij een geldige DSN MOET er wél iets aankomen.
 */

type Call = { fn: string; args: unknown[] };

function fakeClient(opts: { throwOnInit?: boolean } = {}) {
  const calls: Call[] = [];
  const rec =
    (fn: string) =>
    (...args: unknown[]) => {
      calls.push({ fn, args });
      if (fn === "init" && opts.throwOnInit) throw new Error("Invalid Sentry Dsn");
      return "";
    };
  return {
    calls,
    client: {
      init: rec("init"),
      captureException: rec("captureException"),
      captureMessage: rec("captureMessage"),
      setUser: rec("setUser"),
      addBreadcrumb: rec("addBreadcrumb"),
      flush: async (...a: unknown[]) => {
        calls.push({ fn: "flush", args: a });
        return true;
      },
    },
  };
}

/** Verse modulestaat per geval: `initialized`/`active` staan op moduleniveau. */
async function load(dsn: string | undefined) {
  vi.resetModules();
  if (dsn === undefined) delete process.env.SENTRY_DSN;
  else process.env.SENTRY_DSN = dsn;
  return import("./sentry");
}

const ORIGINAL = process.env.SENTRY_DSN;
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.SENTRY_DSN;
  else process.env.SENTRY_DSN = ORIGINAL;
  vi.restoreAllMocks();
});

describe("dsnLooksUsable", () => {
  // Structureel en niet één regex over de hele string: een zelfgehoste Sentry
  // kan achter een padvoorvoegsel zitten en de oude vorm draagt een secret na
  // de publieke sleutel. Allebei moeten blijven werken.
  const bruikbaar = [
    ["modern", "https://abc123def@o4507.ingest.sentry.io/4508"],
    ["oude vorm met secret", "https://publiek:geheim@sentry.io/1"],
    ["zelfgehost met padvoorvoegsel", "https://sleutel@sentry.intern.nl/pad/42"],
    ["http, zelfgehost in een LAN", "http://sleutel@10.0.0.5:9000/7"],
  ] as const;

  const onbruikbaar = [
    ["de plaatsaanduiding die op productie stond", "optional"],
    ["losse tekst", "zet dit nog een keer"],
    ["geen publieke sleutel", "https://o4507.ingest.sentry.io/4508"],
    ["geen project-id", "https://sleutel@sentry.io/"],
    ["verkeerd protocol", "ftp://sleutel@sentry.io/1"],
    ["leeg", ""],
  ] as const;

  it.each(bruikbaar)("accepteert %s", async (_naam, dsn) => {
    const { dsnLooksUsable } = await load(undefined);
    expect(dsnLooksUsable(dsn)).toBe(true);
  });

  it.each(onbruikbaar)("weigert %s", async (_naam, dsn) => {
    const { dsnLooksUsable } = await load(undefined);
    expect(dsnLooksUsable(dsn)).toBe(false);
  });
});

describe("initSentry — de guard is `active`, niet de omgevingsvariabele", () => {
  const GELDIG = "https://abc123def@o4507.ingest.sentry.io/4508";

  it("meldt aan én levert af bij een geldige DSN (positieve controle)", async () => {
    const { calls, client } = fakeClient();
    const m = await load(GELDIG);
    m.initSentry(client);

    expect(m.isSentryEnabled()).toBe(true);
    expect(calls.filter((c) => c.fn === "init")).toHaveLength(1);
    expect((calls[0].args[0] as Record<string, unknown>).dsn).toBe(GELDIG);

    m.captureException(new Error("x"));
    m.captureMessage("y");
    m.setSentryUser({ id: "1" });
    await m.flushSentry();
    expect(calls.map((c) => c.fn)).toEqual([
      "init",
      "captureException",
      "captureMessage",
      "setUser",
      "flush",
    ]);
  });

  it("is stil en uit als SENTRY_DSN niet gezet is", async () => {
    const { calls, client } = fakeClient();
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const m = await load(undefined);
    m.initSentry(client);

    expect(m.isSentryEnabled()).toBe(false);
    expect(calls).toHaveLength(0);
    expect(err).not.toHaveBeenCalled();
  });

  it("behandelt een DSN van alleen spaties als ongezet", async () => {
    const { calls, client } = fakeClient();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const m = await load("   ");
    m.initSentry(client);
    expect(m.isSentryEnabled()).toBe(false);
    expect(calls).toHaveLength(0);
  });

  // DE REGRESSIETEST. Precies de productiestand van 2026-08-25.
  it("blijft UIT bij een onbruikbare DSN, en zegt het luid", async () => {
    const { calls, client } = fakeClient();
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const m = await load("optional");
    m.initSentry(client);

    expect(m.isSentryEnabled()).toBe(false);
    expect(calls).toHaveLength(0); // init is niet eens geprobeerd

    m.captureException(new Error("een echte serverfout"));
    m.captureMessage("ook dit");
    m.setSentryUser({ id: "1" });
    await m.flushSentry();
    expect(calls).toHaveLength(0); // en niets glipt langs de guard

    expect(err).toHaveBeenCalledTimes(1);
    const tekst = String(err.mock.calls[0][0]);
    expect(tekst).toContain("stays OFF");
    // De DSN zelf hoort niet in het log te belanden.
    expect(tekst).not.toContain("optional");
  });

  // De tweede manier waarop `active` false hoort te blijven: de DSN ziet er
  // goed uit, maar de client weigert hem alsnog.
  it("blijft UIT als init zelf gooit", async () => {
    const { calls, client } = fakeClient({ throwOnInit: true });
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const m = await load(GELDIG);
    m.initSentry(client);

    expect(m.isSentryEnabled()).toBe(false);
    m.captureException(new Error("x"));
    expect(calls.map((c) => c.fn)).toEqual(["init"]); // alleen de mislukte init
    expect(err).toHaveBeenCalledTimes(1);
  });

  it("initialiseert hooguit één keer", async () => {
    const { calls, client } = fakeClient();
    const m = await load(GELDIG);
    m.initSentry(client);
    m.initSentry(client);
    expect(calls.filter((c) => c.fn === "init")).toHaveLength(1);
  });
});
