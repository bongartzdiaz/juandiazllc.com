// lint-staged configuration — runs on every git commit via the
// .husky/pre-commit hook. Goal: catch lint errors locally before they
// burn a CI cycle. Fast (<10s typical) so commits stay snappy.
//
// Why only standalone? The root tree has no working ESLint config:
// Next 16 removed `next lint` and no eslint.config.* file exists at
// root. Adding one is out of Task-4 scope. Once root grows an ESLint
// config, add a `'!(apps)/**/*.{ts,tsx,js,mjs}': 'eslint --fix'` rule
// alongside the standalone block below.
//
// Root tree coverage comes from .husky/pre-push (typecheck + tests),
// which catches the higher-impact failures even without lint.

const { existsSync } = require('node:fs');

const STANDALONE_HAS_NODE_MODULES = existsSync('apps/philly-standalone/node_modules');

module.exports = {
  // Standalone tree: run its own eslint config from inside the standalone.
  // Strip the apps/philly-standalone/ prefix so eslint resolves paths
  // relative to the standalone cwd. Skipped silently if the standalone's
  // node_modules aren't installed (a dev who only works in root shouldn't
  // be blocked from committing root changes).
  'apps/philly-standalone/**/*.{ts,tsx,js,mjs}': (files) => {
    if (!STANDALONE_HAS_NODE_MODULES) return [];
    const stripped = files
      .map((f) => f.replace(/^.*apps\/philly-standalone\//, ''))
      .map((f) => `"${f}"`)
      .join(' ');
    return [`bash -c "cd apps/philly-standalone && npx eslint --fix ${stripped}"`];
  },
};
