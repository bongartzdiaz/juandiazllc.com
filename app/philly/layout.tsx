import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Red_Hat_Mono } from 'next/font/google'
import './globals.css'
import { ClientLayout } from '@/components/philly/layout/ClientLayout'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700', '800'], variable: '--font-jakarta' })
const redHatMono = Red_Hat_Mono({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'], variable: '--font-red-hat-mono' })

export const metadata: Metadata = {
  title: 'Philly Dashboard — Business Platform',
  description: 'CRM and operations platform for impact-driven businesses',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192.svg',
    apple: '/icon-192.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Philly',
  },
}

export const viewport = {
  themeColor: '#0D7377',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

// Runs synchronously in the document head before React hydrates so the
// persisted theme is applied before first paint. Without this, the page
// flashes the light theme on dark-mode users (FOUC).
const themeBootScript = `
(function(){
  try {
    var t = localStorage.getItem('pai-theme');
    if (t !== 'light' && t !== 'dark') {
      t = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', t);
  } catch (e) { /* localStorage unavailable — fall through to default */ }
})();
`

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} data-theme="light" className={`${jakarta.variable} ${redHatMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ClientLayout>{children}</ClientLayout>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
