'use client'

/* Onboarding — shown to a Supabase-authenticated user who has no
   Philly User row yet. They either create their own organization
   (and become its admin) or wait for an admin to invite them.

   Server-side guard: routes that need an org call requireScope(),
   which returns 409 NEEDS_ONBOARDING if the user lands somewhere
   else first; client-side, the dashboard layout polls
   /api/onboarding/status and redirects here when needed. */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Status {
  needsOnboarding: boolean
  organizationId?: string
  email?: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const [status, setStatus] = useState<Status | null>(null)
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/onboarding/status', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: Status) => {
        if (cancelled) return
        setStatus(data)
        if (!data.needsOnboarding) {
          router.replace('/')
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to check onboarding status')
      })
    return () => {
      cancelled = true
    }
  }, [router])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/onboarding/create-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          displayName: displayName || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to create organization')
        return
      }
      router.replace('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setBusy(false)
    }
  }

  if (!status) {
    return (
      <main className="mx-auto max-w-md p-8">
        <p className="text-sm text-zinc-500">Loading…</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-md p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Welcome</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Signed in as <strong>{status.email}</strong>. To start using the
          CRM you need an organization. You can create your own (you become
          its admin), or wait for an existing admin to invite you.
        </p>
      </header>

      <form onSubmit={submit} className="space-y-4 rounded-md border border-zinc-200 p-4">
        <h2 className="font-medium">Create a new organization</h2>

        <label className="block text-sm">
          <span className="block font-medium">Organization name</span>
          <input
            type="text"
            required
            minLength={2}
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-300 px-2 py-1"
            placeholder="Acme Inc."
          />
        </label>

        <label className="block text-sm">
          <span className="block font-medium">Your display name (optional)</span>
          <input
            type="text"
            maxLength={120}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-300 px-2 py-1"
            placeholder="Jane Doe"
          />
        </label>

        <button
          type="submit"
          disabled={busy || name.length < 2}
          className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {busy ? 'Creating…' : 'Create organization'}
        </button>

        {error && <p className="text-sm text-red-700">{error}</p>}
      </form>

      <p className="text-xs text-zinc-500">
        Already invited to an organization? Just sign out and sign back in
        once your admin has created your account — you will land in their
        organization automatically.
      </p>
    </main>
  )
}
