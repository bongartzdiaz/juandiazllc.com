'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/hooks/philly/useTheme'
import { useIndustry, type Industry } from '@/hooks/philly/useIndustry'
import {
  LayoutDashboard, FolderKanban, Users, BarChart3, FileText,
  Columns3, Settings, Plus, UserPlus, Download, Calendar,
  Sun, Moon, Building2, Heart, UtensilsCrossed, Search,
  DollarSign, Home, Eye, HandCoins, DoorOpen, Trophy, Mail,
  TrendingUp, ClipboardList, ListChecks, Target, GitBranch,
  Phone, Network, BarChart, Globe, PenTool, BedDouble, Award,
  Inbox, MessageSquare, FileCode, Layers, Sparkles, Bell, Zap,
  Plug, Webhook, Shield, GanttChart, FileArchive, Loader2, User,
  ToggleRight,
} from 'lucide-react'
import { exportToCSV } from '@/lib/philly/export'
import { AskAIMode } from './AskAIMode'

/* ── Types ───────────────────────────────────────────── */

interface CommandItem {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  category: string
  action: () => void
  keywords?: string[]
}

interface ContactHit {
  id: string
  name: string
  email?: string | null
  type?: string | null
  company?: string | null
}

interface ProjectHit {
  id: string
  title: string
  status?: string | null
  category?: string | null
}

