'use client'

import { useState, FormEvent, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { LogIn, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  )
}

function LoginPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams?.get('callbackUrl') || '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.')
      return
    }

    setLoading(true)

    const res = await signIn('credentials', {
      email: email.trim(),
      password,
      redirect: false,
      callbackUrl,
    })

    if (!res || res.error) {
      setError('Invalid email or password.')
      setLoading(false)
      return
    }

    router.push(res.url || callbackUrl)
    router.refresh()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', fontSize: 13.5, fontWeight: 500,
    background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8,
    color: 'var(--txt)', outline: 'none', transition: 'border 150ms',
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 60%, #000) 100%)',
      padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 400,
        background: 'var(--panel)', borderRadius: 16,
        boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)',
        padding: '40px 32px',
        animation: 'scaleIn 0.3s cubic-bezier(0.16,1,0.3,1)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em',
            color: 'var(--accent)',
          }}>
            Philly
          </div>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--txt3)', marginTop: 4 }}>
            Business Platform
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--txt2)', marginBottom: 5 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              style={inputStyle}
              autoFocus
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--txt2)', marginBottom: 5 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                style={{ ...inputStyle, paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt3)',
                  display: 'flex', alignItems: 'center', padding: 2,
                }}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '11px 0', fontSize: 13.5, fontWeight: 700,
              background: 'var(--accent)', color: '#fff', border: 'none',
              borderRadius: 8, cursor: loading ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: loading ? 0.7 : 1, transition: 'opacity 150ms',
            }}
          >
            {loading ? (
              <div style={{
                width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#fff', borderRadius: '50%',
                animation: 'spin 0.6s linear infinite',
              }} />
            ) : (
              <>
                <LogIn size={15} />
                Sign In
              </>
            )}
          </button>

          {/* Error */}
          {error && (
            <div style={{
              marginTop: 12, padding: '8px 12px', borderRadius: 8,
              background: 'var(--r-bg)', border: '1px solid var(--r-border, var(--border))',
              fontSize: 12, fontWeight: 500, color: 'var(--r-txt)',
            }}>
              {error}
            </div>
          )}
        </form>

        {/* Forgot password */}
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <span style={{
            fontSize: 12, color: 'var(--accent)', fontWeight: 500, cursor: 'pointer',
          }}>
            Forgot password?
          </span>
        </div>

      </div>

      {/* Spin keyframe for loader */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
