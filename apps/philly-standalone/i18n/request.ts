import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

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
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
