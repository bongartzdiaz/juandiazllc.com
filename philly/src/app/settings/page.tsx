'use client'

import { useState, useEffect } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { useTheme } from '@/hooks/useTheme'
import { useLocale } from '@/hooks/useLocale'
import { useIndustry } from '@/hooks/useIndustry'
import { useToast } from '@/hooks/useToast'
import {
  User, Building2, Sliders, Plug, Moon, Sun, Globe,
  KeyRound, Target, Eye, EyeOff,
} from 'lucide-react'
import type { Industry } from '@/hooks/useIndustry'
import { useKpiStore } from '@/hooks/useKpiStore'
import { useTranslations } from 'next-intl'

/* ── Nav ─────────────────────────────────────────────── */

const NAV_ITEMS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'organization', label: 'Organization', icon: Building2 },
  { id: 'preferences', label: 'Preferences', icon: Sliders },
  { id: 'apikeys', label: 'API Keys', icon: KeyRound },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'integrations', label: 'Integrations', icon: Plug },
]

/* ── Shared styles ───────────────────────────────────── */

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--bg2)',
  fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, marginBottom: 5, display: 'block', color: 'var(--txt2)',
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 15, fontWeight: 600, marginBottom: 4,
}

const sectionSubStyle: React.CSSProperties = {
  fontSize: 11.5, color: 'var(--txt3)', marginBottom: 16,
}

const accentBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  padding: '7px 16px', borderRadius: 8,
  fontSize: 12, fontWeight: 600, cursor: 'pointer',
  background: 'var(--accent)', color: '#fff',
  border: 'none', boxShadow: 'var(--shadow-sm)',
  fontFamily: 'inherit',
}

/* ── API config definitions ──────────────────────────── */

interface ApiField { key: string; label: string; placeholder: string }
interface ApiDef { id: string; name: string; description: string; fields: ApiField[] }

const API_DEFS: ApiDef[] = [
  {
    id: 'gohighlevel', name: 'GoHighLevel CRM',
    description: 'Connect your GHL pipeline',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'ghl_api_...' },
      { key: 'locationId', label: 'Location ID', placeholder: 'loc_...' },
    ],
  },
  {
    id: 'meta', name: 'Meta Ads',
    description: 'Facebook/Instagram ad campaigns',
    fields: [
      { key: 'accessToken', label: 'Access Token', placeholder: 'EAA...' },
      { key: 'accountId', label: 'Account ID', placeholder: 'act_123456789' },
    ],
  },
  {
    id: 'googleads', name: 'Google Ads',
    description: 'Google search & display campaigns',
    fields: [
      { key: 'clientId', label: 'Client ID', placeholder: 'xxxxx.apps.googleusercontent.com' },
      { key: 'clientSecret', label: 'Client Secret', placeholder: 'GOCSPX-...' },
    ],
  },
  {
    id: 'supabase', name: 'Supabase',
    description: 'Database connection',
    fields: [
      { key: 'url', label: 'Project URL', placeholder: 'https://xxx.supabase.co' },
      { key: 'anonKey', label: 'Anon Key', placeholder: 'eyJhbGciOi...' },
    ],
  },
  {
    id: 'stripe', name: 'Stripe',
    description: 'Payment processing',
    fields: [
      { key: 'secretKey', label: 'Secret Key', placeholder: 'sk_live_...' },
    ],
  },
  {
    id: 'twilio', name: 'Twilio',
    description: 'SMS & WhatsApp messaging',
    fields: [
      { key: 'accountSid', label: 'Account SID', placeholder: 'AC...' },
      { key: 'authToken', label: 'Auth Token', placeholder: 'auth_token...' },
    ],
  },
]

/* ── Goals config per industry ───────────────────────── */

interface GoalDef { key: string; label: string; unit: string; demoValue: number; defaultTarget: number }

