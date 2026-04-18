'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/philly/layout/Topbar'
import { KpiCard } from '@/components/philly/ui/KpiCard'
import { Search } from 'lucide-react'

interface MarketSnapshot {
  id: string
  zipCode: string
  year: number
  month: number
  medianPriceCents: number
  avgDaysOnMarket: number
  activeListings: number
  closedSales: number
  newListings: number
  avgPricePerSqft: number
  inventoryMonths: number
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function MarketAnalyticsPage() {
  const [snapshots, setSnapshots] = useState<MarketSnapshot[]>([])
  const [zipCode, setZipCode] = useState('')
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const t = useTranslations('marketAnalytics')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ year: String(year) })
      if (zipCode) params.set('zipCode', zipCode)
      const res = await fetch(`/philly/api/market-data?${params}`)
      const json = await res.json()
      setSnapshots(json.data ?? [])
    } catch { setSnapshots([]) }
    finally { setLoading(false) }
  }, [zipCode, year])

  useEffect(() => { fetchData() }, [fetchData])

  // Aggregate stats
  const latestMonth = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null
  const prevMonth = snapshots.length > 1 ? snapshots[snapshots.length - 2] : null
  const medianPrice = latestMonth?.medianPriceCents ?? 0
  const priceChange = latestMonth && prevMonth && prevMonth.medianPriceCents > 0
    ? Math.round(((latestMonth.medianPriceCents - prevMonth.medianPriceCents) / prevMonth.medianPriceCents) * 100)
    : 0
  const avgDOM = latestMonth?.avgDaysOnMarket ?? 0
  const totalClosed = snapshots.reduce((s, sn) => s + sn.closedSales, 0)
  const avgInventory = snapshots.length > 0
    ? (snapshots.reduce((s, sn) => s + sn.inventoryMonths, 0) / snapshots.length).toFixed(1)
    : '0'

  return (
    <>
      <Topbar title={t('title')} sub={t('subtitle')} />
      <div style={{ padding: '18px 24px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard icon="dollar-sign" label="Median Price" value={`$${(medianPrice / 100).toLocaleString()}`}
            delta={priceChange !== 0 ? `${Math.abs(priceChange)}% MoM` : undefined}
            deltaDir={priceChange > 0 ? 'up' : priceChange < 0 ? 'down' : 'neu'} />
          <KpiCard icon="calendar" label="Avg Days on Market" value={String(avgDOM)} />
          <KpiCard icon="trending-up" label="YTD Closed Sales" value={String(totalClosed)} />
          <KpiCard icon="chart" label="Avg Inventory" value={`${avgInventory} mo`} />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel)', fontSize: 12, maxWidth: 200 }}>
            <Search size={13} style={{ color: 'var(--txt3)' }} />
            <input value={zipCode} onChange={e => setZipCode(e.target.value)} placeholder="Filter by ZIP..." style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--txt)', fontFamily: 'inherit', outline: 'none', width: '100%' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel)', fontSize: 12 }}>
            <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--txt)', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
              {[2026, 2025, 2024, 2023].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* Monthly data table */}
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 80px 110px 80px 80px 80px 80px 80px 90px', gap: 8, padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)' }}>
            <span>ZIP</span><span>Month</span><span>Median Price</span><span>DOM</span><span>Active</span><span>Closed</span><span>New</span><span>$/SqFt</span><span>Inventory</span>
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>Loading...</div>
          ) : snapshots.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>No market data available. Add data via API.</div>
          ) : snapshots.map((sn, idx) => (
            <div key={sn.id} style={{ display: 'grid', gridTemplateColumns: '80px 80px 110px 80px 80px 80px 80px 80px 90px', gap: 8, padding: '10px 16px', borderBottom: idx < snapshots.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 12, alignItems: 'center', background: idx % 2 === 1 ? 'color-mix(in srgb, var(--bg2) 30%, transparent)' : 'transparent' }}>
              <span style={{ fontWeight: 600, fontFamily: "var(--font-red-hat-mono), monospace" }}>{sn.zipCode}</span>
              <span style={{ fontSize: 11 }}>{MONTH_NAMES[sn.month - 1]} {sn.year}</span>
              <span style={{ fontWeight: 600, fontFamily: "var(--font-red-hat-mono), monospace" }}>${(sn.medianPriceCents / 100).toLocaleString()}</span>
              <span style={{ fontFamily: "var(--font-red-hat-mono), monospace" }}>{sn.avgDaysOnMarket}</span>
              <span style={{ fontFamily: "var(--font-red-hat-mono), monospace" }}>{sn.activeListings}</span>
              <span style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontWeight: 600, color: 'var(--g-txt)' }}>{sn.closedSales}</span>
              <span style={{ fontFamily: "var(--font-red-hat-mono), monospace" }}>{sn.newListings}</span>
              <span style={{ fontFamily: "var(--font-red-hat-mono), monospace" }}>${sn.avgPricePerSqft}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontFamily: "var(--font-red-hat-mono), monospace" }}>{sn.inventoryMonths.toFixed(1)}</span>
                {sn.inventoryMonths < 3 ? (
                  <span style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, background: 'var(--r-bg)', color: 'var(--r-txt)', fontWeight: 600 }}>Hot</span>
                ) : sn.inventoryMonths > 6 ? (
                  <span style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, background: 'var(--b-bg)', color: 'var(--b-txt)', fontWeight: 600 }}>Cool</span>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        {/* Market Health Legend */}
        <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 10, color: 'var(--txt3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--r-bg)', border: '1px solid var(--r-border)' }} />
            <span>Hot Market (&lt;3 mo inventory)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--g-bg)', border: '1px solid var(--g-border)' }} />
            <span>Balanced (3-6 mo)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--b-bg)', border: '1px solid var(--b-border)' }} />
            <span>Cool Market (&gt;6 mo)</span>
          </div>
        </div>
      </div>
    </>
  )
}
