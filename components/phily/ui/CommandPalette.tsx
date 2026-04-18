'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/hooks/phily/useTheme'
import { useIndustry, type Industry } from '@/hooks/phily/useIndustry'
import {
  LayoutDashboard, FolderKanban, Users, BarChart3, FileText,
  Columns3, Settings, Plus, UserPlus, Download,
  Sun, Moon, Building2, Heart, UtensilsCrossed, Search,
} from 'lucide-react'

interface CommandItem {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  category: 'Pages' | 'Actions' | 'Settings'
  action: () => void
  keywords?: string[]
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { theme, toggle: toggleTheme } = useTheme()
  const { industry, config, setIndustry } = useIndustry()

  const iconSize = 16

  const items: CommandItem[] = useMemo(() => [
    // Pages
    {
      id: 'dashboard', label: 'Dashboard', description: 'Overview and KPIs',
      icon: <LayoutDashboard size={iconSize} />, category: 'Pages',
      action: () => router.push('/'), keywords: ['home', 'overview'],
    },
    {
      id: 'projects', label: config.projectsLabel, description: `Manage ${config.projectsLabel.toLowerCase()}`,
      icon: <FolderKanban size={iconSize} />, category: 'Pages',
      action: () => router.push('/projects'), keywords: ['properties', 'projects'],
    },
    {
      id: 'contacts', label: 'Contacts', description: 'People and organizations',
      icon: <Users size={iconSize} />, category: 'Pages',
      action: () => router.push('/contacts'), keywords: ['people', 'clients'],
    },
    {
      id: 'impact', label: industry === 'realestate' ? 'Market' : 'Impact', description: industry === 'realestate' ? 'Market analytics' : 'Impact metrics',
      icon: <BarChart3 size={iconSize} />, category: 'Pages',
      action: () => router.push('/impact'), keywords: ['analytics', 'metrics'],
    },
    {
      id: 'reports', label: 'Reports', description: 'Generate and view reports',
      icon: <FileText size={iconSize} />, category: 'Pages',
      action: () => router.push('/reports'), keywords: ['export', 'pdf'],
    },
    {
      id: 'kanban', label: industry === 'realestate' ? 'Deals' : 'Kanban', description: 'Pipeline board',
      icon: <Columns3 size={iconSize} />, category: 'Pages',
      action: () => router.push('/kanban'), keywords: ['board', 'pipeline', 'deals'],
    },
    {
      id: 'settings', label: 'Settings', description: 'App preferences',
      icon: <Settings size={iconSize} />, category: 'Pages',
      action: () => router.push('/settings'), keywords: ['preferences', 'config'],
    },
    // Actions
    {
      id: 'new-project',
      label: industry === 'realestate' ? 'New Property' : 'New Project',
      description: `Create a new ${industry === 'realestate' ? 'property' : 'project'}`,
      icon: <Plus size={iconSize} />, category: 'Actions',
      action: () => router.push('/projects'), keywords: ['create', 'add'],
    },
    {
      id: 'new-contact', label: 'New Contact', description: 'Add a new contact',
      icon: <UserPlus size={iconSize} />, category: 'Actions',
      action: () => router.push('/contacts'), keywords: ['create', 'add', 'person'],
    },
    {
      id: 'export-data', label: 'Export Data', description: 'Download data as CSV',
      icon: <Download size={iconSize} />, category: 'Actions',
      action: () => router.push('/reports'), keywords: ['csv', 'download'],
    },
    // Settings
    {
      id: 'toggle-theme',
      label: theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode',
      description: `Currently ${theme}`,
      icon: theme === 'light' ? <Moon size={iconSize} /> : <Sun size={iconSize} />,
      category: 'Settings',
      action: () => { toggleTheme(); setOpen(false) },
      keywords: ['dark', 'light', 'theme', 'mode'],
    },
    {
      id: 'ind-csr', label: 'Switch to CSR', description: 'Philanthropy & CSR mode',
      icon: <Heart size={iconSize} />, category: 'Settings',
      action: () => { setIndustry('philanthropy' as Industry); setOpen(false) },
      keywords: ['philanthropy', 'industry'],
    },
    {
      id: 'ind-re', label: 'Switch to Real Estate', description: 'Real Estate mode',
      icon: <Building2 size={iconSize} />, category: 'Settings',
      action: () => { setIndustry('realestate' as Industry); setOpen(false) },
      keywords: ['property', 'industry'],
    },
    {
      id: 'ind-hos', label: 'Switch to Hospitality', description: 'Hospitality mode',
      icon: <UtensilsCrossed size={iconSize} />, category: 'Settings',
      action: () => { setIndustry('hospitality' as Industry); setOpen(false) },
      keywords: ['hotel', 'industry'],
    },
  ], [config, industry, theme, router, toggleTheme, setIndustry])

