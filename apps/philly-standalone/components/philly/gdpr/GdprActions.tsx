'use client'

/* Admin form for data-subject access requests + erasures.
   Posts to /api/admin/gdpr/data-subject-{export,erasure}. */

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useConfirm } from '@/hooks/philly/useConfirm'

type Mode = 'export' | 'erasure'

export function GdprActions() {
  const [mode, setMode] = useState<Mode>('export')
  const [email, setEmail] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const tConfirms = useTranslations('confirms')
  const tCommon = useTranslations('common')
  const confirm = useConfirm()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setFeedback(null)
    try {
      if (mode === 'export') {
        const res = await fetch('/api/admin/gdpr/data-subject-export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, reason: reason || undefined }),
        })
        if (!res.ok) {
          setFeedback({ ok: false, msg: (await res.text()).slice(0, 300) })
          return
        }
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `dsar-${Date.now()}.json`
        a.click()
        URL.revokeObjectURL(url)
        setFeedback({ ok: true, msg: 'Export downloaded.' })
      } else {
        const ok = await confirm({
          title: tConfirms('gdprErase.title', { email }),
          body: tConfirms('gdprErase.body'),
          confirmLabel: tCommon('delete'),
          cancelLabel: tCommon('cancel'),
          danger: true,
        })
        if (!ok) {
          setBusy(false)
          return
        }
        const res = await fetch('/api/admin/gdpr/data-subject-erasure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, reason, confirm: 'ERASE' }),
        })
        const json = await res.json()
        if (!res.ok) {
          setFeedback({ ok: false, msg: json.error ?? 'Erasure failed.' })
          return
        }
        setFeedback({ ok: true, msg: `Erased ${json.totalRows} rows across ${Object.keys(json.rowCounts).length} tables.` })
        setEmail('')
        setReason('')
      }
    } catch (err) {
      setFeedback({ ok: false, msg: err instanceof Error ? err.message : 'Network error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-md border border-zinc-200 p-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('export')}
          className={`rounded px-3 py-1 text-sm ${mode === 'export' ? 'bg-zinc-900 text-white' : 'bg-zinc-100'}`}
        >
          Access request (export)
        </button>
        <button
          type="button"
          onClick={() => setMode('erasure')}
          className={`rounded px-3 py-1 text-sm ${mode === 'erasure' ? 'bg-red-600 text-white' : 'bg-zinc-100'}`}
        >
          Erasure (delete)
        </button>
      </div>

      <label className="block text-sm">
        <span className="block font-medium">Data subject email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1"
          placeholder="subject@example.com"
        />
      </label>

      <label className="block text-sm">
        <span className="block font-medium">
          Reason / ticket reference{' '}
          {mode === 'erasure' && <span className="text-red-600">(required)</span>}
        </span>
        <input
          type="text"
          required={mode === 'erasure'}
          minLength={mode === 'erasure' ? 3 : 0}
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1"
          placeholder="e.g. ticket #1234, requester verified by phone"
        />
      </label>

      <button
        type="submit"
        disabled={busy || !email}
        className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {busy ? 'Working…' : mode === 'export' ? 'Generate export' : 'Erase data'}
      </button>

      {feedback && (
        <p className={`text-sm ${feedback.ok ? 'text-emerald-700' : 'text-red-700'}`}>{feedback.msg}</p>
      )}
    </form>
  )
}
