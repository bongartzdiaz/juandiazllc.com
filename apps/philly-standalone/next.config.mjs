// Philly CRM — standalone Next.js config. Extracted from the parent
// juandiazllc.com monorepo; no locale routing, no marketing bundle
// optimizations, just what the CRM needs to run.

import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  devIndicators: false,
  // Note: running `npm run build` inside this dir will print a harmless
  // warning about multiple lockfiles (this app's + the parent monorepo's).
  // That's expected: this standalone lives inside the parent repo as a
  // mirrored extraction. The warning doesn't affect correctness.
  // Pinning turbopack.root here broke module resolution, so we accept
  // the warning until moved to its own repo.
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },
};

export default withNextIntl(nextConfig);
