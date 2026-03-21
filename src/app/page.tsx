'use client'

import { Topbar } from '@/components/layout/Topbar'
import { KpiCard } from '@/components/ui/KpiCard'
import { useIndustry } from '@/hooks/useIndustry'
import {
  FolderKanban, Leaf, Globe2, ArrowRight, Clock,
  Building2, DollarSign, TrendingUp, Home, Key, Calendar,
  Users, MapPin, Star, BedDouble, UtensilsCrossed, Coffee,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts'

// ── CSR Demo Data ──
const CSR_MONTHLY = [
  { month: 'Oct', co2: 1200, people: 340, donated: 15000 },
  { month: 'Nov', co2: 1800, people: 520, donated: 22000 },
  { month: 'Dec', co2: 2400, people: 610, donated: 28000 },
  { month: 'Jan', co2: 3100, people: 780, donated: 35000 },
  { month: 'Feb', co2: 3800, people: 920, donated: 41000 },
  { month: 'Mar', co2: 4500, people: 1100, donated: 48000 },
]

const CSR_PROJECTS = [
  { id: '1', title: 'Urban Reforestation Amsterdam', status: 'active', category: 'Environment', progress: 72, sdgs: [11, 13, 15] },
  { id: '2', title: 'Clean Water Access Kenya', status: 'active', category: 'Water & Sanitation', progress: 45, sdgs: [6, 3] },
  { id: '3', title: 'Tech Education for Youth', status: 'active', category: 'Education', progress: 88, sdgs: [4, 8, 10] },
  { id: '4', title: 'Renewable Energy Transition', status: 'planned', category: 'Energy', progress: 15, sdgs: [7, 13] },
  { id: '5', title: 'Food Bank Partnership', status: 'completed', category: 'Hunger', progress: 100, sdgs: [1, 2] },
]

const CSR_ACTIVITY = [
  { text: 'Milestone completed: "500 trees planted"', time: '2h ago' },
  { text: 'New partner added: GreenTech Solutions', time: '5h ago' },
  { text: 'Impact report generated for Q1 2026', time: '1d ago' },
  { text: 'Budget updated for Clean Water Access', time: '1d ago' },
  { text: 'New project created: Renewable Energy', time: '2d ago' },
]

// ── Real Estate Demo Data ──
const RE_MONTHLY = [
  { month: 'Oct', revenue: 42000, listings: 8, closed: 3 },
  { month: 'Nov', revenue: 58000, listings: 12, closed: 5 },
  { month: 'Dec', revenue: 35000, listings: 6, closed: 2 },
  { month: 'Jan', revenue: 67000, listings: 15, closed: 6 },
  { month: 'Feb', revenue: 82000, listings: 18, closed: 8 },
  { month: 'Mar', revenue: 95000, listings: 22, closed: 9 },
]

const RE_PROPERTIES = [
  { id: '1', title: 'Penthouse Suite — Zuidas', status: 'active', type: 'Sale', price: 1250000, sqm: 185, beds: 3, daysOnMarket: 12, viewings: 8 },
  { id: '2', title: 'Family Home — Amstelveen', status: 'active', type: 'Sale', price: 685000, sqm: 142, beds: 4, daysOnMarket: 28, viewings: 15 },
  { id: '3', title: 'Studio Apartment — De Pijp', status: 'pending', type: 'Rental', price: 1850, sqm: 38, beds: 1, daysOnMarket: 5, viewings: 22 },
  { id: '4', title: 'Commercial Office — Centrum', status: 'active', type: 'Lease', price: 4500, sqm: 220, beds: 0, daysOnMarket: 45, viewings: 6 },
  { id: '5', title: 'Townhouse — Jordaan', status: 'sold', type: 'Sale', price: 920000, sqm: 125, beds: 3, daysOnMarket: 0, viewings: 31 },
]

const RE_ACTIVITY = [
  { text: 'New offer received: Penthouse Suite — €1.2M', time: '1h ago' },
  { text: 'Viewing scheduled: Family Home — Tomorrow 14:00', time: '3h ago' },
  { text: 'Contract signed: Townhouse — Jordaan', time: '1d ago' },
  { text: 'Price adjustment: Studio De Pijp — €1,850/mo', time: '1d ago' },
  { text: 'New listing added: Commercial Office — Centrum', time: '2d ago' },
]

const RE_PIPELINE = [
  { stage: 'New Leads', value: 34, color: 'var(--txt3)' },
  { stage: 'Viewings', value: 18, color: 'var(--b)' },
  { stage: 'Offers', value: 8, color: 'var(--y)' },
  { stage: 'Under Contract', value: 5, color: 'var(--o)' },
  { stage: 'Closed', value: 9, color: 'var(--g)' },
]

// ── Hospitality Demo Data ──
const HOS_MONTHLY = [
  { month: 'Oct', roomRevenue: 38000, fnbRevenue: 12000 },
  { month: 'Nov', roomRevenue: 44000, fnbRevenue: 14000 },
  { month: 'Dec', roomRevenue: 52000, fnbRevenue: 18000 },
  { month: 'Jan', roomRevenue: 41000, fnbRevenue: 13000 },
  { month: 'Feb', roomRevenue: 46000, fnbRevenue: 15000 },
  { month: 'Mar', roomRevenue: 48000, fnbRevenue: 16000 },
]

const HOS_ROOMS = [
  { id: '1', title: 'Royal Suite — Floor 4', status: 'occupied', type: 'Suite', rate: 450, guests: 'Mr. & Mrs. Jansen', nights: 4 },
  { id: '2', title: 'Standard Double 201', status: 'available', type: 'Standard', rate: 135, guests: '', nights: 0 },
  { id: '3', title: 'Deluxe King 305', status: 'occupied', type: 'Deluxe', rate: 225, guests: 'T. Nakamura', nights: 2 },
  { id: '4', title: 'Restaurant — La Terrazza', status: 'available', type: 'F&B Venue', rate: 0, guests: '', nights: 0 },
  { id: '5', title: 'Conference Hall A', status: 'reserved', type: 'Event Space', rate: 800, guests: 'TechCorp Summit', nights: 1 },
]

const HOS_ACTIVITY = [
  { text: 'New booking: Suite 401 — 3 nights', time: '45m ago' },
  { text: 'Guest checkout: Room 205 — rated 5 stars', time: '2h ago' },
  { text: 'Review received: 5 stars — "Excellent service"', time: '3h ago' },
  { text: 'Maintenance completed: Room 108 — AC repair', time: '5h ago' },
  { text: 'F&B order: La Terrazza — private dinner for 12', time: '1d ago' },
]

const HOS_PIPELINE = [
  { stage: 'Inquiry', value: 42, color: 'var(--txt3)' },
  { stage: 'Confirmed', value: 28, color: 'var(--b)' },
  { stage: 'Checked-In', value: 18, color: 'var(--o)' },
  { stage: 'Checked-Out', value: 12, color: 'var(--p)' },
  { stage: 'Reviewed', value: 9, color: 'var(--g)' },
]

const hosStatusColors: Record<string, { bg: string; txt: string; border: string }> = {
  available: { bg: 'var(--g-bg)', txt: 'var(--g-txt)', border: 'var(--g-border)' },
  occupied: { bg: 'var(--accent-bg)', txt: 'var(--accent-txt)', border: 'var(--accent-border)' },
  reserved: { bg: 'var(--y-bg)', txt: 'var(--y-txt)', border: 'var(--y-border)' },
  maintenance: { bg: 'var(--o-bg)', txt: 'var(--o-txt)', border: 'var(--o-border)' },
}

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
  pending: { bg: 'var(--y-bg)', txt: 'var(--y-txt)', border: 'var(--y-border)' },
  sold: { bg: 'var(--g-bg)', txt: 'var(--g-txt)', border: 'var(--g-border)' },
}

