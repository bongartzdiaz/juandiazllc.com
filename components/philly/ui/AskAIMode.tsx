'use client'

/* ---------------------------------------------------------------
   Ask-AI mode for the command palette.

   The user types a request in plain English. We call /api/ai/command-plan
   to get a typed plan (understanding + ordered steps), render the plan
   transparently, and let the user run each step one-by-one via
   /api/ai/command-execute. No step runs without a click.

   Read-only + draft-only. The executor's tool registry has no write
   path in this version.
   --------------------------------------------------------------- */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, ArrowLeft, Loader2, Play, Check, X, Copy, AlertTriangle } from 'lucide-react'

/* ── Mirrors the server schema — keep in sync with command-planner.ts ── */

type TimeWindow = 'today' | 'week' | 'month' | 'quarter' | 'year'
type PlannerEntity = 'contact' | 'deal' | 'project' | 'property'

type PlanStep =
  | { tool: 'list_contacts'; args: { limit: number; createdSince?: TimeWindow; leadStatus?: string; search?: string }; rationale: string }
  | { tool: 'list_deals'; args: { limit: number; createdSince?: TimeWindow; status?: string; topByValue?: boolean }; rationale: string }
  | { tool: 'list_projects'; args: { limit: number; createdSince?: TimeWindow; status?: string }; rationale: string }
  | { tool: 'list_properties'; args: { limit: number; status?: string; topByPrice?: boolean }; rationale: string }
  | { tool: 'count_entities'; args: { entity: PlannerEntity; createdSince?: TimeWindow }; rationale: string }
  | { tool: 'search_entities'; args: { entity: PlannerEntity; query: string; limit: number }; rationale: string }
  | { tool: 'summarize_contact'; args: { identifier: string }; rationale: string }
  | { tool: 'draft_followup_email'; args: { identifier: string; angle: string }; rationale: string }
  | { tool: 'navigate_to'; args: { path: string }; rationale: string }
  | { tool: 'update_deal_stage'; args: { dealIdentifier: string; stageName: string }; rationale: string }
  | { tool: 'add_contact_note'; args: { identifier: string; note: string }; rationale: string }
  | { tool: 'set_lead_status'; args: { identifier: string; leadStatus: string }; rationale: string }
  | { tool: 'create_task'; args: { identifier: string; title: string; dueInDays: number; description?: string }; rationale: string }
  | { tool: 'schedule_followup'; args: { identifier?: string; title: string; daysOut: number; timeOfDay: 'morning' | 'afternoon'; durationMinutes: number }; rationale: string }
  | { tool: 'link_deal_to_contact'; args: { dealIdentifier: string; contactIdentifier: string }; rationale: string }

const WRITE_TOOLS = new Set<PlanStep['tool']>([
  'update_deal_stage',
  'add_contact_note',
  'set_lead_status',
  'create_task',
  'schedule_followup',
  'link_deal_to_contact',
])

interface Plan {
  understanding: string
  steps: PlanStep[]
  clarification?: string
}

interface ExecuteResult {
  ok: boolean
  tool: PlanStep['tool']
  summary: string
  data?: unknown
  error?: string
}

const TOOL_LABELS: Record<PlanStep['tool'], string> = {
  list_contacts: 'List contacts',
  list_deals: 'List deals',
  list_projects: 'List projects',
  list_properties: 'List properties',
  count_entities: 'Count',
  search_entities: 'Search',
  summarize_contact: 'Summarize contact',
  draft_followup_email: 'Draft email',
  navigate_to: 'Navigate',
  update_deal_stage: 'Move deal to stage',
  add_contact_note: 'Add note to contact',
  set_lead_status: 'Set lead status',
  create_task: 'Create task',
  schedule_followup: 'Schedule follow-up',
  link_deal_to_contact: 'Link deal to contact',
}

/* ── Component ─────────────────────────────────────────── */

export interface AskAIModeProps {
  onExit: () => void
  /** Closes the whole palette — used after a successful navigation. */
  onCloseAll: () => void
  industry?: 'realestate' | 'hospitality' | 'philanthropy' | null
}

