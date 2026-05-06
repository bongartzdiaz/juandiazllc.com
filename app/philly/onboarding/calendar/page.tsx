'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Lock } from 'lucide-react'
import {
  OnboardingFrame, obButtonSecondary, obButtonPrimary,
} from '@/components/philly/onboarding/OnboardingFrame'

export default function StepCalendar() {
  const router = useRouter()
  const [comingSoon, setComingSoon] = useState(false)

  const advance = async () => {
    // Final user-visible step → mark complete and go to /done.
    await fetch('/philly/api/onboarding/step', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 'done' }),
    })
    await fetch('/philly/api/onboarding/complete', { method: 'POST' })
    router.push('/philly/onboarding/done')
  }

  const skip = async () => {
    await fetch('/philly/api/onboarding/skip', { method: 'POST' })
    await advance()
  }

  // Calendar OAuth integration is a follow-up bundle (needs Google +
  // Microsoft app registration, refresh-token storage, callback handlers).
  // Today: we show a "coming soon" affordance so the wizard flow is
  // complete and the customer knows what's next.
  const tryConnect = (provider: 'google' | 'outlook') => {
    setComingSoon(true)
    void provider
  }

  return (
    <OnboardingFrame
      step="calendar"
      title="Connect your calendar"
      sub="Meetings sync both ways, and time spent on a deal is tracked automatically."
      footer={
        <>
          <button type="button" onClick={advance} style={obButtonPrimary}>
            Continue
          </button>
          <button type="button" onClick={skip} style={obButtonSecondary}>
            Skip — I'll connect later
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          type="button"
          onClick={() => tryConnect('google')}
          style={{
            ...obButtonSecondary, justifyContent: 'flex-start',
            padding: '12px 14px',
          }}
        >
          <Calendar size={16} style={{ color: 'var(--accent)' }} />
          Connect Google Calendar
          <Lock size={12} style={{ marginLeft: 'auto', color: 'var(--txt3)' }} aria-label="coming soon" />
        </button>
        <button
          type="button"
          onClick={() => tryConnect('outlook')}
          style={{
            ...obButtonSecondary, justifyContent: 'flex-start',
            padding: '12px 14px',
          }}
        >
          <Calendar size={16} style={{ color: 'var(--accent)' }} />
          Connect Outlook
          <Lock size={12} style={{ marginLeft: 'auto', color: 'var(--txt3)' }} aria-label="coming soon" />
        </button>
      </div>

      {comingSoon && (
        <div style={{
          marginTop: 12, padding: '10px 12px', borderRadius: 8,
          background: 'var(--bg2)', fontSize: 12, color: 'var(--txt2)',
          lineHeight: 1.5,
        }}>
          Calendar sync ships next week. For now, click <strong>Continue</strong> to finish setup —
          we'll email you when calendar is live so you can connect from <em>Settings → Integrations</em>.
        </div>
      )}

      <details style={{ marginTop: 16, fontSize: 12, color: 'var(--txt2)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Why connect?</summary>
        <ul style={{ margin: '8px 0 0 18px', padding: 0, lineHeight: 1.7 }}>
          <li>Meetings on a deal show up in DEUS without copy-paste.</li>
          <li>Time tracked per deal answers &quot;where is this hour going?&quot; on the dashboard.</li>
          <li>Reminders for follow-up calls appear next to the contact.</li>
        </ul>
      </details>
    </OnboardingFrame>
  )
}
