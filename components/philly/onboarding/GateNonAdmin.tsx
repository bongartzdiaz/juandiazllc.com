'use client'

import Link from 'next/link'
import { Shield } from 'lucide-react'
import { obButtonPrimary } from './OnboardingFrame'

/**
 * Empty state for manager + viewer roles who land on /philly/onboarding/*.
 * Friendly, no 403-flavor — they just don't need to do this.
 */
export function GateNonAdmin() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px', background: 'var(--bg)',
    }}>
      <div style={{
        maxWidth: 460, textAlign: 'center',
        background: 'var(--panel)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '32px 24px',
      }}>
        <Shield size={28} style={{ color: 'var(--txt3)', marginBottom: 12 }} aria-hidden="true" />
        <h1 style={{
          fontSize: 18, fontWeight: 700, margin: '0 0 8px',
          color: 'var(--txt)',
        }}>Your admin handles setup</h1>
        <p style={{
          fontSize: 13, color: 'var(--txt2)', lineHeight: 1.5,
          margin: '0 0 20px',
        }}>
          Only the organization admin runs the setup wizard. Once they finish,
          you'll have full access to contacts, deals, and the rest of DEUS.
        </p>
        <Link href="/philly" style={{ ...obButtonPrimary, textDecoration: 'none' }}>
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
