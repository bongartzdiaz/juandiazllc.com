import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// BASE_PATH is '/diaz/app' in prod (we sit behind juandiazllc.com's rewrite)
// and empty in dev so local `next dev` on :3100 still works at the root.
// Override with BASE_PATH env var if you want to test the prod config locally.
const BASE_PATH = process.env.BASE_PATH ?? '';

const nextConfig: NextConfig = {
  output: 'standalone',
  basePath: BASE_PATH || undefined,
  assetPrefix: BASE_PATH || undefined,
};

export default withNextIntl(nextConfig);
