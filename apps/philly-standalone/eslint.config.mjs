// ESLint v9 flat config — Next 16 dropped `next lint` so the standalone
// runs ESLint directly via `npm run lint`.
//
// Rule selection is deliberately conservative: typecheck (`tsc --noEmit`)
// already catches most real bugs, so lint focuses on stylistic and
// correctness rules that the type system can't see — unused imports,
// stale console.log calls in app code, accidental `any`, etc.
//
// Rules stay at "warn" rather than "error" except for the few that
// indicate near-certain bugs. CI will gate on a strict mode by passing
// `--max-warnings=0` once the warning backlog is at zero.

import nextConfig from 'eslint-config-next'
import nextTypescript from 'eslint-config-next/typescript'
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'

export default [
  // Files / dirs that ESLint should never look at.
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'next-env.d.ts',
      'prisma/migrations/**',
      // Generated Prisma client lives under node_modules/@prisma/client
      // but the postinstall hook can place stubs at the root in some
      // setups; ignore the obvious paths defensively.
      '**/generated/**',
    ],
  },

  // Pull in Next 16's flat configs.
  ...nextConfig,
  ...nextTypescript,
  ...nextCoreWebVitals,

  // Project-specific overrides — start permissive, tighten as the
  // backlog clears. CI can flip to `--max-warnings=0` once existing
  // warnings are at zero; until then `npm run lint` should succeed
  // on a clean tree without failing on legacy code.
  {
    rules: {
      // Catches stale debug logs in UI code; lib/ uses `console` inside
      // its own structured logger so this rule is loosened there below.
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // `any` is sometimes necessary for Prisma's generated types or
      // when bridging an external SDK; keep it as a warning so it
      // surfaces in review without blocking PRs.
      '@typescript-eslint/no-explicit-any': 'warn',

      // Dynamic require() is the only safe way to optionally load
      // Sentry / @prisma/client when env-gated; treat as warning so
      // accidental requires still surface.
      '@typescript-eslint/no-require-imports': 'warn',

      // Unused imports are pure noise; flag them.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // React-specific.
      'react/jsx-key': 'warn',
      'react/no-unescaped-entities': 'warn',

      // Migrating every <a href="/x"> to <Link> is a separate UX pass.
      '@next/next/no-html-link-for-pages': 'warn',

      // The React-Compiler-style rules introduced in eslint-plugin-react-hooks
      // v6 (Next 16's default) are aspirational hints — useful in PR review
      // but blocking the whole tree on them isn't realistic. Downgrade to
      // warning until the codebase has been migrated. Re-tighten later.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/set-state-in-render': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/no-deriving-state-in-effects': 'warn',
      'react-hooks/error-boundaries': 'warn',
      'react-hooks/incompatible-library': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/capitalized-calls': 'warn',
      'react-hooks/component-hook-factories': 'warn',
      'react-hooks/use-memo': 'warn',
      'react-hooks/void-use-memo': 'warn',
      'react-hooks/memoized-effect-dependencies': 'warn',
      'react-hooks/exhaustive-effect-dependencies': 'warn',
      'react-hooks/memo-dependencies': 'warn',
      'react-hooks/unsupported-syntax': 'warn',
    },
  },

  // Server-side library code legitimately uses console.* internally
  // (lib/philly/logger.ts is the structured logger that delegates to
  // console). Don't flag those as warnings.
  {
    files: ['lib/**/*.{ts,tsx}'],
    rules: {
      'no-console': 'off',
    },
  },

  // CLI scripts (prisma seed, audit script) use console.* for output.
  {
    files: ['prisma/**/*.ts', 'scripts/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },

  // Test files lean on `any` and `console` for setup; loosen there.
  {
    files: ['**/*.test.{ts,tsx}'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
]
