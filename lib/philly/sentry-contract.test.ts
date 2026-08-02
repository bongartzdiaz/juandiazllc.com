import { describe, it, expect } from "vitest";

/* ---------------------------------------------------------------
   Contracttest op @sentry/node
   ---------------------------------------------------------------
   WAAROM DIT BESTAAT

   lib/philly/sentry.ts en lib/philly/observability.ts importeren
   @sentry/node niet op typeniveau. Ze declareren allebei een eigen
   structurele `SentryLike`-vorm en laden de module via require() in een
   try/catch, waarna elke aanroep zijn fouten inslikt.

   Dat is bewust — de app moet draaien zonder Sentry — maar het heeft een
   prijs: TypeScript kan een hernoemde of verdwenen Sentry-API niet zien.
   Een major-upgrade zou dus stil breken. `tsc` blijft groen, de tests
   blijven groen (die testen alleen het uitgeschakelde pad, want ze
   verwijderen SENTRY_DSN), en het gaat pas stuk in productie — op het moment
   dat je juist wél wilt weten wat er misging.

   Deze test controleert daarom of de echte, geïnstalleerde @sentry/node de
   functies bevat waar onze twee wrappers structureel van uitgaan. Hij mockt
   niets: een mock zou de mock testen, niet het pakket.

   Faalt hij na een upgrade, dan wijst hij precies de naam aan die is
   veranderd — in plaats van dat je het over een week uit een lege
   foutmelding moet afleiden.
   --------------------------------------------------------------- */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const sentry = require("@sentry/node") as Record<string, unknown>;

// De functies waar lib/philly/sentry.ts op leunt (SentryLike aldaar).
const WRAPPER_API = [
  "init",
  "captureException",
  "captureMessage",
  "setUser",
  "addBreadcrumb",
  "flush",
] as const;

// De functies waar lib/philly/observability.ts op leunt. startSpan draagt de
// hele SLO-instrumentatie (SLO.LOGIN, SLO.CREATE_DEAL, SLO.AI_ACTION) en is
// bij een OTel-major het meest waarschijnlijke slachtoffer van een rename.
const SPAN_API = ["startSpan", "captureException"] as const;

describe("@sentry/node — contract met lib/philly/sentry.ts", () => {
  it.each(WRAPPER_API)("exporteert %s als functie", (naam) => {
    expect(typeof sentry[naam]).toBe("function");
  });
});

describe("@sentry/node — contract met lib/philly/observability.ts", () => {
  it.each(SPAN_API)("exporteert %s als functie", (naam) => {
    expect(typeof sentry[naam]).toBe("function");
  });

  it("startSpan neemt (opts, callback) — twee parameters", () => {
    // Onze wrapper roept startSpan({name, op, attributes}, cb) aan. Een major
    // die dit naar een andere vorm brengt (bijvoorbeeld één options-object of
    // een curried variant) verandert de arity, en dan klopt onze aanroep niet
    // meer. Dit is een grove maar goedkope indicator.
    expect((sentry.startSpan as (...a: unknown[]) => unknown).length).toBe(2);
  });

  it("startSpan geeft terug wat de callback teruggeeft", () => {
    // De belofte waar withSpan volledig op steunt: "The returned value is
    // exactly whatever the inner fn returned." Breekt die, dan geven alle
    // ingepakte functies stilletjes iets anders terug dan hun aanroeper
    // verwacht — zonder foutmelding.
    const startSpan = sentry.startSpan as (
      opts: Record<string, unknown>,
      cb: (span: unknown) => unknown,
    ) => unknown;
    const uit = startSpan({ name: "contracttest" }, () => "doorgegeven");
    expect(uit).toBe("doorgegeven");
  });
});
