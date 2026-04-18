const styles: Record<string, { bg: string; color: string; border: string }> = {
  goed:     { bg: 'var(--g-bg)',  color: 'var(--g-txt)',  border: '1px solid var(--g-border)' },
  ok:       { bg: 'var(--o-bg)',  color: 'var(--o-txt)',  border: '1px solid var(--o-border)' },
  testfase: { bg: 'var(--y-bg)',  color: 'var(--y-txt)',  border: '1px solid var(--y-border)' },
  slecht:   { bg: 'var(--r-bg)',  color: 'var(--r-txt)',  border: '1px solid var(--r-border)' },
  info:     { bg: 'var(--b-bg)',  color: 'var(--b-txt)',  border: '1px solid var(--b-border)' },
  muted:    { bg: 'var(--bg2)',   color: 'var(--txt2)',   border: '1px solid var(--border)' },
}

export function StatusBadge({ status, label, dot }: { status: string; label?: string; dot?: boolean }) {
  const s = styles[status] || styles.muted
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 8,
      background: s.bg, color: s.color, border: s.border,
    }}>
      {dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />}
      {label || status}
    </span>
  )
}
