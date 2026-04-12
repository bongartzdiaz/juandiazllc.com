'use client'

import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Pagination } from '@/components/ui/Pagination'
import { Bell, Check, CheckCheck, Info, AlertTriangle, CheckCircle2, XCircle, Clock } from 'lucide-react'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  read: boolean
  createdAt: string
}

const TYPE_ICONS: Record<string, any> = { info: Info, warning: AlertTriangle, success: CheckCircle2, error: XCircle }
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

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/notifications?page=${page}&limit=20`)
      const json = await res.json()
      setNotifications(json.data ?? [])
      setTotal(json.pagination?.total ?? 0)
      setTotalPages(json.pagination?.totalPages ?? 0)
    } catch { setNotifications([]) }
    finally { setLoading(false) }
  }, [page])

  useEffect(() => { fetchData() }, [fetchData])

  const markRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    } catch { /* silently handle */ }
  }

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', { method: 'POST' })
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } catch { /* silently handle */ }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <>
      <Topbar title="Notifications" sub={`${unreadCount} unread`} />
      <div style={{ padding: '18px 24px 40px' }}>
        {unreadCount > 0 && (
          <button onClick={markAllRead} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel)', fontSize: 12, fontWeight: 600, color: 'var(--txt2)', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16 }}>
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
