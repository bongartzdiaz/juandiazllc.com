'use client'

import { useState } from 'react'
import { Topbar } from '@/components/philly/layout/Topbar'
import {
  Download, Trash2, AlertCircle, CheckCircle2, Shield, Loader2,
} from 'lucide-react'

const sectionStyle: React.CSSProperties = {
  background: 'var(--panel)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: 20,
  marginBottom: 16,
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 14, fontWeight: 600, marginBottom: 4, color: 'var(--txt)',
  display: 'flex', alignItems: 'center', gap: 8,
}

const sectionSubStyle: React.CSSProperties = {
  fontSize: 12, color: 'var(--txt3)', marginBottom: 16, lineHeight: 1.5,
}

const accentBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
  background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none',
  cursor: 'pointer', fontFamily: 'inherit',
}

const dangerBtnStyle: React.CSSProperties = {
  ...accentBtnStyle,
  background: 'var(--r, #dc2626)',
}

const ghostBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
  background: 'transparent', color: 'var(--txt2)',
  border: '1px solid var(--border)', cursor: 'pointer',
  fontFamily: 'inherit',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--bg2)',
  fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
  outline: 'none',
}

export default function PrivacySettingsPage() {
  const [exportScope, setExportScope] = useState<'user' | 'org'>('user')
  const [exporting, setExporting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [flash, setFlash] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  const downloadExport = async () => {
    setExporting(true)
    setFlash(null)
    try {
      const res = await fetch(`/philly/api/me/export?scope=${exportScope}`)
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setFlash({ kind: 'err', msg: json.error ?? 'Export failed.' })
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `deus-export-${exportScope}-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setFlash({ kind: 'ok', msg: 'Export downloaded.' })
    } catch {
      setFlash({ kind: 'err', msg: 'Network error.' })
    } finally {
      setExporting(false)
    }
  }

  const deleteAccount = async () => {
    if (confirmation !== 'DELETE') {
      setFlash({ kind: 'err', msg: 'Type DELETE exactly to confirm.' })
      return
    }
    setDeleting(true)
    setFlash(null)
    try {
      const res = await fetch('/philly/api/me', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: 'DELETE' }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFlash({ kind: 'err', msg: json.error ?? 'Could not delete account.' })
        setDeleting(false)
        return
      }
      // Account deleted — server has invalidated the session.
      // Redirect to login. The next render of any auth-walled page would 410.
      window.location.href = '/login?deleted=1'
    } catch {
      setFlash({ kind: 'err', msg: 'Network error.' })
      setDeleting(false)
    }
  }

  return (
    <>
      <Topbar title="Privacy" sub="Export your data or delete your account" />
      <div style={{ padding: '20px 28px 40px', maxWidth: 720 }}>

        {flash && (
          <div style={{
            ...sectionStyle, padding: '10px 14px', marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
            borderColor: flash.kind === 'ok' ? 'var(--g, #16a34a)' : 'var(--r, #dc2626)',
            color: flash.kind === 'ok' ? 'var(--g, #16a34a)' : 'var(--r, #dc2626)',
          }}>
            {flash.kind === 'ok' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {flash.msg}
          </div>
        )}

        {/* Export */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            <Download size={15} />
            Export my data
          </div>
          <div style={sectionSubStyle}>
            Download a JSON archive of your data under AVG/GDPR Art. 15 (right of access)
            and Art. 20 (data portability). Sensitive credentials (password hashes, 2FA secrets,
            invite tokens) are not included. The file is generated on demand and is never cached.
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt2)' }}>
              Scope:
            </label>
            <select
              value={exportScope}
              onChange={(e) => setExportScope(e.target.value as 'user' | 'org')}
              style={{ ...inputStyle, width: 'auto', flex: '0 0 auto' }}
              disabled={exporting}
            >
              <option value="user">My data only</option>
              <option value="org">Whole organization (admin/manager)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={downloadExport}
            style={{ ...accentBtnStyle, opacity: exporting ? 0.6 : 1 }}
            disabled={exporting}
          >
            {exporting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={14} />}
            {exporting ? 'Building export…' : 'Download export'}
          </button>
        </div>

        {/* Delete account */}
        <div style={{ ...sectionStyle, borderColor: 'var(--r, #dc2626)' }}>
          <div style={{ ...sectionTitleStyle, color: 'var(--r, #dc2626)' }}>
            <Trash2 size={15} />
            Delete my account
          </div>
          <div style={sectionSubStyle}>
            Erases your account under AVG/GDPR Art. 17 (right to be forgotten). Your data is
            soft-deleted for 30 days (in case you change your mind), then permanently purged.
            Backups roll off within 60 days. The audit trail of your past actions is preserved
            for 24 months for legal-defense purposes — this is required by law and cannot be
            shortened.
          </div>
          <div style={{
            ...sectionSubStyle, color: 'var(--r, #dc2626)', fontWeight: 500,
            display: 'flex', alignItems: 'flex-start', gap: 6,
          }}>
            <Shield size={13} style={{ marginTop: 2, flexShrink: 0 }} />
            <span>
              If you are the only admin in your organization, you must promote another teammate
              to admin first. The system blocks the request otherwise so the org never becomes orphaned.
            </span>
          </div>

          {!deleteOpen ? (
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              style={dangerBtnStyle}
            >
              <Trash2 size={14} />
              Delete my account…
            </button>
          ) : (
            <div style={{
              padding: 16, background: 'var(--bg2)', borderRadius: 8,
              border: '1px solid var(--r, #dc2626)',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: 'var(--txt)' }}>
                Are you sure?
              </div>
              <div style={{ fontSize: 12, color: 'var(--txt2)', marginBottom: 12 }}>
                Type <strong>DELETE</strong> below to confirm. You will be signed out immediately.
              </div>
              <input
                type="text"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
                style={{ ...inputStyle, marginBottom: 10, fontFamily: 'monospace' }}
                disabled={deleting}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={deleteAccount}
                  style={{
                    ...dangerBtnStyle,
                    opacity: confirmation === 'DELETE' && !deleting ? 1 : 0.4,
                  }}
                  disabled={confirmation !== 'DELETE' || deleting}
                >
                  {deleting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} />}
                  {deleting ? 'Deleting…' : 'Delete forever'}
                </button>
                <button
                  type="button"
                  onClick={() => { setDeleteOpen(false); setConfirmation('') }}
                  style={ghostBtnStyle}
                  disabled={deleting}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </>
  )
}
