'use client'

import { useState, useEffect } from 'react'
import { Topbar } from '@/components/philly/layout/Topbar'
import { useTheme } from '@/hooks/philly/useTheme'
import { useLocale } from '@/hooks/philly/useLocale'
import { useIndustry } from '@/hooks/philly/useIndustry'
import { useToast } from '@/hooks/philly/useToast'
import {
  User, Building2, Sliders, Plug, Moon, Sun, Globe,
  KeyRound, Target, Eye, EyeOff,
} from 'lucide-react'
import type { Industry } from '@/hooks/philly/useIndustry'
import { useKpiStore } from '@/hooks/philly/useKpiStore'
import { useTranslations } from 'next-intl'

/* ── Nav ─────────────────────────────────────────────── */

const NAV_ITEMS = [
  { id: 'profile', navKey: 'profile', icon: User },
  { id: 'organization', navKey: 'organization', icon: Building2 },
  { id: 'preferences', navKey: 'preferences', icon: Sliders },
  { id: 'apikeys', navKey: 'apiKeys', icon: KeyRound },
  { id: 'goals', navKey: 'goals', icon: Target },
  { id: 'integrations', navKey: 'integrations', icon: Plug },
] as const

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

interface ApiField { key: string; labelKey: string; placeholder: string }
interface ApiDef { id: string; fields: ApiField[] }

const API_DEFS: ApiDef[] = [
  {
    id: 'gohighlevel',
    fields: [
      { key: 'apiKey', labelKey: 'apiKey', placeholder: 'ghl_api_...' },
      { key: 'locationId', labelKey: 'locationId', placeholder: 'loc_...' },
    ],
  },
  {
    id: 'meta',
    fields: [
      { key: 'accessToken', labelKey: 'accessToken', placeholder: 'EAA...' },
      { key: 'accountId', labelKey: 'accountId', placeholder: 'act_123456789' },
    ],
  },
  {
    id: 'googleads',
    fields: [
      { key: 'clientId', labelKey: 'clientId', placeholder: 'xxxxx.apps.googleusercontent.com' },
      { key: 'clientSecret', labelKey: 'clientSecret', placeholder: 'GOCSPX-...' },
    ],
  },
  {
    id: 'supabase',
    fields: [
      { key: 'url', labelKey: 'url', placeholder: 'https://xxx.supabase.co' },
      { key: 'anonKey', labelKey: 'anonKey', placeholder: 'eyJhbGciOi...' },
    ],
  },
  {
    id: 'stripe',
    fields: [
      { key: 'secretKey', labelKey: 'secretKey', placeholder: 'sk_live_...' },
    ],
  },
  {
    id: 'twilio',
    fields: [
      { key: 'accountSid', labelKey: 'accountSid', placeholder: 'AC...' },
      { key: 'authToken', labelKey: 'authToken', placeholder: 'auth_token...' },
    ],
  },
]

/* ── Goals config per industry ───────────────────────── */

interface GoalDef { key: string; unit: string; demoValue: number; defaultTarget: number }

const GOALS_BY_INDUSTRY: Record<Industry, GoalDef[]> = {
  realestate: [
    { key: 'listings', unit: '#', demoValue: 4, defaultTarget: 10 },
    { key: 'deals', unit: '#', demoValue: 2, defaultTarget: 5 },
    { key: 'commission', unit: '\u20AC', demoValue: 18500, defaultTarget: 35000 },
    { key: 'viewings', unit: '#', demoValue: 12, defaultTarget: 20 },
    { key: 'leads', unit: '#', demoValue: 28, defaultTarget: 50 },
  ],
  philanthropy: [
    { key: 'projects', unit: '#', demoValue: 3, defaultTarget: 6 },
    { key: 'people', unit: '#', demoValue: 420, defaultTarget: 1000 },
    { key: 'co2', unit: 'kg', demoValue: 1200, defaultTarget: 5000 },
    { key: 'donations', unit: '\u20AC', demoValue: 14000, defaultTarget: 25000 },
    { key: 'partners', unit: '#', demoValue: 2, defaultTarget: 8 },
  ],
  hospitality: [
    { key: 'occupancy', unit: '%', demoValue: 72, defaultTarget: 85 },
    { key: 'revpar', unit: '\u20AC', demoValue: 95, defaultTarget: 120 },
    { key: 'satisfaction', unit: '/5', demoValue: 4.2, defaultTarget: 4.5 },
    { key: 'bookings', unit: '#', demoValue: 148, defaultTarget: 200 },
    { key: 'fnb', unit: '\u20AC', demoValue: 32000, defaultTarget: 45000 },
  ],
}

