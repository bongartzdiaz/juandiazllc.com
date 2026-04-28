'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/philly/layout/Topbar'
import { Pagination } from '@/components/philly/ui/Pagination'
import { KpiCard } from '@/components/philly/ui/KpiCard'
import { useEntitySubscription } from '@/hooks/philly/useRealtime'
import { useApi } from '@/hooks/philly/useApi'
import { Phone, PhoneCall, List, Filter, X, Loader2 } from 'lucide-react'

/* ── Types ──────────────────────────────────────────────── */

interface Call {
  id: string
  agentId: string
  contactId: string
  direction: 'inbound' | 'outbound'
  phoneNumber: string
  status: string
  duration: number
  outcome: string
  notes: string
  recordingUrl: string | null
  disposition: string | null
  callbackAt: string | null
  startedAt: string
  endedAt: string | null
}

interface DialerList {
  id: string
  name: string
  contactIds: string
  totalContacts: number
  assignedTo: string | null
  status: 'active' | 'completed' | 'paused'
  createdAt: string
}

interface ContactLite {
  id: string
  name: string | null
  phone: string | null
  email: string | null
}

/* ── Color maps ─────────────────────────────────────────── */

const DIRECTION_COLORS: Record<string, { bg: string; txt: string }> = {
  outbound: { bg: 'var(--b-bg)', txt: 'var(--b-txt)' },
  inbound: { bg: 'var(--g-bg)', txt: 'var(--g-txt)' },
}

const OUTCOME_COLORS: Record<string, { bg: string; txt: string }> = {
  connected: { bg: 'var(--g-bg)', txt: 'var(--g-txt)' },
  voicemail: { bg: 'var(--b-bg)', txt: 'var(--b-txt)' },
  no_answer: { bg: 'var(--r-bg)', txt: 'var(--r-txt)' },
  busy: { bg: 'var(--y-bg)', txt: 'var(--y-txt)' },
  callback: { bg: 'var(--b-bg)', txt: 'var(--b-txt)' },
}

const LIST_STATUS_COLORS: Record<string, { bg: string; txt: string }> = {
  active: { bg: 'var(--g-bg)', txt: 'var(--g-txt)' },
  completed: { bg: 'var(--b-bg)', txt: 'var(--b-txt)' },
  paused: { bg: 'var(--y-bg)', txt: 'var(--y-txt)' },
}

const OUTCOMES = [
  { value: 'connected', label: 'Connected' },
  { value: 'voicemail', label: 'Voicemail' },
  { value: 'no_answer', label: 'No Answer' },
  { value: 'busy', label: 'Busy' },
  { value: 'callback', label: 'Callback' },
]

/* ── Helpers ────────────────────────────────────────────── */

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

function parseContactIds(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : []
  } catch { return [] }
}

const cursorKey = (listId: string) => `dialer.cursor.${listId}`

function getCursor(listId: string): number {
  if (typeof window === 'undefined') return 0
  const v = window.localStorage.getItem(cursorKey(listId))
  const n = v ? parseInt(v, 10) : 0
  return Number.isFinite(n) && n >= 0 ? n : 0
}

function setCursor(listId: string, idx: number) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(cursorKey(listId), String(idx))
}

/* ── Page Component ─────────────────────────────────────── */

