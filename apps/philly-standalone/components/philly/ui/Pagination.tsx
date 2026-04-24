'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, total, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  const pages = buildPageNumbers(page, totalPages)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 0', gap: 12,
    }}>
      <span style={{ fontSize: 12, color: 'var(--txt3)' }}>
        {total} result{total !== 1 ? 's' : ''}
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <PageButton
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={14} />
        </PageButton>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dot-${i}`} style={{ padding: '0 4px', fontSize: 12, color: 'var(--txt3)' }}>...</span>
          ) : (
            <PageButton
              key={p}
              active={p === page}
              onClick={() => onPageChange(p as number)}
            >
              {p}
            </PageButton>
          )
        )}

        <PageButton
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight size={14} />
        </PageButton>
      </div>
    </div>
  )
}

function PageButton({
  children, active, disabled, onClick, ...rest
}: {
  children: React.ReactNode
  active?: boolean
  disabled?: boolean
  onClick?: () => void
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 6, border: '1px solid var(--border)',
        background: active ? 'var(--txt)' : 'var(--panel)',
        color: active ? 'var(--panel)' : disabled ? 'var(--txt3)' : 'var(--txt2)',
        fontSize: 12, fontWeight: active ? 600 : 500,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        fontFamily: 'inherit',
      }}
      {...rest}
    >
      {children}
    </button>
  )
}

function buildPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | '...')[] = [1]

  if (current > 3) pages.push('...')

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)

  if (current < total - 2) pages.push('...')

  pages.push(total)
  return pages
}
