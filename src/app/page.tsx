'use client'

import { Topbar } from '@/components/layout/Topbar'
import { KpiCard } from '@/components/ui/KpiCard'
import {
  FolderKanban, Users2, Leaf, TreePine, HeartHandshake,
  Globe2, ArrowRight, Clock, CheckCircle2,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts'

// Demo data — will be replaced with real DB queries
const DEMO_IMPACT_DAILY = [
  { month: 'Oct', co2: 1200, people: 340, donated: 15000 },
  { month: 'Nov', co2: 1800, people: 520, donated: 22000 },
  { month: 'Dec', co2: 2400, people: 610, donated: 28000 },
  { month: 'Jan', co2: 3100, people: 780, donated: 35000 },
  { month: 'Feb', co2: 3800, people: 920, donated: 41000 },
  { month: 'Mar', co2: 4500, people: 1100, donated: 48000 },
]

const DEMO_PROJECTS = [
  { id: '1', title: 'Urban Reforestation Amsterdam', status: 'active', category: 'Environment', progress: 72, sdgs: [11, 13, 15] },
  { id: '2', title: 'Clean Water Access Kenya', status: 'active', category: 'Water & Sanitation', progress: 45, sdgs: [6, 3] },
  { id: '3', title: 'Tech Education for Youth', status: 'active', category: 'Education', progress: 88, sdgs: [4, 8, 10] },
  { id: '4', title: 'Renewable Energy Transition', status: 'planned', category: 'Energy', progress: 15, sdgs: [7, 13] },
  { id: '5', title: 'Food Bank Partnership', status: 'completed', category: 'Hunger', progress: 100, sdgs: [1, 2] },
]

const DEMO_ACTIVITY = [
  { text: 'Milestone completed: "500 trees planted"', time: '2h ago', icon: 'check' },
  { text: 'New partner added: GreenTech Solutions', time: '5h ago', icon: 'user' },
  { text: 'Impact report generated for Q1 2026', time: '1d ago', icon: 'doc' },
  { text: 'Budget updated for Clean Water Access', time: '1d ago', icon: 'money' },
  { text: 'New project created: Renewable Energy', time: '2d ago', icon: 'new' },
]

const SDG_COLORS: Record<number, string> = {
  1: '#E5243B', 2: '#DDA63A', 3: '#4C9F38', 4: '#C5192D', 5: '#FF3A21',
  6: '#26BDE2', 7: '#FCC30B', 8: '#A21942', 9: '#FD6925', 10: '#DD1367',
  11: '#FD9D24', 12: '#BF8B2E', 13: '#3F7E44', 14: '#0A97D9', 15: '#56C02B',
  16: '#00689D', 17: '#19486A',
}

const statusColors: Record<string, { bg: string; txt: string; border: string }> = {
  active: { bg: 'var(--g-bg)', txt: 'var(--g-txt)', border: 'var(--g-border)' },
  completed: { bg: 'var(--accent-bg)', txt: 'var(--accent-txt)', border: 'var(--accent-border)' },
  planned: { bg: 'var(--bg2)', txt: 'var(--txt3)', border: 'var(--border)' },
  paused: { bg: 'var(--y-bg)', txt: 'var(--y-txt)', border: 'var(--y-border)' },
}

export default function DashboardPage() {
  return (
    <>
      <Topbar
        title="Dashboard"
        sub="Your impact at a glance"
        addLabel="Project"
      />

      <div style={{ padding: '18px 24px 40px' }}>
        {/* KPI Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 18 }}>
          <KpiCard label="Active Projects" value="4" delta="+1 this month" deltaDir="up" icon="folder" accentColor="var(--accent)" delay={80} />
          <KpiCard label="People Helped" value="1,100" delta="+19.6% vs last month" deltaDir="up" icon="heart" accentColor="var(--p)" delay={130} />
          <KpiCard label="CO2 Reduced" value="4.5t" delta="+18.4% vs last month" deltaDir="up" icon="leaf" accentColor="var(--g)" delay={180} />
          <KpiCard label="Trees Planted" value="2,340" delta="Target: 5,000" deltaDir="neu" icon="tree" accentColor="var(--g)" delay={230} />
          <KpiCard label="Total Donated" value="$48K" delta="12 donors active" deltaDir="up" icon="dollar-sign" hot delay={280} />
        </div>

        {/* Main Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14, marginBottom: 14 }}>
          {/* Impact Trend Chart */}
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px 18px',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, background: 'var(--accent-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Globe2 size={14} color="var(--accent)" />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Impact Overview</div>
                  <div style={{ fontSize: 10.5, color: 'var(--txt3)' }}>Cumulative impact over time</div>
                </div>
              </div>
            </div>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={DEMO_IMPACT_DAILY}>
                  <defs>
                    <linearGradient id="gradCo2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--g)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="var(--g)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradPeople" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--txt3)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--txt3)' }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--panel)', border: '1px solid var(--border)',
                      borderRadius: 8, fontSize: 12, boxShadow: 'var(--shadow)',
                    }}
                  />
                  <Area type="monotone" dataKey="co2" stroke="var(--g)" fill="url(#gradCo2)" strokeWidth={2} name="CO2 (kg)" />
                  <Area type="monotone" dataKey="people" stroke="var(--accent)" fill="url(#gradPeople)" strokeWidth={2} name="People Helped" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Activity */}
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px 18px',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, background: 'var(--bg2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Clock size={14} color="var(--txt3)" />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Recent Activity</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {DEMO_ACTIVITY.map((a, i) => (
                <div key={i} style={{
                  padding: '10px 0',
                  borderBottom: i < DEMO_ACTIVITY.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{ fontSize: 12.5, lineHeight: 1.4 }}>{a.text}</div>
                  <div className="mono" style={{ fontSize: 10.5, color: 'var(--txt3)', marginTop: 2 }}>{a.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Projects + SDG Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14 }}>
          {/* Active Projects */}
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px 18px',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, background: 'var(--accent-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <FolderKanban size={14} color="var(--accent)" />
                </div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Projects</div>
              </div>
              <button style={{
                fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none',
                cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
              }}>
                View All <ArrowRight size={12} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DEMO_PROJECTS.map(p => {
                const sc = statusColors[p.status] || statusColors.planned
                return (
                  <div key={p.id} className="card-hover" style={{
                    padding: '12px 14px', borderRadius: 10,
                    border: '1px solid var(--border)', background: 'var(--panel2)',
                    display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{p.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 6,
                          background: sc.bg, color: sc.txt, border: `1px solid ${sc.border}`,
                          textTransform: 'capitalize',
                        }}>{p.status}</span>
                        <span style={{ fontSize: 10.5, color: 'var(--txt3)' }}>{p.category}</span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div style={{ width: 60, textAlign: 'right' }}>
                      <div className="mono" style={{ fontSize: 11, fontWeight: 600, color: p.progress >= 80 ? 'var(--g-txt)' : 'var(--txt2)', marginBottom: 3 }}>
                        {p.progress}%
                      </div>
                      <div style={{ height: 4, borderRadius: 2, background: 'var(--bg2)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 2, width: `${p.progress}%`,
                          background: p.progress >= 80 ? 'var(--g)' : p.progress >= 50 ? 'var(--accent)' : 'var(--y)',
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                    </div>
                    {/* SDG dots */}
                    <div style={{ display: 'flex', gap: 3 }}>
                      {p.sdgs.map(s => (
                        <div key={s} style={{
                          width: 16, height: 16, borderRadius: 4, background: SDG_COLORS[s],
                          fontSize: 8, fontWeight: 700, color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>{s}</div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* SDG Coverage */}
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px 18px',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, background: 'var(--accent-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Leaf size={14} color="var(--accent)" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>SDG Coverage</div>
                <div style={{ fontSize: 10.5, color: 'var(--txt3)' }}>8 of 17 goals addressed</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
              {Array.from({ length: 17 }, (_, i) => i + 1).map(n => {
                const active = [1, 2, 3, 4, 6, 7, 8, 10, 11, 13, 15].includes(n)
                return (
                  <div key={n} style={{
                    aspectRatio: '1', borderRadius: 8,
                    background: active ? SDG_COLORS[n] : 'var(--bg2)',
                    opacity: active ? 1 : 0.3,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: active ? '#fff' : 'var(--txt3)',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                  }}>{n}</div>
                )
              })}
            </div>

            {/* Donation chart */}
            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Monthly Donations</div>
              <div style={{ height: 120 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={DEMO_IMPACT_DAILY}>
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--txt3)' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--panel)', border: '1px solid var(--border)',
                        borderRadius: 8, fontSize: 11,
                      }}
                      formatter={(v) => [`$${(Number(v) / 1000).toFixed(1)}K`, 'Donated']}
                    />
                    <Bar dataKey="donated" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
