'use client'

import { useState, Fragment } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { KpiCard } from '@/components/ui/KpiCard'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useIndustry } from '@/hooks/useIndustry'

/* ── Philanthropy data ── */

const SDG_GOALS: { id: number; name: string; color: string }[] = [
  { id: 1, name: 'No Poverty', color: '#E5243B' },
  { id: 2, name: 'Zero Hunger', color: '#DDA63A' },
  { id: 3, name: 'Good Health', color: '#4C9F38' },
  { id: 4, name: 'Quality Education', color: '#C5192D' },
  { id: 5, name: 'Gender Equality', color: '#FF3A21' },
  { id: 6, name: 'Clean Water', color: '#26BDE2' },
  { id: 7, name: 'Affordable Energy', color: '#FCC30B' },
  { id: 8, name: 'Decent Work', color: '#A21942' },
  { id: 9, name: 'Industry & Innovation', color: '#FD6925' },
  { id: 10, name: 'Reduced Inequalities', color: '#DD1367' },
  { id: 11, name: 'Sustainable Cities', color: '#FD9D24' },
  { id: 12, name: 'Responsible Consumption', color: '#BF8B2E' },
  { id: 13, name: 'Climate Action', color: '#3F7E44' },
  { id: 14, name: 'Life Below Water', color: '#0A97D9' },
  { id: 15, name: 'Life on Land', color: '#56C02B' },
  { id: 16, name: 'Peace & Justice', color: '#00689D' },
  { id: 17, name: 'Partnerships', color: '#19486A' },
]

const ACTIVE_SDGS = new Set([1, 2, 3, 4, 6, 7, 10, 11, 13, 14, 15, 17])

interface ProjectImpact {
  project: string
  co2Kg: number
  peopleHelped: number
  trees: number
  donated: number
}

const PROJECT_IMPACT: ProjectImpact[] = [
  { project: 'Urban Reforestation Amsterdam', co2Kg: 1200, peopleHelped: 85, trees: 1800, donated: 42000 },
  { project: 'Clean Water Access Kenya', co2Kg: 340, peopleHelped: 520, trees: 0, donated: 112500 },
  { project: 'Tech Education for Youth', co2Kg: 80, peopleHelped: 310, trees: 0, donated: 70400 },
  { project: 'Renewable Energy Transition', co2Kg: 2400, peopleHelped: 45, trees: 0, donated: 75000 },
  { project: 'Food Bank Partnership', co2Kg: 150, peopleHelped: 95, trees: 0, donated: 43200 },
  { project: 'Ocean Plastic Cleanup', co2Kg: 380, peopleHelped: 45, trees: 540, donated: 54000 },
]

const TREND_DATA = [
  { month: 'Sep', co2: 280, people: 60, trees: 150 },
  { month: 'Oct', co2: 420, people: 95, trees: 320 },
  { month: 'Nov', co2: 610, people: 180, trees: 540 },
  { month: 'Dec', co2: 850, people: 290, trees: 780 },
  { month: 'Jan', co2: 1100, people: 440, trees: 1050 },
  { month: 'Feb', co2: 1450, people: 620, trees: 1400 },
  { month: 'Mar', co2: 1800, people: 780, trees: 1800 },
  { month: 'Apr', co2: 2200, people: 880, trees: 2100 },
  { month: 'May', co2: 2900, people: 960, trees: 2340 },
  { month: 'Jun', co2: 3400, people: 1020, trees: 2340 },
  { month: 'Jul', co2: 3900, people: 1060, trees: 2340 },
  { month: 'Aug', co2: 4500, people: 1100, trees: 2340 },
]

/* ── Real Estate data ── */

const RE_PROPERTY_TYPES = [
  { type: 'Residential', count: 14, pct: 45, color: 'var(--accent)' },
  { type: 'Commercial', count: 8, pct: 26, color: 'var(--b)' },
  { type: 'Rental', count: 6, pct: 19, color: 'var(--o)' },
  { type: 'Mixed-Use', count: 3, pct: 10, color: 'var(--p)' },
]

