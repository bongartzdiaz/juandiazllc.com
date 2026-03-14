import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700', '800'], variable: '--font-jakarta' })
const jetMono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-jet-mono' })

export const metadata: Metadata = {
  title: 'HMB Energy Ops',
  description: 'Marketing operations dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" data-theme="light" className={`${jakarta.variable} ${jetMono.variable}`}>
      <body>
        <div style={{ display: 'flex', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
          <Sidebar />
          <main style={{ marginLeft: 230, flex: 1, display: 'flex', flexDirection: 'column' }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
