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
  // optimizePackageImports stond hier met three, lucide-react en recharts.
  // lucide-react en recharts hoorden bij het CRM (#137); three werd alleen
  // gebruikt door components/LoginScene.tsx, de WebGL-achtergrond van de
  // inlogpagina, en is met die pagina meegegaan. Er blijft niets te
  // optimaliseren over, dus het blok is weg in plaats van leeg.
};

export default nextConfig;