const GOALS_BY_INDUSTRY: Record<Industry, GoalDef[]> = {
  realestate: [
    { key: 'listings', label: 'Listings Added', unit: '#', demoValue: 4, defaultTarget: 10 },
    { key: 'deals', label: 'Deals Closed', unit: '#', demoValue: 2, defaultTarget: 5 },
    { key: 'commission', label: 'Commission Target', unit: '\u20AC', demoValue: 18500, defaultTarget: 35000 },
    { key: 'viewings', label: 'Viewings Booked', unit: '#', demoValue: 12, defaultTarget: 20 },
    { key: 'leads', label: 'New Leads', unit: '#', demoValue: 28, defaultTarget: 50 },
  ],
  philanthropy: [
    { key: 'projects', label: 'Projects Completed', unit: '#', demoValue: 3, defaultTarget: 6 },
    { key: 'people', label: 'People Helped', unit: '#', demoValue: 420, defaultTarget: 1000 },
    { key: 'co2', label: 'CO2 Reduced', unit: 'kg', demoValue: 1200, defaultTarget: 5000 },
    { key: 'donations', label: 'Donations Raised', unit: '\u20AC', demoValue: 14000, defaultTarget: 25000 },
    { key: 'partners', label: 'Partners Onboarded', unit: '#', demoValue: 2, defaultTarget: 8 },
  ],
  hospitality: [
    { key: 'occupancy', label: 'Occupancy Rate', unit: '%', demoValue: 72, defaultTarget: 85 },
    { key: 'revpar', label: 'RevPAR Target', unit: '\u20AC', demoValue: 95, defaultTarget: 120 },
    { key: 'satisfaction', label: 'Guest Satisfaction', unit: '/5', demoValue: 4.2, defaultTarget: 4.5 },
    { key: 'bookings', label: 'Bookings', unit: '#', demoValue: 148, defaultTarget: 200 },
    { key: 'fnb', label: 'F&B Revenue', unit: '\u20AC', demoValue: 32000, defaultTarget: 45000 },
  ],
}

const PERIODS = ['Daily', 'Weekly', 'Monthly', 'Yearly', 'Custom'] as const
type Period = (typeof PERIODS)[number]

/* ── Component ───────────────────────────────────────── */

