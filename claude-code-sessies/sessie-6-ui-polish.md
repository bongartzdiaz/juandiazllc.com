# Sessie 6 — UI Polish, Animaties & Performance

## Context
Lees eerst CLAUDE.md. Alle vorige sessies zijn compleet. Dit is de WOW-laag.

## Investigate
```bash
cat CLAUDE.md
npx tsc --noEmit   # check type errors
# Open app in browser, check console voor warnings
```

---

## Phase 1 — Getal animaties

Alle KPI waarden animeren van 0 naar eindwaarde bij page load.

`src/hooks/useCountUp.ts`:
```ts
export function useCountUp(target: number, duration = 800, delay = 0) {
  const [value, setValue] = useState(0)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  useEffect(() => {
    if (!started || target === 0) return
    const start = performance.now()
    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      setValue(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [started, target, duration])

  return value
}
```

Gebruik in KpiCard:
```tsx
const animatedValue = useCountUp(value, 800, delay)
// Render: <span className="mono">{animatedValue}</span>
```

---

## Phase 2 — Funnel bar animaties (staggered)

In `FunnelJourney.tsx` na mount:
```tsx
useEffect(() => {
  const timeouts = bars.map((bar, i) =>
    setTimeout(() => {
      setAnimatedWidths(prev => ({ ...prev, [bar.id]: bar.pct }))
    }, 400 + i * 120)
  )
  return () => timeouts.forEach(clearTimeout)
}, [])
```

CSS transition op elke bar: `transition: width 1s cubic-bezier(0.16,1,0.3,1)`

---

## Phase 3 — Recharts upgrade

### Gradient fills
```tsx
// In alle LineCharts:
<defs>
  <linearGradient id="gradOrange" x1="0" y1="0" x2="0" y2="1">
    <stop offset="5%"  stopColor="#FF6D2D" stopOpacity={0.25} />
    <stop offset="95%" stopColor="#FF6D2D" stopOpacity={0} />
  </linearGradient>
  <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
    <stop offset="5%"  stopColor="#00FF88" stopOpacity={0.3} />
    <stop offset="95%" stopColor="#00FF88" stopOpacity={0} />
  </linearGradient>
</defs>
<Area fill="url(#gradOrange)" ... />
```

### Custom HmbTooltip (globaal herbruikbaar)
```tsx
// src/components/charts/HmbTooltip.tsx
export function HmbTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#131920',
      border: '1px solid rgba(255,255,255,0.10)',
      borderRadius: 8,
      padding: '10px 14px',
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
    }}>
      <p style={{ color: '#8B99A8', marginBottom: 6 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color, margin: 0 }}>
          {p.name}: {formatter ? formatter(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}
```

### Referentie lijnen
```tsx
// CPL chart: doel lijn €20
<ReferenceLine y={20} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4">
  <Label value="Doel €20" position="right" fill="#4A5568" fontSize={10} />
</ReferenceLine>
```

---

## Phase 4 — Shimmer Skeleton

`src/components/ui/SkeletonLoader.tsx`:
```tsx
// Shimmer animatie
// background: linear-gradient(90deg, var(--raised) 0%, var(--elevated) 50%, var(--raised) 100%)
// background-size: 200% 100%
// animation: shimmer 1.5s infinite

@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

Varianten: SkeletonKpi, SkeletonTable, SkeletonChart

---

## Phase 5 — Performance audit

### React.memo voor zware componenten
```tsx
export const CampagneTable = React.memo(({ data, loading }) => {
  // ...
})
```

### useMemo voor berekeningen
```tsx
const alerts = useMemo(() =>
  calculateAlerts(ads, dmchampReport, agenda),
  [ads, dmchampReport, agenda]
)

const sortedAds = useMemo(() =>
  [...ads].sort((a, b) => b.spend - a.spend),
  [ads]
)
```

### useCallback voor handlers
```tsx
const handleRowClick = useCallback((row: Ad) => {
  setSelectedAd(row)
  setSlideOverOpen(true)
}, [])
```

### Lazy loading voor pagina's
In elk route bestand dat niet de hoofdpagina is:
```tsx
// Gebruik next/dynamic voor zware componenten
import dynamic from 'next/dynamic'
const WeekView = dynamic(() => import('@/components/agenda/WeekView'), {
  loading: () => <SkeletonChart />,
})
```

### Tabel virtualisatie (als > 50 rijen)
Installeer: `npm install @tanstack/react-virtual`
Gebruik voor grote datasets in DataTable.

---

## Phase 6 — Consistentie audit

Loop door het hele project en fix:

1. **Hardcoded kleuren** → vervang door CSS variabelen of Tailwind tokens
   - Zoek: `#0D1117` `#131920` `#00FF88` `#FF6D2D` etc. in TSX files
   - Vervang door: `var(--surface)` of className `bg-surface` etc.

2. **Getallen zonder mono font**
   - Zoek alle getallen/percentages die niet `font-mono` of `className="mono"` hebben
   - Fix elke losse numerieke waarde

3. **Missing hover states**
   - Elke klikbaar element heeft hover feedback
   - Cards: `hover:translate-y-[-2px] hover:border-rim2`
   - Knoppen: `hover:translate-y-[-1px]`

4. **Loading states**
   - Elke component die data fetcht heeft skeleton state
   - Geen "flash" van lege content

5. **TypeScript errors**
   ```bash
   npx tsc --noEmit
   ```
   Fix alle errors voor eindoplevering.

---

## Phase 7 — Final touches

### Live indicator in topbar
De "LIVE · Xm" chip update elke minuut:
```tsx
const [lastRefresh, setLastRefresh] = useState(new Date())
// update op elke data refresh
// format: "LIVE · 2m" of "LIVE · nu"
```

### Toast notificaties
Bij sync success:
```tsx
// Simpele toast implementatie of installeer: npm install react-hot-toast
toast.success('GHL gesynchroniseerd', {
  style: {
    background: '#131920',
    color: '#DDE4EC',
    border: '1px solid rgba(0,255,136,0.2)',
  }
})
```

### Keyboard shortcuts (bonus)
```tsx
// G dan D → /dashboard
// G dan M → /meta-ads
// G dan S → /sales
// ? → shortcut overlay
```

---

## Validation Checklist
- [ ] Getallen tellen op van 0 bij page load (easeOutExpo)
- [ ] Funnel bars animeren staggered bij load
- [ ] Charts hebben gradient fills
- [ ] HmbTooltip ziet er uit zoals in referentie design
- [ ] Referentielijn €20 zichtbaar in CPL chart
- [ ] Skeleton loaders verschijnen tijdens fetch (geen flicker)
- [ ] `npx tsc --noEmit` → 0 errors
- [ ] Geen hardcoded kleuren in TSX bestanden
- [ ] Alle getallen zijn in JetBrains Mono
- [ ] Alle klikbare elementen hebben hover feedback
- [ ] LIVE chip update elke minuut
- [ ] Toast verschijnt na GHL sync
- [ ] Lighthouse Performance score > 85
- [ ] `npm run build` succesvol