export function AskAIMode({ onExit, onCloseAll, industry }: AskAIModeProps) {
  const [input, setInput] = useState('')
  const [planning, setPlanning] = useState(false)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [planError, setPlanError] = useState<string | null>(null)
  const [results, setResults] = useState<Record<number, ExecuteResult>>({})
  const [runningIdx, setRunningIdx] = useState<number | null>(null)
  const [confirmingIdx, setConfirmingIdx] = useState<number | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 40)
  }, [])

  const requestPlan = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || planning) return
    setPlanning(true)
    setPlanError(null)
    setPlan(null)
    setResults({})
    try {
      const res = await fetch('/philly/api/ai/command-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: trimmed, industry: industry ?? undefined }),
      })
      const json = await res.json()
      if (!res.ok) {
        setPlanError(json.error ?? 'Planner failed')
      } else {
        setPlan(json.data as Plan)
      }
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setPlanning(false)
    }
  }, [input, industry, planning])

  const runStep = useCallback(async (idx: number) => {
    if (!plan || runningIdx !== null) return
    const step = plan.steps[idx]
    setRunningIdx(idx)
    try {
      const res = await fetch('/philly/api/ai/command-execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step }),
      })
      const json = await res.json()
      if (!res.ok) {
        setResults(prev => ({ ...prev, [idx]: { ok: false, tool: step.tool, summary: json.error ?? 'Failed', error: json.error } }))
      } else {
        const result = json.data as ExecuteResult
        setResults(prev => ({ ...prev, [idx]: result }))
        // navigate_to closes the whole palette + pushes the route.
        if (result.ok && result.tool === 'navigate_to') {
          const data = result.data as { path: string } | undefined
          if (data?.path) {
            onCloseAll()
            router.push(data.path)
          }
        }
      }
    } catch (err) {
      setResults(prev => ({ ...prev, [idx]: { ok: false, tool: step.tool, summary: 'Network error', error: err instanceof Error ? err.message : 'network' } }))
    } finally {
      setRunningIdx(null)
    }
  }, [plan, runningIdx, router, onCloseAll])

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      requestPlan()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onExit()
    }
  }, [requestPlan, onExit])

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
      }}>
        <button
          onClick={onExit}
          aria-label="Back to commands"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, borderRadius: 7,
            background: 'var(--bg2)', border: '1px solid var(--border)',
            color: 'var(--txt2)', cursor: 'pointer', padding: 0,
          }}
        >
          <ArrowLeft size={14} />
        </button>
        <Sparkles size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <div style={{ flex: 1, fontSize: 13, color: 'var(--txt)', fontWeight: 500 }}>
          Ask AI
        </div>
        <kbd style={{
          fontSize: 10, padding: '2px 6px', borderRadius: 4,
          background: 'var(--bg2)', border: '1px solid var(--border)',
          color: 'var(--txt3)', fontFamily: 'inherit',
        }}>
          ESC
        </kbd>
      </div>

      {/* Input */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={'Ask AI anything…  e.g. "who did we add last week in energy?"'}
          rows={2}
          style={{
            width: '100%', resize: 'none', border: 'none', background: 'transparent',
            outline: 'none', fontSize: 14, color: 'var(--txt)', padding: 0,
            fontFamily: 'inherit', lineHeight: 1.5,
          }}
        />
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 8, fontSize: 11, color: 'var(--txt3)',
        }}>
          <span>Enter to plan · Shift+Enter for newline</span>
          <button
            onClick={requestPlan}
            disabled={!input.trim() || planning}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 8,
              background: input.trim() && !planning ? 'var(--accent)' : 'var(--bg2)',
              color: input.trim() && !planning ? '#fff' : 'var(--txt3)',
              border: '1px solid ' + (input.trim() && !planning ? 'var(--accent)' : 'var(--border)'),
              fontSize: 12, fontWeight: 500, cursor: input.trim() && !planning ? 'pointer' : 'not-allowed',
            }}
          >
            {planning
              ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Planning…</>
              : <><Sparkles size={12} /> Plan</>
            }
          </button>
        </div>
      </div>

      {/* Plan body */}
      <div style={{ maxHeight: 420, overflowY: 'auto', padding: '10px 16px 14px' }}>
        {!plan && !planning && !planError && (
          <div style={{ padding: '14px 0', fontSize: 12, color: 'var(--txt3)', lineHeight: 1.6 }}>
            <div style={{ fontWeight: 600, color: 'var(--txt2)', marginBottom: 6 }}>Try:</div>
            <div>· "count deals this month"</div>
            <div>· "top 5 properties by price"</div>
            <div>· "draft a follow-up email to Marco about Q3 energy costs"</div>
            <div>· "open the pipelines settings page"</div>
          </div>
        )}

        {planError && (
          <div style={{
            padding: 12, borderRadius: 8,
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
            fontSize: 12, color: '#ef4444',
          }}>
            {planError}
          </div>
        )}

        {plan && (
          <>
            <div style={{
              padding: '10px 12px', marginBottom: 10, borderRadius: 8,
              background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
              fontSize: 12, color: 'var(--txt)', lineHeight: 1.5,
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                Understood
              </div>
              {plan.understanding}
            </div>

            {plan.clarification && (
              <div style={{
                padding: 12, borderRadius: 8,
                background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)',
                fontSize: 12, color: 'var(--txt)', lineHeight: 1.5,
              }}>
                {plan.clarification}
              </div>
            )}

            {plan.steps.map((step, idx) => {
              const result = results[idx]
              const isRunning = runningIdx === idx
              return (
                <div key={idx} style={{
                  marginTop: 10, borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--bg)',
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '10px 12px',
                  }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 6,
                      background: 'var(--bg2)', border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 600, color: 'var(--txt2)', flexShrink: 0,
                    }}>
                      {idx + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {TOOL_LABELS[step.tool]}
                        {WRITE_TOOLS.has(step.tool) && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                            fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
                            padding: '1px 6px', borderRadius: 4,
                            background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                            border: '1px solid rgba(245,158,11,0.3)',
                          }}>
                            <AlertTriangle size={9} /> writes
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--txt3)', marginBottom: 6, lineHeight: 1.5 }}>
                        {step.rationale}
                      </div>
                      <ArgsBadge step={step} />
                    </div>
                    {!result && (() => {
                      const isWrite = WRITE_TOOLS.has(step.tool)
                      const isConfirming = confirmingIdx === idx
                      if (isWrite && !isConfirming) {
                        return (
                          <button
                            onClick={() => setConfirmingIdx(idx)}
                            disabled={runningIdx !== null}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '4px 10px', borderRadius: 6,
                              background: '#f59e0b', color: '#111',
                              border: 'none', fontSize: 11, fontWeight: 600,
                              cursor: runningIdx !== null ? 'wait' : 'pointer',
                              opacity: runningIdx !== null ? 0.4 : 1,
                              flexShrink: 0,
                            }}
                          >
                            <AlertTriangle size={11} /> Review & run
                          </button>
                        )
                      }
                      if (isWrite && isConfirming) {
                        return (
                          <div style={{ display: 'inline-flex', gap: 4, flexShrink: 0 }}>
                            <button
                              onClick={() => { setConfirmingIdx(null); runStep(idx) }}
                              disabled={runningIdx !== null}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '4px 10px', borderRadius: 6,
                                background: '#dc2626', color: '#fff',
                                border: 'none', fontSize: 11, fontWeight: 600,
                                cursor: runningIdx !== null ? 'wait' : 'pointer',
                              }}
                            >
                              {isRunning
                                ? <><Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> Writing</>
                                : <><Play size={11} /> Confirm write</>
                              }
                            </button>
                            <button
                              onClick={() => setConfirmingIdx(null)}
                              style={{
                                display: 'inline-flex', alignItems: 'center',
                                padding: '4px 8px', borderRadius: 6,
                                background: 'var(--bg2)', color: 'var(--txt2)',
                                border: '1px solid var(--border)', fontSize: 11,
                                cursor: 'pointer',
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        )
                      }
                      return (
                        <button
                          onClick={() => runStep(idx)}
                          disabled={runningIdx !== null}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '4px 10px', borderRadius: 6,
                            background: 'var(--accent)', color: '#fff',
                            border: 'none', fontSize: 11, fontWeight: 500,
                            cursor: runningIdx !== null ? 'wait' : 'pointer',
                            opacity: runningIdx !== null && !isRunning ? 0.4 : 1,
                            flexShrink: 0,
                          }}
                        >
                          {isRunning
                            ? <><Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> Running</>
                            : <><Play size={11} /> Run</>
                          }
                        </button>
                      )
                    })()}
                    {result && (
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '4px 8px', borderRadius: 6, flexShrink: 0,
                        background: result.ok ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                        color: result.ok ? '#22c55e' : '#ef4444',
                        fontSize: 11, fontWeight: 500,
                      }}>
                        {result.ok ? <Check size={11} /> : <X size={11} />}
                        {result.ok ? 'Done' : 'Failed'}
                      </div>
                    )}
                  </div>

                  {result && (
                    <div style={{
                      padding: '10px 12px', borderTop: '1px solid var(--border)',
                      background: 'var(--bg2)', fontSize: 12, color: 'var(--txt2)',
                      lineHeight: 1.55,
                    }}>
                      <ResultBody result={result} />
                    </div>
                  )}
                </div>
              )
            })}

            {plan.steps.length === 0 && !plan.clarification && (
              <div style={{ padding: '18px 0', textAlign: 'center', fontSize: 12, color: 'var(--txt3)' }}>
                No steps proposed. Try being more specific.
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px', borderTop: '1px solid var(--border)',
        fontSize: 10, color: 'var(--txt3)', background: 'var(--bg2)',
      }}>
        <span>Read-only + draft-only. Nothing runs without a click.</span>
        <span>AI Command Bar · beta</span>
      </div>
    </div>
  )
}

