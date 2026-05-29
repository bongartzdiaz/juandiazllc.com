'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
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
  const t = useTranslations('commandPalette')

  const iconSize = 16

  /* ── Static command items (industry-aware full nav) ── */

  const staticItems: CommandItem[] = useMemo(() => {
    const catPages = t('categories.pages')
    const catTools = t('categories.tools')
    const catRe = t('categories.realEstate')
    const catHos = t('categories.hospitality')
    const catPhi = t('categories.philanthropy')
    const catSys = t('categories.system')
    const catAct = t('categories.actions')
    const catSet = t('categories.settings')

    const projectsItemKey = industry === 'realestate' ? 'properties' : 'projects'
    const impactItemKey = industry === 'realestate' ? 'market' : 'impact'
    const kanbanItemKey = industry === 'realestate'
      ? 'dealsBoard'
      : industry === 'hospitality'
        ? 'reservations'
        : 'kanban'

    const core: CommandItem[] = [
      { id: 'dashboard', label: t('items.dashboard.label'), description: t('items.dashboard.description'), icon: <LayoutDashboard size={iconSize} />, category: catPages, action: () => router.push('/'), keywords: ['home', 'overview'] },
      { id: 'projects', label: t(`items.${projectsItemKey}.label`), description: t(`items.${projectsItemKey}.description`), icon: <FolderKanban size={iconSize} />, category: catPages, action: () => router.push('/projects'), keywords: ['properties', 'projects'] },
      { id: 'contacts', label: t('items.contacts.label'), description: t('items.contacts.description'), icon: <Users size={iconSize} />, category: catPages, action: () => router.push('/contacts'), keywords: ['people', 'clients'] },
      { id: 'impact', label: t(`items.${impactItemKey}.label`), description: t(`items.${impactItemKey}.description`), icon: <BarChart3 size={iconSize} />, category: catPages, action: () => router.push('/impact'), keywords: ['analytics', 'metrics'] },
    ]

    const tools: CommandItem[] = [
      { id: 'reports', label: t('items.reports.label'), description: t('items.reports.description'), icon: <FileText size={iconSize} />, category: catTools, action: () => router.push('/reports'), keywords: ['export', 'pdf'] },
      { id: 'kanban', label: t(`items.${kanbanItemKey}.label`), description: t(`items.${kanbanItemKey}.description`), icon: <Columns3 size={iconSize} />, category: catTools, action: () => router.push('/kanban'), keywords: ['board', 'pipeline', 'deals'] },
      { id: 'deals', label: t('items.deals.label'), description: t('items.deals.description'), icon: <DollarSign size={iconSize} />, category: catTools, action: () => router.push('/deals'), keywords: ['pipeline', 'sales'] },
      { id: 'calendar', label: t('items.calendar.label'), description: t('items.calendar.description'), icon: <Calendar size={iconSize} />, category: catTools, action: () => router.push('/calendar'), keywords: ['events', 'schedule'] },
      { id: 'timeline', label: t('items.timeline.label'), description: t('items.timeline.description'), icon: <GanttChart size={iconSize} />, category: catTools, action: () => router.push('/timeline'), keywords: ['gantt', 'schedule'] },
      { id: 'documents', label: t('items.documents.label'), description: t('items.documents.description'), icon: <FileArchive size={iconSize} />, category: catTools, action: () => router.push('/documents'), keywords: ['files', 'uploads'] },
      { id: 'inbox', label: t('items.inbox.label'), description: t('items.inbox.description'), icon: <Inbox size={iconSize} />, category: catTools, action: () => router.push('/inbox'), keywords: ['messages', 'conversations'] },
      { id: 'email', label: t('items.email.label'), description: t('items.email.description'), icon: <Mail size={iconSize} />, category: catTools, action: () => router.push('/email'), keywords: ['mail', 'campaigns'] },
      { id: 'sms', label: t('items.sms.label'), description: t('items.sms.description'), icon: <MessageSquare size={iconSize} />, category: catTools, action: () => router.push('/sms'), keywords: ['text', 'twilio'] },
      { id: 'templates', label: t('items.templates.label'), description: t('items.templates.description'), icon: <FileCode size={iconSize} />, category: catTools, action: () => router.push('/templates'), keywords: ['template', 'library'] },
      { id: 'pages', label: t('items.pages.label'), description: t('items.pages.description'), icon: <Layers size={iconSize} />, category: catTools, action: () => router.push('/pages'), keywords: ['custom', 'builder'] },
      { id: 'ai', label: t('items.ai.label'), description: t('items.ai.description'), icon: <Sparkles size={iconSize} />, category: catTools, action: () => router.push('/ai'), keywords: ['ai', 'insights', 'intelligence'] },
    ]

    const industryItems: CommandItem[] = industry === 'realestate'
      ? [
          { id: 'properties', label: t('items.propertiesRe.label'), description: t('items.propertiesRe.description'), icon: <Home size={iconSize} />, category: catRe, action: () => router.push('/properties') },
          { id: 'showings', label: t('items.showings.label'), description: t('items.showings.description'), icon: <Eye size={iconSize} />, category: catRe, action: () => router.push('/showings') },
          { id: 'offers', label: t('items.offers.label'), description: t('items.offers.description'), icon: <HandCoins size={iconSize} />, category: catRe, action: () => router.push('/offers') },
          { id: 'open-houses', label: t('items.openHouses.label'), description: t('items.openHouses.description'), icon: <DoorOpen size={iconSize} />, category: catRe, action: () => router.push('/open-houses') },
          { id: 'commissions', label: t('items.commissions.label'), description: t('items.commissions.description'), icon: <Trophy size={iconSize} />, category: catRe, action: () => router.push('/commissions') },
          { id: 'drip-campaigns', label: t('items.dripCampaigns.label'), description: t('items.dripCampaigns.description'), icon: <Mail size={iconSize} />, category: catRe, action: () => router.push('/drip-campaigns') },
          { id: 'market-analytics', label: t('items.marketAnalytics.label'), description: t('items.marketAnalytics.description'), icon: <TrendingUp size={iconSize} />, category: catRe, action: () => router.push('/market-analytics') },
          { id: 'transactions', label: t('items.transactions.label'), description: t('items.transactions.description'), icon: <ClipboardList size={iconSize} />, category: catRe, action: () => router.push('/transactions') },
          { id: 'action-plans', label: t('items.actionPlans.label'), description: t('items.actionPlans.description'), icon: <ListChecks size={iconSize} />, category: catRe, action: () => router.push('/action-plans') },
          { id: 'lead-scores', label: t('items.leadScores.label'), description: t('items.leadScores.description'), icon: <Target size={iconSize} />, category: catRe, action: () => router.push('/lead-scores') },
          { id: 'lead-routing', label: t('items.leadRouting.label'), description: t('items.leadRouting.description'), icon: <GitBranch size={iconSize} />, category: catRe, action: () => router.push('/lead-routing') },
          { id: 'dialer', label: t('items.dialer.label'), description: t('items.dialer.description'), icon: <Phone size={iconSize} />, category: catRe, action: () => router.push('/dialer') },
          { id: 'referrals', label: t('items.referrals.label'), description: t('items.referrals.description'), icon: <UserPlus size={iconSize} />, category: catRe, action: () => router.push('/referrals') },
          { id: 'soi', label: t('items.soi.label'), description: t('items.soi.description'), icon: <Network size={iconSize} />, category: catRe, action: () => router.push('/soi') },
          { id: 'cma', label: t('items.cma.label'), description: t('items.cma.description'), icon: <BarChart size={iconSize} />, category: catRe, action: () => router.push('/cma') },
          { id: 'client-portal', label: t('items.clientPortal.label'), description: t('items.clientPortal.description'), icon: <Globe size={iconSize} />, category: catRe, action: () => router.push('/client-portal') },
          { id: 'e-signatures', label: t('items.eSignatures.label'), description: t('items.eSignatures.description'), icon: <PenTool size={iconSize} />, category: catRe, action: () => router.push('/e-signatures') },
        ]
      : industry === 'hospitality'
        ? [
            { id: 'rooms', label: t('items.rooms.label'), description: t('items.rooms.description'), icon: <BedDouble size={iconSize} />, category: catHos, action: () => router.push('/rooms') },
          ]
        : [
            { id: 'grants', label: t('items.grants.label'), description: t('items.grants.description'), icon: <Award size={iconSize} />, category: catPhi, action: () => router.push('/grants') },
            { id: 'donors', label: t('items.donors.label'), description: t('items.donors.description'), icon: <HandCoins size={iconSize} />, category: catPhi, action: () => router.push('/philanthropy/donors') },
            { id: 'volunteers', label: t('items.volunteers.label'), description: t('items.volunteers.description'), icon: <Heart size={iconSize} />, category: catPhi, action: () => router.push('/volunteers') },
          ]

    const system: CommandItem[] = [
      { id: 'notifications', label: t('items.notifications.label'), description: t('items.notifications.description'), icon: <Bell size={iconSize} />, category: catSys, action: () => router.push('/notifications') },
      { id: 'automations', label: t('items.automations.label'), description: t('items.automations.description'), icon: <Zap size={iconSize} />, category: catSys, action: () => router.push('/automations') },
      { id: 'integrations', label: t('items.integrations.label'), description: t('items.integrations.description'), icon: <Plug size={iconSize} />, category: catSys, action: () => router.push('/integrations') },
      { id: 'webhooks', label: t('items.webhooks.label'), description: t('items.webhooks.description'), icon: <Webhook size={iconSize} />, category: catSys, action: () => router.push('/settings/webhooks') },
      { id: 'pipelines', label: t('items.pipelines.label'), description: t('items.pipelines.description'), icon: <Columns3 size={iconSize} />, category: catSys, action: () => router.push('/settings/pipelines'), keywords: ['stages', 'board', 'deals'] },
      { id: 'security', label: t('items.security.label'), description: t('items.security.description'), icon: <Shield size={iconSize} />, category: catSys, action: () => router.push('/settings/security'), keywords: ['ip', 'allowlist', 'session', 'idle', 'enterprise'] },
      { id: 'features', label: t('items.features.label'), description: t('items.features.description'), icon: <ToggleRight size={iconSize} />, category: catSys, action: () => router.push('/settings/features'), keywords: ['kill-switch', 'killswitch', 'toggle', 'flag', 'flags', 'enable', 'disable', 'ai'] },
      { id: 'scim-groups', label: t('items.scimGroups.label'), description: t('items.scimGroups.description'), icon: <Users size={iconSize} />, category: catSys, action: () => router.push('/settings/scim-groups'), keywords: ['scim', 'sso', 'okta', 'azure', 'idp', 'groups', 'role', 'sections', 'mapping'] },
      { id: 'audit', label: t('items.audit.label'), description: t('items.audit.description'), icon: <Shield size={iconSize} />, category: catSys, action: () => router.push('/audit') },
      { id: 'settings', label: t('items.settings.label'), description: t('items.settings.description'), icon: <Settings size={iconSize} />, category: catSys, action: () => router.push('/settings'), keywords: ['preferences', 'config'] },
    ]

    const newProjectKey = industry === 'realestate'
      ? 'newProperty'
      : industry === 'hospitality'
        ? 'newRoom'
        : 'newProject'

    const actions: CommandItem[] = [
      {
        id: 'new-project',
        label: t(`items.${newProjectKey}.label`),
        description: t(`items.${newProjectKey}.description`),
        icon: <Plus size={iconSize} />, category: catAct,
        action: () => router.push('/projects'), keywords: ['create', 'add'],
      },
      {
        id: 'new-contact', label: t('items.newContact.label'), description: t('items.newContact.description'),
        icon: <UserPlus size={iconSize} />, category: catAct,
        action: () => router.push('/contacts'), keywords: ['create', 'add', 'person'],
      },
      {
        id: 'export-data', label: t('items.exportData.label'), description: t('items.exportData.description'),
        icon: <Download size={iconSize} />, category: catAct,
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

    const themeKey = theme === 'light' ? 'toDark' : 'toLight'
    const settings: CommandItem[] = [
      {
        id: 'toggle-theme',
        label: t(`items.${themeKey}.label`),
        description: t(`items.${themeKey}.description`, { theme }),
        icon: theme === 'light' ? <Moon size={iconSize} /> : <Sun size={iconSize} />,
        category: catSet,
        action: () => { toggleTheme(); setOpen(false) },
        keywords: ['dark', 'light', 'theme', 'mode'],
      },
      {
        id: 'ind-csr', label: t('items.toCsr.label'), description: t('items.toCsr.description'),
        icon: <Heart size={iconSize} />, category: catSet,
        action: () => { setIndustry('philanthropy' as Industry); setOpen(false) },
        keywords: ['philanthropy', 'industry'],
      },
      {
        id: 'ind-re', label: t('items.toRe.label'), description: t('items.toRe.description'),
        icon: <Building2 size={iconSize} />, category: catSet,
        action: () => { setIndustry('realestate' as Industry); setOpen(false) },
        keywords: ['property', 'industry'],
      },
      {
        id: 'ind-hos', label: t('items.toHos.label'), description: t('items.toHos.description'),
        icon: <UtensilsCrossed size={iconSize} />, category: catSet,
        action: () => { setIndustry('hospitality' as Industry); setOpen(false) },
        keywords: ['hotel', 'industry'],
      },
    ]

    return [...core, ...tools, ...industryItems, ...actions, ...system, ...settings]
  }, [config, industry, theme, router, toggleTheme, setIndustry, t])

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
    const contactsCat = t('categories.contacts')
    const projectsCat = t('categories.projects')
    const contactFallback = t('contactFallback')
    const contactEntries: CommandItem[] = contactHits.map(c => ({
      id: `contact-${c.id}`,
      label: c.name,
      description: [c.company, c.email, c.type].filter(Boolean).join(' · ') || contactFallback,
      icon: <User size={iconSize} />,
      category: contactsCat,
      action: () => router.push(`/contacts/${c.id}`),
    }))
    const projectEntries: CommandItem[] = projectHits.map(p => ({
      id: `project-${p.id}`,
      label: p.title,
      description: [p.category, p.status].filter(Boolean).join(' · ') || projectsCat,
      icon: <FolderKanban size={iconSize} />,
      category: projectsCat,
      action: () => router.push(`/projects/${p.id}`),
    }))
    return [...contactEntries, ...projectEntries]
  }, [contactHits, projectHits, router, t])

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
            placeholder={t('placeholder')}
            style={{
              flex: 1, border: 'none', background: 'transparent',
              outline: 'none', fontSize: 14, color: 'var(--txt)',
              padding: 0,
            }}
          />
          <button
            onClick={() => setAiMode(true)}
            aria-label={t('askAiAria')}
            title={t('askAiTitle')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '4px 8px', borderRadius: 6,
              background: 'var(--accent-bg)', color: 'var(--accent)',
              border: '1px solid var(--accent-border)',
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <Sparkles size={12} /> {t('askAi')}
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
              {searching ? t('searching') : t('noResults')}
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
              <kbd style={kbdFooter}>↑</kbd><kbd style={kbdFooter}>↓</kbd> {t('navigate')}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <kbd style={kbdFooter}>↵</kbd> {t('select')}
            </span>
          </span>
          <span>{t(filtered.length === 1 ? 'resultsOne' : 'resultsOther', { count: filtered.length })}</span>
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
