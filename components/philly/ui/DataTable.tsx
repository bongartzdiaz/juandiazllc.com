'use client'

import { useMemo, useState } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, Settings2, Check } from 'lucide-react'

export interface DataTableColumn<T> {
  key: string
  label: string
  accessor?: (row: T) => React.ReactNode
  sortable?: boolean
  width?: number | string
  align?: 'left' | 'right' | 'center'
  mono?: boolean
  hidden?: boolean
}

export interface DataTableProps<T extends { id: string | number }> {
  columns: DataTableColumn<T>[]
  rows: T[]
  rowKey?: (row: T) => string
  empty?: string
  selectable?: boolean
  selected?: string[]
  onSelectedChange?: (ids: string[]) => void
  onRowClick?: (row: T) => void
  stickyHeader?: boolean
  dense?: boolean
}

export function DataTable<T extends { id: string | number }>({
  columns, rows, rowKey, empty = 'No data',
  selectable = false, selected = [], onSelectedChange, onRowClick,
  stickyHeader = true, dense = false,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null)
  const [visibility, setVisibility] = useState<Record<string, boolean>>(
    () => Object.fromEntries(columns.map(c => [c.key, !c.hidden])),
  )
  const [showColPicker, setShowColPicker] = useState(false)

  const visibleColumns = useMemo(() => columns.filter(c => visibility[c.key] !== false), [columns, visibility])

  const keyFor = (r: T) => rowKey ? rowKey(r) : String(r.id)

  const sortedRows = useMemo(() => {
    if (!sort) return rows
    const col = columns.find(c => c.key === sort.key)
    if (!col || !col.sortable) return rows
    const copy = [...rows]
    copy.sort((a, b) => {
      const aRaw = (a as unknown as Record<string, unknown>)[sort.key]
      const bRaw = (b as unknown as Record<string, unknown>)[sort.key]
      const aNum = Number(aRaw), bNum = Number(bRaw)
      if (!Number.isNaN(aNum) && !Number.isNaN(bNum) && typeof aRaw !== 'string') {
        return sort.dir === 'asc' ? aNum - bNum : bNum - aNum
      }
      const aStr = String(aRaw ?? ''); const bStr = String(bRaw ?? '')
      return sort.dir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
    })
    return copy
  }, [rows, sort, columns])

  const toggleSort = (key: string) => {
    const col = columns.find(c => c.key === key)
    if (!col?.sortable) return
    setSort(prev => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' }
      if (prev.dir === 'asc') return { key, dir: 'desc' }
      return null
    })
  }

  const allSelected = selectable && sortedRows.length > 0 && sortedRows.every(r => selected.includes(keyFor(r)))
  const someSelected = selectable && selected.length > 0 && !allSelected

  const toggleAll = () => {
    if (!onSelectedChange) return
    if (allSelected) onSelectedChange([])
    else onSelectedChange(sortedRows.map(keyFor))
  }

  const toggleRow = (id: string) => {
    if (!onSelectedChange) return
    onSelectedChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id])
  }

  const cellPad = dense ? '6px 10px' : '10px 12px'

  return (
    <div style={{
      background: 'var(--panel)', border: '1px solid var(--border)',
      borderRadius: 10, overflow: 'hidden', position: 'relative',
    }}>
      {/* Column picker trigger */}
      <div style={{ position: 'absolute', top: 7, right: 8, zIndex: 2 }}>
        <button
          onClick={() => setShowColPicker(s => !s)}
          title="Columns"
          style={{
            width: 26, height: 26, borderRadius: 6, border: 'none',
            background: 'var(--bg2)', color: 'var(--txt3)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Settings2 size={12} />
        </button>
        {showColPicker && (
          <div style={{
            position: 'absolute', top: 30, right: 0,
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 8, boxShadow: 'var(--shadow-md)',
            padding: 6, minWidth: 180, zIndex: 3,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)', padding: '4px 6px 6px' }}>
              Columns
            </div>
            {columns.map(col => (
              <button
                key={col.key}
                onClick={() => setVisibility(v => ({ ...v, [col.key]: v[col.key] === false }))}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 7,
                  padding: '5px 7px', borderRadius: 5, border: 'none',
                  background: 'transparent', cursor: 'pointer',
                  color: 'var(--txt2)', fontSize: 12, textAlign: 'left',
                }}
              >
                <span style={{
                  width: 13, height: 13, borderRadius: 3,
                  background: visibility[col.key] !== false ? 'var(--accent)' : 'var(--bg2)',
                  border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--accent-fg)',
                }}>
                  {visibility[col.key] !== false && <Check size={9} strokeWidth={3} />}
                </span>
                {col.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={stickyHeader ? { position: 'sticky', top: 0, zIndex: 1 } : undefined}>
            <tr style={{ background: 'var(--bg2)' }}>
              {selectable && (
                <th style={{ ...thStyle, width: 40, padding: cellPad }}>
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={toggleAll}
                  />
                </th>
              )}
              {visibleColumns.map(col => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  style={{
                    ...thStyle,
                    padding: cellPad,
                    width: col.width,
                    textAlign: col.align ?? 'left',
                    cursor: col.sortable ? 'pointer' : 'default',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {col.label}
                    {col.sortable && (
                      sort?.key === col.key
                        ? sort.dir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />
                        : <ChevronsUpDown size={11} style={{ opacity: 0.4 }} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + (selectable ? 1 : 0)}
                  style={{ padding: 24, textAlign: 'center', color: 'var(--txt3)' }}
                >{empty}</td>
              </tr>
            ) : sortedRows.map((row, i) => {
              const id = keyFor(row)
              const isSelected = selectable && selected.includes(id)
              return (
                <tr
                  key={id}
                  onClick={() => onRowClick?.(row)}
                  style={{
                    background: isSelected ? 'var(--accent-bg)' : 'transparent',
                    borderBottom: i === sortedRows.length - 1 ? 'none' : '1px solid var(--border)',
                    cursor: onRowClick ? 'pointer' : 'default',
                    transition: 'background 100ms ease',
                  }}
                  onMouseEnter={e => {
                    if (!isSelected && onRowClick) e.currentTarget.style.background = 'var(--bg2)'
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  {selectable && (
                    <td style={{ padding: cellPad, width: 40 }} onClick={e => e.stopPropagation()}>
                      <Checkbox checked={isSelected} onChange={() => toggleRow(id)} />
                    </td>
                  )}
                  {visibleColumns.map(col => {
                    const content = col.accessor
                      ? col.accessor(row)
                      : String((row as unknown as Record<string, unknown>)[col.key] ?? '')
                    return (
                      <td
                        key={col.key}
                        className={col.mono ? 'mono' : undefined}
                        style={{
                          padding: cellPad,
                          textAlign: col.align ?? 'left',
                          color: 'var(--txt2)',
                          fontSize: col.mono ? 12 : 13,
                        }}
                      >{content}</td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  fontSize: 10.5,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--txt3)',
  borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap',
  userSelect: 'none',
}

function Checkbox({ checked, indeterminate, onChange }: {
  checked: boolean
  indeterminate?: boolean
  onChange: () => void
}) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onChange() }}
      style={{
        width: 16, height: 16, borderRadius: 4,
        background: checked || indeterminate ? 'var(--accent)' : 'var(--bg2)',
        border: `1px solid ${checked || indeterminate ? 'var(--accent)' : 'var(--border)'}`,
        cursor: 'pointer', padding: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--accent-fg)',
      }}
    >
      {indeterminate ? (
        <span style={{ width: 7, height: 2, background: 'var(--accent-fg)', borderRadius: 1 }} />
      ) : checked ? (
        <Check size={11} strokeWidth={3} />
      ) : null}
    </button>
  )
}
