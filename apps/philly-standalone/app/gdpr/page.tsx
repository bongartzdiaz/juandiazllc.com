/* Admin GDPR control panel. Renders the Records of Processing
   Activities (lib/gdpr/ropa.ts) and links to the data-subject
   workflows. Server component — no live data fetching, just the
   static RoPA. */

import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/philly/auth-helpers'
import { PROCESSING_ACTIVITIES } from '@/lib/gdpr/ropa'
import { GdprActions } from '@/components/philly/gdpr/GdprActions'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function GdprAdminPage() {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) {
    // Non-admins are bounced back to the dashboard rather than seeing
    // a JSON 403. The route handler still returns 403 to API clients.
    redirect('/')
  }

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">GDPR &amp; Privacy</h1>
        <p className="text-sm text-zinc-500">
          Data-subject rights, processing register, and proof-of-erasure log.
          This page is the controller-side view; it never displays personal
          data of the data subjects whose rights it administers.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Data-subject rights (Art. 15 &amp; 17)</h2>
        <GdprActions />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Records of Processing Activities (Art. 30)</h2>
        <p className="text-sm text-zinc-500">
          Living register, kept as code at <code>lib/gdpr/ropa.ts</code> so it
          is reviewed in pull requests alongside the implementation.
        </p>
        <ul className="space-y-4">
          {PROCESSING_ACTIVITIES.map((a) => (
            <li key={a.id} className="rounded-md border border-zinc-200 p-4">
              <header className="mb-2">
                <h3 className="font-medium">{a.name}</h3>
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Lawful basis: {a.lawfulBasis.replace(/_/g, ' ')}
                </p>
              </header>
              <p className="text-sm">{a.description}</p>
              <dl className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                <div>
                  <dt className="font-medium">Data subjects</dt>
                  <dd>{a.dataSubjects.join(', ')}</dd>
                </div>
                <div>
                  <dt className="font-medium">Data categories</dt>
                  <dd>{a.dataCategories.join(', ')}</dd>
                </div>
                <div>
                  <dt className="font-medium">Recipients</dt>
                  <dd>{a.recipients.join(', ') || 'None'}</dd>
                </div>
                <div>
                  <dt className="font-medium">Retention</dt>
                  <dd>{a.retentionPolicy}</dd>
                </div>
                {a.thirdCountryTransfers.length > 0 && (
                  <div className="sm:col-span-2">
                    <dt className="font-medium">Third-country transfers</dt>
                    <dd>
                      {a.thirdCountryTransfers
                        .map((t) => `${t.country} (${t.safeguard.toUpperCase()})`)
                        .join('; ')}
                    </dd>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <dt className="font-medium">Security measures</dt>
                  <dd>
                    <ul className="list-disc pl-5">
                      {a.securityMeasures.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