/* ── Args summary badge ────────────────────────────────── */

function ArgsBadge({ step }: { step: PlanStep }) {
  const pieces: string[] = []
  const args = step.args as Record<string, unknown>
  for (const [k, v] of Object.entries(args)) {
    if (v === undefined || v === null || v === '' || v === false) continue
    if (k === 'limit' && v === 10) continue
    pieces.push(`${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
  }
  if (pieces.length === 0) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {pieces.map(p => (
        <span key={p} style={{
          fontSize: 10, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          padding: '2px 6px', borderRadius: 4,
          background: 'var(--bg2)', border: '1px solid var(--border)',
          color: 'var(--txt3)',
        }}>
          {p}
        </span>
      ))}
    </div>
  )
}

/* ── Result body renderers (one per tool, kept compact) ── */

function ResultBody({ result }: { result: ExecuteResult }) {
  if (!result.ok) {
    return <div style={{ color: '#ef4444' }}>{result.error ?? result.summary}</div>
  }

  if (result.tool === 'draft_followup_email') {
    const data = result.data as { draft: string; name: string } | undefined
    return (
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt3)', marginBottom: 6 }}>
          Draft for {data?.name}
        </div>
        <pre style={{
          whiteSpace: 'pre-wrap', fontFamily: 'inherit',
          margin: 0, fontSize: 12, color: 'var(--txt)',
          padding: 10, background: 'var(--panel)', borderRadius: 6,
          border: '1px solid var(--border)',
        }}>
          {data?.draft ?? ''}
        </pre>
        <button
          onClick={() => data?.draft && navigator.clipboard?.writeText(data.draft)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            marginTop: 6, padding: '3px 8px', borderRadius: 5,
            background: 'var(--bg)', border: '1px solid var(--border)',
            color: 'var(--txt2)', fontSize: 10, cursor: 'pointer',
          }}
        >
          <Copy size={10} /> Copy
        </button>
      </div>
    )
  }

  if (result.tool === 'summarize_contact') {
    const data = result.data as { name: string; email?: string; industry?: string; icpFit?: number; summary: string } | undefined
    return (
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt)', marginBottom: 2 }}>{data?.name}</div>
        {data?.email && <div style={{ fontSize: 11, color: 'var(--txt3)', marginBottom: 4 }}>{data.email}</div>}
        {(data?.industry || data?.icpFit != null) && (
          <div style={{ fontSize: 11, color: 'var(--txt3)', marginBottom: 6 }}>
            {data?.industry ? data.industry : 'Industry unknown'}
            {data?.icpFit != null ? ` · ICP ${data.icpFit}/100` : ''}
          </div>
        )}
        <div style={{ fontSize: 12, lineHeight: 1.55 }}>{data?.summary}</div>
      </div>
    )
  }

  if (result.tool === 'count_entities') {
    const data = result.data as { count: number; entity: string; window: string | null } | undefined
    return (
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 28, fontWeight: 600, color: 'var(--txt)' }}>{data?.count ?? 0}</span>
        <span style={{ fontSize: 12, color: 'var(--txt3)' }}>
          {data?.entity}{data?.count === 1 ? '' : 's'}{data?.window ? ` · last ${data.window}` : ''}
        </span>
      </div>
    )
  }

  if (result.tool === 'navigate_to') {
    const data = result.data as { path: string } | undefined
    return <div>Opening <code style={{ fontSize: 11 }}>{data?.path}</code>…</div>
  }

  if (result.tool === 'update_deal_stage') {
    const data = result.data as { previousStage?: string; stage?: string; noOp?: boolean } | undefined
    if (data?.noOp) return <div style={{ color: 'var(--txt3)' }}>{result.summary}</div>
    return <div>{data?.previousStage ?? '—'} → <strong>{data?.stage}</strong></div>
  }

  if (result.tool === 'add_contact_note') {
    const data = result.data as { name: string; appended: string } | undefined
    return (
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt3)', marginBottom: 4 }}>
          Appended to {data?.name}
        </div>
        <pre style={{
          whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0,
          fontSize: 12, color: 'var(--txt)',
          padding: 8, background: 'var(--panel)', borderRadius: 6,
          border: '1px solid var(--border)',
        }}>{data?.appended}</pre>
      </div>
    )
  }

  if (result.tool === 'set_lead_status') {
    const data = result.data as { name: string; previous?: string | null; leadStatus: string; noOp?: boolean } | undefined
    if (data?.noOp) return <div style={{ color: 'var(--txt3)' }}>{result.summary}</div>
    return <div>{data?.name}: {data?.previous ?? 'new'} → <strong>{data?.leadStatus}</strong></div>
  }

  if (result.tool === 'create_task') {
    const data = result.data as { contactName?: string; title?: string; dueAt?: string } | undefined
    return (
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt3)', marginBottom: 4 }}>
          Task for {data?.contactName}
        </div>
        <div><strong>{data?.title}</strong></div>
        {data?.dueAt && (
          <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 2 }}>
            due {new Date(data.dueAt).toLocaleString()}
          </div>
        )}
      </div>
    )
  }

  if (result.tool === 'schedule_followup') {
    const data = result.data as { title?: string; startTime?: string; contactName?: string | null } | undefined
    return (
      <div>
        <div><strong>{data?.title}</strong></div>
        {data?.startTime && (
          <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 2 }}>
            {new Date(data.startTime).toLocaleString()}
            {data.contactName ? ` · ${data.contactName}` : ''}
          </div>
        )}
      </div>
    )
  }

  if (result.tool === 'link_deal_to_contact') {
    const data = result.data as { dealTitle?: string; contactName?: string; previousContactName?: string | null; noOp?: boolean } | undefined
    if (data?.noOp) return <div style={{ color: 'var(--txt3)' }}>{result.summary}</div>
    return <div>{data?.dealTitle} → <strong>{data?.contactName}</strong>{data?.previousContactName ? ` (was ${data.previousContactName})` : ''}</div>
  }

  // list_* and search_entities share a row-list shape
  const rows = (result.data as { rows?: Array<Record<string, unknown>> } | undefined)?.rows ?? []
  if (rows.length === 0) {
    return <div style={{ color: 'var(--txt3)' }}>{result.summary}</div>
  }

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--txt3)', marginBottom: 6 }}>{result.summary}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {rows.slice(0, 10).map((row, i) => (
          <div key={i} style={{ fontSize: 12, color: 'var(--txt)' }}>
            {(row.title as string | undefined) ?? (row.name as string | undefined) ?? '—'}
            {row.status ? <span style={{ color: 'var(--txt3)' }}> · {row.status as string}</span> : null}
            {row.email ? <span style={{ color: 'var(--txt3)' }}> · {row.email as string}</span> : null}
            {row.city ? <span style={{ color: 'var(--txt3)' }}> · {row.city as string}</span> : null}
          </div>
        ))}
      </div>
    </div>
  )
}
