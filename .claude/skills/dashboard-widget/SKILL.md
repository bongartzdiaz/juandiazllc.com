---
name: dashboard-widget
description: Bouw dashboard-widgets — KPI-cards, metric-tiles, sparkline-cards, chart-wrappers, recent-activity-feed, status-tiles. Tremor of recharts (HMB Dashboard, PT). Inclusief loading-skeleton, hover-detail, click-through naar detail-page. Gebruik wanneer Juan vraagt "voeg een widget toe voor X" of bouwt aan dashboard.
trigger: /dashboard-widget
---

# /dashboard-widget

Standaard dashboard-bouwstenen met consistent gedrag (loading, hover, click-through, drill-down).

## Usage
```
/dashboard-widget <type> <metric>
/dashboard-widget <type> --size <sm|md|lg>
/dashboard-widget <type> --chart <line|area|bar|pie|sparkline|none>
/dashboard-widget <type> --stack <pt|hmb|philly>
/dashboard-widget <type> --period <today|week|month|custom>
```

## Widget-types

### 1. KPI-card (number + delta)
```tsx
interface KpiCardProps {
  label: string;
  value: number | string;
  delta?: { value: number; isPercentage?: boolean; period?: string };
  format?: "number" | "currency" | "percent" | "time";
  icon?: ReactNode;
  href?: string;       // klik-through naar detail
  loading?: boolean;
}

export function KpiCard({ label, value, delta, format = "number", icon, href, loading }: KpiCardProps) {
  if (loading) return <KpiCardSkeleton />;
  const formatted = formatValue(value, format);
  const isPositive = (delta?.value ?? 0) > 0;
  const Wrap = href ? "a" : "div";
  return (
    <Wrap
      href={href}
      className="block rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow"
    >
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-gray-600">{label}</p>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      <p className="mt-2 text-3xl font-bold text-gray-900" style={{ fontVariantNumeric: "tabular-nums" }}>
        {formatted}
      </p>
      {delta && (
        <p className={`mt-1 text-xs ${isPositive ? "text-emerald-600" : "text-red-600"}`}>
          {isPositive ? "+" : ""}{delta.value}{delta.isPercentage ? "%" : ""} {delta.period && `vs ${delta.period}`}
        </p>
      )}
    </Wrap>
  );
}
```

### 2. Sparkline-card (number + mini-chart)
```tsx
import { LineChart, Line, ResponsiveContainer } from "recharts";

<KpiCard label="Leads vandaag" value={42}>
  <div className="mt-3 h-12">
    <ResponsiveContainer>
      <LineChart data={last7Days}>
        <Line dataKey="leads" stroke="#10b981" dot={false} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  </div>
</KpiCard>
```

### 3. Status-tile (binary state)
```tsx
<StatusTile
  label="Edge function pipeline"
  status="ok"          // ok | warn | error
  hint="Laatste run 2 min geleden"
  href="/admin/pipeline"
/>
```

### 4. Chart-card (time-series)
```tsx
<ChartCard
  title="Leads per dag"
  data={leadsByDay}
  xKey="date"
  yKey="count"
  type="area"
  period="laatste 30 dagen"
  total={1247}
/>
```

### 5. Recent-activity-feed
```tsx
<ActivityFeed
  items={recentEvents}
  renderItem={(e) => (
    <ActivityRow
      icon={iconFor(e.type)}
      title={e.title}
      meta={`${e.actor} · ${formatDistance(e.created_at)}`}
      href={e.href}
    />
  )}
  emptyState="Nog geen activiteit."
  maxItems={10}
/>
```

### 6. Big-number tile (alleen waarde, geen context)
Voor TV-screen / status-monitor.

## Layout-grid (HMB Dashboard / PT)

```tsx
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
  <KpiCard label="Leads" value={142} delta={{ value: 12, isPercentage: true, period: "vorige week" }} />
  <KpiCard label="Conversie" value="8.4%" delta={{ value: -0.3, isPercentage: false }} />
  <KpiCard label="Spend" value={4250} format="currency" />
  <KpiCard label="CPL" value="€29.86" format="currency" />
</div>

<div className="mt-6 grid gap-4 lg:grid-cols-3">
  <ChartCard ... className="lg:col-span-2" />
  <ActivityFeed ... />
</div>
```

## Hard rules

- **Tabular-nums** voor cijfers (`fontVariantNumeric: "tabular-nums"`) — voorkomt "wobble"
- **Currency-formatting** via `Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" })`
- **Percentage**: 1 decimaal max, `8.4%` niet `8.4123456789%`
- **Tijd**: relatief (`2 min geleden`) voor recent, absoluut voor >24u
- **Delta-color** alleen bij betekenisvolle change (>1%)
- **Skeleton** bij loading — exact dezelfde dimensies als eind-state (geen jump)
- **Click-through** als data klikbaar is — `href` of `onClick`
- **Geen 3D charts**, geen pie-charts met >5 slices

## Charting-libs

| Lib | Voor | Waarom |
|---|---|---|
| **recharts** | Most charts, time-series, bar | Stabiel, goed met React, ResponsiveContainer |
| **tremor** | Hele dashboard kits, snel scaffold | Hoogste DX, less control |
| **@nivo/...** | Geographic, complex viz | Veel grenzen, learn-curve |
| **chart.js + react-chartjs-2** | Legacy, lazy-load only | Bundle-zwaar, vermijd voor new code |

Default: **recharts**. Voor HMB Dashboard mogelijk **tremor** (sneller).

## Skeleton

```tsx
export function KpiCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
      <div className="mt-3 h-9 w-32 animate-pulse rounded bg-gray-100" />
      <div className="mt-2 h-3 w-16 animate-pulse rounded bg-gray-100" />
    </div>
  );
}
```

## Combineer met
- `/ui-page --type dashboard` — voor de hele page-scaffold
- `/api-route` — voor metrics-endpoints
- `/db-migration` — voor materialized views (zorg dat `REVOKE ALL FROM anon` staat)
- `/empty-state` — voor leeg-dashboard cases
