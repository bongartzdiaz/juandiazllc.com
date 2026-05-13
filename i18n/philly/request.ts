import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

// Bundle DL — root /philly now supports en / nl / de / es to match
// the standalone (and the marketing-site dict). Cookie value
// `pai-locale` selects the active locale; anything unrecognised
// falls back to en. Shared namespaces with the standalone use the
// translated strings copied from apps/philly-standalone/messages/;
// root-only namespaces (dripCampaigns, marketAnalytics, notifications,
// audit, documents, rooms, settings, templates, actionPlans,
// transactions, leadScores, scoringRules, leadRouting, soi, cma,
// clientPortal) currently fall back to English in de/es — fill
// progressively via /writing or DeepL passthrough.
const SUPPORTED = ['en', 'nl', 'de', 'es'] as const
type Supported = (typeof SUPPORTED)[number]

function isSupported(s: string | undefined): s is Supported {
  return s != null && (SUPPORTED as readonly string[]).includes(s)
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const raw = cookieStore.get('pai-locale')?.value
  const locale: Supported = isSupported(raw) ? raw : 'en'
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
