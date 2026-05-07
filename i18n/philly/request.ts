import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

const SUPPORTED_LOCALES = ['en', 'nl', 'de', 'es'] as const
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

function isSupported(value: string | undefined): value is SupportedLocale {
  return value !== undefined && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const raw = cookieStore.get('pai-locale')?.value
  // Fall back to English for unknown / unset cookies. The brand site
  // (app/[locale]/*) is also 4-locale; aligning philly here means a
  // user who landed DE on marketing then logs in keeps a German UI.
  const locale: SupportedLocale = isSupported(raw) ? raw : 'en'
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
