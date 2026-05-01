/* ---------------------------------------------------------------
   Drip campaign — step schema + scheduling helpers
   ---------------------------------------------------------------
   Bundle BZ. Pure functions only — no I/O — so the cron dispatcher
   stays testable.

   A campaign's `stepsJson` column is `DripStep[]`:

     interface DripStep {
       day: number          // delay from enrollment, in DAYS
       channel: 'email' | 'sms'
       templateId?: string  // optional MessageTemplate.id ref
       subject?: string     // email only
       body: string         // free-text body (interpolatable)
     }

   The first step fires at `enrolledAt + step[0].day` days.
   Subsequent steps fire at `enrolledAt + step[i].day` days —
   `day` is always relative to enrollment, NOT to the previous
   step. That keeps the schedule deterministic even if a step
   delivery is delayed by a transient provider error.
   --------------------------------------------------------------- */

const MS_PER_DAY = 24 * 60 * 60 * 1000

export interface DripStep {
  day: number
  channel: 'email' | 'sms'
  templateId?: string
  subject?: string
  body: string
}

/** Parse + validate a stepsJson payload. Returns [] on any structural
 *  error so a malformed campaign can't crash the dispatcher. */
export function parseSteps(json: unknown): DripStep[] {
  let raw: unknown
  if (typeof json === 'string') {
    try { raw = JSON.parse(json) } catch { return [] }
  } else {
    raw = json
  }
  if (!Array.isArray(raw)) return []
  const out: DripStep[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const s = item as Record<string, unknown>
    const day = typeof s.day === 'number' && Number.isFinite(s.day) ? Math.max(0, Math.floor(s.day)) : null
    const channel = s.channel === 'email' || s.channel === 'sms' ? s.channel : null
    const body = typeof s.body === 'string' ? s.body : ''
    if (day === null || channel === null || !body) continue
    out.push({
      day,
      channel,
      ...(typeof s.subject === 'string' ? { subject: s.subject } : {}),
      ...(typeof s.templateId === 'string' ? { templateId: s.templateId } : {}),
      body,
    })
  }
  // Stable sort by day ascending so step[i] < step[i+1] in time.
  out.sort((a, b) => a.day - b.day)
  return out
}

/** Compute the firing time for a given step relative to the
 *  enrollment time. */
export function dueAtForStep(enrolledAt: Date, step: DripStep): Date {
  return new Date(enrolledAt.getTime() + step.day * MS_PER_DAY)
}

export interface AdvanceResult {
  /** New lastStepIndex after this advance. */
  nextStepIndex: number
  /** When the *next* step (lastStepIndex + 1) is due. Null when the
   *  enrollment is complete. */
  nextDueAt: Date | null
  /** Whether the enrollment is complete after this advance. */
  done: boolean
}

/**
 * Given the current lastStepIndex + the parsed step list + the
 * enrolledAt timestamp, compute the new state after a successful
 * delivery of step[lastStepIndex + 1].
 */
export function advanceAfterDelivery(
  lastStepIndex: number,
  steps: DripStep[],
  enrolledAt: Date,
): AdvanceResult {
  const justDelivered = lastStepIndex + 1
  const newLast = justDelivered
  const nextIdx = newLast + 1
  if (nextIdx >= steps.length) {
    return { nextStepIndex: newLast, nextDueAt: null, done: true }
  }
  return {
    nextStepIndex: newLast,
    nextDueAt: dueAtForStep(enrolledAt, steps[nextIdx]),
    done: false,
  }
}

/** Initial scheduling for a fresh enrollment. lastStepIndex = -1
 *  (nothing delivered); next step is steps[0] firing at
 *  enrolledAt + steps[0].day. Returns null when there are no
 *  valid steps — caller should not enroll. */
export function initialDueAt(enrolledAt: Date, steps: DripStep[]): Date | null {
  if (steps.length === 0) return null
  return dueAtForStep(enrolledAt, steps[0])
}

/** Variable interpolation for step body / subject. Today: only
 *  {{contact.name}} / {{contact.email}} / {{contact.phone}}. Keep
 *  this minimal — anything richer should be a template-engine
 *  concern, not the dispatcher's. */
export function renderTemplate(
  template: string,
  vars: { name?: string; email?: string; phone?: string; company?: string },
): string {
  return template.replace(/\{\{\s*contact\.(name|email|phone|company)\s*\}\}/g, (_m, field) => {
    const v = vars[field as keyof typeof vars]
    return typeof v === 'string' ? v : ''
  })
}
