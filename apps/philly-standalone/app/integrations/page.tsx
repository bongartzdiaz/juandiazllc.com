'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Topbar } from '@/components/philly/layout/Topbar'
import { Modal, FormField } from '@/components/philly/ui/Modal'
import { useApi } from '@/hooks/philly/useApi'
import { useConfirm } from '@/hooks/philly/useConfirm'
import { useTranslations } from 'next-intl'
import {
  Plug, Search, Filter, Check, X, ExternalLink, AlertCircle,
  Calendar, MessageSquare, CreditCard, FileText, Megaphone, Zap,
} from 'lucide-react'

interface Integration {
  id: string
  organizationId: string
  provider: string
  name: string | null
  status: 'connected' | 'disconnected' | 'error'
  accessToken: string | null
  refreshToken: string | null
  tokenExpiry: string | null
  scopes: string | null
  metadata: string | null
  lastSyncAt: string | null
  createdAt: string
  updatedAt: string
}

interface CatalogItem {
  id: string
  name: string
  category: string
  oauth?: { scopes: string[] }
  apiKey?: boolean
}

type Toast = { message: string; kind: 'success' | 'error' } | null

const CATEGORY_LABEL: Record<string, string> = {
  payments: 'Payments',
  communication: 'Communication',
  calendar: 'Calendar',
  accounting: 'Accounting',
  marketing: 'Marketing',
  productivity: 'Productivity',
}

const CATEGORY_ICON: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  payments: CreditCard,
  communication: MessageSquare,
  calendar: Calendar,
  accounting: FileText,
  marketing: Megaphone,
  productivity: Zap,
}

const DESCRIPTIONS: Record<string, string> = {
  stripe: 'Accept payments and reconcile invoices automatically.',
  slack: 'Real-time alerts for new leads, replies, and pipeline changes.',
  mailchimp: 'Sync contact lists and track campaign engagement.',
  google: 'Two-way Google Calendar sync and send mail from Gmail.',
  microsoft: 'Sync Outlook calendars and send mail via Microsoft 365.',
  quickbooks: 'Sync invoices, payments, and commissions to your ledger.',
}

const BRAND_COLOR: Record<string, string> = {
  stripe: '#635bff',
  slack: '#611f69',
  mailchimp: '#ffe01b',
  google: '#4285f4',
  microsoft: '#0078d4',
  quickbooks: '#2ca01c',
}

