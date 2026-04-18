'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, Info, AlertTriangle, CheckCircle2, XCircle, Clock } from 'lucide-react'
import Link from 'next/link'

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

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/notifications?limit=5&unread=true')
      .then(r => r.json())
      .then(j => {
        setNotifications(j.data ?? [])
        setUnread(j.pagination?.total ?? 0)
      })
      .catch(() => {})

    // Poll every 30s
    const interval = setInterval(() => {
      fetch('/api/notifications?limit=5&unread=true')
        .then(r => r.json())
        .then(j => {
          setNotifications(j.data ?? [])
          setUnread(j.pagination?.total ?? 0)
        })
        .catch(() => {})
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
    setNotifications(prev => prev.filter(n => n.id !== id))
    setUnread(prev => Math.max(0, prev - 1))
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'relative', background: 'none', border: 'none',
          cursor: 'pointer', padding: 6, borderRadius: 8, color: 'var(--txt2)',
          display: 'flex', alignItems: 'center',
        }}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            width: 14, height: 14, borderRadius: '50%',
            background: 'var(--r)', color: '#fff',
            fontSize: 8, fontWeight: 700, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 8,
          width: 340, maxHeight: 400, overflowY: 'auto',
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 12, boxShadow: 'var(--shadow-lg)', zIndex: 100,
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)' }}>Notifications</span>
            <Link href="/philly/notifications" onClick={() => setOpen(false)} style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}>View all</Link>
          </div>

          {notifications.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--txt3)', fontSize: 12 }}>
              No unread notifications
            </div>
          ) : notifications.map(n => {
            const Icon = TYPE_ICONS[n.type] ?? Info
            const colors = TYPE_COLORS[n.type] ?? TYPE_COLORS.info
            return (
              <div key={n.id} onClick={() => markRead(n.id)} style={{
                padding: '10px 16px', borderBottom: '1px solid var(--border)',
                cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'flex-start',
              }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  <Icon size={12} style={{ color: colors.txt }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt)' }}>{n.title}</div>
                  {n.message && <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.message}</div>}
                  <div style={{ fontSize: 9, color: 'var(--txt3)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Clock size={8} /> {timeAgo(n.createdAt)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}