const RE_MARKET_DATA = [
  { area: 'Zuidas', avgPrice: '€6,800/sqm', volume: '€2.4M', dom: 14, trend: 'up' },
  { area: 'Jordaan', avgPrice: '€5,200/sqm', volume: '€1.8M', dom: 18, trend: 'up' },
  { area: 'De Pijp', avgPrice: '€4,600/sqm', volume: '€1.2M', dom: 22, trend: 'stable' },
  { area: 'Amstelveen', avgPrice: '€3,400/sqm', volume: '€1.6M', dom: 28, trend: 'up' },
  { area: 'NDSM', avgPrice: '€3,100/sqm', volume: '€0.8M', dom: 32, trend: 'down' },
  { area: 'Centrum', avgPrice: '€5,900/sqm', volume: '€0.4M', dom: 16, trend: 'stable' },
]

const RE_PRICE_TREND = [
  { month: 'Sep', price: 3800, volume: 5200 },
  { month: 'Oct', price: 3850, volume: 4800 },
  { month: 'Nov', price: 3920, volume: 5600 },
  { month: 'Dec', price: 3900, volume: 4100 },
  { month: 'Jan', price: 4000, volume: 6200 },
  { month: 'Feb', price: 4050, volume: 7100 },
  { month: 'Mar', price: 4100, volume: 6800 },
  { month: 'Apr', price: 4150, volume: 7400 },
  { month: 'May', price: 4200, volume: 8200 },
  { month: 'Jun', price: 4180, volume: 7600 },
  { month: 'Jul', price: 4220, volume: 7900 },
  { month: 'Aug', price: 4280, volume: 8100 },
]

const RE_DEAL_BREAKDOWN = {
  sales: { count: 33, volume: '\u20AC8.1M', avgDays: 28, commission: '\u20AC243K' },
  rentals: { count: 14, volume: '\u20AC29.4K/mo', avgDays: 12, commission: '\u20AC14.7K' },
}

const trendIcons: Record<string, { symbol: string; color: string }> = {
  up: { symbol: '+', color: 'var(--g)' },
  down: { symbol: '-', color: 'var(--r, #E5243B)' },
  stable: { symbol: '~', color: 'var(--txt3)' },
}

/* ── Hospitality data ── */

const HOS_ROOM_TYPES = [
  { type: 'Suite', occupancy: 92, adr: 480, revenue: 52800, reviews: 48 },
  { type: 'Deluxe', occupancy: 85, adr: 225, revenue: 38250, reviews: 72 },
  { type: 'Standard', occupancy: 74, adr: 135, revenue: 29970, reviews: 95 },
  { type: 'Economy', occupancy: 68, adr: 95, revenue: 19380, reviews: 61 },
]

const HOS_TREND_DATA = [
  { month: 'Sep', occupancy: 65, revenue: 42000 },
  { month: 'Oct', occupancy: 70, revenue: 48000 },
  { month: 'Nov', occupancy: 72, revenue: 52000 },
  { month: 'Dec', occupancy: 82, revenue: 64000 },
  { month: 'Jan', occupancy: 68, revenue: 46000 },
  { month: 'Feb', occupancy: 74, revenue: 54000 },
  { month: 'Mar', occupancy: 78, revenue: 58000 },
  { month: 'Apr', occupancy: 80, revenue: 62000 },
  { month: 'May', occupancy: 84, revenue: 68000 },
  { month: 'Jun', occupancy: 88, revenue: 72000 },
  { month: 'Jul', occupancy: 91, revenue: 78000 },
  { month: 'Aug', occupancy: 86, revenue: 74000 },
]

/* ── Component ── */

