// juandiazllc.com — de marketingsite. Het CRM dat hier onder /philly/* stond
// is verhuisd naar bongartzdiaz/DEUS-SHARED en in PR #134 verwijderd; Supabase
// blijft over voor de leadopvang (contact, nieuwsbrief) en voor auth.
//
// De next-intl-plugin die hier stond bediende uitsluitend het CRM: hij wees
// naar ./i18n/philly/request.ts en las messages/*.json, inclusief een
// phily-en.json. De marketingsite vertaalt via lib/i18n/dict.ts en useT(),
// niet via next-intl — er stond nergens een useTranslations().

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  devIndicators: false,
  // Pin the workspace root: multiple lockfiles (worktree + parent) made Next
  // guess the root, which can mis-trace files for the build output. This
  // repo's own dir is the correct root.
  turbopack: { root: import.meta.dirname },
  experimental: {
    // three is still used by components/LoginScene.tsx via a dynamic
    // import("three") for the WebGL login background — code-split to the
    // /login route only, so it never ships on marketing pages.
    // lucide-react en recharts stonden hier ook in; die zaten alleen in het
    // CRM en zijn met de dependencies mee verdwenen.
    optimizePackageImports: ['three'],
  },
};

export default nextConfig;
