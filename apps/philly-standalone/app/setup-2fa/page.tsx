'use client'

/* /setup-2fa — three-step TOTP enrollment wizard.

   Step 1: Generate a fresh secret + QR. User scans with
           Google Authenticator / 1Password / Authy / etc.
   Step 2: User enters the 6-digit code their app shows. We
           verify; on success we flip twoFactorEnabled + return
           recovery codes.
   Step 3: We display the 10 recovery codes once. User downloads
           or copies them; we never show them again.

   Admin role + mandatory-admin-2FA: hitting any /api/admin
   endpoint without 2FA returns 409 NEEDS_2FA, which the dashboard
   layout reads and redirects here. After step 3, admin lands back
   on the dashboard. */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

type Step = 'init' | 'verify' | 'codes' | 'done'

interface SetupResponse {
  secret: string
  otpauthUri: string
  qrDataUrl: string
}

export default function Setup2FAPage() {
  const t = useTranslations('setup2fa')
  const router = useRouter()
  const [step, setStep] = useState<Step>('init')
  const [setupData, setSetupData] = useState<SetupResponse | null>(null)
  const [code, setCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startSetup = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/2fa/setup', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? t('errors.startFailed'))
        return
      }
      setSetupData(json)
      setStep('verify')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.network'))
    } finally {
      setBusy(false)
    }
  }, [t])

  // Auto-start the flow on mount; admins arriving here have a
  // single click experience: scan QR, type code, save codes, done.
  useEffect(() => {
    void startSetup()
  }, [startSetup])

  const submitVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^\d{6}$/.test(code) || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? t('errors.verifyFailed', { status: res.status }))
        return
      }
      setRecoveryCodes(json.recoveryCodes ?? [])
      setStep('codes')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.network'))
    } finally {
      setBusy(false)
    }
  }

  const finish = () => {
    setStep('done')
    router.replace('/')
  }

  return (
    <main style={{ maxWidth: 520, margin: '40px auto', padding: '0 20px' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{t('title')}</h1>
        <p style={{ color: 'var(--txt3)', fontSize: 13, lineHeight: 1.5 }}>
          {t('intro')}
        </p>
      </header>

      {step === 'init' && (
        <p style={{ fontSize: 13, color: 'var(--txt3)' }}>{t('init.starting')}</p>
      )}

      {step === 'verify' && setupData && (
        <section
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 20,
          }}
        >
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
            {t('step1.title')}
          </h2>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            {/* QR is a data: URL produced server-side, so this is
                 safe to embed without external network. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={setupData.qrDataUrl} alt={t('step1.qrAlt')} width={240} height={240} />
          </div>
          <details style={{ marginBottom: 18 }}>
            <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--txt3)' }}>
              {t('step1.manualToggle')}
            </summary>
            <code
              style={{
                display: 'block',
                marginTop: 8,
                padding: '8px 12px',
                background: 'var(--bg2)',
                borderRadius: 6,
                fontSize: 13,
                wordBreak: 'break-all',
                userSelect: 'all',
              }}
            >
              {setupData.secret}
            </code>
          </details>

          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
            {t('step2.title')}
          </h2>
          <form onSubmit={submitVerify} style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\s+/g, ''))}
              placeholder="123456"
              disabled={busy}
              autoFocus
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                fontSize: 18,
                fontFamily: 'var(--font-red-hat-mono), monospace',
                letterSpacing: '0.18em',
                textAlign: 'center',
              }}
            />
            <button
              type="submit"
              disabled={busy || !/^\d{6}$/.test(code)}
              style={{
                padding: '10px 18px',
                borderRadius: 8,
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                cursor: busy || !/^\d{6}$/.test(code) ? 'default' : 'pointer',
                opacity: busy || !/^\d{6}$/.test(code) ? 0.5 : 1,
              }}
            >
              {busy ? t('verify.busy') : t('verify.button')}
            </button>
          </form>

          {error && (
            <p
              role="alert"
              style={{
                marginTop: 12,
                padding: '8px 12px',
                background: 'var(--r-bg)',
                color: 'var(--r-txt)',
                border: '1px solid var(--r-border)',
                borderRadius: 7,
                fontSize: 12,
              }}
            >
              {error}
            </p>
          )}
        </section>
      )}

      {step === 'codes' && (
        <section
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 20,
          }}
        >
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
            {t('step3.title')}
          </h2>
          <p style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 14 }}>
            {t.rich('step3.description', {
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>
          <div
            style={{
              padding: '12px 14px',
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontFamily: 'var(--font-red-hat-mono), monospace',
              fontSize: 13,
              lineHeight: 1.8,
              userSelect: 'all',
              marginBottom: 16,
            }}
          >
            {recoveryCodes.map((c) => (
              <div key={c}>{c}</div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => navigator.clipboard.writeText(recoveryCodes.join('\n')).catch(() => {})}
              style={{
                padding: '8px 14px',
                borderRadius: 7,
                background: 'var(--bg2)',
                color: 'var(--txt2)',
                border: '1px solid var(--border)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t('step3.copyAll')}
            </button>
            <button
              onClick={() => {
                const blob = new Blob([recoveryCodes.join('\n')], { type: 'text/plain' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'philly-2fa-recovery-codes.txt'
                a.click()
                URL.revokeObjectURL(url)
              }}
              style={{
                padding: '8px 14px',
                borderRadius: 7,
                background: 'var(--bg2)',
                color: 'var(--txt2)',
                border: '1px solid var(--border)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t('step3.download')}
            </button>
            <button
              onClick={finish}
              style={{
                marginLeft: 'auto',
                padding: '8px 16px',
                borderRadius: 7,
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t('step3.done')}
            </button>
          </div>
        </section>
      )}
    </main>
  )
}
