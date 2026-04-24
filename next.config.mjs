import createNextIntlPlugin from 'next-intl/plugin';
import createBundleAnalyzer from '@next/bundle-analyzer';

// Opt-in bundle-size inspection. Runs only when `ANALYZE=true` is set.
// NOTE: @next/bundle-analyzer is webpack-only and does not emit a
// report under Turbopack (which our default `npm run build` uses).
// To get a report, run `npm run analyze` which drops --turbopack
// and routes through webpack specifically for this analysis path.
// When Turbopack's first-party analyzer matures (`next
// experimental-analyze`), swap this over.
const withBundleAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false,
});

// juandiazllc.com — gemergde monorepo: brand + Philly CRM onder /philly/*
// in één Next-app. Eén build, één deploy, één Vercel-project. Supabase
// blijft voor brand-auth en -data, Prisma+MariaDB+NextAuth voor Philly.
// Zie /middleware.ts voor de scope-routing naar /philly/*.

const withNextIntl = createNextIntlPlugin('./i18n/philly/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  devIndicators: false,
  images: {
    // Prefer AVIF then fall back to WebP — ~40% smaller than JPEG.
    formats: ['image/avif', 'image/webp'],
  },
  compiler: {
    // Strip console.* in prod builds (keeps error + warn for Sentry).
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },
  experimental: {
    // Tree-shake icon libs and heavy geo deps at build time. `three`
    // still used by LoginScene via dynamic import; d3-geo + topojson
    // added for the SVG globe on the marketing hero.
    optimizePackageImports: ['three', 'lucide-react', 'recharts', 'd3-geo', 'topojson-client'],
  },
  async headers() {
    return [
      {
        // The world atlas topojson is a static 108KB asset the Globe
        // fetches on mount. Immutable cache lets browsers + CDN pin
        // it for a year; we version by filename when we ever swap it.
        source: '/world-110m.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default withNextIntl(withBundleAnalyzer(nextConfig));
