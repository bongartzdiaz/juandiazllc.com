'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useConfirm } from '@/hooks/philly/useConfirm'
import { Topbar } from '@/components/philly/layout/Topbar'
import { Key, Plus, Trash2, Copy, Check, RefreshCw, AlertCircle } from 'lucide-react'

interface ApiKey {
  id: string
  name: string
  prefix: string
  permissions: 'read' | 'write' | 'admin'
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
  key?: string
  warning?: string
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [permissions, setPermissions] = useState<'read' | 'write' | 'admin'>('read')
  const [expiresInDays, setExpiresInDays] = useState('')
  const [newKey, setNewKey] = useState<ApiKey | null>(null)
  const [copied, setCopied] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const tConfirms = useTranslations('confirms')
  const tCommon = useTranslations('common')
  const confirm = useConfirm()

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/api-keys')
      .then(r => r.json())
      .then(json => setKeys(json.data ?? []))
      .catch(() => setKeys([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const create = async () => {
    if (!name.trim() || creating) return
    setCreating(true)
    setCreateError(null)
    try {
      const payload: Record<string, unknown> = { name: name.trim(), permissions }
      const d = parseInt(expiresInDays, 10)
      if (!isNaN(d) && d > 0) payload.expiresInDays = d
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        // Previously this branch was silent — the user clicked Create
        // and saw nothing happen. Surface the error.
        setCreateError(json?.error ?? `Request failed (${res.status})`)
        return
      }
      setNewKey(json.data)
      setName('')
      setPermissions('read')
      setExpiresInDays('')
      setShowCreate(false)
      load()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setCreating(false)
    }
  }

  const rotate = async (id: string) => {
    const ok = await confirm({
      title: tConfirms('rotateApiKey.title'),
      body: tConfirms('rotateApiKey.body'),
      confirmLabel: tCommon('replace'),
      cancelLabel: tCommon('cancel'),
      danger: true,
    })
    if (!ok) return
    const res = await fetch(`/api/api-keys/${id}/rotate`, { method: 'POST' })
    const json = await res.json().catch(() => ({}))
    if (res.ok) {
      setNewKey(json.data)
      load()
    } else {
      alert(json?.error ?? 'Rotate failed')
    }
  }

  const del = async (id: string) => {
    const ok = await confirm({
      title: tConfirms('revokeApiKey.title'),
      body: tConfirms('revokeApiKey.body'),
      confirmLabel: tCommon('revoke'),
      cancelLabel: tCommon('cancel'),
      danger: true,
    })
    if (!ok) return
    await fetch(`/api/api-keys/${id}`, { method: 'DELETE' })
    load()
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      alert('Copy failed — your browser blocked clipboard access. Select the key manually.')
    }
  }

  return (
    <>
      <Topbar title="API Keys" sub="Manage keys for programmatic access to /api/v1" />
      <div style={{ padding: '20px 28px 40px' }}>
        {newKey?.key && (
          <div style={{
            background: 'var(--g-bg)', border: '1px solid var(--g-border)',
            borderRadius: 10, padding: 16, marginBottom: 18,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--g-txt)', marginBottom: 6 }}>
              New key created — copy it now, this is the only time you'll see it.
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--panel)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '10px 14px',
              fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 13,
            }}>
              <span style={{ flex: 1, userSelect: 'all' }}>{newKey.key}</span>
              <button
                onClick={() => copy(newKey.key!)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--txt2)', display: 'flex', alignItems: 'center', gap: 4,
                  fontFamily: 'inherit', fontSize: 11, fontWeight: 600,
                }}
              >
                {copied ? <Check size={14} color="var(--g-txt)" /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <button
              onClick={() => setNewKey(null)}
              style={{
                marginTop: 10, background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--txt3)', fontSize: 11, textDecoration: 'underline',
                fontFamily: 'inherit',
              }}
            >
              Dismiss
            </button>
          </div>
        )}

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 14,
        }}>
          <div style={{ fontSize: 13, color: 'var(--txt3)' }}>
            Keys grant access to <code style={{ fontFamily: "var(--font-red-hat-mono), monospace" }}>/api/v1/*</code>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8,
              background: 'var(--accent)', color: 'white', border: 'none',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <Plus size={13} /> New Key
          </button>
        </div>

        {showCreate && (
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 10, padding: 16, marginBottom: 14,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)', marginBottom: 10 }}>
              New API Key
            </div>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Name (e.g. 'Zapier integration')"
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 7,
                border: '1px solid var(--border)', background: 'var(--bg)',
                color: 'var(--txt)', fontSize: 13, marginBottom: 10,
                fontFamily: 'inherit',
              }}
            />
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {(['read', 'write', 'admin'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPermissions(p)}
                  style={{
                    padding: '6px 14px', borderRadius: 7,
                    background: permissions === p ? 'var(--accent)' : 'var(--panel)',
                    color: permissions === p ? 'white' : 'var(--txt2)',
                    border: `1px solid ${permissions === p ? 'var(--accent)' : 'var(--border)'}`,
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'inherit',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>
                Expires in (days, optional)
              </label>
              <input
                type="number"
                min="1"
                value={expiresInDays}
                onChange={e => setExpiresInDays(e.target.value)}
                placeholder="Leave empty for no expiration"
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 7,
                  border: '1px solid var(--border)', background: 'var(--bg)',
                  color: 'var(--txt)', fontSize: 13, fontFamily: 'inherit', outline: 'none',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={create}
                disabled={!name.trim() || creating}
                style={{
                  padding: '7px 14px', borderRadius: 7,
                  background: 'var(--accent)', color: 'white', border: 'none',
                  fontSize: 12, fontWeight: 600,
                  cursor: !name.trim() || creating ? 'default' : 'pointer',
                  opacity: !name.trim() || creating ? 0.5 : 1, fontFamily: 'inherit',
                }}
              >
                {creating ? 'Creating…' : 'Create Key'}
              </button>
              <button
                onClick={() => { setShowCreate(false); setName(''); setCreateError(null) }}
                disabled={creating}
                style={{
                  padding: '7px 14px', borderRadius: 7,
                  background: 'var(--panel)', color: 'var(--txt2)',
                  border: '1px solid var(--border)',
                  fontSize: 12, fontWeight: 600,
                  cursor: creating ? 'default' : 'pointer',
                  opacity: creating ? 0.5 : 1, fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
            </div>
            {createError && (
              <div role="alert" style={{
                marginTop: 10, padding: '8px 12px', borderRadius: 7,
                background: 'var(--r-bg)', color: 'var(--r-txt)',
                border: '1px solid var(--r-border)',
                fontSize: 12,
              }}>
                {createError}
              </div>
            )}
          </div>
        )}

        <div style={{
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 12, overflow: 'hidden',
        }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: 'var(--txt3)' }}>
              Loading…
            </div>
          ) : keys.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <Key size={32} color="var(--txt3)" style={{ marginBottom: 10 }} />
              <div style={{ fontSize: 13, color: 'var(--txt2)', fontWeight: 600 }}>
                No API keys yet
              </div>
              <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 4 }}>
                Create a key to start using /api/v1
              </div>
            </div>
          ) : keys.map((k, i) => {
            const expires = k.expiresAt ? new Date(k.expiresAt) : null
            const expired = expires ? expires < new Date() : false
            const expiringSoon = expires && !expired && expires < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            return (
              <div
                key={k.id}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 140px 110px 110px 72px',
                  gap: 14, alignItems: 'center', padding: '12px 18px',
                  borderBottom: i < keys.length - 1 ? '1px solid var(--border)' : 'none',
                  opacity: expired ? 0.6 : 1,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--txt)' }}>
                      {k.name}
                    </span>
                    {expired && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        padding: '1px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700,
                        background: 'var(--r-bg)', color: 'var(--r-txt)',
                        border: '1px solid var(--r-border)',
                        textTransform: 'uppercase',
                      }}>
                        <AlertCircle size={9} /> Expired
                      </span>
                    )}
                    {expiringSoon && !expired && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        padding: '1px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700,
                        background: 'var(--y-bg)', color: 'var(--y-txt)',
                        border: '1px solid var(--y-border)',
                        textTransform: 'uppercase',
                      }}>
                        Expires soon
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontSize: 11, color: 'var(--txt3)',
                    fontFamily: "var(--font-red-hat-mono), monospace",
                  }}>
                    {k.prefix}•••••••••••
                  </div>
                </div>
                <span style={{
                  padding: '3px 10px', borderRadius: 6,
                  background: 'var(--bg2)', color: 'var(--txt2)',
                  fontSize: 10, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                  textAlign: 'center',
                }}>
                  {k.permissions}
                </span>
                <div style={{ fontSize: 11, color: 'var(--txt3)' }}>
                  {k.lastUsedAt ? `Used ${new Date(k.lastUsedAt).toLocaleDateString()}` : 'Never used'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--txt3)' }}>
                  {expires ? `Expires ${expires.toLocaleDateString()}` : new Date(k.createdAt).toLocaleDateString()}
                </div>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => rotate(k.id)}
                    aria-label="Rotate key"
                    title="Rotate key"
                    style={{
                      background: 'none', border: '1px solid var(--border)', cursor: 'pointer',
                      color: 'var(--accent)', padding: 6, borderRadius: 6,
                      display: 'flex', alignItems: 'center',
                    }}
                  >
                    <RefreshCw size={13} />
                  </button>
                  <button
                    onClick={() => del(k.id)}
                    aria-label="Revoke key"
                    title="Revoke key"
                    style={{
                      background: 'none', border: '1px solid var(--border)', cursor: 'pointer',
                      color: 'var(--r-txt)', padding: 6, borderRadius: 6,
                      display: 'flex', alignItems: 'center',
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