export default function DashboardPage() {
  const { industry, config } = useIndustry()

  if (industry === 'hospitality') return <HospitalityDashboard config={config} />
  if (industry === 'realestate') return <RealEstateDashboard config={config} />
  return <CSRDashboard config={config} />
}

// ══════════════════════════════════════════
// HOSPITALITY DASHBOARD
// ══════════════════════════════════════════
function HospitalityDashboard({ config }: { config: { dashboardTitle: string; dashboardSub: string } }) {
  const totalRevenue = HOS_MONTHLY.reduce((s, m) => s + m.roomRevenue + m.fnbRevenue, 0)

  return (
    <>
      <Topbar title={config.dashboardTitle} sub={config.dashboardSub} addLabel="Booking" />
      <div style={{ padding: '18px 24px 40px' }}>
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 18 }}>
          <KpiCard label="Occupancy Rate" value="78%" delta="+4% vs last month" deltaDir="up" icon="users" accentColor="var(--accent)" delay={80} />
          <KpiCard label="RevPAR" value="€142" delta="+€12 vs avg" deltaDir="up" icon="dollar-sign" accentColor="var(--g)" delay={130} />
          <KpiCard label="ADR" value="€185" delta="Avg Daily Rate" deltaDir="neu" icon="chart" accentColor="var(--b)" delay={180} />
          <KpiCard label="Guest Satisfaction" value="4.6/5" delta="Based on 189 reviews" deltaDir="up" icon="heart" accentColor="var(--y)" delay={230} />
          <KpiCard label="Total Bookings" value="234" delta="+18 this week" deltaDir="up" icon="calendar" hot delay={280} />
        </div>

        {/* Pipeline + Revenue Chart */}
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 14, marginBottom: 14 }}>
          {/* Booking Pipeline */}
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px 18px', boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, background: 'var(--accent-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <TrendingUp size={14} color="var(--accent)" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Booking Pipeline</div>
                <div style={{ fontSize: 10.5, color: 'var(--txt3)' }}>Guest journey overview</div>
              </div>
            </div>
            {HOS_PIPELINE.map((stage, i) => (
              <div key={stage.stage} style={{ marginBottom: i < HOS_PIPELINE.length - 1 ? 12 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--txt2)' }}>{stage.stage}</span>
                  <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>{stage.value}</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--bg2)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    width: `${(stage.value / 42) * 100}%`,
                    background: stage.color,
                    transition: 'width 0.8s ease',
                  }} />
                </div>
              </div>
            ))}
            <div style={{
              marginTop: 16, padding: '10px 12px', borderRadius: 8,
              background: 'var(--g-bg)', border: '1px solid var(--g-border)',
            }}>
              <div style={{ fontSize: 11, color: 'var(--g-txt)', fontWeight: 600 }}>Review Rate</div>
              <div className="mono" style={{ fontSize: 20, fontWeight: 600, color: 'var(--g-txt)' }}>75%</div>
              <div style={{ fontSize: 10, color: 'var(--g-txt)', opacity: 0.8 }}>Checkout to Review</div>
            </div>
          </div>

          {/* Revenue Chart */}
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px 18px', boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, background: 'var(--accent-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <DollarSign size={14} color="var(--accent)" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Revenue Breakdown</div>
                <div style={{ fontSize: 10.5, color: 'var(--txt3)' }}>Room + F&B revenue monthly</div>
              </div>
            </div>
            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={HOS_MONTHLY}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--txt3)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--txt3)' }} axisLine={false} tickLine={false} width={50} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--panel)', border: '1px solid var(--border)',
                      borderRadius: 8, fontSize: 12, boxShadow: 'var(--shadow)',
                    }}
                    formatter={(v, name) => [
                      `€${(Number(v) / 1000).toFixed(0)}K`,
                      name === 'roomRevenue' ? 'Room Revenue' : 'F&B Revenue',
                    ]}
                  />
                  <Bar dataKey="roomRevenue" fill="var(--accent)" radius={[4, 4, 0, 0]} stackId="rev" />
                  <Bar dataKey="fnbRevenue" fill="var(--g)" radius={[4, 4, 0, 0]} stackId="rev" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Rooms + Activity */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14 }}>
          {/* Rooms/Venues */}
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px 18px', boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, background: 'var(--accent-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <BedDouble size={14} color="var(--accent)" />
                </div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Rooms & Venues</div>
              </div>
              <button style={{
                fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none',
                cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
              }}>
                View All <ArrowRight size={12} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {HOS_ROOMS.map(p => {
                const sc = hosStatusColors[p.status] || hosStatusColors.available
                return (
                  <div key={p.id} className="card-hover" style={{
                    padding: '12px 14px', borderRadius: 10,
                    border: '1px solid var(--border)', background: 'var(--panel2)',
                    display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 8, background: 'var(--bg2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {p.type === 'F&B Venue' ? <UtensilsCrossed size={18} color="var(--txt3)" /> :
                       p.type === 'Event Space' ? <Calendar size={18} color="var(--txt3)" /> :
                       <BedDouble size={18} color="var(--txt3)" />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{p.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 6,
                          background: sc.bg, color: sc.txt, border: `1px solid ${sc.border}`,
                          textTransform: 'capitalize',
                        }}>{p.status}</span>
                        <span style={{ fontSize: 10.5, color: 'var(--txt3)' }}>{p.type}</span>
                        {p.guests && <span style={{ fontSize: 10.5, color: 'var(--txt3)' }}>{p.guests}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {p.rate > 0 && (
                        <div className="mono" style={{ fontSize: 14, fontWeight: 600 }}>€{p.rate}/night</div>
                      )}
                      {p.nights > 0 && (
                        <div className="mono" style={{ fontSize: 10, color: 'var(--txt3)' }}>{p.nights} nights</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Activity */}
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px 18px', boxShadow: 'var(--shadow-sm)',
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
            {HOS_ACTIVITY.map((a, i) => (
              <div key={i} style={{
                padding: '10px 0',
                borderBottom: i < HOS_ACTIVITY.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ fontSize: 12.5, lineHeight: 1.4 }}>{a.text}</div>
                <div className="mono" style={{ fontSize: 10.5, color: 'var(--txt3)', marginTop: 2 }}>{a.time}</div>
              </div>
            ))}

            {/* Quick Stats */}
            <div style={{
              marginTop: 14, padding: '12px', borderRadius: 8,
              background: 'var(--bg2)', border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt3)', marginBottom: 8 }}>QUICK STATS</div>
              {[
                { label: 'Avg Stay', value: '2.8 nights', icon: Calendar },
                { label: 'Repeat Guests', value: '34%', icon: Users },
                { label: 'Revenue This Month', value: '€48K', icon: DollarSign },
              ].map(stat => (
                <div key={stat.label} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 0',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <stat.icon size={12} color="var(--txt3)" />
                    <span style={{ fontSize: 11.5, color: 'var(--txt2)' }}>{stat.label}</span>
                  </div>
                  <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ══════════════════════════════════════════
// REAL ESTATE DASHBOARD
// ══════════════════════════════════════════
function RealEstateDashboard({ config }: { config: { dashboardTitle: string; dashboardSub: string } }) {
  const totalRevenue = RE_MONTHLY.reduce((s, m) => s + m.revenue, 0)
  const totalClosed = RE_MONTHLY.reduce((s, m) => s + m.closed, 0)
  const activeListings = RE_PROPERTIES.filter(p => p.status === 'active').length
  const avgDaysOnMarket = Math.round(RE_PROPERTIES.filter(p => p.daysOnMarket > 0).reduce((s, p) => s + p.daysOnMarket, 0) / RE_PROPERTIES.filter(p => p.daysOnMarket > 0).length)

  return (
    <>
      <Topbar title={config.dashboardTitle} sub={config.dashboardSub} addLabel="Listing" />
      <div style={{ padding: '18px 24px 40px' }}>
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 18 }}>
          <KpiCard label="Active Listings" value={activeListings} delta="+3 this month" deltaDir="up" icon="folder" accentColor="var(--b)" delay={80} />
          <KpiCard label="Deals Closed" value={totalClosed} delta="YTD total" deltaDir="up" icon="target" accentColor="var(--g)" delay={130} />
          <KpiCard label="Commission" value={`€${(totalRevenue / 1000).toFixed(0)}K`} delta="+15.8% vs last quarter" deltaDir="up" icon="dollar-sign" hot delay={180} />
          <KpiCard label="Avg Days on Market" value={avgDaysOnMarket} delta={avgDaysOnMarket < 30 ? 'Below average' : 'Above average'} deltaDir={avgDaysOnMarket < 30 ? 'up' : 'down'} icon="calendar" accentColor="var(--y)" delay={230} />
          <KpiCard label="Total Viewings" value="82" delta="+24% this month" deltaDir="up" icon="users" accentColor="var(--accent)" delay={280} />
        </div>

        {/* Pipeline + Revenue Chart */}
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 14, marginBottom: 14 }}>
          {/* Deal Pipeline */}
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px 18px', boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, background: 'var(--accent-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <TrendingUp size={14} color="var(--accent)" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Deal Pipeline</div>
                <div style={{ fontSize: 10.5, color: 'var(--txt3)' }}>Lead to close overview</div>
              </div>
            </div>
            {RE_PIPELINE.map((stage, i) => (
              <div key={stage.stage} style={{ marginBottom: i < RE_PIPELINE.length - 1 ? 12 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--txt2)' }}>{stage.stage}</span>
                  <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>{stage.value}</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--bg2)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    width: `${(stage.value / 34) * 100}%`,
                    background: stage.color,
                    transition: 'width 0.8s ease',
                  }} />
                </div>
              </div>
            ))}
            <div style={{
              marginTop: 16, padding: '10px 12px', borderRadius: 8,
              background: 'var(--g-bg)', border: '1px solid var(--g-border)',
            }}>
              <div style={{ fontSize: 11, color: 'var(--g-txt)', fontWeight: 600 }}>Conversion Rate</div>
              <div className="mono" style={{ fontSize: 20, fontWeight: 600, color: 'var(--g-txt)' }}>26.5%</div>
              <div style={{ fontSize: 10, color: 'var(--g-txt)', opacity: 0.8 }}>Lead to Close</div>
            </div>
          </div>

          {/* Revenue Chart */}
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px 18px', boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, background: 'var(--accent-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <DollarSign size={14} color="var(--accent)" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Revenue & Closings</div>
                <div style={{ fontSize: 10.5, color: 'var(--txt3)' }}>Monthly performance</div>
              </div>
            </div>
            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={RE_MONTHLY}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--txt3)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--txt3)' }} axisLine={false} tickLine={false} width={50} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--panel)', border: '1px solid var(--border)',
                      borderRadius: 8, fontSize: 12, boxShadow: 'var(--shadow)',
                    }}
                    formatter={(v) => [`€${(Number(v) / 1000).toFixed(0)}K`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Properties + Activity */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14 }}>
          {/* Properties */}
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px 18px', boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, background: 'var(--accent-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Building2 size={14} color="var(--accent)" />
                </div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Properties</div>
              </div>
              <button style={{
                fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none',
                cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
              }}>
                View All <ArrowRight size={12} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {RE_PROPERTIES.map(p => {
                const sc = statusColors[p.status] || statusColors.active
                return (
                  <div key={p.id} className="card-hover" style={{
                    padding: '12px 14px', borderRadius: 10,
                    border: '1px solid var(--border)', background: 'var(--panel2)',
                    display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 8, background: 'var(--bg2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Home size={18} color="var(--txt3)" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{p.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 6,
                          background: sc.bg, color: sc.txt, border: `1px solid ${sc.border}`,
                          textTransform: 'capitalize',
                        }}>{p.status}</span>
                        <span style={{ fontSize: 10.5, color: 'var(--txt3)' }}>{p.type}</span>
                        {p.beds > 0 && <span style={{ fontSize: 10.5, color: 'var(--txt3)' }}>{p.beds} bed</span>}
                        <span style={{ fontSize: 10.5, color: 'var(--txt3)' }}>{p.sqm}m2</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="mono" style={{ fontSize: 14, fontWeight: 600 }}>
                        {p.price >= 10000 ? `€${(p.price / 1000).toFixed(0)}K` : `€${p.price.toLocaleString()}/mo`}
                      </div>
                      {p.daysOnMarket > 0 && (
                        <div className="mono" style={{ fontSize: 10, color: 'var(--txt3)' }}>{p.daysOnMarket}d on market</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Star size={11} color="var(--y)" />
                      <span className="mono" style={{ fontSize: 10.5, color: 'var(--txt3)' }}>{p.viewings}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Activity */}
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px 18px', boxShadow: 'var(--shadow-sm)',
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
            {RE_ACTIVITY.map((a, i) => (
              <div key={i} style={{
                padding: '10px 0',
                borderBottom: i < RE_ACTIVITY.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ fontSize: 12.5, lineHeight: 1.4 }}>{a.text}</div>
                <div className="mono" style={{ fontSize: 10.5, color: 'var(--txt3)', marginTop: 2 }}>{a.time}</div>
              </div>
            ))}

            {/* Quick Stats */}
            <div style={{
              marginTop: 14, padding: '12px', borderRadius: 8,
              background: 'var(--bg2)', border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt3)', marginBottom: 8 }}>QUICK STATS</div>
              {[
                { label: 'Avg Commission', value: '€11.2K', icon: DollarSign },
                { label: 'Showings This Week', value: '14', icon: Calendar },
                { label: 'Hot Leads', value: '8', icon: Users },
              ].map(stat => (
                <div key={stat.label} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 0',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <stat.icon size={12} color="var(--txt3)" />
                    <span style={{ fontSize: 11.5, color: 'var(--txt2)' }}>{stat.label}</span>
                  </div>
                  <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ══════════════════════════════════════════
// CSR / PHILANTHROPY DASHBOARD (original)
// ══════════════════════════════════════════
function CSRDashboard({ config }: { config: { dashboardTitle: string; dashboardSub: string } }) {
  return (
    <>
      <Topbar title={config.dashboardTitle} sub={config.dashboardSub} addLabel="Project" />
      <div style={{ padding: '18px 24px 40px' }}>
        {/* KPI Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 18 }}>
          <KpiCard label="Active Projects" value="4" delta="+1 this month" deltaDir="up" icon="folder" accentColor="var(--accent)" delay={80} />
          <KpiCard label="People Helped" value="1,100" delta="+19.6% vs last month" deltaDir="up" icon="heart" accentColor="var(--p)" delay={130} />
          <KpiCard label="CO2 Reduced" value="4.5t" delta="+18.4% vs last month" deltaDir="up" icon="leaf" accentColor="var(--g)" delay={180} />
          <KpiCard label="Trees Planted" value="2,340" delta="Target: 5,000" deltaDir="neu" icon="tree" accentColor="var(--g)" delay={230} />
          <KpiCard label="Total Donated" value="€48K" delta="12 donors active" deltaDir="up" icon="dollar-sign" hot delay={280} />
        </div>

        {/* Charts + Activity */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14, marginBottom: 14 }}>
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px 18px', boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Globe2 size={14} color="var(--accent)" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Impact Overview</div>
                <div style={{ fontSize: 10.5, color: 'var(--txt3)' }}>Cumulative impact over time</div>
              </div>
            </div>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={CSR_MONTHLY}>
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
                  <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, boxShadow: 'var(--shadow)' }} />
                  <Area type="monotone" dataKey="co2" stroke="var(--g)" fill="url(#gradCo2)" strokeWidth={2} name="CO2 (kg)" />
                  <Area type="monotone" dataKey="people" stroke="var(--accent)" fill="url(#gradPeople)" strokeWidth={2} name="People Helped" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px 18px', boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={14} color="var(--txt3)" />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Recent Activity</div>
            </div>
            {CSR_ACTIVITY.map((a, i) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: i < CSR_ACTIVITY.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ fontSize: 12.5, lineHeight: 1.4 }}>{a.text}</div>
                <div className="mono" style={{ fontSize: 10.5, color: 'var(--txt3)', marginTop: 2 }}>{a.time}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Projects + SDG */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14 }}>
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px 18px', boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FolderKanban size={14} color="var(--accent)" />
                </div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Projects</div>
              </div>
              <button style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>View All <ArrowRight size={12} /></button>
            </div>
            {CSR_PROJECTS.map(p => {
              const sc = statusColors[p.status] || statusColors.planned
              return (
                <div key={p.id} className="card-hover" style={{
                  padding: '12px 14px', borderRadius: 10, marginBottom: 8,
                  border: '1px solid var(--border)', background: 'var(--panel2)',
                  display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{p.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 6, background: sc.bg, color: sc.txt, border: `1px solid ${sc.border}`, textTransform: 'capitalize' }}>{p.status}</span>
                      <span style={{ fontSize: 10.5, color: 'var(--txt3)' }}>{p.category}</span>
                    </div>
                  </div>
                  <div style={{ width: 60, textAlign: 'right' }}>
                    <div className="mono" style={{ fontSize: 11, fontWeight: 600, color: p.progress >= 80 ? 'var(--g-txt)' : 'var(--txt2)', marginBottom: 3 }}>{p.progress}%</div>
                    <div style={{ height: 4, borderRadius: 2, background: 'var(--bg2)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 2, width: `${p.progress}%`, background: p.progress >= 80 ? 'var(--g)' : p.progress >= 50 ? 'var(--accent)' : 'var(--y)' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {p.sdgs.map(s => (
                      <div key={s} style={{ width: 16, height: 16, borderRadius: 4, background: SDG_COLORS[s], fontSize: 8, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s}</div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px 18px', boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                  <div key={n} style={{ aspectRatio: '1', borderRadius: 8, background: active ? SDG_COLORS[n] : 'var(--bg2)', opacity: active ? 1 : 0.3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: active ? '#fff' : 'var(--txt3)', cursor: 'pointer' }}>{n}</div>
                )
              })}
            </div>
            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Monthly Donations</div>
              <div style={{ height: 120 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={CSR_MONTHLY}>
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--txt3)' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }} formatter={(v) => [`€${(Number(v) / 1000).toFixed(1)}K`, 'Donated']} />
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
