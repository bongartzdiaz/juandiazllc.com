'use client'

import { useMemo } from 'react'
import { TrendingUp } from 'lucide-react'
import {
  ResponsiveContainer,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
  AreaChart,
} from 'recharts'

interface DataPoint {
  month: string
  actual: number | null
  forecast: number | null
}

function getData(industry: string): { data: DataPoint[]; label: string; subtitle: string; prefix: string; suffix: string } {
  if (industry === 'realestate') {
    return {
      data: [
        { month: 'Jan', actual: 42000, forecast: null },
        { month: 'Feb', actual: 58000, forecast: null },
        { month: 'Mar', actual: 48000, forecast: 48000 },
        { month: 'Apr', actual: null, forecast: 52000 },
        { month: 'May', actual: null, forecast: 58000 },
        { month: 'Jun', actual: null, forecast: 65000 },
      ],
      label: 'Commission Forecast',
      subtitle: 'Actual vs projected commission revenue',
      prefix: '\u20AC',
      suffix: '',
    }
  }
  if (industry === 'hospitality') {
    return {
      data: [
        { month: 'Jan', actual: 50000, forecast: null },
        { month: 'Feb', actual: 58000, forecast: null },
        { month: 'Mar', actual: 70000, forecast: 70000 },
        { month: 'Apr', actual: null, forecast: 62000 },
        { month: 'May', actual: null, forecast: 68000 },
        { month: 'Jun', actual: null, forecast: 75000 },
      ],
      label: 'Revenue Forecast',
      subtitle: 'Actual vs projected revenue',
      prefix: '\u20AC',
      suffix: '',
    }
  }
  // philanthropy / CSR
  return {
    data: [
      { month: 'Jan', actual: 650, forecast: null },
      { month: 'Feb', actual: 810, forecast: null },
      { month: 'Mar', actual: 1100, forecast: 1100 },
      { month: 'Apr', actual: null, forecast: 1350 },
      { month: 'May', actual: null, forecast: 1650 },
      { month: 'Jun', actual: null, forecast: 2000 },
    ],
    label: 'Impact Forecast',
    subtitle: 'People helped -- actual vs projected',
    prefix: '',
    suffix: '',
  }
}

function formatVal(val: number, prefix: string): string {
  if (prefix === '\u20AC') {
    if (val >= 1000) return `${prefix}${(val / 1000).toFixed(0)}K`
    return `${prefix}${val}`
  }
  return `${prefix}${val.toLocaleString('nl-NL')}`
}

export function ForecastCard({ industry, themeKey }: { industry: string; themeKey: string }) {
  const { data, label, subtitle, prefix } = useMemo(() => getData(industry), [industry])

  // Guard: at least one non-null point in either series. Without this guard,
  // recharts renders an empty axis grid and the growth % calc divides by 1.
  const hasData = data.some(d => d.actual !== null || d.forecast !== null)

  const projected = data[data.length - 1]?.forecast || 0
  const firstActual = data.find(d => d.actual !== null)?.actual || 1
  const growthPct = ((projected - firstActual) / firstActual * 100).toFixed(0)

  return (
    <div style={{
      background: 'var(--panel)', border: '1px solid var(--border)',
      borderRadius: 14, boxShadow: 'var(--shadow-sm)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={15} color="var(--txt2)" />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em' }}>{label}</div>
            <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 1 }}>{subtitle}</div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ padding: '12px 12px 0 0', height: 220 }}>
        {!hasData ? (
          <div style={{
            height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--txt3)', fontSize: 12, padding: 20, textAlign: 'center',
          }}>
            No forecast data yet
          </div>
        ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, left: 12, bottom: 4 }}>
            <defs>
              <linearGradient id={`grad-${themeKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: 'var(--txt3)', fontFamily: 'inherit' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--txt3)', fontFamily: 'inherit' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => formatVal(v, prefix)}
              width={50}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 12,
                boxShadow: 'var(--shadow-sm)',
                fontFamily: 'inherit',
              }}
              labelStyle={{ fontWeight: 600, marginBottom: 4 }}
              formatter={(value, name) => [
                typeof value === 'number' ? formatVal(value, prefix) : String(value),
                name === 'actual' ? 'Actual' : 'Forecast'
              ]}
            />
            <Area
              type="monotone"
              dataKey="actual"
              stroke="var(--accent)"
              strokeWidth={2.5}
              fill={`url(#grad-${themeKey})`}
              dot={{ r: 4, fill: 'var(--accent)', stroke: 'var(--panel)', strokeWidth: 2 }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="forecast"
              stroke="var(--accent)"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={{ r: 3, fill: 'var(--panel)', stroke: 'var(--accent)', strokeWidth: 2 }}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
        )}
      </div>

      {/* Bottom stats */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px', borderTop: '1px solid var(--border)',
      }}>
        <div>
          <div style={{ fontSize: 10.5, color: 'var(--txt3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Projected by Jun
          </div>
          <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)', marginTop: 2 }}>
            {formatVal(projected, prefix)}
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '4px 10px', borderRadius: 6,
          background: 'var(--g-bg)',
        }}>
          <TrendingUp size={12} color="var(--g)" />
          <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--g-txt)' }}>
            +{growthPct}%
          </span>
          <span style={{ fontSize: 10.5, color: 'var(--g-txt)' }}>growth</span>
        </div>
      </div>
    </div>
  )
}