export default function DialerPage() {
  const t = useTranslations('dialer')

  /* Tab state */
  const [activeTab, setActiveTab] = useState<'calls' | 'lists'>('calls')

  /* Call Log state */
  const [callPage, setCallPage] = useState(1)
  const [outcomeFilter, setOutcomeFilter] = useState('')

  const callsParams = new URLSearchParams({ page: String(callPage), limit: '25' })
  if (outcomeFilter) callsParams.set('outcome', outcomeFilter)
  interface CallsResponse { data: Call[]; pagination: { total: number; totalPages: number } }
  const callsQuery = useApi<CallsResponse>(`/calls?${callsParams}`)
  const calls = callsQuery.data?.data ?? []
  const callTotal = callsQuery.data?.pagination.total ?? 0
  const callTotalPages = callsQuery.data?.pagination.totalPages ?? 0
  const callsLoading = callsQuery.loading
  const fetchCalls = callsQuery.refetch

  /* Dialer Lists state */
  const [listPage, setListPage] = useState(1)

  const listsParams = new URLSearchParams({ page: String(listPage), limit: '25' })
  interface ListsResponse { data: DialerList[]; pagination: { total: number; totalPages: number } }
  const listsQuery = useApi<ListsResponse>(`/dialer-lists?${listsParams}`)
  const lists = listsQuery.data?.data ?? []
  const listTotal = listsQuery.data?.pagination.total ?? 0
  const listTotalPages = listsQuery.data?.pagination.totalPages ?? 0
  const listsLoading = listsQuery.loading
  const fetchLists = listsQuery.refetch

  /* Add List modal */
  const [showAddList, setShowAddList] = useState(false)
  const [addName, setAddName] = useState('')
  const [addAssigned, setAddAssigned] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [addSubmitting, setAddSubmitting] = useState(false)

  /* Dial-Next / Log-Call modal */
  const [callModalOpen, setCallModalOpen] = useState(false)
  const [callModalListId, setCallModalListId] = useState<string | null>(null)
  const [callModalIndex, setCallModalIndex] = useState<number>(0)
  const [callModalContact, setCallModalContact] = useState<ContactLite | null>(null)
  const [callModalLoading, setCallModalLoading] = useState(false)
  const [callPhone, setCallPhone] = useState('')
  const [callOutcome, setCallOutcome] = useState('connected')
  const [callDuration, setCallDuration] = useState('0')
  const [callNotes, setCallNotes] = useState('')
  const [callError, setCallError] = useState<string | null>(null)
  const [callSubmitting, setCallSubmitting] = useState(false)

  /* ── SSE refresh subscriptions ────────────────────────── */
  useEntitySubscription('call', fetchCalls)
  useEntitySubscription('dialerList', fetchLists)

  /* ── KPI computations ─────────────────────────────────── */

  const outboundCalls = calls.filter(c => c.direction === 'outbound').length
  const avgDuration = calls.length
    ? Math.round(calls.reduce((s, c) => s + c.duration, 0) / calls.length)
    : 0
  const callbacks = calls.filter(c => c.outcome === 'callback').length

  const activeLists = lists.filter(l => l.status === 'active').length
  const totalContacts = lists.reduce((s, l) => s + l.totalContacts, 0)

  /* ── Dial-Next flow ───────────────────────────────────── */

  const openCallModalForList = useCallback(async (list: DialerList) => {
    const ids = parseContactIds(list.contactIds)
    if (ids.length === 0) {
      setCallModalListId(null)
      setCallModalContact(null)
      setCallPhone('')
      setCallModalIndex(0)
      setCallOutcome('connected'); setCallDuration('0'); setCallNotes('')
      setCallError('This list has no contacts. Add contacts before dialing.')
      setCallModalOpen(true)
      return
    }
    let idx = getCursor(list.id) % ids.length
    if (!Number.isFinite(idx) || idx < 0) idx = 0
    const contactId = ids[idx]
    setCallModalListId(list.id)
    setCallModalIndex(idx)
    setCallError(null)
    setCallOutcome('connected'); setCallDuration('0'); setCallNotes('')
    setCallModalOpen(true)
    setCallModalLoading(true)
    setCallModalContact(null)
    setCallPhone('')
    try {
      const res = await fetch(`/api/contacts/${contactId}`, { cache: 'no-store' })
      const json = await res.json()
      const c: ContactLite | null = json.data ?? null
      setCallModalContact(c)
      setCallPhone(c?.phone ?? '')
    } catch (err) {
      setCallError(err instanceof Error ? err.message : 'Could not load contact')
    } finally {
      setCallModalLoading(false)
    }
  }, [])

  const openAdHocCallModal = useCallback(() => {
    setCallModalListId(null)
    setCallModalContact(null)
    setCallModalIndex(0)
    setCallPhone('')
    setCallOutcome('connected'); setCallDuration('0'); setCallNotes('')
    setCallError(null)
    setCallModalOpen(true)
  }, [])

  const closeCallModal = useCallback(() => {
    if (callSubmitting) return
    setCallModalOpen(false)
    setCallModalContact(null)
    setCallError(null)
  }, [callSubmitting])

  const submitCall = useCallback(async () => {
    setCallError(null)
    if (!callPhone.trim()) { setCallError('Phone number is required'); return }
    const dur = parseInt(callDuration || '0', 10)
    if (!Number.isFinite(dur) || dur < 0) { setCallError('Duration must be a non-negative number'); return }
    setCallSubmitting(true)
    try {
      const res = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: callModalContact?.id ?? null,
          direction: 'outbound',
          phoneNumber: callPhone.trim(),
          status: 'completed',
          duration: dur,
          outcome: callOutcome,
          notes: callNotes.trim(),
          startedAt: new Date(Date.now() - dur * 1000).toISOString(),
          endedAt: new Date().toISOString(),
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setCallError(j.error ?? 'Failed to log call')
        return
      }
      // Advance cursor for the active list (if any)
      if (callModalListId) {
        const list = lists.find(l => l.id === callModalListId)
        const ids = list ? parseContactIds(list.contactIds) : []
        if (ids.length > 0) {
          const next = (callModalIndex + 1) % ids.length
          setCursor(callModalListId, next)
        }
      }
      setCallModalOpen(false)
      setCallModalContact(null)
      fetchCalls()
    } catch (err) {
      setCallError(err instanceof Error ? err.message : 'Failed to log call')
    } finally {
      setCallSubmitting(false)
    }
  }, [callPhone, callDuration, callOutcome, callNotes, callModalContact, callModalListId, callModalIndex, lists, fetchCalls])

  /* ── Add-list submit ──────────────────────────────────── */

  const submitAddList = useCallback(async () => {
    setAddError(null)
    if (!addName.trim()) { setAddError('Name is required'); return }
    setAddSubmitting(true)
    try {
      const res = await fetch('/api/dialer-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addName.trim(),
          assignedTo: addAssigned.trim() || null,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setAddError(j.error ?? 'Failed to create list')
        return
      }
      setAddName(''); setAddAssigned('')
      setShowAddList(false)
      fetchLists()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to create list')
    } finally {
      setAddSubmitting(false)
    }
  }, [addName, addAssigned, fetchLists])

  /* ── Render ───────────────────────────────────────────── */

  return (
    <>
      <Topbar
        title={t('title')}
        sub={t('subtitle')}
        onAdd={activeTab === 'lists' ? () => setShowAddList(true) : openAdHocCallModal}
        addLabel={activeTab === 'lists' ? 'List' : 'Log Call'}
      />

      <div style={{ padding: '18px 24px 40px' }}>
        {/* ── Tab buttons ─────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
          <TabButton active={activeTab === 'calls'} onClick={() => setActiveTab('calls')}>
            <Phone size={13} /> Call Log
          </TabButton>
          <TabButton active={activeTab === 'lists'} onClick={() => setActiveTab('lists')}>
            <List size={13} /> Dialer Lists
          </TabButton>
        </div>

        {/* ════════════════════════════════════════════════════
            CALL LOG TAB
           ════════════════════════════════════════════════════ */}
        {activeTab === 'calls' && (
          <>
            {/* KPI Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
              <KpiCard icon="zap" label="Total Calls" value={String(callTotal)} />
              <KpiCard icon="trending-up" label="Outbound" value={String(outboundCalls)} />
              <KpiCard icon="calendar" label="Avg Duration" value={formatDuration(avgDuration)} />
              <KpiCard icon="target" label="Callbacks" value={String(callbacks)} />
            </div>

            {/* Outcome filter */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <FilterSelect
                value={outcomeFilter}
                onChange={v => { setOutcomeFilter(v); setCallPage(1) }}
                options={[
                  { value: '', label: 'All Outcomes' },
                  ...OUTCOMES,
                ]}
              />
            </div>

            {/* Calls table */}
            <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 90px 110px 140px 1fr', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)' }}>
                <span>Phone Number</span>
                <span>Direction</span>
                <span>Duration</span>
                <span>Outcome</span>
                <span>Started At</span>
                <span>Notes</span>
              </div>

              {callsLoading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>Loading...</div>
              ) : calls.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>No calls found.</div>
              ) : calls.map((call, idx) => (
                <div key={call.id} style={{
                  display: 'grid', gridTemplateColumns: '1fr 100px 90px 110px 140px 1fr',
                  gap: 12, padding: '10px 16px',
                  borderBottom: idx < calls.length - 1 ? '1px solid var(--border)' : 'none',
                  fontSize: 12, alignItems: 'center',
                  background: idx % 2 === 1 ? 'color-mix(in srgb, var(--bg2) 30%, transparent)' : 'transparent',
                }}>
                  <span style={{ fontWeight: 600, color: 'var(--txt)' }}>{call.phoneNumber}</span>

                  <span style={{
                    padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                    textTransform: 'uppercase', display: 'inline-block', maxWidth: 'fit-content',
                    background: DIRECTION_COLORS[call.direction]?.bg ?? 'var(--bg2)',
                    color: DIRECTION_COLORS[call.direction]?.txt ?? 'var(--txt2)',
                  }}>
                    {call.direction}
                  </span>

                  <span style={{ fontFamily: 'var(--font-red-hat-mono), monospace', fontWeight: 500 }}>
                    {formatDuration(call.duration)}
                  </span>

                  <span style={{
                    padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                    textTransform: 'uppercase', display: 'inline-block', maxWidth: 'fit-content',
                    background: OUTCOME_COLORS[call.outcome]?.bg ?? 'var(--bg2)',
                    color: OUTCOME_COLORS[call.outcome]?.txt ?? 'var(--txt2)',
                  }}>
                    {(call.outcome || '—').replace('_', ' ')}
                  </span>

                  <span style={{ fontSize: 11, color: 'var(--txt2)', fontFamily: 'var(--font-red-hat-mono), monospace' }}>
                    {new Date(call.startedAt).toLocaleDateString()}{' '}
                    {new Date(call.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  <span style={{
                    fontSize: 11, color: 'var(--txt3)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {call.notes || '-'}
                  </span>
                </div>
              ))}
            </div>

            <Pagination page={callPage} totalPages={callTotalPages} total={callTotal} onPageChange={setCallPage} />
          </>
        )}

        {/* ════════════════════════════════════════════════════
            DIALER LISTS TAB
           ════════════════════════════════════════════════════ */}
        {activeTab === 'lists' && (
          <>
            {/* KPI Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
              <KpiCard icon="folder" label="Total Lists" value={String(listTotal)} />
              <KpiCard icon="zap" label="Active" value={String(activeLists)} />
              <KpiCard icon="users" label="Total Contacts" value={String(totalContacts)} />
            </div>

            {/* List cards */}
            {listsLoading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>Loading...</div>
            ) : lists.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>No dialer lists yet.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12, marginBottom: 16 }}>
                {lists.map(list => {
                  const ids = parseContactIds(list.contactIds)
                  const cursor = ids.length > 0 ? getCursor(list.id) % ids.length : 0
                  const remaining = Math.max(0, ids.length - cursor)
                  const canDial = list.status === 'active' && ids.length > 0

                  return (
                    <div key={list.id} style={{
                      background: 'var(--panel)', border: '1px solid var(--border)',
                      borderRadius: 12, padding: '16px 18px',
                      boxShadow: 'var(--shadow-sm)',
                      display: 'flex', flexDirection: 'column', gap: 10,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt)' }}>{list.name}</span>
                        <span style={{
                          padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                          textTransform: 'uppercase',
                          background: LIST_STATUS_COLORS[list.status]?.bg ?? 'var(--bg2)',
                          color: LIST_STATUS_COLORS[list.status]?.txt ?? 'var(--txt2)',
                        }}>
                          {list.status}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                          <span style={{ color: 'var(--txt3)' }}>Contacts</span>
                          <span style={{ fontWeight: 600, fontFamily: 'var(--font-red-hat-mono), monospace', color: 'var(--txt)' }}>
                            {list.totalContacts}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                          <span style={{ color: 'var(--txt3)' }}>Remaining</span>
                          <span style={{ fontWeight: 600, fontFamily: 'var(--font-red-hat-mono), monospace', color: 'var(--txt)' }}>
                            {remaining}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                          <span style={{ color: 'var(--txt3)' }}>Assigned To</span>
                          <span style={{ color: 'var(--txt2)' }}>
                            {list.assignedTo ?? 'Unassigned'}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <button
                          onClick={() => openCallModalForList(list)}
                          disabled={!canDial}
                          style={{
                            flex: 1, padding: '8px 12px', borderRadius: 8,
                            border: 'none',
                            background: canDial ? 'var(--accent)' : 'var(--bg2)',
                            color: canDial ? '#fff' : 'var(--txt3)',
                            fontSize: 12, fontWeight: 600,
                            cursor: canDial ? 'pointer' : 'not-allowed',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            fontFamily: 'inherit',
                          }}
                        >
                          <PhoneCall size={13} /> Dial Next
                        </button>
                        {ids.length > 0 && (
                          <button
                            onClick={() => { setCursor(list.id, 0); fetchLists() }}
                            title="Reset position to first contact"
                            style={{
                              padding: '8px 12px', borderRadius: 8,
                              border: '1px solid var(--border)', background: 'var(--bg2)',
                              fontSize: 11, color: 'var(--txt2)', cursor: 'pointer',
                              fontFamily: 'inherit',
                            }}
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <Pagination page={listPage} totalPages={listTotalPages} total={listTotal} onPageChange={setListPage} />
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════
          ADD LIST MODAL
         ═══════════════════════════════════════════════════ */}
      {showAddList && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Add dialer list"
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.35)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => !addSubmitting && setShowAddList(false)}
        >
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--panel)', borderRadius: 16,
            border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)',
            padding: '24px 28px', width: 420, maxHeight: '80vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Add Dialer List</div>
              <button
                onClick={() => !addSubmitting && setShowAddList(false)}
                aria-label="Close"
                style={{
                  width: 28, height: 28, borderRadius: 8, border: 'none',
                  background: 'var(--bg2)', cursor: 'pointer', color: 'var(--txt3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={14} />
              </button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 18 }}>Create a new dialer list</div>

            {addError && (
              <div style={{ background: 'var(--r-bg)', color: 'var(--r-txt)', padding: '8px 12px', borderRadius: 8, fontSize: 12, marginBottom: 12 }}>
                {addError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>Name</label>
                <input value={addName} onChange={e => setAddName(e.target.value)} placeholder="e.g. Hot Leads Q2" style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg2)',
                  fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
                }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>Assigned To</label>
                <input value={addAssigned} onChange={e => setAddAssigned(e.target.value)} placeholder="Agent name" style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg2)',
                  fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
                }} />
              </div>
            </div>

            <button
              onClick={submitAddList}
              disabled={addSubmitting}
              style={{
                width: '100%', marginTop: 18, padding: '10px 0',
                borderRadius: 10, border: 'none',
                background: addSubmitting ? 'var(--bg2)' : 'var(--accent)',
                color: addSubmitting ? 'var(--txt3)' : '#fff',
                fontSize: 13, fontWeight: 600,
                cursor: addSubmitting ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >{addSubmitting ? 'Creating…' : 'Add List'}</button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          DIAL / LOG CALL MODAL
         ═══════════════════════════════════════════════════ */}
      {callModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Log call"
          style={{
            position: 'fixed', inset: 0, zIndex: 110,
            background: 'rgba(0,0,0,0.35)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}
          onClick={closeCallModal}
        >
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--panel)', borderRadius: 16,
            border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)',
            padding: '22px 26px', width: 460, maxHeight: '85vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>
                {callModalListId ? 'Dial Next Contact' : 'Log Call'}
              </div>
              <button
                onClick={closeCallModal}
                aria-label="Close"
                style={{
                  width: 28, height: 28, borderRadius: 8, border: 'none',
                  background: 'var(--bg2)', cursor: 'pointer', color: 'var(--txt3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={14} />
              </button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 14 }}>
              {callModalListId
                ? `Contact ${callModalIndex + 1} of ${(lists.find(l => l.id === callModalListId) ? parseContactIds(lists.find(l => l.id === callModalListId)!.contactIds).length : 0)}`
                : 'Manually log a call'}
            </div>

            {/* Contact context */}
            {callModalListId && (
              <div style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '12px 14px', marginBottom: 14,
              }}>
                {callModalLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--txt3)', fontSize: 12 }}>
                    <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Loading contact…
                  </div>
                ) : callModalContact ? (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>
                      {callModalContact.name ?? 'Unnamed contact'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 3, fontFamily: 'var(--font-red-hat-mono), monospace' }}>
                      {callModalContact.phone ?? 'No phone on file'}
                      {callModalContact.email && <> · {callModalContact.email}</>}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--txt3)' }}>Contact not found.</div>
                )}
              </div>
            )}

            {callError && (
              <div style={{ background: 'var(--r-bg)', color: 'var(--r-txt)', padding: '8px 12px', borderRadius: 8, fontSize: 12, marginBottom: 12 }}>
                {callError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>Phone Number</label>
                <input
                  value={callPhone}
                  onChange={e => setCallPhone(e.target.value)}
                  placeholder="+1 555 555 0123"
                  inputMode="tel"
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'var(--bg2)',
                    fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>Outcome</label>
                  <select value={callOutcome} onChange={e => setCallOutcome(e.target.value)} style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'var(--bg2)',
                    fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
                  }}>
                    {OUTCOMES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>Duration (sec)</label>
                  <input
                    value={callDuration}
                    onChange={e => setCallDuration(e.target.value.replace(/[^0-9]/g, ''))}
                    inputMode="numeric"
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: 8,
                      border: '1px solid var(--border)', background: 'var(--bg2)',
                      fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>Notes</label>
                <textarea
                  value={callNotes}
                  onChange={e => setCallNotes(e.target.value)}
                  rows={3}
                  placeholder="Call summary, next steps…"
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'var(--bg2)',
                    fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
                    resize: 'vertical', minHeight: 70,
                  }}
                />
              </div>
            </div>

            <button
              onClick={submitCall}
              disabled={callSubmitting}
              style={{
                width: '100%', marginTop: 18, padding: '10px 0',
                borderRadius: 10, border: 'none',
                background: callSubmitting ? 'var(--bg2)' : 'var(--accent)',
                color: callSubmitting ? 'var(--txt3)' : '#fff',
                fontSize: 13, fontWeight: 600,
                cursor: callSubmitting ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {callSubmitting ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Phone size={13} />}
              {callSubmitting ? 'Logging…' : (callModalListId ? 'Log Call & Advance' : 'Log Call')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

/* ── Sub-components ───────────────────────────────────────── */

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '7px 16px', borderRadius: 8,
      fontSize: 12, fontWeight: 600, cursor: 'pointer',
      border: '1px solid var(--border)',
      background: active ? 'var(--txt)' : 'var(--bg2)',
      color: active ? 'var(--panel)' : 'var(--txt2)',
      fontFamily: 'inherit',
      transition: 'all 0.15s ease',
    }}>
      {children}
    </button>
  )
}

function FilterSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel)', fontSize: 12 }}>
      <Filter size={13} style={{ color: 'var(--txt3)' }} />
      <select value={value} onChange={e => onChange(e.target.value)} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--txt)', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}
