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
    // three is still used by components/LoginScene.tsx via a dynamic
    // import("three") for the WebGL login background — code-split to the
    // /login route only, so it never ships on marketing pages.
    optimizePackageImports: ['three', 'lucide-react', 'recharts'],
  },
};

export default withNextIntl(nextConfig);
