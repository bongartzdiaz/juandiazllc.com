import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Red_Hat_Mono } from 'next/font/google'
import './globals.css'
import { ClientLayout } from '@/components/philly/layout/ClientLayout'
import { SentryBootstrap } from '@/components/philly/SentryBootstrap'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'

// Standalone root layout — owns <html>/<body>. In the parent monorepo
// this file was a nested layout under /philly/* and deferred those
// tags to the brand root. Here, it's the root.

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
  // Customer-facing brand 2026-05-26 rebrand: DEUS sold via lucenai.eu.
  // Internal identifiers (className 'philly-root', localStorage 'pai-theme',
  // file paths under lib/philly/*) deliberately unchanged here — those
  // belong to the PR-Extract phase-5 internal rename, not the customer
  // branding pass. See memory/deus_extraction_plan.md.
  title: 'DEUS — Modern European CRM',
  description: 'Real estate, CSR and hospitality CRM for European agencies. GDPR-native. AI included. Flat per-org pricing.',
}

// Boot script — runs before hydration to set data-theme on <html> from
// localStorage (or OS preference), so the dashboard never flashes light
// before useTheme catches up.
const themeBootScript = `(function(){try{
  var t=localStorage.getItem('pai-theme');
  if(t!=='dark'&&t!=='light'){
    t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
  }
  document.documentElement.setAttribute('data-theme',t);
}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} className={`philly-root ${jakarta.variable} ${redHatMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ClientLayout>{children}</ClientLayout>
        </NextIntlClientProvider>
        <SentryBootstrap />
      </body>
    </html>
  )
}
