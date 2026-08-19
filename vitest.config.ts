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
    exclude: ["**/node_modules/**", ".next/**", "preview/**", ".claude/**"],
    environment: "node",
  },
});