  const filtered = useMemo(() => {
    if (!query.trim()) return items
    const q = query.toLowerCase()
    return items.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.keywords?.some(k => k.includes(q))
    )
  }, [query, items])

  const grouped = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {}
    for (const item of filtered) {
      if (!groups[item.category]) groups[item.category] = []
      groups[item.category].push(item)
    }
    return groups
  }, [filtered])

  // Keyboard shortcut to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Reset active index when filtered changes
  useEffect(() => {
    setActiveIndex(0)
  }, [filtered.length])

  const runItem = useCallback((item: CommandItem) => {
    setOpen(false)
    item.action()
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(prev => (prev + 1) % filtered.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(prev => (prev - 1 + filtered.length) % filtered.length)
    } else if (e.key === 'Enter' && filtered[activeIndex]) {
      e.preventDefault()
      runItem(filtered[activeIndex])
    }
  }, [filtered, activeIndex, runItem])

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return
    const active = listRef.current.querySelector('[data-active="true"]') as HTMLElement
    if (active) active.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  if (!open) return null

  let flatIdx = -1

  return (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: 'min(20vh, 160px)', padding: '120px 24px 24px',
        animation: 'fadeIn 0.12s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 560,
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 12, boxShadow: 'var(--shadow-md)',
          overflow: 'hidden',
          animation: 'scaleIn 0.15s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Search input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', borderBottom: '1px solid var(--border)',
        }}>
          <Search size={16} style={{ color: 'var(--txt3)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search commands... (Cmd+K)"
            style={{
              flex: 1, border: 'none', background: 'transparent',
              outline: 'none', fontSize: 14, color: 'var(--txt)',
              padding: 0,
            }}
          />
          <kbd style={{
            fontSize: 10, padding: '2px 6px', borderRadius: 4,
            background: 'var(--bg2)', border: '1px solid var(--border)',
            color: 'var(--txt3)', fontFamily: 'inherit',
          }}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ maxHeight: 360, overflowY: 'auto', padding: '6px 0' }}>
          {filtered.length === 0 && (
            <div style={{
              padding: '24px 16px', textAlign: 'center',
              color: 'var(--txt3)', fontSize: 13,
            }}>
              No results found
            </div>
          )}

          {Object.entries(grouped).map(([category, categoryItems]) => (
            <div key={category}>
              <div style={{
                padding: '8px 16px 4px', fontSize: 10, fontWeight: 600,
                color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                {category}
              </div>
              {categoryItems.map(item => {
                flatIdx++
                const isActive = flatIdx === activeIndex
                const idx = flatIdx
                return (
                  <div
                    key={item.id}
                    data-active={isActive}
                    onClick={() => runItem(item)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 16px', margin: '0 6px', borderRadius: 8,
                      cursor: 'pointer',
                      background: isActive ? 'var(--bg2)' : 'transparent',
                      transition: 'background 80ms ease',
                    }}
                  >
                    <span style={{
                      width: 28, height: 28, borderRadius: 7,
                      background: isActive ? 'var(--accent-bg)' : 'var(--bg2)',
                      border: `1px solid ${isActive ? 'var(--accent-border)' : 'var(--border)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: isActive ? 'var(--accent)' : 'var(--txt3)',
                      flexShrink: 0,
                    }}>
                      {item.icon}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--txt)' }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 1 }}>
                        {item.description}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