const PERIODS = ['Daily', 'Weekly', 'Monthly', 'Yearly', 'Custom'] as const
type Period = (typeof PERIODS)[number]
const PERIOD_KEYS: Record<Period, string> = {
  Daily: 'daily', Weekly: 'weekly', Monthly: 'monthly', Yearly: 'yearly', Custom: 'custom',
}

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
    if (!profileName.trim()) { addToast(t('toasts.nameRequired'), 'error'); return }
    setProfileSaving(true)
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profileName.trim(), email: profileEmail.trim() }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        addToast(j.error ?? t('toasts.failedSaveProfile'), 'error')
        return
      }
      addToast(t('toasts.profileSaved'), 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : t('toasts.failedSaveProfile'), 'error')
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
    if (!orgName.trim()) { addToast(t('toasts.orgNameRequired'), 'error'); return }
    setOrgSaving(true)
    try {
      const res = await fetch('/api/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: orgName.trim(), industry: orgIndustry }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        addToast(j.error ?? t('toasts.failedSaveOrg'), 'error')
        return
      }
      addToast(t('toasts.orgSaved'), 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : t('toasts.failedSaveOrg'), 'error')
    } finally {
      setOrgSaving(false)
    }
  }

  /* ── API Keys state ──────────────── */
  const [apiValues, setApiValues] = useState<Record<string, Record<string, string>>>({})
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({})

  // Bundle CR — values live in React state for the page lifetime only.
  // Removed the localStorage persistence path that CodeQL flagged as
  // clear-text storage of sensitive information: tokens are no longer
  // written to disk where they'd be exposed to any same-origin script.
  // Production tenants should wire each integration through
  // `/api/integrations` (the real Integration model encrypts secrets
  // at rest via Bundle N's INTEGRATION_SECRET key).
  const PAI_KEYS_LS = 'pai-api-keys'
  useEffect(() => {
    // Best-effort cleanup of any value left over from before Bundle CR
    // when this page did persist the secret. No-op on fresh installs.
    try { localStorage.removeItem(PAI_KEYS_LS) } catch { /* ignore */ }
  }, [])

  const updateApiField = (apiId: string, fieldKey: string, value: string) => {
    setApiValues(prev => ({
      ...prev,
      [apiId]: { ...(prev[apiId] || {}), [fieldKey]: value },
    }))
  }

  const saveApiKey = (apiId: string) => {
    // Bundle CS — Bundle CR removed the localStorage persistence path
    // (clear-text storage of secrets). This panel is a UI draft until
    // it's wired to /api/integrations server-side. The toast tells the
    // operator the truth — "draft only" — instead of pretending to save.
    const name = t(`api.${apiId}.name`)
    addToast(`${name}: ${t('toasts.apiDraftNotice')}`, 'info')
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
    addToast(t('toasts.goalsSaved'), 'success')
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
                {t(`nav.${item.navKey}`)}
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
              <div style={sectionTitleStyle}>{t('sections.profile.title')}</div>
              <div style={sectionSubStyle}>{t('sections.profile.sub')}</div>

              {profileLoading ? (
                <div style={{ padding: 20, fontSize: 12, color: 'var(--txt3)' }}>{t('status.loading')}</div>
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
                        <label style={labelStyle}>{t('fields.fullName')}</label>
                        <input value={profileName} onChange={e => setProfileName(e.target.value)} style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>{t('fields.email')}</label>
                        <input value={profileEmail} onChange={e => setProfileEmail(e.target.value)} type="email" style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>{t('fields.role')}</label>
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
                    {profileSaving ? t('actions.saving') : t('actions.saveChanges')}
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── Organization ────────────── */}
          {activeSection === 'organization' && (
            <div>
              <div style={sectionTitleStyle}>{t('sections.organization.title')}</div>
              <div style={sectionSubStyle}>{t('sections.organization.sub')}</div>

              {orgLoading ? (
                <div style={{ padding: 20, fontSize: 12, color: 'var(--txt3)' }}>{t('status.loading')}</div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 400 }}>
                    <div>
                      <label style={labelStyle}>{t('fields.organizationName')}</label>
                      <input value={orgName} onChange={e => setOrgName(e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>{t('fields.industry')}</label>
                      <select value={orgIndustry} onChange={e => setOrgIndustry(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                        <option value="general">{t('industries.general')}</option>
                        <option value="nonprofit">{t('industries.nonprofit')}</option>
                        <option value="foundation">{t('industries.foundation')}</option>
                        <option value="csr">{t('industries.csr')}</option>
                        <option value="government">{t('industries.government')}</option>
                        <option value="education">{t('industries.education')}</option>
                        <option value="healthcare">{t('industries.healthcare')}</option>
                        <option value="realestate">{t('industries.realestate')}</option>
                        <option value="hospitality">{t('industries.hospitality')}</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={saveOrg}
                    disabled={orgSaving}
                    style={{ ...accentBtnStyle, marginTop: 18, opacity: orgSaving ? 0.6 : 1, cursor: orgSaving ? 'not-allowed' : 'pointer' }}
                  >
                    {orgSaving ? t('actions.saving') : t('actions.saveChanges')}
                  </button>
                  <div style={{ marginTop: 8, fontSize: 11, color: 'var(--txt3)' }}>
                    {t('status.adminOnly')}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Preferences ─────────────── */}
          {activeSection === 'preferences' && (
            <div>
              <div style={sectionTitleStyle}>{t('sections.preferences.title')}</div>
              <div style={sectionSubStyle}>{t('sections.preferences.sub')}</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 400 }}>
                {/* Language toggle */}
                <div>
                  <label style={labelStyle}>{t('fields.language')}</label>
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
                  <label style={labelStyle}>{t('fields.theme')}</label>
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
                      {t('theme.light')}
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
                      {t('theme.dark')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── API Keys ────────────────── */}
          {activeSection === 'apikeys' && (
            <div>
              <div style={sectionTitleStyle}>{t('sections.apiKeys.title')}</div>
              <div style={sectionSubStyle}>{t('sections.apiKeys.sub')}</div>

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
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{t(`api.${api.id}.name`)}</span>
                            <span style={{
                              fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 6,
                              background: connected ? 'rgba(34,197,94,.12)' : 'var(--panel)',
                              color: connected ? '#16a34a' : 'var(--txt3)',
                            }}>
                              {connected ? t('status.connected') : t('status.notConfigured')}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 2, paddingLeft: 16 }}>
                            {t(`api.${api.id}.description`)}
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
                              <label style={{ ...labelStyle, marginBottom: 3 }}>{t(`api.fieldLabels.${field.labelKey}`)}</label>
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
                                  aria-label={visible ? t('actions.hide') : t('actions.show')}
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
                        }}>{t('actions.save')}</button>
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
              <div style={sectionTitleStyle}>{t('sections.goals.title')}</div>
              <div style={sectionSubStyle}>{t('sections.goals.sub')}</div>

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
                    {t(`periods.${PERIOD_KEYS[p]}`)}
                  </button>
                ))}
              </div>

              {/* Custom date range */}
              {goalPeriod === 'Custom' && (
                <div style={{ display: 'flex', gap: 12, marginBottom: 16, maxWidth: 360 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>{t('fields.startDate')}</label>
                    <input
                      type="date"
                      value={customRange.start}
                      onChange={e => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>{t('fields.endDate')}</label>
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
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{t(`goalsList.${g.key}`)}</div>
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
                          <label style={{ ...labelStyle, marginBottom: 3 }}>{t('fields.current')}</label>
                          <input
                            type="number"
                            value={currentValue}
                            onChange={e => kpi.setKpiValue(g.key, Number(e.target.value))}
                            style={inputStyle}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ ...labelStyle, marginBottom: 3 }}>{t('fields.target')}</label>
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
                <button onClick={saveGoals} style={accentBtnStyle}>{t('actions.saveGoals')}</button>
              </div>
            </div>
          )}

          {/* ── Integrations ────────────── */}
          {activeSection === 'integrations' && (
            <div>
              <div style={sectionTitleStyle}>{t('sections.integrations.title')}</div>
              <div style={sectionSubStyle}>{t('sections.integrations.sub')}</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { key: 'gohighlevel', connected: true },
                  { key: 'supabase', connected: true },
                  { key: 'slack', connected: false },
                  { key: 'googleAnalytics', connected: false },
                ].map(int => (
                  <div key={int.key} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 14px', borderRadius: 10,
                    background: 'var(--bg2)', border: '1px solid var(--border)',
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{t(`integrationsList.${int.key}`)}</div>
                      <div style={{ fontSize: 11, color: int.connected ? 'var(--g-txt)' : 'var(--txt3)' }}>
                        {int.connected ? t('status.connected') : t('status.notConnected')}
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
                      {int.connected ? t('actions.configure') : t('actions.connect')}
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