function formatRelative(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const d = new Date(dateStr)
  const diffMs = Date.now() - d.getTime()
  const sec = Math.floor(diffMs / 1000)
  if (sec < 60) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}d ago`
  return d.toLocaleDateString()
}

export default function IntegrationsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const confirm = useConfirm()
  const tConfirms = useTranslations('confirms')
  const tCommon = useTranslations('common')
  const t = useTranslations('integrations')

  interface CatalogResponse { data: CatalogItem[] }
  interface IntegrationsResponse { data: Integration[] }
  const catalogQuery = useApi<CatalogResponse>('/integrations/catalog')
  const integrationsQuery = useApi<IntegrationsResponse>('/integrations')
  const catalog = catalogQuery.data?.data ?? []
  const integrations = integrationsQuery.data?.data ?? []
  const loading = catalogQuery.loading || integrationsQuery.loading
  const fetchAll = useCallback(() => {
    catalogQuery.refetch()
    integrationsQuery.refetch()
  }, [catalogQuery, integrationsQuery])
  const [busy, setBusy] = useState<string | null>(null)
  const [category, setCategory] = useState<string>('All')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<Toast>(null)
  const [banner, setBanner] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  // Modal state for API key entry
  const [keyModalFor, setKeyModalFor] = useState<CatalogItem | null>(null)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [accountIdInput, setAccountIdInput] = useState('')

  // Handle OAuth callback params
  useEffect(() => {
    const ok = searchParams.get('oauth_success')
    const err = searchParams.get('oauth_error')
    if (ok) {
      setBanner({ kind: 'success', text: `Connected to ${ok}!` })
      // Strip params from URL without triggering a full navigation
      const url = new URL(window.location.href)
      url.searchParams.delete('oauth_success')
      url.searchParams.delete('oauth_error')
      router.replace(url.pathname + (url.search || ''))
    } else if (err) {
      setBanner({ kind: 'error', text: decodeURIComponent(err) })
      const url = new URL(window.location.href)
      url.searchParams.delete('oauth_success')
      url.searchParams.delete('oauth_error')
      router.replace(url.pathname + (url.search || ''))
    }
  }, [searchParams, router])

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  const byProvider = useMemo(() => {
    const m = new Map<string, Integration>()
    for (const i of integrations) m.set(i.provider, i)
    return m
  }, [integrations])

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const item of catalog) set.add(item.category)
    return ['All', ...Array.from(set)]
  }, [catalog])

  const filtered = useMemo(() => {
    return catalog.filter(item => {
      if (category !== 'All' && item.category !== category) return false
      if (search) {
        const q = search.toLowerCase()
        if (!item.name.toLowerCase().includes(q) &&
            !item.category.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [catalog, category, search])

  const handleConnect = (item: CatalogItem) => {
    if (item.oauth) {
      window.location.href = `/api/integrations/oauth/${item.id}`
      return
    }
    if (item.apiKey) {
      setApiKeyInput('')
      setAccountIdInput('')
      setKeyModalFor(item)
    }
  }

  const submitApiKey = async () => {
    if (!keyModalFor || !apiKeyInput.trim()) return
    setBusy(keyModalFor.id)
    try {
      const metadata: Record<string, string> = {}
      if (keyModalFor.id === 'mailchimp' && accountIdInput.trim()) {
        metadata.accountId = accountIdInput.trim()
      }
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: keyModalFor.id,
          name: keyModalFor.name,
          apiKey: apiKeyInput.trim(),
          metadata: Object.keys(metadata).length ? metadata : undefined,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setToast({ kind: 'error', message: j.error ?? 'Failed to connect' })
      } else {
        setToast({ kind: 'success', message: `${keyModalFor.name} connected.` })
        setKeyModalFor(null)
        await fetchAll()
      }
    } catch {
      setToast({ kind: 'error', message: 'Network error' })
    } finally {
      setBusy(null)
    }
  }

  const handleTest = async (item: CatalogItem, record: Integration) => {
    setBusy(item.id)
    try {
      const res = await fetch(`/api/integrations/${record.id}/test`, { method: 'POST' })
      const json = await res.json()
      const result = json.data
      if (result?.ok) {
        setToast({ kind: 'success', message: `${item.name} connection OK.` })
      } else {
        setToast({ kind: 'error', message: `${item.name} test failed: ${result?.error ?? 'unknown'}` })
      }
      await fetchAll()
    } catch {
      setToast({ kind: 'error', message: 'Test failed' })
    } finally {
      setBusy(null)
    }
  }

  const handleDisconnect = async (record: Integration, item: CatalogItem) => {
    const ok = await confirm({
      title: tConfirms('disconnectIntegration.title', { name: item.name }),
      body: tConfirms('disconnectIntegration.body'),
      confirmLabel: tCommon('disconnect'),
      cancelLabel: tCommon('cancel'),
      danger: true,
    })
    if (!ok) return
    setBusy(item.id)
    try {
      await fetch('/api/integrations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: record.id, status: 'disconnected' }),
      })
      setToast({ kind: 'success', message: `${item.name} disconnected.` })
      await fetchAll()
    } catch {
      setToast({ kind: 'error', message: 'Disconnect failed' })
    } finally {
      setBusy(null)
    }
  }

  const handleRevoke = async (record: Integration, item: CatalogItem) => {
    const ok = await confirm({
      title: tConfirms('revokeIntegration.title', { name: item.name }),
      body: tConfirms('revokeIntegration.body', { name: item.name }),
      confirmLabel: tCommon('revoke'),
      cancelLabel: tCommon('cancel'),
      danger: true,
    })
    if (!ok) return
    setBusy(item.id)
    try {
      const res = await fetch(`/api/integrations/${record.id}`, { method: 'DELETE' })
      if (res.status === 204 || res.ok) {
        setToast({ kind: 'success', message: `${item.name} revoked & removed.` })
        await fetchAll()
      } else {
        const j = await res.json().catch(() => ({}))
        setToast({ kind: 'error', message: j?.error ?? 'Revoke failed' })
      }
    } catch {
      setToast({ kind: 'error', message: 'Network error' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <Topbar title={t('title')} sub={t('subtitle')} />
      <div style={{ padding: '18px 24px 40px' }}>

        {/* OAuth result banner */}
        {banner && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '11px 14px', borderRadius: 10, marginBottom: 14,
            background: banner.kind === 'success' ? 'var(--g-bg)' : 'var(--r-bg)',
            border: `1px solid ${banner.kind === 'success' ? 'var(--g-border)' : 'var(--r-border)'}`,
            color: banner.kind === 'success' ? 'var(--g-txt)' : 'var(--r-txt)',
            fontSize: 12.5, fontWeight: 600,
          }}>
            {banner.kind === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
            <span style={{ flex: 1 }}>{banner.text}</span>
            <button
              onClick={() => setBanner(null)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'inherit', padding: 4, display: 'flex',
              }}
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* Hero gradient */}
        <div style={{
          padding: '18px 22px', borderRadius: 12, marginBottom: 16,
          background: 'linear-gradient(135deg, var(--accent-bg) 0%, var(--panel) 100%)',
          border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 11,
            background: 'var(--accent)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Plug size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt)' }}>
              Connect your favorite tools to DEUS
            </div>
            <div style={{ fontSize: 12, color: 'var(--txt3)', marginTop: 3 }}>
              {catalog.length} integrations available. {integrations.filter(i => i.status === 'connected').length} connected.
            </div>
          </div>
        </div>

        {/* Category filter chips */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {categories.map(c => {
            const active = category === c
            const label = c === 'All' ? 'All' : (CATEGORY_LABEL[c] ?? c)
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                style={{
                  padding: '6px 12px', borderRadius: 999,
                  border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                  background: active ? 'var(--accent-bg)' : 'var(--panel)',
                  color: active ? 'var(--accent-txt)' : 'var(--txt2)',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >{label}</button>
            )
          })}
        </div>

        {/* Search */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 12px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--panel)',
            fontSize: 12, flex: 1, minWidth: 240, maxWidth: 360,
          }}>
            <Search size={13} style={{ color: 'var(--txt3)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('searchPlaceholder')}
              style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--txt)', fontFamily: 'inherit', outline: 'none', width: '100%' }}
            />
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 12px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--panel)',
            fontSize: 11, color: 'var(--txt3)',
          }}>
            <Filter size={13} />
            Showing {filtered.length} of {catalog.length}
          </div>
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {loading ? (
            <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{
              gridColumn: '1 / -1', padding: 40, textAlign: 'center',
              color: 'var(--txt3)', fontSize: 13,
              background: 'var(--panel)', borderRadius: 12, border: '1px solid var(--border)',
            }}>
              <Plug size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <div>No integrations match your filters.</div>
            </div>
          ) : filtered.map(item => {
            const record = byProvider.get(item.id)
            const isConnected = record?.status === 'connected'
            const hasError = record?.status === 'error'
            const isBusy = busy === item.id
            const CatIcon = CATEGORY_ICON[item.category] ?? Plug
            const color = BRAND_COLOR[item.id] ?? 'var(--accent)'
            const description = DESCRIPTIONS[item.id] ?? `Connect ${item.name} to your workspace.`
            const categoryLabel = CATEGORY_LABEL[item.category] ?? item.category
            const initial = item.name.charAt(0).toUpperCase()

            return (
              <div
                key={item.id}
                style={{
                  position: 'relative', overflow: 'hidden',
                  padding: 0, borderRadius: 12,
                  border: '1px solid var(--border)', background: 'var(--panel)',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex', flexDirection: 'column',
                }}
              >
                <div style={{ height: 4, background: color }} />

                <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: color, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, fontSize: 17, fontWeight: 700,
                      fontFamily: "var(--font-red-hat-mono), monospace",
                    }}>
                      {initial}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', lineHeight: 1.25 }}>
                        {item.name}
                      </div>
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        marginTop: 4, padding: '2px 7px', borderRadius: 6,
                        background: 'var(--bg2)', color: 'var(--txt3)',
                        fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}>
                        <CatIcon size={9} />
                        {categoryLabel}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    fontSize: 11, color: 'var(--txt3)', lineHeight: 1.45,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    overflow: 'hidden', marginBottom: 14, minHeight: 32,
                  }}>
                    {description}
                  </div>

                  <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 8px', borderRadius: 6,
                        fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase',
                        background: isConnected ? 'var(--g-bg)' : hasError ? 'var(--r-bg)' : 'var(--bg2)',
                        color: isConnected ? 'var(--g-txt)' : hasError ? 'var(--r-txt)' : 'var(--txt3)',
                        width: 'fit-content',
                      }}>
                        {isConnected ? <><Check size={10} /> {t('status.connected')}</> : hasError ? <><AlertCircle size={10} /> {t('status.error')}</> : <>{t('status.notConnected')}</>}
                      </span>
                      {isConnected && record?.lastSyncAt && (
                        <span style={{
                          fontSize: 9.5, color: 'var(--txt3)',
                          fontFamily: 'var(--font-red-hat-mono), monospace',
                        }}>
                          Synced {formatRelative(record.lastSyncAt)}
                        </span>
                      )}
                    </div>

                    {isConnected && record ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => handleTest(item, record)}
                          disabled={isBusy}
                          style={{
                            padding: '6px 10px', borderRadius: 7,
                            background: 'var(--bg2)', color: 'var(--txt2)',
                            border: '1px solid var(--border)',
                            fontSize: 11, fontWeight: 600,
                            cursor: isBusy ? 'not-allowed' : 'pointer',
                            fontFamily: 'inherit', opacity: isBusy ? 0.6 : 1,
                          }}
                        >
                          {isBusy ? '...' : 'Test'}
                        </button>
                        <button
                          onClick={() => handleDisconnect(record, item)}
                          disabled={isBusy}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '6px 10px', borderRadius: 7,
                            background: 'transparent', color: 'var(--txt2)',
                            border: '1px solid var(--border)',
                            fontSize: 11, fontWeight: 600,
                            cursor: isBusy ? 'not-allowed' : 'pointer',
                            fontFamily: 'inherit', opacity: isBusy ? 0.6 : 1,
                          }}
                        >
                          <X size={11} /> Disconnect
                        </button>
                        <button
                          onClick={() => handleRevoke(record, item)}
                          disabled={isBusy}
                          title="Revoke tokens and permanently remove this integration"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '6px 10px', borderRadius: 7,
                            background: 'transparent', color: 'var(--r-txt)',
                            border: '1px solid var(--r-border)',
                            fontSize: 11, fontWeight: 600,
                            cursor: isBusy ? 'not-allowed' : 'pointer',
                            fontFamily: 'inherit', opacity: isBusy ? 0.6 : 1,
                          }}
                        >
                          <AlertCircle size={11} /> Revoke
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleConnect(item)}
                        disabled={isBusy}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '6px 12px', borderRadius: 7,
                          background: 'var(--accent)', color: '#fff',
                          border: 'none',
                          fontSize: 11, fontWeight: 600,
                          cursor: isBusy ? 'not-allowed' : 'pointer',
                          fontFamily: 'inherit', opacity: isBusy ? 0.6 : 1,
                        }}
                      >
                        <ExternalLink size={11} /> {isBusy ? 'Connecting...' : 'Connect'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* API Key Modal */}
      <Modal
        open={!!keyModalFor}
        onClose={() => setKeyModalFor(null)}
        title={keyModalFor ? `Connect ${keyModalFor.name}` : ''}
        subtitle="Paste your API key below. Keys are stored encrypted."
        size="sm"
      >
        {keyModalFor && (
          <>
            <FormField label="API Key" required>
              <input
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
                placeholder={keyModalFor.id === 'stripe' ? 'sk_live_...' : keyModalFor.id === 'mailchimp' ? 'abc123...-us14' : 'Your API key'}
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: 7,
                  border: '1px solid var(--border)', background: 'var(--bg)',
                  color: 'var(--txt)', fontSize: 13,
                  fontFamily: "var(--font-red-hat-mono), monospace",
                }}
                autoFocus
              />
            </FormField>
            {keyModalFor.id === 'mailchimp' && (
              <FormField label="Account ID (optional)">
                <input
                  value={accountIdInput}
                  onChange={e => setAccountIdInput(e.target.value)}
                  placeholder="e.g. 1234567"
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 7,
                    border: '1px solid var(--border)', background: 'var(--bg)',
                    color: 'var(--txt)', fontSize: 13, fontFamily: 'inherit',
                  }}
                />
              </FormField>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                onClick={submitApiKey}
                disabled={!apiKeyInput.trim() || busy === keyModalFor.id}
                style={{
                  padding: '8px 16px', borderRadius: 7,
                  background: 'var(--accent)', color: '#fff', border: 'none',
                  fontSize: 12, fontWeight: 600,
                  cursor: apiKeyInput.trim() ? 'pointer' : 'not-allowed',
                  opacity: apiKeyInput.trim() ? 1 : 0.5,
                  fontFamily: 'inherit',
                }}
              >
                {busy === keyModalFor.id ? 'Connecting...' : 'Connect'}
              </button>
              <button
                onClick={() => setKeyModalFor(null)}
                style={{
                  padding: '8px 16px', borderRadius: 7,
                  background: 'var(--panel)', color: 'var(--txt2)',
                  border: '1px solid var(--border)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 1100,
          padding: '11px 16px', borderRadius: 10,
          background: toast.kind === 'success' ? 'var(--g-bg)' : 'var(--r-bg)',
          border: `1px solid ${toast.kind === 'success' ? 'var(--g-border)' : 'var(--r-border)'}`,
          color: toast.kind === 'success' ? 'var(--g-txt)' : 'var(--r-txt)',
          fontSize: 12.5, fontWeight: 600, maxWidth: 360,
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: 'var(--shadow-md)',
        }}>
          {toast.kind === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
          {toast.message}
        </div>
      )}
    </>
  )
}
