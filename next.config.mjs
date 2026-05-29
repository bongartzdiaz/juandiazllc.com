import createNextIntlPlugin from 'next-intl/plugin';

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
  experimental: {
    // three removed — the WebGL globe was replaced by a CSS+SVG (d3-geo)
    // globe; three is no longer imported anywhere.
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
};

export default withNextIntl(nextConfig);
