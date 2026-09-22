import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    include: ["**/*.test.ts", "**/*.test.tsx"],
    // "node_modules/**" matcht alleen de wortel. Een untracked werkmap met een
    // eigen node_modules (diaz-editor-gtm/reel-remotion) liet daardoor zod's
    // volledige testsuite meedraaien: drie bestanden faalden permanent en het
    // totaal telde honderden tests van een ander project mee. Beide kanten van
    // die meting waren onjuist.
    // supabase/functions/** is Deno: https-imports en Deno.test. Node's ESM-
    // loader weigert een https-specifier, dus vitest zou elk Deno-testbestand
    // als FAIL tellen. Die draaien met `deno test --no-lock supabase/functions`.
    exclude: ["**/node_modules/**", ".next/**", "preview/**", ".claude/**", "supabase/functions/**"],
    environment: "node",
    // GEMETEN, 2026-09-22, niet gekozen op gevoel.
    //
    // De standaard is 5000 ms, en die stond er — hij is nooit gekozen. Op een
    // stille machine was de traagste test 1666 ms (i18n/server-acties), dus
    // drie volle runs achter elkaar waren groen. Met drie gelijktijdige
    // vitest-processen viel er prompt een om met `Test timed out in 5000ms`,
    // elke run een andere. Dat meet de machine, niet de code. Zie
    // [[feedback_verify_the_measuring_stick]].
    //
    // De kosten zaten in de poorten zelf: veertien lopen de bronboom af en
    // lazen dezelfde 244 bestanden (2,0 MiB) opnieuw bij ELKE `it()`. Dat is
    // weggenomen met `leesBron` in lib/bronscan.ts en de traagste test staat
    // nu op 670 ms — maar dat alleen is niet genoeg, en dat is nagemeten:
    //
    //   3 gelijktijdige runs, 5000 ms  ->  3x groen (was: 1 faler)
    //   6 gelijktijdige runs, 5000 ms  ->  29 timeouts over 6 runs
    //   6 gelijktijdige runs, deze grens -> 6x groen, 0 timeouts
    //
    // De lezing verlegt de drempel dus, hij haalt hem niet weg. Dit is het
    // tweede slot: 30x de gemeten worst case, zodat een bezette machine geen
    // rood meldt terwijl een werkelijk hangende test binnen twintig seconden
    // nog steeds faalt. lib/bronscan-lezen.test.ts houdt beide sloten vast.
    testTimeout: 20000,
  },
});
