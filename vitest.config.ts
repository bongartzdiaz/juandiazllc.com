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
  },
});