export default function ImpactPage() {
  const { industry } = useIndustry()
  const isRE = industry === 'realestate'
  const isHOS = industry === 'hospitality'

  if (isHOS) {
    return (
      <>
        <Topbar title="Analytics" sub="Performance & guest insights" />

        <div style={{ padding: '18px 24px 40px' }}>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 18 }}>
            <KpiCard label="Occupancy Rate" value="78%" delta="+4% vs last month" deltaDir="up" icon="users" accentColor="var(--accent)" delay={80} />
            <KpiCard label="RevPAR" value="€142" delta="+€12 vs avg" deltaDir="up" icon="dollar-sign" accentColor="var(--g)" delay={130} />
            <KpiCard label="ADR" value="€185" delta="Avg Daily Rate" deltaDir="neu" icon="chart" accentColor="var(--b)" delay={180} />
            <KpiCard label="Avg Review" value="4.6/5" delta="189 reviews total" deltaDir="up" icon="heart" accentColor="var(--o)" delay={230} />
            <KpiCard label="F&B Revenue" value="€18K" delta="+8% this month" deltaDir="up" icon="zap" accentColor="var(--p)" delay={280} />
          </div>

          {/* Room Type Performance */}
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px', marginBottom: 14,
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Room Type Performance</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {HOS_ROOM_TYPES.map(rt => (
                <div key={rt.type}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{rt.type}</span>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--txt2)' }}>{rt.occupancy}% occupancy — €{rt.adr} ADR</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: 'var(--bg2)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 4, width: `${rt.occupancy}%`,
                      background: rt.occupancy >= 85 ? 'var(--g)' : rt.occupancy >= 70 ? 'var(--accent)' : 'var(--y)',
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Table + Trend Chart */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Room Type Table */}
            <div style={{
              background: 'var(--panel)', border: '1px solid var(--border)',
              borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{ padding: '14px 16px 0', fontSize: 13, fontWeight: 600 }}>Revenue by Room Type</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Room Type', 'Occupancy %', 'ADR', 'Revenue', 'Reviews'].map(h => (
                      <th key={h} style={{
                        padding: '8px 14px', textAlign: h === 'Room Type' ? 'left' : 'right',
                        fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase',
                        color: 'var(--txt3)', letterSpacing: '0.05em',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {HOS_ROOM_TYPES.map(rt => (
                    <tr key={rt.type} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600 }}>{rt.type}</td>
                      <td className="mono" style={{ padding: '10px 14px', fontSize: 12, textAlign: 'right' }}>{rt.occupancy}%</td>
                      <td className="mono" style={{ padding: '10px 14px', fontSize: 12, textAlign: 'right' }}>€{rt.adr}</td>
                      <td className="mono" style={{ padding: '10px 14px', fontSize: 12, textAlign: 'right' }}>€{(rt.revenue / 1000).toFixed(1)}K</td>
                      <td className="mono" style={{ padding: '10px 14px', fontSize: 12, textAlign: 'right' }}>{rt.reviews}</td>
                    </tr>
                  ))}
                  <tr style={{ background: 'var(--bg2)' }}>
                    <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700 }}>Total</td>
                    <td className="mono" style={{ padding: '10px 14px', fontSize: 12, textAlign: 'right', fontWeight: 700 }}>{Math.round(HOS_ROOM_TYPES.reduce((s, r) => s + r.occupancy, 0) / HOS_ROOM_TYPES.length)}%</td>
                    <td className="mono" style={{ padding: '10px 14px', fontSize: 12, textAlign: 'right', fontWeight: 700 }}>€{Math.round(HOS_ROOM_TYPES.reduce((s, r) => s + r.adr, 0) / HOS_ROOM_TYPES.length)}</td>
                    <td className="mono" style={{ padding: '10px 14px', fontSize: 12, textAlign: 'right', fontWeight: 700 }}>€{(HOS_ROOM_TYPES.reduce((s, r) => s + r.revenue, 0) / 1000).toFixed(1)}K</td>
                    <td className="mono" style={{ padding: '10px 14px', fontSize: 12, textAlign: 'right', fontWeight: 700 }}>{HOS_ROOM_TYPES.reduce((s, r) => s + r.reviews, 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Occupancy + Revenue Trend */}
            <div style={{
              background: 'var(--panel)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '16px', boxShadow: 'var(--shadow-sm)',
              display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Occupancy & Revenue Trend (12 months)</div>
              <div style={{ flex: 1, minHeight: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={HOS_TREND_DATA} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradOcc" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0D7377" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#0D7377" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--txt3)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--txt3)' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--panel)', border: '1px solid var(--border)',
                        borderRadius: 8, fontSize: 12, boxShadow: 'var(--shadow)',
                      }}
                      formatter={(v, name) => [
                        name === 'occupancy' ? `${v}%` : `€${(Number(v) / 1000).toFixed(0)}K`,
                        name === 'occupancy' ? 'Occupancy' : 'Revenue',
                      ]}
                    />
                    <Area type="monotone" dataKey="occupancy" name="occupancy" stroke="#0D7377" fill="url(#gradOcc)" strokeWidth={2} />
                    <Area type="monotone" dataKey="revenue" name="revenue" stroke="#059669" fill="url(#gradRev)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (isRE) {
    return (
      <>
        <Topbar title="Market" sub="Market analytics & performance" />

        <div style={{ padding: '18px 24px 40px' }}>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 18 }}>
            <KpiCard label="Avg Price/sqm" value="€4,200" delta="+8% vs last quarter" deltaDir="up" icon="dollar-sign" accentColor="var(--accent)" delay={80} />
            <KpiCard label="Total Volume" value="€8.2M" delta="+1.4M this month" deltaDir="up" icon="chart" accentColor="var(--g)" delay={130} />
            <KpiCard label="Days on Market" value="22" delta="-3 vs avg" deltaDir="up" icon="calendar" accentColor="var(--b)" delay={180} />
            <KpiCard label="Listings Active" value="18" delta="+4 new this week" deltaDir="up" icon="folder" accentColor="var(--o)" delay={230} />
            <KpiCard label="Conversion Rate" value="26.5%" delta="+2.1pp vs Q4" deltaDir="up" icon="zap" accentColor="var(--p)" delay={280} />
            <KpiCard label="Commission Earned" value="€258K" delta="+22% YTD" deltaDir="up" icon="dollar-sign" accentColor="var(--g)" delay={330} />
          </div>

          {/* Property Type Breakdown */}
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px', marginBottom: 14,
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Property Type Breakdown</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {RE_PROPERTY_TYPES.map(pt => (
                <div key={pt.type}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{pt.type}</span>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--txt2)' }}>{pt.count} properties ({pt.pct}%)</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: 'var(--bg2)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 4, width: `${pt.pct}%`,
                      background: pt.color,
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sales vs Rentals */}
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px', marginBottom: 14,
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Sales vs Rentals</div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: 0 }}>
              {/* Header row */}
              <div style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }} />
              <div style={{
                padding: '8px 14px', textAlign: 'right', fontSize: 11, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.05em',
                color: 'var(--accent)', borderBottom: '1px solid var(--border)',
              }}>Sales</div>
              <div style={{
                padding: '8px 14px', textAlign: 'right', fontSize: 11, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.05em',
                color: 'var(--p)', borderBottom: '1px solid var(--border)',
              }}>Rentals</div>
              {/* Data rows */}
              {([
                ['Deals', String(RE_DEAL_BREAKDOWN.sales.count), String(RE_DEAL_BREAKDOWN.rentals.count)],
                ['Volume', RE_DEAL_BREAKDOWN.sales.volume, RE_DEAL_BREAKDOWN.rentals.volume],
                ['Avg Days', String(RE_DEAL_BREAKDOWN.sales.avgDays), String(RE_DEAL_BREAKDOWN.rentals.avgDays)],
                ['Commission', RE_DEAL_BREAKDOWN.sales.commission, RE_DEAL_BREAKDOWN.rentals.commission],
              ] as const).map(([label, sVal, rVal]) => (
                <Fragment key={label}>
                  <div style={{
                    padding: '10px 0', fontSize: 12, fontWeight: 600,
                    borderBottom: '1px solid var(--border)',
                  }}>{label}</div>
                  <div className="mono" style={{
                    padding: '10px 14px', fontSize: 12, textAlign: 'right',
                    borderBottom: '1px solid var(--border)',
                  }}>{sVal}</div>
                  <div className="mono" style={{
                    padding: '10px 14px', fontSize: 12, textAlign: 'right',
                    borderBottom: '1px solid var(--border)',
                  }}>{rVal}</div>
                </Fragment>
              ))}
            </div>
          </div>

          {/* Market Comparison + Price Trend side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Market Comparison Table */}
            <div style={{
              background: 'var(--panel)', border: '1px solid var(--border)',
              borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{ padding: '14px 16px 0', fontSize: 13, fontWeight: 600 }}>Market Comparison</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Area', 'Avg Price', 'Volume', 'DOM', 'Trend'].map(h => (
                      <th key={h} style={{
                        padding: '8px 14px', textAlign: h === 'Area' ? 'left' : 'right',
                        fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase',
                        color: 'var(--txt3)', letterSpacing: '0.05em',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {RE_MARKET_DATA.map(row => {
                    const ti = trendIcons[row.trend]
                    return (
                      <tr key={row.area} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600 }}>{row.area}</td>
                        <td className="mono" style={{ padding: '10px 14px', fontSize: 12, textAlign: 'right' }}>{row.avgPrice}</td>
                        <td className="mono" style={{ padding: '10px 14px', fontSize: 12, textAlign: 'right' }}>{row.volume}</td>
                        <td className="mono" style={{ padding: '10px 14px', fontSize: 12, textAlign: 'right' }}>{row.dom}d</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, textAlign: 'right', fontWeight: 700, color: ti.color }}>
                          {ti.symbol}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Price Trend Chart */}
            <div style={{
              background: 'var(--panel)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '16px', boxShadow: 'var(--shadow-sm)',
              display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Price Trend (12 months)</div>
              <div style={{ flex: 1, minHeight: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={RE_PRICE_TREND} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0D7377" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#0D7377" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="gradVolume" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--txt3)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--txt3)' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--panel)', border: '1px solid var(--border)',
                        borderRadius: 8, fontSize: 12, boxShadow: 'var(--shadow)',
                      }}
                    />
                    <Area type="monotone" dataKey="price" name="Avg €/sqm" stroke="#0D7377" fill="url(#gradPrice)" strokeWidth={2} />
                    <Area type="monotone" dataKey="volume" name="Volume (€K)" stroke="#059669" fill="url(#gradVolume)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  /* ── Philanthropy version (default) ── */

  const totals = PROJECT_IMPACT.reduce(
    (acc, p) => ({
      co2Kg: acc.co2Kg + p.co2Kg,
      peopleHelped: acc.peopleHelped + p.peopleHelped,
      trees: acc.trees + p.trees,
      donated: acc.donated + p.donated,
    }),
    { co2Kg: 0, peopleHelped: 0, trees: 0, donated: 0 }
  )

  return (
    <>
      <Topbar title="Impact" sub="Measure what matters" />

      <div style={{ padding: '18px 24px 40px' }}>
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 18 }}>
          <KpiCard label="CO2 Reduced" value="4.5t" delta="+18% vs last quarter" deltaDir="up" icon="leaf" accentColor="var(--g)" delay={80} />
          <KpiCard label="People Helped" value="1,100" delta="+240 this month" deltaDir="up" icon="users" accentColor="var(--accent)" delay={130} />
          <KpiCard label="Trees Planted" value="2,340" delta="On track for 3K goal" deltaDir="up" icon="tree" accentColor="var(--g)" delay={180} />
          <KpiCard label="Water Saved" value="45kL" delta="+12% vs target" deltaDir="up" icon="water" accentColor="var(--b)" delay={230} />
          <KpiCard label="Energy Saved" value="890 MWh" delta="Renewable transition" deltaDir="neu" icon="zap" accentColor="var(--o)" delay={280} />
        </div>

        {/* SDG Alignment */}
        <div style={{
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '16px', marginBottom: 14,
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>SDG Alignment</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
            {SDG_GOALS.map(sdg => {
              const active = ACTIVE_SDGS.has(sdg.id)
              return (
                <div key={sdg.id} style={{
                  borderRadius: 8, padding: '10px 8px',
                  background: active ? sdg.color : 'var(--bg2)',
                  opacity: active ? 1 : 0.35,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  cursor: 'default',
                  transition: 'opacity 200ms ease, transform 150ms ease',
                }}>
                  <div style={{
                    fontSize: 16, fontWeight: 700,
                    color: active ? '#fff' : 'var(--txt3)',
                  }}>{sdg.id}</div>
                  <div style={{
                    fontSize: 9, fontWeight: 600, textAlign: 'center', lineHeight: 1.2,
                    color: active ? 'rgba(255,255,255,0.9)' : 'var(--txt3)',
                  }}>{sdg.name}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Impact by Project table + Trend chart side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* Table */}
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ padding: '14px 16px 0', fontSize: 13, fontWeight: 600 }}>Impact by Project</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Project', 'CO2 (kg)', 'People', 'Trees', 'Donated'].map(h => (
                    <th key={h} style={{
                      padding: '8px 14px', textAlign: h === 'Project' ? 'left' : 'right',
                      fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase',
                      color: 'var(--txt3)', letterSpacing: '0.05em',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PROJECT_IMPACT.map(p => (
                  <tr key={p.project} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600, maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.project}</td>
                    <td className="mono" style={{ padding: '10px 14px', fontSize: 12, textAlign: 'right' }}>{p.co2Kg.toLocaleString()}</td>
                    <td className="mono" style={{ padding: '10px 14px', fontSize: 12, textAlign: 'right' }}>{p.peopleHelped.toLocaleString()}</td>
                    <td className="mono" style={{ padding: '10px 14px', fontSize: 12, textAlign: 'right' }}>{p.trees.toLocaleString()}</td>
                    <td className="mono" style={{ padding: '10px 14px', fontSize: 12, textAlign: 'right' }}>€{(p.donated / 1000).toFixed(1)}K</td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr style={{ background: 'var(--bg2)' }}>
                  <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700 }}>Total</td>
                  <td className="mono" style={{ padding: '10px 14px', fontSize: 12, textAlign: 'right', fontWeight: 700 }}>{totals.co2Kg.toLocaleString()}</td>
                  <td className="mono" style={{ padding: '10px 14px', fontSize: 12, textAlign: 'right', fontWeight: 700 }}>{totals.peopleHelped.toLocaleString()}</td>
                  <td className="mono" style={{ padding: '10px 14px', fontSize: 12, textAlign: 'right', fontWeight: 700 }}>{totals.trees.toLocaleString()}</td>
                  <td className="mono" style={{ padding: '10px 14px', fontSize: 12, textAlign: 'right', fontWeight: 700 }}>${(totals.donated / 1000).toFixed(1)}K</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Trend Chart */}
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px', boxShadow: 'var(--shadow-sm)',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Impact Trend (12 months)</div>
            <div style={{ flex: 1, minHeight: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={TREND_DATA} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradCO2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradPeople" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0D7377" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#0D7377" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradTrees" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#56C02B" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#56C02B" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--txt3)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--txt3)' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--panel)', border: '1px solid var(--border)',
                      borderRadius: 8, fontSize: 12, boxShadow: 'var(--shadow)',
                    }}
                  />
                  <Area type="monotone" dataKey="co2" name="CO2 (kg)" stroke="#059669" fill="url(#gradCO2)" strokeWidth={2} />
                  <Area type="monotone" dataKey="people" name="People Helped" stroke="#0D7377" fill="url(#gradPeople)" strokeWidth={2} />
                  <Area type="monotone" dataKey="trees" name="Trees Planted" stroke="#56C02B" fill="url(#gradTrees)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
