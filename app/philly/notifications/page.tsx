'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/philly/layout/Topbar'
import { Pagination } from '@/components/philly/ui/Pagination'
import { useRealtime } from '@/hooks/philly/useRealtime'
import { Bell, CheckCheck, Info, AlertTriangle, CheckCircle2, XCircle, Clock } from 'lucide-react'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  read: boolean
  createdAt: string
}

type IconComponent = typeof Info
const TYPE_ICONS: Record<string, IconComponent> = { info: Info, warning: AlertTriangle, success: CheckCircle2, error: XCircle }
const TYPE_COLORS: Record<string, { bg: string; txt: string }> = {
  info: { bg: 'var(--b-bg)', txt: 'var(--b-txt)' },
  warning: { bg: 'var(--y-bg)', txt: 'var(--y-txt)' },
  success: { bg: 'var(--g-bg)', txt: 'var(--g-txt)' },
  error: { bg: 'var(--r-bg)', txt: 'var(--r-txt)' },
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState<string | null>(null)
  const t = useTranslations('notifications')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/philly/api/notifications?page=${page}&limit=20`)
      const json = await res.json().catch(() => ({}))
      setNotifications(Array.isArray(json.data) ? json.data : [])
      setTotal(json.pagination?.total ?? 0)
      setTotalPages(json.pagination?.totalPages ?? 0)
    } catch {
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { fetchData() }, [fetchData])

  // Live updates: when a new notification arrives via SSE, refetch.
  useRealtime((msg) => {
    if (msg.type === 'notification') fetchData()
  }, [fetchData])

  const markRead = async (id: string) => {
    // optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    try {
      const res = await fetch(`/philly/api/notifications/${id}/read`, { method: 'PATCH' })
      if (!res.ok) throw new Error(`Failed to mark as read (${res.status})`)
    } catch (err) {
      // revert + surface the error
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: false } : n))
      setActionError(err instanceof Error ? err.message : 'Failed to mark as read')
    }
  }

  const markAllRead = async () => {
    const snapshot = notifications
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    try {
      const res = await fetch('/philly/api/notifications/mark-all-read', { method: 'POST' })
      if (!res.ok) throw new Error(`Failed to mark all as read (${res.status})`)
    } catch (err) {
      setNotifications(snapshot)
      setActionError(err instanceof Error ? err.message : 'Failed to mark all as read')
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <>
      <Topbar title={t('title')} sub={`${unreadCount} ${t('unread')}`} />
      <div style={{ padding: '18px 24px 40px' }}>
        {actionError && (
          <div role="alert" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            padding: '8px 12px', borderRadius: 8, marginBottom: 12,
            background: 'var(--r-bg)', border: '1px solid var(--r-border)',
            color: 'var(--r-txt)', fontSize: 12, fontWeight: 600,
          }}>
            <span>{actionError}</span>
            <button onClick={() => setActionError(null)} aria-label="Dismiss" style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 700 }}>×</button>
          </div>
        )}
        {unreadCount > 0 && (
          <button onClick={markAllRead} aria-label="Mark all notifications as read" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel)', fontSize: 12, fontWeight: 600, color: 'var(--txt2)', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16 }}>
            <CheckCheck size={14} /> Mark all as read
          </button>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>Loading...</div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13, background: 'var(--panel)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <Bell size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              No notifications yet.
            </div>
          ) : notifications.map(n => {
            const Icon = TYPE_ICONS[n.type] ?? Info
            const colors = TYPE_COLORS[n.type] ?? TYPE_COLORS.info
            return (
              <div key={n.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)', background: n.read ? 'var(--panel)' : 'color-mix(in srgb, var(--accent) 5%, var(--panel))', cursor: n.read ? 'default' : 'pointer' }} onClick={() => !n.read && markRead(n.id)}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={14} style={{ color: colors.txt }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>{n.title}</div>
                  {n.message && <div style={{ fontSize: 12, color: 'var(--txt2)', marginTop: 2 }}>{n.message}</div>}
                  <div style={{ fontSize: 10, color: 'var(--txt3)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={10} /> {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>
                {!n.read && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 6 }} />
                )}
              </div>
            )
          })}
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </div>
    </>
  )
}
