'use client'

import { useState, FormEvent } from 'react'
import { Topbar } from '@/components/philly/layout/Topbar'
import { MessageSquareText, Send, Sparkles } from 'lucide-react'

interface NLResult {
  question: string
  plan: { intent: string; entity: string; filters: Record<string, unknown>; limit: number }
  answer: string
  data: unknown[]
  count?: number
}

const EXAMPLES = [
  'How many contacts this month?',
  'Show me top 5 deals by value',
  'List active projects',
  'Show properties available',
  'Top 10 grants',
  'Recent showings',
  'Volunteers with status active',
]

export default function AIAskPage() {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<NLResult | null>(null)
  const [history, setHistory] = useState<NLResult[]>([])

  async function submit(q: string) {
    if (!q.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/philly/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      })
      const json = await res.json()
      const r: NLResult = json.data ?? { question: q, plan: { intent: 'list', entity: '', filters: {}, limit: 0 }, answer: json.error ?? 'No data', data: [] }
      setResult(r)
      setHistory(h => [r, ...h].slice(0, 20))
    } catch {
      setResult({ question: q, plan: { intent: 'list', entity: '', filters: {}, limit: 0 }, answer: 'Request failed', data: [] })
    } finally {
      setLoading(false)
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    submit(question)
  }

  return (
    <>
      <Topbar title="Ask AI" sub="Natural language queries across your data" />
      <div style={{ padding: '20px 28px 40px', maxWidth: 980, margin: '0 auto' }}>
        {/* Hero */}
        <div style={{
          background: 'linear-gradient(135deg, var(--accent) 0%, #8b5cf6 100%)',
          color: 'white', borderRadius: 14, padding: '20px 22px',
          display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em' }}>
              Ask anything about your business
            </div>
            <div style={{ fontSize: 11.5, opacity: 0.9, marginTop: 2 }}>
              Pattern-based engine — supports contacts, projects, deals, properties, showings, volunteers, grants.
            </div>
          </div>
        </div>

        {/* Input */}
        <form onSubmit={onSubmit} style={{
          display: 'flex', gap: 10, marginBottom: 16,
        }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', borderRadius: 10,
            background: 'var(--panel)', border: '1px solid var(--border)',
          }}>
            <MessageSquareText size={16} color="var(--txt3)" />
            <input
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="e.g., How many deals this month?"
              disabled={loading}
              style={{
                flex: 1, border: 'none', background: 'none',
                fontSize: 13.5, color: 'var(--txt)', outline: 'none',
                fontFamily: 'inherit',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !question.trim()}
            style={{
              padding: '10px 16px', borderRadius: 10, border: 'none',
              background: loading ? 'var(--bg2)' : 'var(--accent)',
              color: loading ? 'var(--txt3)' : '#fff',
              fontSize: 13, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: 'inherit',
            }}
          >
            <Send size={13} />
            {loading ? 'Asking…' : 'Ask'}
          </button>
        </form>

        {/* Examples */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 22 }}>
          {EXAMPLES.map(ex => (
            <button
              key={ex}
              onClick={() => { setQuestion(ex); submit(ex) }}
              disabled={loading}
              style={{
                padding: '5px 10px', borderRadius: 6,
                border: '1px solid var(--border)', background: 'var(--panel)',
                fontSize: 11, color: 'var(--txt2)', cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {ex}
            </button>
          ))}
        </div>

        {/* Current result */}
        {result && (
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, overflow: 'hidden', marginBottom: 20,
          }}>
            <div style={{
              padding: '14px 18px', borderBottom: '1px solid var(--border)',
              background: 'var(--bg2)',
            }}>
              <div style={{ fontSize: 11, color: 'var(--txt3)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 4 }}>
                Q
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt)', marginBottom: 12 }}>
                {result.question}
              </div>
              <div style={{ fontSize: 11, color: 'var(--txt3)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 4 }}>
                A
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--txt)' }}>
                {result.answer}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--txt3)', marginTop: 8,
                fontFamily: "var(--font-red-hat-mono), monospace" }}>
                plan: {result.plan.intent} → {result.plan.entity} (limit {result.plan.limit})
              </div>
            </div>
            {result.data.length > 0 && (
              <div style={{ maxHeight: 480, overflow: 'auto' }}>
                <pre style={{
                  margin: 0, padding: 16, fontSize: 11,
                  fontFamily: "var(--font-red-hat-mono), monospace",
                  color: 'var(--txt2)', whiteSpace: 'pre-wrap',
                }}>
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* History */}
        {history.length > 1 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--txt3)', letterSpacing: '0.06em', marginBottom: 10 }}>
              Recent
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {history.slice(1).map((h, i) => (
                <button
                  key={i}
                  onClick={() => setResult(h)}
                  style={{
                    padding: '10px 14px', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'var(--panel)',
                    textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt)' }}>{h.question}</div>
                  <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 2 }}>{h.answer}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