export default function SettingsPage() {
  const { theme, toggle } = useTheme()
  const { industry } = useIndustry()
  const { addToast } = useToast()
  const kpi = useKpiStore(industry)
  const [activeSection, setActiveSection] = useState('profile')
  const { locale: lang, switchLocale: setLang } = useLocale()
  const t = useTranslations('settings')

  /* ── Profile state ───────────────── */
  const [profileName, setProfileName] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileRole, setProfileRole] = useState<string>('member')

  useEffect(() => {
    let cancelled = false
    setProfileLoading(true)
    fetch('/api/me', { cache: 'no-store' })
      .then(r => r.json())
      .then(j => {
        if (cancelled) return
        const u = j.data
        if (u) {
          setProfileName(u.name ?? '')
          setProfileEmail(u.email ?? '')
          setProfileRole(u.role ?? 'member')
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setProfileLoading(false) })
    return () => { cancelled = true }
  }, [])

  const saveProfile = async () => {
    if (profileSaving) return
    if (!profileName.trim()) { addToast('Name is required', 'error'); return }
    setProfileSaving(true)
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profileName.trim(), email: profileEmail.trim() }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        addToast(j.error ?? 'Failed to save profile', 'error')
        return
      }
      addToast('Profile saved', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to save profile', 'error')
    } finally {
      setProfileSaving(false)
    }
  }

  /* ── Organization state ────────── */
  const [orgName, setOrgName] = useState('')
  const [orgIndustry, setOrgIndustry] = useState('general')
  const [orgLoading, setOrgLoading] = useState(true)
  const [orgSaving, setOrgSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    setOrgLoading(true)
    fetch('/api/organization', { cache: 'no-store' })
      .then(r => r.json())
      .then(j => {
        if (cancelled) return
        const o = j.data
        if (o) {
          setOrgName(o.name ?? '')
          setOrgIndustry(o.industry ?? 'general')
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setOrgLoading(false) })
    return () => { cancelled = true }
  }, [])

  const saveOrg = async () => {
    if (orgSaving) return
    if (!orgName.trim()) { addToast('Organization name is required', 'error'); return }
    setOrgSaving(true)
    try {
      const res = await fetch('/api/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: orgName.trim(), industry: orgIndustry }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        addToast(j.error ?? 'Failed to save organization', 'error')
        return
      }
      addToast('Organization saved', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to save organization', 'error')
    } finally {
      setOrgSaving(false)
    }
  }

  /* ── API Keys state ──────────────── */
  const [apiValues, setApiValues] = useState<Record<string, Record<string, string>>>({})
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({})

  useEffect(() => {
    try {
      const stored = localStorage.getItem('pai-api-keys')
      if (stored) setApiValues(JSON.parse(stored))
    } catch { /* ignore */ }
  }, [])

  const updateApiField = (apiId: string, fieldKey: string, value: string) => {
    setApiValues(prev => ({
      ...prev,
      [apiId]: { ...(prev[apiId] || {}), [fieldKey]: value },
    }))
  }

  const saveApiKey = (apiId: string) => {
    const next = { ...apiValues }
    localStorage.setItem('pai-api-keys', JSON.stringify(next))
    addToast(`${API_DEFS.find(a => a.id === apiId)?.name} saved`, 'success')
  }

  const isConnected = (apiId: string) => {
    const vals = apiValues[apiId]
    if (!vals) return false
    const def = API_DEFS.find(a => a.id === apiId)!
    return def.fields.every(f => (vals[f.key] || '').trim().length > 0)
  }

  const toggleFieldVisibility = (fieldUid: string) => {
    setVisibleFields(prev => ({ ...prev, [fieldUid]: !prev[fieldUid] }))
  }

  /* ── Goals state ─────────────────── */
  const [goalPeriod, setGoalPeriod] = useState<Period>('Monthly')
  const [customRange, setCustomRange] = useState({ start: '', end: '' })
  const [goalTargets, setGoalTargets] = useState<Record<string, number>>({})

  useEffect(() => {
    try {
      const stored = localStorage.getItem('pai-goals')
      if (stored) setGoalTargets(JSON.parse(stored))
    } catch { /* ignore */ }
  }, [])

  const goalDefs = GOALS_BY_INDUSTRY[industry]

  const getTarget = (key: string, defaultTarget: number) =>
    goalTargets[`${industry}_${goalPeriod}_${key}`] ?? defaultTarget

  const setTarget = (key: string, value: number) => {
    setGoalTargets(prev => ({ ...prev, [`${industry}_${goalPeriod}_${key}`]: value }))
  }

  const saveGoals = () => {
    localStorage.setItem('pai-goals', JSON.stringify(goalTargets))
    addToast('Goals saved', 'success')
  }

  /* ── Render ──────────────────────── */

  return (
    <>
      <Topbar title={t('title')} sub={t('subtitle')} />

      <div style={{ padding: '18px 24px 40px', display: 'flex', gap: 18 }}>
        {/* Left nav */}
        <div style={{
          width: 200, flexShrink: 0,
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '8px', boxShadow: 'var(--shadow-sm)',
          alignSelf: 'flex-start',
        }}>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            const active = activeSection === item.id
            return (
              <button key={item.id} onClick={() => setActiveSection(item.id)} style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: active ? 'var(--accent-bg)' : 'transparent',
                color: active ? 'var(--accent-txt)' : 'var(--txt2)',
                fontSize: 12.5, fontWeight: active ? 600 : 500,
                fontFamily: 'inherit', textAlign: 'left',
                transition: 'background 0.12s',
              }}>
                <Icon size={14} />
                {item.label}
              </button>
            )
          })}
        </div>

        {/* Right content */}
        <div style={{
          flex: 1, background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '22px 26px', boxShadow: 'var(--shadow-sm)',
        }}>

          {/* ── Profile ─────────────────── */}
          {activeSection === 'profile' && (
            <div>
              <div style={sectionTitleStyle}>Profile</div>
              <div style={sectionSubStyle}>Manage your personal information</div>

              {profileLoading ? (
                <div style={{ padding: 20, fontSize: 12, color: 'var(--txt3)' }}>Loading…</div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 20 }}>
                    <div style={{
                      width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
                      background: 'var(--accent-bg)', border: '2px solid var(--accent-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, fontWeight: 700, color: 'var(--accent-txt)',
                    }}>{(profileName || 'U').slice(0, 2).toUpperCase()}</div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div>
                        <label style={labelStyle}>Full Name</label>
                        <input value={profileName} onChange={e => setProfileName(e.target.value)} style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Email</label>
                        <input value={profileEmail} onChange={e => setProfileEmail(e.target.value)} type="email" style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Role</label>
                        <div style={{
                          padding: '8px 12px', borderRadius: 8,
                          background: 'var(--bg2)', border: '1px solid var(--border)',
                          fontSize: 13, color: 'var(--txt3)', textTransform: 'capitalize',
                        }}>{profileRole}</div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={saveProfile}
                    disabled={profileSaving}
                    style={{ ...accentBtnStyle, opacity: profileSaving ? 0.6 : 1, cursor: profileSaving ? 'not-allowed' : 'pointer' }}
                  >
                    {profileSaving ? 'Saving…' : 'Save Changes'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── Organization ────────────── */}
          {activeSection === 'organization' && (
            <div>
              <div style={sectionTitleStyle}>Organization</div>
              <div style={sectionSubStyle}>Configure your organization details</div>

              {orgLoading ? (
                <div style={{ padding: 20, fontSize: 12, color: 'var(--txt3)' }}>Loading…</div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 400 }}>
                    <div>
                      <label style={labelStyle}>Organization Name</label>
                      <input value={orgName} onChange={e => setOrgName(e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Industry</label>
                      <select value={orgIndustry} onChange={e => setOrgIndustry(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                        <option value="general">General</option>
                        <option value="nonprofit">Non-Profit / NGO</option>
                        <option value="foundation">Foundation</option>
                        <option value="csr">Corporate CSR</option>
                        <option value="government">Government</option>
                        <option value="education">Education</option>
                        <option value="healthcare">Healthcare</option>
                        <option value="realestate">Real Estate</option>
                        <option value="hospitality">Hospitality</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={saveOrg}
                    disabled={orgSaving}
                    style={{ ...accentBtnStyle, marginTop: 18, opacity: orgSaving ? 0.6 : 1, cursor: orgSaving ? 'not-allowed' : 'pointer' }}
                  >
                    {orgSaving ? 'Saving…' : 'Save Changes'}
                  </button>
                  <div style={{ marginTop: 8, fontSize: 11, color: 'var(--txt3)' }}>
                    Only administrators can update organization details.
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Preferences ─────────────── */}
          {activeSection === 'preferences' && (
            <div>
              <div style={sectionTitleStyle}>Preferences</div>
              <div style={sectionSubStyle}>Customize your experience</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 400 }}>
                {/* Language toggle */}
                <div>
                  <label style={labelStyle}>Language</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['en', 'nl'] as const).map(l => (
                      <button key={l} onClick={() => setLang(l)} style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '7px 16px', borderRadius: 8,
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        background: lang === l ? 'var(--txt)' : 'var(--bg2)',
                        color: lang === l ? 'var(--panel)' : 'var(--txt2)',
                        border: lang === l ? 'none' : '1px solid var(--border)',
                        fontFamily: 'inherit',
                      }}>
                        <Globe size={12} />
                        {l === 'en' ? 'English' : 'Nederlands'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Theme toggle */}
                <div>
                  <label style={labelStyle}>Theme</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => { if (theme === 'dark') toggle() }} style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '7px 16px', borderRadius: 8,
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      background: theme === 'light' ? 'var(--txt)' : 'var(--bg2)',
                      color: theme === 'light' ? 'var(--panel)' : 'var(--txt2)',
                      border: theme === 'light' ? 'none' : '1px solid var(--border)',
                      fontFamily: 'inherit',
                    }}>
                      <Sun size={12} />
                      Light
                    </button>
                    <button onClick={() => { if (theme === 'light') toggle() }} style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '7px 16px', borderRadius: 8,
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      background: theme === 'dark' ? 'var(--txt)' : 'var(--bg2)',
                      color: theme === 'dark' ? 'var(--panel)' : 'var(--txt2)',
                      border: theme === 'dark' ? 'none' : '1px solid var(--border)',
                      fontFamily: 'inherit',
                    }}>
                      <Moon size={12} />
                      Dark
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── API Keys ────────────────── */}
          {activeSection === 'apikeys' && (
            <div>
              <div style={sectionTitleStyle}>API Keys</div>
              <div style={sectionSubStyle}>Configure API integrations for external services</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {API_DEFS.map(api => {
                  const connected = isConnected(api.id)
                  return (
                    <div key={api.id} style={{
                      padding: '16px 18px', borderRadius: 12,
                      background: 'var(--bg2)', border: '1px solid var(--border)',
                    }}>
                      {/* Header row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                              width: 8, height: 8, borderRadius: '50%',
                              background: connected ? '#22c55e' : 'var(--txt3)',
                              display: 'inline-block', flexShrink: 0,
                            }} />
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{api.name}</span>
                            <span style={{
                              fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 6,
                              background: connected ? 'rgba(34,197,94,.12)' : 'var(--panel)',
                              color: connected ? '#16a34a' : 'var(--txt3)',
                            }}>
                              {connected ? 'Connected' : 'Not configured'}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 2, paddingLeft: 16 }}>
                            {api.description}
                          </div>
                        </div>
                      </div>

                      {/* Fields */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {api.fields.map(field => {
                          const uid = `${api.id}_${field.key}`
                          const visible = visibleFields[uid] ?? false
                          return (
                            <div key={uid}>
                              <label style={{ ...labelStyle, marginBottom: 3 }}>{field.label}</label>
                              <div style={{ position: 'relative' }}>
                                <input
                                  type={visible ? 'text' : 'password'}
                                  placeholder={field.placeholder}
                                  value={apiValues[api.id]?.[field.key] ?? ''}
                                  onChange={e => updateApiField(api.id, field.key, e.target.value)}
                                  style={{ ...inputStyle, paddingRight: 36 }}
                                />
                                <button
                                  onClick={() => toggleFieldVisibility(uid)}
                                  style={{
                                    position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: 'var(--txt3)', padding: 2, display: 'flex',
                                  }}
                                  tabIndex={-1}
                                  aria-label={visible ? 'Hide' : 'Show'}
                                >
                                  {visible ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Save */}
                      <div style={{ marginTop: 12 }}>
                        <button onClick={() => saveApiKey(api.id)} style={{
                          ...accentBtnStyle, fontSize: 11, padding: '6px 14px',
                        }}>Save</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Goals ───────────────────── */}
          {activeSection === 'goals' && (
            <div>
              <div style={sectionTitleStyle}>Goals</div>
              <div style={sectionSubStyle}>Set performance targets for your team</div>

              {/* Period tabs */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                {PERIODS.map(p => (
                  <button key={p} onClick={() => setGoalPeriod(p)} style={{
                    padding: '6px 16px', borderRadius: 20,
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: goalPeriod === p ? 'var(--txt)' : 'var(--bg2)',
                    color: goalPeriod === p ? 'var(--panel)' : 'var(--txt2)',
                    border: goalPeriod === p ? 'none' : '1px solid var(--border)',
                    fontFamily: 'inherit', transition: 'background 0.12s',
                  }}>
                    {p}
                  </button>
                ))}
              </div>

              {/* Custom date range */}
              {goalPeriod === 'Custom' && (
                <div style={{ display: 'flex', gap: 12, marginBottom: 16, maxWidth: 360 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Start Date</label>
                    <input
                      type="date"
                      value={customRange.start}
                      onChange={e => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>End Date</label>
                    <input
                      type="date"
                      value={customRange.end}
                      onChange={e => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                </div>
              )}

              {/* Goal rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {goalDefs.map(g => {
                  const target = getTarget(g.key, g.defaultTarget)
                  const currentValue = Number(kpi.getKpiValue(g.key, g.demoValue))
                  const pct = target > 0 ? Math.min((currentValue / target) * 100, 100) : 0

                  return (
                    <div key={g.key} style={{
                      padding: '14px 16px', borderRadius: 12,
                      background: 'var(--bg2)', border: '1px solid var(--border)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{g.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--txt3)' }}>
                          {g.unit === '\u20AC' && '\u20AC'}{currentValue}{g.unit === '%' && '%'}{g.unit === '/5' && '/5'}{g.unit === 'kg' && ' kg'}
                          {' / '}
                          {g.unit === '\u20AC' && '\u20AC'}{target}{g.unit === '%' && '%'}{g.unit === '/5' && '/5'}{g.unit === 'kg' && ' kg'}
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div style={{
                        width: '100%', height: 6, borderRadius: 3,
                        background: 'var(--border)', marginBottom: 10, overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%', borderRadius: 3,
                          width: `${pct}%`,
                          background: pct >= 100 ? '#22c55e' : 'var(--accent)',
                          transition: 'width 0.3s',
                        }} />
                      </div>

                      {/* Inputs row */}
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ ...labelStyle, marginBottom: 3 }}>Current</label>
                          <input
                            type="number"
                            value={currentValue}
                            onChange={e => kpi.setKpiValue(g.key, Number(e.target.value))}
                            style={inputStyle}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ ...labelStyle, marginBottom: 3 }}>Target</label>
                          <input
                            type="number"
                            value={target}
                            onChange={e => setTarget(g.key, Number(e.target.value))}
                            style={inputStyle}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div style={{ marginTop: 18 }}>
                <button onClick={saveGoals} style={accentBtnStyle}>Save Goals</button>
              </div>
            </div>
          )}

          {/* ── Integrations ────────────── */}
          {activeSection === 'integrations' && (
            <div>
              <div style={sectionTitleStyle}>Integrations</div>
              <div style={sectionSubStyle}>Connect external services</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { name: 'GoHighLevel', status: 'Connected', connected: true },
                  { name: 'Supabase', status: 'Connected', connected: true },
                  { name: 'Slack', status: 'Not connected', connected: false },
                  { name: 'Google Analytics', status: 'Not connected', connected: false },
                ].map(int => (
                  <div key={int.name} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 14px', borderRadius: 10,
                    background: 'var(--bg2)', border: '1px solid var(--border)',
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{int.name}</div>
                      <div style={{ fontSize: 11, color: int.connected ? 'var(--g-txt)' : 'var(--txt3)' }}>
                        {int.status}
                      </div>
                    </div>
                    <button style={{
                      padding: '5px 14px', borderRadius: 7,
                      fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      background: int.connected ? 'var(--bg2)' : 'var(--accent)',
                      color: int.connected ? 'var(--txt2)' : '#fff',
                      border: int.connected ? '1px solid var(--border)' : 'none',
                      fontFamily: 'inherit',
                    }}>
                      {int.connected ? 'Configure' : 'Connect'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
