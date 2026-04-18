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
  title: 'Philly Dashboard — Business Platform',
  description: 'CRM and operations platform for impact-driven businesses',
}

export default async function PhillyLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <div className={`philly-root ${jakarta.variable} ${redHatMono.variable}`} data-theme="light">
      <NextIntlClientProvider locale={locale} messages={messages}>
        <ClientLayout>{children}</ClientLayout>
      </NextIntlClientProvider>
    </div>
  )
}
