import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Red_Hat_Mono } from 'next/font/google'
import './globals.css'
import { ClientLayout } from '@/components/philly/layout/ClientLayout'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'

// Philly sub-app layout — sits under /philly/* inside the brand Next app.
// NO <html>/<body> tags here — that's the brand's root app/layout.tsx job.

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
})
const redHatMono = Red_Hat_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-red-hat-mono',
})

export const metadata: Metadata = {
  title: 'DEUS — LucenAI',
  description: 'CRM and operations platform for real estate and hospitality teams',
}

// Boot script — runs before hydration to set data-theme on <html> from
// localStorage (or OS preference), so the dashboard never flashes light
// before useTheme catches up. Scoped to /philly/* only.
const themeBootScript = `(function(){try{
  var t=localStorage.getItem('pai-theme');
  if(t!=='dark'&&t!=='light'){
    t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
  }
  document.documentElement.setAttribute('data-theme',t);
}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`

export default async function PhillyLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <div className={`philly-root ${jakarta.variable} ${redHatMono.variable}`}>
      <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      <NextIntlClientProvider locale={locale} messages={messages}>
        <ClientLayout>{children}</ClientLayout>
      </NextIntlClientProvider>
    </div>
  )
}
