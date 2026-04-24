'use client'

/* Client-side section gate. Sits inside ProtectedShell and short-circuits
   the render when the current user's dashboardSections allow-list doesn't
   include the section the URL maps to. Admins always pass.

   The REAL enforcement is server-side in requireSection() on every API
   route. This component only prevents loading a page whose data will
   403 — it's a UX layer, not a security layer. Treat it as "don't let
   users see a broken shell for sections they can't use". */

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useMemo } from 'react'
import { useMySections } from '@/hooks/philly/useMySections'
import { hasSection, sectionForPath } from '@/lib/philly/sections'
import { ShieldOff } from 'lucide-react'

export function SectionGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/'
  const { role, dashboardSections, loading } = useMySections()

  const section = useMemo(() => sectionForPath(pathname), [pathname])

  // While /me is still loading, show children — the API layer still
  // protects everything, and blocking render on every navigation would
  // flash a spinner on every page. Once loaded, gate strictly.
  if (loading) return <>{children}</>

  // Unknown path (e.g. /philly/foobar) has no section to check — let
  // it 404 naturally rather than pre-empting with a Forbidden screen.
  if (!section) return <>{children}</>

  if (hasSection({ role, dashboardSections }, section.slug)) {
    return <>{children}</>
  }

  return <ForbiddenScreen slug={section.slug} />
}

function ForbiddenScreen({ slug }: { slug: string }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
      }}
    >
      <div
        style={{
          maxWidth: 440,
          padding: '36px 40px',
          border: '1px solid var(--border)',
          borderRadius: 16,
          background: 'var(--panel)',
          textAlign: 'center',
          boxShadow: 'var(--shadow)',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'var(--r-bg)',
            color: 'var(--r-txt)',
            marginBottom: 20,
          }}
        >
          <ShieldOff size={26} strokeWidth={2} />
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 10 }}>
          Section not available
        </h1>
        <p style={{ fontSize: 14, color: 'var(--txt2)', lineHeight: 1.55, marginBottom: 24 }}>
          Your account doesn&apos;t have access to <code
            style={{ padding: '1px 6px', background: 'var(--bg2)', borderRadius: 4, fontSize: 12 }}
          >{slug}</code>. Ask an admin to enable it in Settings &rarr; Users.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '10px 18px',
            background: 'var(--accent)',
            color: '#fff',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
