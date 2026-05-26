'use client'

/* /assistant — in-app AI help center.
   Streams responses from /api/assistant/ask via NDJSON.
   Conversations persist server-side; sidebar lists them. */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useConfirm } from '@/hooks/philly/useConfirm'
import { Topbar } from '@/components/philly/layout/Topbar'
import { Send, MessageSquare, Trash2, AlertCircle, ExternalLink } from 'lucide-react'

interface Citation {
  slug: string
  title: string
  score: number
}

interface Memory {
  key: string
  value: string
}

interface Turn {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
}

interface ConversationSummary {
  id: string
  title: string
  updatedAt: string
  _count: { turns: number }
}

export default function AssistantPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [turns, setTurns] = useState<Turn[]>([])
  const [draft, setDraft] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [memories, setMemories] = useState<Memory[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const tConfirms = useTranslations('confirms')
  const tCommon = useTranslations('common')
  const confirm = useConfirm()

  // Load conversation list on mount
  const loadList = useCallback(async () => {
    const res = await fetch('/api/assistant/conversations', { cache: 'no-store' })
    if (!res.ok) return
    const json = await res.json()
    setConversations(json.conversations ?? [])
  }, [])

  useEffect(() => {
    loadList()
  }, [loadList])

  // Load a specific conversation
  const openConversation = useCallback(async (id: string) => {
    setActiveId(id)
    setError(null)
    setMemories([])
    const res = await fetch(`/api/assistant/conversations/${id}`, { cache: 'no-store' })
    if (!res.ok) {
      setError('Failed to load conversation')
      return
    }
    const json = await res.json()
    const data = json.data as { turns: Array<{ id: string; role: string; content: string; retrievedDocs: string }> }
    setTurns(
      data.turns.map((t) => {
        let citations: Citation[] | undefined
        try {
          citations = JSON.parse(t.retrievedDocs || '[]')
        } catch { /* leave undefined */ }
        return { id: t.id, role: t.role as 'user' | 'assistant', content: t.content, citations }
      }),
    )
  }, [])

  const startNew = useCallback(() => {
    setActiveId(null)
    setTurns([])
    setError(null)
    setMemories([])
  }, [])

  const deleteConversation = useCallback(async (id: string) => {
    const ok = await confirm({
      title: tConfirms('deleteGeneric.title', { entityType: tConfirms('entities.conversation') }),
      body: tConfirms('deleteGeneric.body'),
      confirmLabel: tCommon('delete'),
      cancelLabel: tCommon('cancel'),
      danger: true,
    })
    if (!ok) return
    const res = await fetch(`/api/assistant/conversations/${id}`, { method: 'DELETE' })
    if (res.ok) {
      if (activeId === id) startNew()
      loadList()
    }
  }, [activeId, loadList, startNew, confirm, tConfirms, tCommon])

  // Auto-scroll to bottom on new content
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [turns, streaming])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.trim() || streaming) return
    const message = draft.trim()
    setDraft('')
    setError(null)
    setMemories([])

    // Optimistically add the user turn
    const userTurnId = `local-${Date.now()}`
    setTurns((t) => [...t, { id: userTurnId, role: 'user', content: message }])
    // Add a placeholder assistant turn we'll fill in as deltas arrive
    const assistantPlaceholderId = `local-asst-${Date.now()}`
    setTurns((t) => [...t, { id: assistantPlaceholderId, role: 'assistant', content: '', citations: [] }])
    setStreaming(true)

    try {
      const res = await fetch('/api/assistant/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, conversationId: activeId ?? undefined }),
      })
      if (!res.ok || !res.body) {
        const body = await res.text().catch(() => '')
        throw new Error(body.slice(0, 300) || `HTTP ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let receivedConversationId: string | null = null
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let nl = buffer.indexOf('\n')
        while (nl !== -1) {
          const line = buffer.slice(0, nl).trim()
          buffer = buffer.slice(nl + 1)
          if (line) {
            try {
              const evt = JSON.parse(line)
              if (evt.type === 'start') {
                receivedConversationId = evt.conversationId
              } else if (evt.type === 'citation') {
                setTurns((t) =>
                  t.map((turn) =>
                    turn.id === assistantPlaceholderId
                      ? { ...turn, citations: [...(turn.citations ?? []), { slug: evt.slug, title: evt.title, score: evt.score }] }
                      : turn,
                  ),
                )
              } else if (evt.type === 'delta') {
                setTurns((t) =>
                  t.map((turn) =>
                    turn.id === assistantPlaceholderId
                      ? { ...turn, content: turn.content + evt.content }
                      : turn,
                  ),
                )
              } else if (evt.type === 'memory') {
                setMemories((m) => [...m, { key: evt.key, value: evt.value }])
              } else if (evt.type === 'error') {
                setError(evt.message)
              }
            } catch {
              // Ignore malformed lines.
            }
          }
          nl = buffer.indexOf('\n')
        }
      }

      // If this was a new conversation, capture its id and refresh the list.
      if (!activeId && receivedConversationId) {
        setActiveId(receivedConversationId)
        loadList()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setStreaming(false)
    }
  }

  return (
    <>
      <Topbar title="Assistant" sub="Ask anything about how to use the CRM" />
      <div style={{ display: 'flex', height: 'calc(100vh - 60px)' }}>
        {/* Sidebar */}
        <aside
          style={{
            width: 260, flexShrink: 0,
            borderRight: '1px solid var(--border)',
            background: 'var(--panel)',
            display: 'flex', flexDirection: 'column',
          }}
        >
          <button
            onClick={startNew}
            style={{
              margin: 12, padding: '8px 12px', borderRadius: 8,
              background: 'var(--accent)', color: '#fff', border: 'none',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <MessageSquare size={13} /> New chat
          </button>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {conversations.length === 0 ? (
              <div style={{ padding: '20px 12px', fontSize: 11, color: 'var(--txt3)', textAlign: 'center' }}>
                No conversations yet
              </div>
            ) : (
              conversations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => openConversation(c.id)}
                  style={{
                    padding: '10px 12px', borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    background: c.id === activeId ? 'var(--bg2)' : 'transparent',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12.5, fontWeight: 600, lineHeight: 1.3,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {c.title}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--txt3)' }}>
                      {c._count.turns} message{c._count.turns === 1 ? '' : 's'}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteConversation(c.id) }}
                    aria-label="Delete conversation"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--txt3)', padding: 4,
                      display: 'flex', alignItems: 'center',
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Main chat area */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 32px' }}>
            {turns.length === 0 && !streaming && (
              <div style={{
                maxWidth: 600, margin: '60px auto', textAlign: 'center',
                color: 'var(--txt3)',
              }}>
                <h2 style={{ fontSize: 20, color: 'var(--txt)', marginBottom: 8 }}>
                  How can I help?
                </h2>
                <p style={{ fontSize: 13 }}>
                  I know how every feature in this CRM works. Ask me a question
                  in plain language — for example "How do I invite a teammate?"
                  or "What does the audit log show?".
                </p>
              </div>
            )}
            {turns.map((turn) => (
              <TurnView key={turn.id} turn={turn} />
            ))}
            {memories.length > 0 && (
              <div style={{
                margin: '12px auto', maxWidth: 720, padding: 10, borderRadius: 8,
                background: 'var(--y-bg)', border: '1px solid var(--y-border)',
                fontSize: 11, color: 'var(--y-txt)',
              }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Saved to memory:</div>
                {memories.map((m, i) => (
                  <div key={i}>
                    <code>{m.key}</code> = {m.value}
                  </div>
                ))}
              </div>
            )}
            {error && (
              <div role="alert" style={{
                margin: '12px auto', maxWidth: 720, padding: 12, borderRadius: 8,
                background: 'var(--r-bg)', border: '1px solid var(--r-border)',
                fontSize: 12, color: 'var(--r-txt)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <AlertCircle size={14} />
                {error}
              </div>
            )}
          </div>

          {/* Composer */}
          <form
            onSubmit={submit}
            style={{
              borderTop: '1px solid var(--border)', padding: 16,
              background: 'var(--panel)',
            }}
          >
            <div style={{
              maxWidth: 720, margin: '0 auto',
              display: 'flex', gap: 8, alignItems: 'flex-end',
            }}>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    submit(e as unknown as React.FormEvent)
                  }
                }}
                placeholder="Ask a question…"
                disabled={streaming}
                rows={2}
                style={{
                  flex: 1, padding: '10px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg)',
                  color: 'var(--txt)', fontSize: 13, resize: 'none',
                  fontFamily: 'inherit', outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={!draft.trim() || streaming}
                style={{
                  padding: '10px 16px', borderRadius: 8,
                  background: 'var(--accent)', color: '#fff', border: 'none',
                  fontSize: 12, fontWeight: 600,
                  cursor: streaming || !draft.trim() ? 'default' : 'pointer',
                  opacity: streaming || !draft.trim() ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontFamily: 'inherit',
                }}
              >
                <Send size={13} />
                {streaming ? 'Thinking…' : 'Send'}
              </button>
            </div>
          </form>
        </main>
      </div>
    </>
  )
}

function TurnView({ turn }: { turn: Turn }) {
  const isUser = turn.role === 'user'
  return (
    <div style={{
      maxWidth: 720, margin: '0 auto 16px',
      display: 'flex', flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
    }}>
      <div style={{
        maxWidth: '85%', padding: '10px 14px', borderRadius: 12,
        background: isUser ? 'var(--accent)' : 'var(--bg2)',
        color: isUser ? '#fff' : 'var(--txt)',
        fontSize: 13.5, lineHeight: 1.55,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        {turn.content || (turn.role === 'assistant' && (
          <span style={{ opacity: 0.6 }}>…</span>
        ))}
      </div>
      {!isUser && turn.citations && turn.citations.length > 0 && (
        <div style={{
          marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap',
        }}>
          {turn.citations.map((c) => (
            <a
              key={c.slug}
              href={`/docs/${c.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 10.5, padding: '2px 8px', borderRadius: 6,
                background: 'var(--bg2)', color: 'var(--txt2)',
                border: '1px solid var(--border)',
                textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}
              title={`Relevance: ${(c.score * 100).toFixed(0)}%`}
            >
              <ExternalLink size={9} />
              {c.title}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
