// Tailwind v4 PostCSS bridge for the standalone app.
//
// app/globals.css uses `@import "tailwindcss"` (the v4 way — no @tailwind
// directives, no JS config). Next.js's CSS pipeline picks up this config
// automatically and runs the plugin.
//
// This file exists at the monorepo root too. It's duplicated here so the
// standalone is self-contained when extracted to its mirror repo
// (DEUS-SHARED). Without this file, `npm run build` fails at
// app/globals.css:1 with "Can't resolve 'tailwindcss'".
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