/* ── Component ───────────────────────────────────────── */

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [aiMode, setAiMode] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [contactHits, setContactHits] = useState<ContactHit[]>([])
  const [projectHits, setProjectHits] = useState<ProjectHit[]>([])
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { theme, toggle: toggleTheme } = useTheme()
  const { industry, config, setIndustry } = useIndustry()

  const iconSize = 16

  /* ── Static command items (industry-aware full nav) ── */

  const staticItems: CommandItem[] = useMemo(() => {
    const core: CommandItem[] = [
      { id: 'dashboard', label: 'Dashboard', description: 'Overview and KPIs', icon: <LayoutDashboard size={iconSize} />, category: 'Pages', action: () => router.push('/'), keywords: ['home', 'overview'] },
      { id: 'projects', label: config.projectsLabel, description: `Manage ${config.projectsLabel.toLowerCase()}`, icon: <FolderKanban size={iconSize} />, category: 'Pages', action: () => router.push('/projects'), keywords: ['properties', 'projects'] },
      { id: 'contacts', label: 'Contacts', description: 'People and organizations', icon: <Users size={iconSize} />, category: 'Pages', action: () => router.push('/contacts'), keywords: ['people', 'clients'] },
      { id: 'impact', label: industry === 'realestate' ? 'Market' : 'Impact', description: industry === 'realestate' ? 'Market analytics' : 'Impact metrics', icon: <BarChart3 size={iconSize} />, category: 'Pages', action: () => router.push('/impact'), keywords: ['analytics', 'metrics'] },
    ]

    const tools: CommandItem[] = [
      { id: 'reports', label: 'Reports', description: 'Generate and view reports', icon: <FileText size={iconSize} />, category: 'Tools', action: () => router.push('/reports'), keywords: ['export', 'pdf'] },
      { id: 'kanban', label: industry === 'realestate' ? 'Deals Board' : industry === 'hospitality' ? 'Reservations' : 'Board', description: 'Pipeline board', icon: <Columns3 size={iconSize} />, category: 'Tools', action: () => router.push('/kanban'), keywords: ['board', 'pipeline', 'deals'] },
      { id: 'deals', label: 'Deals', description: 'Deal pipeline', icon: <DollarSign size={iconSize} />, category: 'Tools', action: () => router.push('/deals'), keywords: ['pipeline', 'sales'] },
      { id: 'calendar', label: 'Calendar', description: 'View milestones and events', icon: <Calendar size={iconSize} />, category: 'Tools', action: () => router.push('/calendar'), keywords: ['events', 'schedule'] },
      { id: 'timeline', label: 'Timeline', description: 'Gantt view of tasks', icon: <GanttChart size={iconSize} />, category: 'Tools', action: () => router.push('/timeline'), keywords: ['gantt', 'schedule'] },
      { id: 'documents', label: 'Documents', description: 'Manage files and documents', icon: <FileArchive size={iconSize} />, category: 'Tools', action: () => router.push('/documents'), keywords: ['files', 'uploads'] },
      { id: 'inbox', label: 'Inbox', description: 'Conversations and messages', icon: <Inbox size={iconSize} />, category: 'Tools', action: () => router.push('/inbox'), keywords: ['messages', 'conversations'] },
      { id: 'email', label: 'Email', description: 'Email campaigns', icon: <Mail size={iconSize} />, category: 'Tools', action: () => router.push('/email'), keywords: ['mail', 'campaigns'] },
      { id: 'sms', label: 'SMS', description: 'SMS messaging', icon: <MessageSquare size={iconSize} />, category: 'Tools', action: () => router.push('/sms'), keywords: ['text', 'twilio'] },
      { id: 'templates', label: 'Templates', description: 'Email and SMS templates', icon: <FileCode size={iconSize} />, category: 'Tools', action: () => router.push('/templates'), keywords: ['template', 'library'] },
      { id: 'pages', label: 'Pages', description: 'Custom pages', icon: <Layers size={iconSize} />, category: 'Tools', action: () => router.push('/pages'), keywords: ['custom', 'builder'] },
      { id: 'ai', label: 'AI Insights', description: 'AI-powered analysis', icon: <Sparkles size={iconSize} />, category: 'Tools', action: () => router.push('/ai'), keywords: ['ai', 'insights', 'intelligence'] },
    ]

    const industryItems: CommandItem[] = industry === 'realestate'
      ? [
          { id: 'properties', label: 'Properties', description: 'Real estate listings', icon: <Home size={iconSize} />, category: 'Real Estate', action: () => router.push('/properties') },
          { id: 'showings', label: 'Showings', description: 'Property showings', icon: <Eye size={iconSize} />, category: 'Real Estate', action: () => router.push('/showings') },
          { id: 'offers', label: 'Offers', description: 'Property offers', icon: <HandCoins size={iconSize} />, category: 'Real Estate', action: () => router.push('/offers') },
          { id: 'open-houses', label: 'Open Houses', description: 'Open house events', icon: <DoorOpen size={iconSize} />, category: 'Real Estate', action: () => router.push('/open-houses') },
          { id: 'commissions', label: 'Commissions', description: 'Team leaderboard', icon: <Trophy size={iconSize} />, category: 'Real Estate', action: () => router.push('/commissions') },
          { id: 'drip-campaigns', label: 'Drip Campaigns', description: 'Automated sequences', icon: <Mail size={iconSize} />, category: 'Real Estate', action: () => router.push('/drip-campaigns') },
          { id: 'market-analytics', label: 'Market Analytics', description: 'Market trends', icon: <TrendingUp size={iconSize} />, category: 'Real Estate', action: () => router.push('/market-analytics') },
          { id: 'transactions', label: 'Transactions', description: 'Real estate transactions', icon: <ClipboardList size={iconSize} />, category: 'Real Estate', action: () => router.push('/transactions') },
          { id: 'action-plans', label: 'Action Plans', description: 'Automated action sequences', icon: <ListChecks size={iconSize} />, category: 'Real Estate', action: () => router.push('/action-plans') },
          { id: 'lead-scores', label: 'Lead Scores', description: 'Contact scoring', icon: <Target size={iconSize} />, category: 'Real Estate', action: () => router.push('/lead-scores') },
          { id: 'lead-routing', label: 'Lead Routing', description: 'Route leads to agents', icon: <GitBranch size={iconSize} />, category: 'Real Estate', action: () => router.push('/lead-routing') },
          { id: 'dialer', label: 'Power Dialer', description: 'Call logs and dialing', icon: <Phone size={iconSize} />, category: 'Real Estate', action: () => router.push('/dialer') },
          { id: 'referrals', label: 'Referrals', description: 'Referral commissions', icon: <UserPlus size={iconSize} />, category: 'Real Estate', action: () => router.push('/referrals') },
          { id: 'soi', label: 'Sphere of Influence', description: 'SOI categories', icon: <Network size={iconSize} />, category: 'Real Estate', action: () => router.push('/soi') },
          { id: 'cma', label: 'CMA Reports', description: 'Comparative market analysis', icon: <BarChart size={iconSize} />, category: 'Real Estate', action: () => router.push('/cma') },
          { id: 'client-portal', label: 'Client Portal', description: 'Client portal access', icon: <Globe size={iconSize} />, category: 'Real Estate', action: () => router.push('/client-portal') },
          { id: 'e-signatures', label: 'E-Signatures', description: 'Document signatures', icon: <PenTool size={iconSize} />, category: 'Real Estate', action: () => router.push('/e-signatures') },
        ]
      : industry === 'hospitality'
        ? [
            { id: 'rooms', label: 'Rooms', description: 'Manage rooms and availability', icon: <BedDouble size={iconSize} />, category: 'Hospitality', action: () => router.push('/rooms') },
          ]
        : [
            { id: 'grants', label: 'Grants', description: 'Grant applications and funding', icon: <Award size={iconSize} />, category: 'Philanthropy', action: () => router.push('/grants') },
            { id: 'donors', label: 'Donors', description: 'Donor scoring dashboard', icon: <HandCoins size={iconSize} />, category: 'Philanthropy', action: () => router.push('/philanthropy/donors') },
            { id: 'volunteers', label: 'Volunteers', description: 'Volunteer team and hours', icon: <Heart size={iconSize} />, category: 'Philanthropy', action: () => router.push('/volunteers') },
          ]

    const system: CommandItem[] = [
      { id: 'notifications', label: 'Notifications', description: 'All notifications', icon: <Bell size={iconSize} />, category: 'System', action: () => router.push('/notifications') },
      { id: 'automations', label: 'Automations', description: 'Automate workflows', icon: <Zap size={iconSize} />, category: 'System', action: () => router.push('/automations') },
      { id: 'integrations', label: 'Integrations', description: 'Connected apps', icon: <Plug size={iconSize} />, category: 'System', action: () => router.push('/integrations') },
      { id: 'webhooks', label: 'Webhooks', description: 'Outbound webhooks', icon: <Webhook size={iconSize} />, category: 'System', action: () => router.push('/settings/webhooks') },
      { id: 'pipelines', label: 'Pipelines', description: 'Configure deal pipelines and stages', icon: <Columns3 size={iconSize} />, category: 'System', action: () => router.push('/settings/pipelines'), keywords: ['stages', 'board', 'deals'] },
      { id: 'security', label: 'Security', description: 'IP allowlist and idle timeout', icon: <Shield size={iconSize} />, category: 'System', action: () => router.push('/settings/security'), keywords: ['ip', 'allowlist', 'session', 'idle', 'enterprise'] },
      { id: 'features', label: 'Feature flags', description: 'Per-org kill-switches without redeploy', icon: <ToggleRight size={iconSize} />, category: 'System', action: () => router.push('/settings/features'), keywords: ['kill-switch', 'killswitch', 'toggle', 'flag', 'flags', 'enable', 'disable', 'ai'] },
      { id: 'audit', label: 'Audit Log', description: 'System audit trail', icon: <Shield size={iconSize} />, category: 'System', action: () => router.push('/audit') },
      { id: 'settings', label: 'Settings', description: 'App preferences', icon: <Settings size={iconSize} />, category: 'System', action: () => router.push('/settings'), keywords: ['preferences', 'config'] },
    ]

    const actions: CommandItem[] = [
      {
        id: 'new-project',
        label: industry === 'realestate' ? 'New Property' : industry === 'hospitality' ? 'New Room' : 'New Project',
        description: `Create a new ${industry === 'realestate' ? 'property' : industry === 'hospitality' ? 'room' : 'project'}`,
        icon: <Plus size={iconSize} />, category: 'Actions',
        action: () => router.push('/projects'), keywords: ['create', 'add'],
      },
      {
        id: 'new-contact', label: 'New Contact', description: 'Add a new contact',
        icon: <UserPlus size={iconSize} />, category: 'Actions',
        action: () => router.push('/contacts'), keywords: ['create', 'add', 'person'],
      },
      {
        id: 'export-data', label: 'Export Data', description: 'Download current data as CSV',
        icon: <Download size={iconSize} />, category: 'Actions',
        action: () => {
          Promise.all([
            fetch('/api/contacts').then(r => r.ok ? r.json() : { data: [] }),
            fetch('/api/projects').then(r => r.ok ? r.json() : { data: [] }),
          ]).then(([contacts, projects]) => {
            if (contacts.data?.length) exportToCSV(contacts.data, 'contacts')
            if (projects.data?.length) exportToCSV(projects.data, 'projects')
          })
          setOpen(false)
        },
        keywords: ['csv', 'download', 'export'],
      },
    ]

    const settings: CommandItem[] = [
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
    ]

    return [...core, ...tools, ...industryItems, ...actions, ...system, ...settings]
  }, [config, industry, theme, router, toggleTheme, setIndustry])

  /* ── Filter static items by query ── */

  const filteredStatic = useMemo(() => {
    if (!query.trim()) return staticItems
    const q = query.toLowerCase()
    return staticItems.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.keywords?.some(k => k.includes(q))
    )
  }, [query, staticItems])

  /* ── Live entity search (debounced) ── */

  useEffect(() => {
    if (!open) return
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setContactHits([])
      setProjectHits([])
      setSearching(false)
      return
    }

    const ctrl = new AbortController()
    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        const [cRes, pRes] = await Promise.all([
          fetch(`/api/contacts?q=${encodeURIComponent(trimmed)}&limit=5`, { signal: ctrl.signal })
            .then(r => r.ok ? r.json() : { data: [] })
            .catch(() => ({ data: [] })),
          fetch(`/api/projects?q=${encodeURIComponent(trimmed)}&limit=5`, { signal: ctrl.signal })
            .then(r => r.ok ? r.json() : { data: [] })
            .catch(() => ({ data: [] })),
        ])
        if (ctrl.signal.aborted) return
        setContactHits(Array.isArray(cRes?.data) ? cRes.data.slice(0, 5) : [])
        setProjectHits(Array.isArray(pRes?.data) ? pRes.data.slice(0, 5) : [])
      } finally {
        if (!ctrl.signal.aborted) setSearching(false)
      }
    }, 180)

    return () => {
      ctrl.abort()
      clearTimeout(timer)
    }
  }, [query, open])

  /* ── Build entity items from hits ── */

  const entityItems: CommandItem[] = useMemo(() => {
    const contactEntries: CommandItem[] = contactHits.map(c => ({
      id: `contact-${c.id}`,
      label: c.name,
      description: [c.company, c.email, c.type].filter(Boolean).join(' · ') || 'Contact',
      icon: <User size={iconSize} />,
      category: 'Contacts',
      action: () => router.push(`/contacts/${c.id}`),
    }))
    const projectEntries: CommandItem[] = projectHits.map(p => ({
      id: `project-${p.id}`,
      label: p.title,
      description: [p.category, p.status].filter(Boolean).join(' · ') || config.projectsLabel,
      icon: <FolderKanban size={iconSize} />,
      category: config.projectsLabel,
      action: () => router.push(`/projects/${p.id}`),
    }))
    return [...contactEntries, ...projectEntries]
  }, [contactHits, projectHits, router, config.projectsLabel])

  /* ── Combined filtered list (entities first when searching) ── */

  const filtered = useMemo(() => {
    if (!query.trim()) return filteredStatic
    return [...entityItems, ...filteredStatic]
  }, [query, entityItems, filteredStatic])

  const grouped = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {}
    for (const item of filtered) {
      if (!groups[item.category]) groups[item.category] = []
      groups[item.category].push(item)
    }
    return groups
  }, [filtered])

  /* ── Keyboard shortcut ── */

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        setOpen(true)
        setAiMode(true)
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  /* ── Custom event for external triggers (e.g. Topbar search button) ── */

  useEffect(() => {
    const openHandler = () => setOpen(true)
    const askAiHandler = () => { setOpen(true); setAiMode(true) }
    window.addEventListener('command-palette:open', openHandler)
    window.addEventListener('command-palette:ask-ai', askAiHandler)
    return () => {
      window.removeEventListener('command-palette:open', openHandler)
      window.removeEventListener('command-palette:ask-ai', askAiHandler)
    }
  }, [])

  /* ── Focus & reset on open ── */

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      setContactHits([])
      setProjectHits([])
      if (!aiMode) setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setAiMode(false)
    }
  }, [open, aiMode])

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
      setActiveIndex(prev => (prev + 1) % Math.max(filtered.length, 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(prev => (prev - 1 + Math.max(filtered.length, 1)) % Math.max(filtered.length, 1))
    } else if (e.key === 'Enter' && filtered[activeIndex]) {
      e.preventDefault()
      runItem(filtered[activeIndex])
    }
  }, [filtered, activeIndex, runItem])

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
          width: '100%', maxWidth: 600,
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 12, boxShadow: 'var(--shadow-md)',
          overflow: 'hidden',
          animation: 'scaleIn 0.15s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {aiMode ? (
          <AskAIMode
            onExit={() => setAiMode(false)}
            onCloseAll={() => setOpen(false)}
            industry={industry as 'realestate' | 'hospitality' | 'philanthropy' | null}
          />
        ) : (
          <>
        {/* Search input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', borderBottom: '1px solid var(--border)',
        }}>
          {searching
            ? <Loader2 size={16} style={{ color: 'var(--accent)', flexShrink: 0, animation: 'spin 1s linear infinite' }} />
            : <Search size={16} style={{ color: 'var(--txt3)', flexShrink: 0 }} />
          }
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, contacts, projects..."
            style={{
              flex: 1, border: 'none', background: 'transparent',
              outline: 'none', fontSize: 14, color: 'var(--txt)',
              padding: 0,
            }}
          />
          <button
            onClick={() => setAiMode(true)}
            aria-label="Ask AI"
            title="Ask AI (Cmd+Shift+K)"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '4px 8px', borderRadius: 6,
              background: 'var(--accent-bg)', color: 'var(--accent)',
              border: '1px solid var(--accent-border)',
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <Sparkles size={12} /> Ask AI
          </button>
          <kbd style={{
            fontSize: 10, padding: '2px 6px', borderRadius: 4,
            background: 'var(--bg2)', border: '1px solid var(--border)',
            color: 'var(--txt3)', fontFamily: 'inherit',
          }}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ maxHeight: 420, overflowY: 'auto', padding: '6px 0' }}>
          {filtered.length === 0 && (
            <div style={{
              padding: '32px 16px', textAlign: 'center',
              color: 'var(--txt3)', fontSize: 13,
            }}>
              {searching ? 'Searching…' : 'No results found'}
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
                      <div style={{
                        fontSize: 13, fontWeight: 500, color: 'var(--txt)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {item.label}
                      </div>
                      <div style={{
                        fontSize: 11, color: 'var(--txt3)', marginTop: 1,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {item.description}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 16px', borderTop: '1px solid var(--border)',
          fontSize: 10, color: 'var(--txt3)', background: 'var(--bg2)',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <kbd style={kbdFooter}>↑</kbd><kbd style={kbdFooter}>↓</kbd> navigate
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <kbd style={kbdFooter}>↵</kbd> select
            </span>
          </span>
          <span>{filtered.length} result{filtered.length === 1 ? '' : 's'}</span>
        </div>
          </>
        )}
      </div>
    </div>
  )
}

const kbdFooter: React.CSSProperties = {
  fontSize: 9, padding: '1px 4px', borderRadius: 3,
  background: 'var(--panel)', border: '1px solid var(--border)',
  color: 'var(--txt2)', fontFamily: 'inherit', minWidth: 14, textAlign: 'center',
}
