'use client'

import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { useTheme } from '@/hooks/useTheme'
import { User, Building2, Sliders, Plug, Moon, Sun, Globe } from 'lucide-react'

const NAV_ITEMS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'organization', label: 'Organization', icon: Building2 },
  { id: 'preferences', label: 'Preferences', icon: Sliders },
  { id: 'integrations', label: 'Integrations', icon: Plug },
]

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

export default function SettingsPage() {
  const { theme, toggle } = useTheme()
  const [activeSection, setActiveSection] = useState('profile')
  const [lang, setLang] = useState<'en' | 'nl'>('en')

  return (
    <>
      <Topbar title="Settings" sub="Platform configuration" />

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

          {/* Profile section */}
          {activeSection === 'profile' && (
            <div>
              <div style={sectionTitleStyle}>Profile</div>
              <div style={sectionSubStyle}>Manage your personal information</div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 20 }}>
                {/* Avatar placeholder */}
                <div style={{
                  width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--accent-bg)', border: '2px solid var(--accent-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, fontWeight: 700, color: 'var(--accent-txt)',
                }}>JD</div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Full Name</label>
                    <input defaultValue="Juan Doe" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input defaultValue="juan@philanthropyai.org" type="email" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Role</label>
                    <div style={{
                      padding: '8px 12px', borderRadius: 8,
                      background: 'var(--bg2)', border: '1px solid var(--border)',
                      fontSize: 13, color: 'var(--txt3)',
                    }}>Administrator</div>
                  </div>
                </div>
              </div>

              <button style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '7px 16px', borderRadius: 8,
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: 'var(--accent)', color: '#fff',
                border: 'none', boxShadow: 'var(--shadow-sm)',
                fontFamily: 'inherit',
              }}>Save Changes</button>
            </div>
          )}

          {/* Organization section */}
          {activeSection === 'organization' && (
            <div>
              <div style={sectionTitleStyle}>Organization</div>
              <div style={sectionSubStyle}>Configure your organization details</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 400 }}>
                <div>
                  <label style={labelStyle}>Organization Name</label>
                  <input defaultValue="PhilanthropyAI Foundation" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Industry</label>
                  <select defaultValue="nonprofit" style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="nonprofit">Non-Profit / NGO</option>
                    <option value="foundation">Foundation</option>
                    <option value="csr">Corporate CSR</option>
                    <option value="government">Government</option>
                    <option value="education">Education</option>
                    <option value="healthcare">Healthcare</option>
                  </select>
                </div>
              </div>

              <button style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '7px 16px', borderRadius: 8, marginTop: 18,
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: 'var(--accent)', color: '#fff',
                border: 'none', boxShadow: 'var(--shadow-sm)',
                fontFamily: 'inherit',
              }}>Save Changes</button>
            </div>
          )}

          {/* Preferences section */}
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

          {/* Integrations section */}
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
