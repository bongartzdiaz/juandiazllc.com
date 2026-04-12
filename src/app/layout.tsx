import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Red_Hat_Mono } from 'next/font/google'
import './globals.css'
import { ClientLayout } from '@/components/layout/ClientLayout'

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700', '800'], variable: '--font-jakarta' })
const redHatMono = Red_Hat_Mono({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'], variable: '--font-red-hat-mono' })

export const metadata: Metadata = {
  title: 'Philly Dashboard — Business Platform',
  description: 'CRM and operations platform for impact-driven businesses',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" className={`${jakarta.variable} ${redHatMono.variable}`}>
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
