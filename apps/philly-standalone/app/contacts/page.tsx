'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/philly/layout/Topbar'
import { KpiCard } from '@/components/philly/ui/KpiCard'
import { Modal } from '@/components/philly/ui/Modal'
import { ContactForm } from '@/components/philly/forms/ContactForm'
import type { ContactFormData } from '@/components/philly/forms/ContactForm'
import { Search, Mail, Phone, FolderKanban, Eye, Download, CheckSquare, Square, Pencil, Trash2, ExternalLink, Copy, Filter as FilterIcon } from 'lucide-react'
import { useIndustry } from '@/hooks/philly/useIndustry'
import { ContactQuickView } from '@/components/philly/contacts/ContactQuickView'
import { BulkActionBar, type ContactTypeOption } from '@/components/philly/contacts/BulkActionBar'
import { SavedViewsBar } from '@/components/philly/views/SavedViewsBar'
import { ContextMenu, type ContextMenuItem } from '@/components/philly/ui/ContextMenu'
import { AdvancedFilterBuilder } from '@/components/philly/filter/AdvancedFilterBuilder'
import type { FilterSpec } from '@/lib/philly/filter/types'
import { CONTACT_FILTER_SCHEMA } from '@/lib/philly/filter/schemas'
import { useRouter } from 'next/navigation'
import type { SavedView } from '@/hooks/philly/useSavedViews'
import { useApi } from '@/hooks/philly/useApi'
import { useEntitySubscription } from '@/hooks/philly/useRealtime'
import { useToast } from '@/hooks/philly/useToast'
import { useUrlState } from '@/hooks/philly/useUrlState'
import { useDebouncedValue } from '@/hooks/philly/useDebouncedValue'
import { toCsv, downloadCsv } from '@/lib/philly/csv'

interface Contact {
  id: string
  firstName: string
  lastName: string
  company: string
  type: string
  email: string
  phone: string
  projects: number
}

/* Shape returned by GET /api/contacts */
interface ApiContact {
  id: string
  name: string
  email: string
  phone: string
  type: string
  company: string
  _count?: { contactProjects: number }
}

function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return { firstName: parts[0], lastName: '' }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

function mapApiContact(c: ApiContact): Contact {
  const { firstName, lastName } = splitName(c.name)
  return {
    id: c.id,
    firstName,
    lastName,
    company: c.company,
    type: c.type,
    email: c.email,
    phone: c.phone,
    projects: c._count?.contactProjects ?? 0,
  }
}

const DEMO_CONTACTS: Contact[] = [
  { id: '1', firstName: 'Sarah', lastName: 'Chen', company: 'GreenFuture Foundation', type: 'partner', email: 's.chen@greenfuture.org', phone: '+31 6 1234 5678', projects: 3 },
  { id: '2', firstName: 'Marcus', lastName: 'Williams', company: 'EcoVentures Capital', type: 'donor', email: 'm.williams@ecoventures.com', phone: '+31 6 2345 6789', projects: 2 },
  { id: '3', firstName: 'Aisha', lastName: 'Patel', company: 'City of Amsterdam', type: 'stakeholder', email: 'a.patel@amsterdam.nl', phone: '+31 20 555 0101', projects: 4 },
  { id: '4', firstName: 'James', lastName: 'O\'Brien', company: 'CleanOcean Initiative', type: 'partner', email: 'j.obrien@cleanocean.org', phone: '+44 7700 900123', projects: 1 },
  { id: '5', firstName: 'Fatima', lastName: 'Al-Rashid', company: 'Water for Life Trust', type: 'beneficiary', email: 'f.alrashid@waterforlife.org', phone: '+254 700 123456', projects: 2 },
  { id: '6', firstName: 'Erik', lastName: 'Johansson', company: 'Nordic Impact Fund', type: 'donor', email: 'e.johansson@nordicimpact.se', phone: '+46 70 123 4567', projects: 5 },
  { id: '7', firstName: 'Priya', lastName: 'Sharma', company: 'TechBridge Education', type: 'partner', email: 'p.sharma@techbridge.edu', phone: '+91 98765 43210', projects: 3 },
  { id: '8', firstName: 'David', lastName: 'Muller', company: 'EU Climate Commission', type: 'stakeholder', email: 'd.muller@ec.europa.eu', phone: '+32 2 299 1111', projects: 2 },
  { id: '9', firstName: 'Lina', lastName: 'Torres', company: 'SolarAid International', type: 'beneficiary', email: 'l.torres@solaraid.org', phone: '+34 612 345 678', projects: 1 },
  { id: '10', firstName: 'Robert', lastName: 'Kim', company: 'Pacific Green Alliance', type: 'donor', email: 'r.kim@pacificgreen.org', phone: '+1 415 555 0199', projects: 4 },
]

const RE_CONTACTS: Contact[] = [
  { id: '1', firstName: 'Willem', lastName: 'de Vries', company: 'De Vries Family Office', type: 'buyer', email: 'w.devries@devries-fo.nl', phone: '+31 6 1122 3344', projects: 2 },
  { id: '2', firstName: 'Sophie', lastName: 'Bakker', company: 'Bakker Real Estate Group', type: 'seller', email: 's.bakker@bakker-re.nl', phone: '+31 6 2233 4455', projects: 3 },
  { id: '3', firstName: 'Thomas', lastName: 'Jansen', company: 'Jansen Capital Partners', type: 'investor', email: 't.jansen@jansencap.com', phone: '+31 6 3344 5566', projects: 5 },
  { id: '4', firstName: 'Eva', lastName: 'Mulder', company: 'Expat Housing Amsterdam', type: 'tenant', email: 'e.mulder@expathousing.nl', phone: '+31 6 4455 6677', projects: 1 },
  { id: '5', firstName: 'Lars', lastName: 'Hendriks', company: 'Hendriks Development BV', type: 'seller', email: 'l.hendriks@hendriks-dev.nl', phone: '+31 6 5566 7788', projects: 4 },
  { id: '6', firstName: 'Anna', lastName: 'Visser', company: 'Visser & Partners Law', type: 'buyer', email: 'a.visser@visserlaw.nl', phone: '+31 6 6677 8899', projects: 2 },
  { id: '7', firstName: 'Pieter', lastName: 'Smit', company: 'Smit Pension Fund', type: 'investor', email: 'p.smit@smitpension.nl', phone: '+31 6 7788 9900', projects: 6 },
  { id: '8', firstName: 'Marta', lastName: 'Koster', company: 'Zuidas Relocation Services', type: 'tenant', email: 'm.koster@zuidasreloc.nl', phone: '+31 6 8899 0011', projects: 1 },
  { id: '9', firstName: 'Jan', lastName: 'van der Berg', company: 'Van der Berg Vastgoed', type: 'seller', email: 'j.vdberg@vdbergvastgoed.nl', phone: '+31 6 9900 1122', projects: 3 },
  { id: '10', firstName: 'Claudia', lastName: 'Brouwer', company: 'Brouwer Investments AG', type: 'investor', email: 'c.brouwer@brouwer-inv.ch', phone: '+41 79 123 4567', projects: 4 },
  { id: '11', firstName: 'Pieter', lastName: 'van der Berg', company: 'Van der Berg Vastgoed', type: 'landlord', email: 'p.vanderberg@vdbvastgoed.nl', phone: '+31 6 8899 0011', projects: 4 },
  { id: '12', firstName: 'Saskia', lastName: 'Huisman', company: 'Huisman Properties B.V.', type: 'landlord', email: 's.huisman@huismanprop.nl', phone: '+31 6 7788 9900', projects: 2 },
]

const HOS_CONTACTS: Contact[] = [
  { id: '1', firstName: 'Hans', lastName: 'Müller', company: 'Business Traveler', type: 'guest', email: 'h.muller@corp.de', phone: '+49 170 123 4567', projects: 4 },
  { id: '2', firstName: 'Elena', lastName: 'Rossi', company: 'Rossi Family (IT)', type: 'guest', email: 'e.rossi@gmail.com', phone: '+39 333 456 7890', projects: 2 },
  { id: '3', firstName: 'Fresh Foods BV', lastName: '', company: 'Fresh Foods BV', type: 'vendor', email: 'orders@freshfoods.nl', phone: '+31 20 555 0201', projects: 1 },
  { id: '4', firstName: 'SparkleClean', lastName: 'Services', company: 'SparkleClean Services', type: 'partner', email: 'info@sparkleclean.nl', phone: '+31 20 555 0302', projects: 3 },
  { id: '5', firstName: 'Maria', lastName: 'Santos', company: 'Santos Wedding Party', type: 'guest', email: 'm.santos@outlook.com', phone: '+31 6 9876 5432', projects: 1 },
  { id: '6', firstName: 'Peter', lastName: 'de Groot', company: 'Hotel Staff — Front Desk', type: 'staff', email: 'p.degroot@hotel.nl', phone: '+31 6 1111 2222', projects: 0 },
  { id: '7', firstName: 'Wine & Dine', lastName: 'Distributors', company: 'Wine & Dine Distributors', type: 'vendor', email: 'sales@winedine.nl', phone: '+31 20 555 0403', projects: 2 },
  { id: '8', firstName: 'James', lastName: 'Wilson', company: 'TechCorp Events', type: 'guest', email: 'j.wilson@techcorp.com', phone: '+1 415 555 0199', projects: 3 },
  { id: '9', firstName: 'Anna', lastName: 'Bakker', company: 'Hotel Staff — Housekeeping', type: 'staff', email: 'a.bakker@hotel.nl', phone: '+31 6 3333 4444', projects: 0 },
  { id: '10', firstName: 'Linen & More', lastName: 'BV', company: 'Linen & More BV', type: 'partner', email: 'service@linenmore.nl', phone: '+31 20 555 0504', projects: 2 },
]

const typeColors: Record<string, { bg: string; txt: string; border: string }> = {
  partner: { bg: 'var(--accent-bg)', txt: 'var(--accent-txt)', border: 'var(--accent-border)' },
  donor: { bg: 'var(--g-bg)', txt: 'var(--g-txt)', border: 'var(--g-border)' },
  stakeholder: { bg: 'var(--p-bg)', txt: 'var(--p-txt)', border: 'var(--p-border)' },
  beneficiary: { bg: 'var(--o-bg)', txt: 'var(--o-txt)', border: 'var(--o-border)' },
  buyer: { bg: 'var(--accent-bg)', txt: 'var(--accent-txt)', border: 'var(--accent-border)' },
  seller: { bg: 'var(--g-bg)', txt: 'var(--g-txt)', border: 'var(--g-border)' },
  tenant: { bg: 'var(--o-bg)', txt: 'var(--o-txt)', border: 'var(--o-border)' },
  investor: { bg: 'var(--p-bg)', txt: 'var(--p-txt)', border: 'var(--p-border)' },
  landlord: { bg: 'var(--y-bg)', txt: 'var(--y-txt)', border: 'var(--y-border)' },
  guest: { bg: 'var(--accent-bg)', txt: 'var(--accent-txt)', border: 'var(--accent-border)' },
  vendor: { bg: 'var(--o-bg)', txt: 'var(--o-txt)', border: 'var(--o-border)' },
  staff: { bg: 'var(--y-bg)', txt: 'var(--y-txt)', border: 'var(--y-border)' },
}

const avatarColors: Record<string, string> = {
  partner: 'var(--accent)',
  donor: 'var(--g)',
  stakeholder: 'var(--p)',
  beneficiary: 'var(--o)',
  buyer: 'var(--accent)',
  seller: 'var(--g)',
  tenant: 'var(--o)',
  investor: 'var(--p)',
  landlord: 'var(--y)',
  guest: 'var(--accent)',
  vendor: 'var(--o)',
  staff: 'var(--y)',
}

export default function ContactsPage() {
  const { industry } = useIndustry()
  const t = useTranslations('contacts')
  const tFilter = useTranslations('filter')
  const [filters, setFilters] = useUrlState({ q: '', type: 'all' })
  const search = filters.q
  const typeFilter = filters.type
  const debouncedSearch = useDebouncedValue(search, 250)
  const [showAdd, setShowAdd] = useState(false)
  const [quickViewId, setQuickViewId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; contactId: string } | null>(null)
  // Bundle AG — drag-drop reorder (live mode only).
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  // Optimistic ordering override — when set, takes precedence over the
  // server's `liveContacts` order until the next refetch.
  const [orderOverride, setOrderOverride] = useState<string[] | null>(null)

  // Bundle AM — advanced filter builder.
  const [filterSpec, setFilterSpec] = useState<FilterSpec | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const { addToast } = useToast()
  const router = useRouter()

  const isRE = industry === 'realestate'
  const isHOS = industry === 'hospitality'
  const isLive = !isRE && !isHOS
  const industryKey: 'philanthropy' | 'realestate' | 'hospitality' =
    isRE ? 'realestate' : isHOS ? 'hospitality' : 'philanthropy'

  const toggleSelected = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])
  const clearSelected = useCallback(() => setSelected(new Set()), [])

  const applySavedView = useCallback((view: SavedView) => {
    const f = view.filters
    const next: Record<string, string> = {}
    if (typeof f.q === 'string') next.q = f.q
    if (typeof f.type === 'string') next.type = f.type
    setFilters(next)
    // Bundle AM — pull the advanced filter spec back if the saved view
    // included one. Unknown shapes are silently ignored (saved views
    // pre-AM don't carry an `advanced` key).
    if (f.advanced && typeof f.advanced === 'object') {
      setFilterSpec(f.advanced as FilterSpec)
    } else {
      setFilterSpec(null)
    }
    addToast(`Applied "${view.name}"`, 'success')
  }, [setFilters, addToast])

  /* Live data for the default (philanthropy) view comes from the API.
     RE and HOS modes are showcase / demo industries, so they keep their
     hand-curated demo data. */
  const contactsApiPath = useMemo(() => {
    const params = new URLSearchParams()
    if (filterSpec && filterSpec.rules.length > 0) {
      params.set('filter', JSON.stringify(filterSpec))
    }
    const qs = params.toString()
    return `/contacts${qs ? `?${qs}` : ''}`
  }, [filterSpec])

  const apiQuery = useApi<{ data: ApiContact[] }>(contactsApiPath, {
    enabled: !isRE && !isHOS,
  })
  // Live mode is loading when the API call is in flight. Demo/showcase
  // modes never set this true — they render their hand-curated data
  // synchronously.
  const isLiveLoading = !isRE && !isHOS && apiQuery.loading
  // Live-refresh on any contact mutation in the org
  useEntitySubscription('contact', apiQuery.refetch)
  const liveContacts = useMemo<Contact[]>(() => {
    if (isRE || isHOS) return []
    const rows = apiQuery.data?.data ?? []
    return rows.map(mapApiContact)
  }, [apiQuery.data, isRE, isHOS])

  const contacts: Contact[] = isHOS
    ? HOS_CONTACTS
    : isRE
    ? RE_CONTACTS
    : liveContacts.length > 0
    ? liveContacts
    : DEMO_CONTACTS
  const filterOptions = isHOS
    ? ['all', 'guest', 'vendor', 'partner', 'staff']
    : isRE
    ? ['all', 'buyer', 'seller', 'tenant', 'investor', 'landlord']
    : ['all', 'partner', 'beneficiary', 'stakeholder', 'donor']

  // Apply optimistic reorder override (Bundle AG) before filtering so
  // a drag-and-drop is reflected immediately, even if the user has a
  // search/type filter active.
  const orderedContacts = useMemo(() => {
    if (!orderOverride) return contacts
    const indexed = new Map(orderOverride.map((id, i) => [id, i]))
    return [...contacts].sort((a, b) => {
      const ai = indexed.has(a.id) ? indexed.get(a.id)! : Number.MAX_SAFE_INTEGER
      const bi = indexed.has(b.id) ? indexed.get(b.id)! : Number.MAX_SAFE_INTEGER
      return ai - bi
    })
  }, [contacts, orderOverride])

  const filtered = orderedContacts.filter(c => {
    if (typeFilter !== 'all' && c.type !== typeFilter) return false
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      return (
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
      )
    }
    return true
  })

  const countByType = (type: string) => contacts.filter(c => c.type === type).length
  // Bundle AN — KPI percentages: guard against divide-by-zero when
  // live mode returns an empty list. fmt returns "—" instead of NaN%.
  const pctOfTotal = (n: number) => contacts.length === 0 ? '—' : `${Math.round((n / contacts.length) * 100)}% of total`

  const handleAddContact = async (data: ContactFormData) => {
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to create contact' }))
        throw new Error(err.error || 'Failed to create contact')
      }
      addToast(t('createdSuccess'), 'success')
      setShowAdd(false)
      apiQuery.refetch()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('createFailed')
      addToast(msg, 'error')
    }
  }

  /* ---- Bulk operations (Bundle X) ---- */

  const exportContactsToCsv = useCallback((rows: Contact[], filenameStem: string) => {
    const csv = toCsv(rows, [
      { header: 'First name', value: (r) => r.firstName },
      { header: 'Last name', value: (r) => r.lastName },
      { header: 'Company', value: (r) => r.company },
      { header: 'Type', value: (r) => r.type },
      { header: 'Email', value: (r) => r.email },
      { header: 'Phone', value: (r) => r.phone },
      { header: 'Linked', value: (r) => r.projects },
    ])
    const stamp = new Date().toISOString().slice(0, 10)
    downloadCsv(`${filenameStem}-${stamp}`, csv)
  }, [])

  const selectedRows = useMemo(
    () => contacts.filter((c) => selected.has(c.id)),
    [contacts, selected],
  )

  const handleBulkExport = useCallback(() => {
    if (selectedRows.length === 0) return
    exportContactsToCsv(selectedRows, 'contacts-selected')
    addToast(`Exported ${selectedRows.length} contact${selectedRows.length === 1 ? '' : 's'}`, 'success')
  }, [selectedRows, exportContactsToCsv, addToast])

  const handleExportAllVisible = useCallback(() => {
    if (filtered.length === 0) {
      addToast('Nothing to export', 'error')
      return
    }
    exportContactsToCsv(filtered, 'contacts-all')
  // filtered is recomputed each render; capture inside the click.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, exportContactsToCsv, addToast])

  const handleBulkDelete = useCallback(async () => {
    if (!isLive || selected.size === 0) return
    const ids = Array.from(selected)
    if (!confirm(`Delete ${ids.length} contact${ids.length === 1 ? '' : 's'}? This cannot be undone.`)) return
    setBulkBusy(true)
    try {
      const res = await fetch('/api/contacts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', ids }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error ?? `Failed (${res.status})`)
      addToast(`Deleted ${json?.data?.deleted ?? ids.length} contact${ids.length === 1 ? '' : 's'}`, 'success')
      clearSelected()
      apiQuery.refetch()
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Bulk delete failed', 'error')
    } finally {
      setBulkBusy(false)
    }
  }, [isLive, selected, addToast, clearSelected, apiQuery])

  const handleBulkChangeType = useCallback(async (type: ContactTypeOption) => {
    if (!isLive || selected.size === 0) return
    const ids = Array.from(selected)
    setBulkBusy(true)
    try {
      const res = await fetch('/api/contacts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', ids, data: { type } }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error ?? `Failed (${res.status})`)
      addToast(`Updated ${json?.data?.updated ?? ids.length} contact${ids.length === 1 ? '' : 's'}`, 'success')
      clearSelected()
      apiQuery.refetch()
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Bulk update failed', 'error')
    } finally {
      setBulkBusy(false)
    }
  }, [isLive, selected, addToast, clearSelected, apiQuery])

  /* ---- Drag-drop reorder (Bundle AG, live mode only) ---- */
  const handleReorderDrop = useCallback(async (sourceId: string, targetId: string) => {
    if (!isLive || sourceId === targetId) return
    // Compute the new order based on the currently-rendered list, not the
    // unfiltered one — moving Alice above Bob within a typeFilter view
    // shouldn't disturb contacts hidden by the filter.
    const currentOrder = filtered.map((c) => c.id)
    const fromIdx = currentOrder.indexOf(sourceId)
    const toIdx = currentOrder.indexOf(targetId)
    if (fromIdx === -1 || toIdx === -1) return
    const reordered = [...currentOrder]
    reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, sourceId)
    setOrderOverride(reordered)
    try {
      const res = await fetch('/api/contacts/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: reordered }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error ?? `Failed (${res.status})`)
      }
      addToast('Contacts reordered', 'success')
      apiQuery.refetch()
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Reorder failed', 'error')
      setOrderOverride(null) // revert
    }
  }, [isLive, filtered, addToast, apiQuery])

  const allVisibleSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id))
  const toggleSelectAllVisible = useCallback(() => {
    if (allVisibleSelected) {
      clearSelected()
    } else {
      setSelected(new Set(filtered.map((c) => c.id)))
    }
  // filtered changes per render; capture lazily.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allVisibleSelected, filtered, clearSelected])

  return (
    <>
      <Topbar
        title={t('title')}
        sub={isHOS ? t('subtitleHOS') : isRE ? t('subtitleRE') : t('subtitle')}
        addLabel={t('newContact')}
        onAdd={() => setShowAdd(true)}
      />

      <div style={{ padding: '18px 24px 40px' }}>
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
          {isHOS ? (
            <>
              <KpiCard label="Total Contacts" value={contacts.length} icon="users" accentColor="var(--accent)" delay={80} />
              <KpiCard label="Guests" value={countByType('guest')} delta={pctOfTotal(countByType('guest'))} deltaDir="neu" icon="heart" accentColor="var(--accent)" delay={130} />
              <KpiCard label="Vendors" value={countByType('vendor')} delta={pctOfTotal(countByType('vendor'))} deltaDir="up" icon="dollar-sign" accentColor="var(--o)" delay={180} />
              <KpiCard label="Staff" value={countByType('staff')} icon="globe" accentColor="var(--y)" delay={230} />
            </>
          ) : isRE ? (
            <>
              <KpiCard label="Total Contacts" value={contacts.length} icon="users" accentColor="var(--accent)" delay={80} />
              <KpiCard label="Buyers" value={countByType('buyer')} delta={pctOfTotal(countByType('buyer'))} deltaDir="neu" icon="heart" accentColor="var(--accent)" delay={130} />
              <KpiCard label="Sellers" value={countByType('seller')} delta={pctOfTotal(countByType('seller'))} deltaDir="up" icon="dollar-sign" accentColor="var(--g)" delay={180} />
              <KpiCard label="Investors" value={countByType('investor')} icon="globe" accentColor="var(--p)" delay={230} />
            </>
          ) : (
            <>
              <KpiCard label="Total Contacts" value={contacts.length} icon="users" accentColor="var(--accent)" delay={80} />
              <KpiCard label="Partners" value={countByType('partner')} delta={pctOfTotal(countByType('partner'))} deltaDir="neu" icon="heart" accentColor="var(--accent)" delay={130} />
              <KpiCard label="Donors" value={countByType('donor')} delta={pctOfTotal(countByType('donor'))} deltaDir="up" icon="dollar-sign" accentColor="var(--g)" delay={180} />
              <KpiCard label="Stakeholders" value={countByType('stakeholder')} icon="globe" accentColor="var(--p)" delay={230} />
            </>
          )}
        </div>

        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '10px 14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, background: 'var(--bg2)', borderRadius: 8, padding: '6px 10px' }}>
            <Search size={14} color="var(--txt3)" aria-hidden="true" />
            <input
              value={search}
              onChange={e => setFilters({ q: e.target.value })}
              placeholder={t('searchPlaceholder')}
              aria-label={t('searchPlaceholder')}
              style={{ border: 'none', background: 'none', flex: 1, fontSize: 13, padding: 0 }}
            />
          </div>
          {filterOptions.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setFilters({ type: s })}
              aria-pressed={typeFilter === s}
              style={{
                padding: '5px 12px', borderRadius: 7, fontSize: 11.5, fontWeight: 600,
                background: typeFilter === s ? 'var(--txt)' : 'var(--bg2)',
                color: typeFilter === s ? 'var(--panel)' : 'var(--txt2)',
                border: 'none', cursor: 'pointer', textTransform: 'capitalize',
              }}
            >{s === 'all' ? t('all') : t(`types.${s}` as 'types.partner')}</button>
          ))}
          <span style={{ width: 1, height: 22, background: 'var(--border)', margin: '0 2px' }} />
          <label
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 10px', borderRadius: 7, fontSize: 11.5,
              background: 'var(--bg2)', color: 'var(--txt2)',
              cursor: filtered.length === 0 ? 'default' : 'pointer',
              userSelect: 'none', opacity: filtered.length === 0 ? 0.5 : 1,
            }}
          >
            <input
              type="checkbox"
              checked={allVisibleSelected}
              disabled={filtered.length === 0}
              onChange={toggleSelectAllVisible}
              style={{ accentColor: 'var(--accent)', cursor: 'inherit' }}
            />
            Select all
          </label>
          <button
            type="button"
            onClick={handleExportAllVisible}
            aria-label="Export all visible contacts to CSV"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 7, fontSize: 11.5, fontWeight: 600,
              background: 'var(--bg2)', color: 'var(--txt2)',
              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <Download size={12} /> Export
          </button>
          {/* Bundle AM — advanced filter builder (live mode only). */}
          {isLive && (
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              aria-label="Open advanced filter builder"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '5px 12px', borderRadius: 7, fontSize: 11.5, fontWeight: 600,
                background: filterSpec ? 'color-mix(in srgb, var(--accent) 14%, transparent)' : 'var(--bg2)',
                color: filterSpec ? 'var(--accent)' : 'var(--txt2)',
                border: filterSpec ? '1px solid var(--accent)' : 'none',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <FilterIcon size={12} />
              {filterSpec
                ? tFilter('labelWithCount', { count: tFilter('ruleCount', { count: filterSpec.rules.length }) })
                : tFilter('label')}
            </button>
          )}
        </div>

        {/* Saved views (Bundle AA) — live mode only. Demo/showcase
            industries can't persist views because the contact ids
            are hand-curated fake rows. */}
        {isLive && (
          <SavedViewsBar
            entity="contacts"
            currentFilters={{ q: search, type: typeFilter, advanced: filterSpec ?? undefined }}
            onApply={applySavedView}
          />
        )}

        {/* Loading indicator — only in live mode while the API call is in
            flight. Demo/showcase modes render synchronously and never
            show this. */}
        {isLiveLoading && (
          <div
            role="status"
            aria-live="polite"
            style={{
              padding: '10px 14px', marginBottom: 12,
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 8, fontSize: 12, color: 'var(--txt2)',
            }}
          >
            Loading contacts…
          </div>
        )}

        {/* Contact cards grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {filtered.map(c => {
            const tc = typeColors[c.type] || typeColors.partner
            const initials = c.firstName[0] + c.lastName[0]
            return (
              <Link key={c.id} href={`/contacts/${c.id}`} className="card-hover"
                onContextMenu={(e) => {
                  e.preventDefault()
                  setCtxMenu({ x: e.clientX, y: e.clientY, contactId: c.id })
                }}
                draggable={isLive}
                onDragStart={(e) => {
                  if (!isLive) return
                  setDragId(c.id)
                  e.dataTransfer.setData('text/contact-id', c.id)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragOver={(e) => {
                  if (!isLive || !dragId || dragId === c.id) return
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  if (dragOverId !== c.id) setDragOverId(c.id)
                }}
                onDragLeave={() => {
                  if (dragOverId === c.id) setDragOverId(null)
                }}
                onDrop={(e) => {
                  if (!isLive) return
                  e.preventDefault()
                  const sourceId = e.dataTransfer.getData('text/contact-id') || dragId
                  setDragId(null)
                  setDragOverId(null)
                  if (sourceId) handleReorderDrop(sourceId, c.id)
                }}
                onDragEnd={() => { setDragId(null); setDragOverId(null) }}
                style={{
                background: selected.has(c.id)
                  ? 'color-mix(in srgb, var(--accent) 6%, var(--panel))'
                  : 'var(--panel)',
                border: `1px solid ${
                  dragOverId === c.id
                    ? 'var(--accent)'
                    : selected.has(c.id) ? 'var(--accent)' : 'var(--border)'
                }`,
                borderRadius: 12, padding: '16px', cursor: 'pointer',
                boxShadow: dragOverId === c.id ? '0 0 0 2px var(--accent)' : 'var(--shadow-sm)',
                textDecoration: 'none', color: 'inherit', display: 'block',
                position: 'relative',
                opacity: dragId === c.id ? 0.55 : 1,
                transition: 'opacity 120ms ease, box-shadow 120ms ease',
              }}>
                {/* Selection checkbox — Bundle X. Stops propagation so
                    selection doesn't follow the surrounding <Link>. */}
                <label
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSelected(c.id) }}
                  aria-label={`Select ${c.firstName} ${c.lastName}`}
                  style={{
                    position: 'absolute', top: 10, left: 10,
                    width: 22, height: 22, borderRadius: 6,
                    background: selected.has(c.id) ? 'var(--accent)' : 'var(--panel)',
                    border: `1px solid ${selected.has(c.id) ? 'var(--accent)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#fff', fontSize: 12, fontWeight: 700,
                    zIndex: 1, userSelect: 'none',
                  }}
                >
                  {selected.has(c.id) ? '✓' : ''}
                </label>
                {/* Quick-view trigger — Bundle T. Stops propagation so
                    the click doesn't follow the surrounding <Link>. */}
                <button
                  type="button"
                  aria-label={`Quick view ${c.firstName} ${c.lastName}`}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setQuickViewId(c.id)
                  }}
                  style={{
                    position: 'absolute', top: 10, right: 10,
                    width: 28, height: 28, borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--panel)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'var(--txt3)',
                    zIndex: 1,
                  }}
                >
                  <Eye size={13} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, paddingLeft: 24 }}>
                  {/* Avatar */}
                  <div style={{
                    width: 40, height: 40, borderRadius: 20,
                    background: avatarColors[c.type] || 'var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, color: '#fff',
                    flexShrink: 0,
                  }}>{initials}</div>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 36 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{c.firstName} {c.lastName}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--txt3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.company}</div>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                    background: tc.bg, color: tc.txt, border: `1px solid ${tc.border}`,
                    textTransform: 'capitalize', flexShrink: 0,
                  }}>{c.type}</span>
                </div>

                {/* Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--txt2)' }}>
                    <Mail size={12} color="var(--txt3)" aria-hidden="true" />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.email}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--txt2)' }}>
                    <Phone size={12} color="var(--txt3)" aria-hidden="true" />
                    <span>{c.phone}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--txt2)' }}>
                    <FolderKanban size={12} color="var(--txt3)" aria-hidden="true" />
                    <span className="mono" style={{ fontWeight: 600 }}>{c.projects}</span>
                    <span>connected {isHOS ? 'reservation' : isRE ? 'propert' : 'project'}{c.projects !== 1 ? (isHOS ? 's' : isRE ? 'ies' : 's') : (isRE ? 'y' : '')}</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="New Contact"
        subtitle="Add a new contact to your directory"
        size="md"
      >
        <ContactForm
          onSubmit={handleAddContact}
          onCancel={() => setShowAdd(false)}
        />
      </Modal>

      <ContactQuickView contactId={quickViewId} onClose={() => setQuickViewId(null)} />

      <AdvancedFilterBuilder
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        schema={CONTACT_FILTER_SCHEMA}
        initial={filterSpec}
        onApply={(spec) => setFilterSpec(spec)}
      />

      <BulkActionBar
        count={selected.size}
        industry={industryKey}
        busy={bulkBusy}
        onClear={clearSelected}
        onExport={handleBulkExport}
        onDelete={handleBulkDelete}
        onChangeType={handleBulkChangeType}
      />

      {ctxMenu && (() => {
        const c = contacts.find((x) => x.id === ctxMenu.contactId)
        if (!c) return null
        const items: ContextMenuItem[] = [
          {
            kind: 'action',
            label: 'Open',
            icon: ExternalLink,
            shortcut: 'Enter',
            onClick: () => router.push(`/contacts/${c.id}`),
          },
          {
            kind: 'action',
            label: 'Quick view',
            icon: Eye,
            onClick: () => setQuickViewId(c.id),
          },
          {
            kind: 'action',
            label: 'Edit',
            icon: Pencil,
            onClick: () => setQuickViewId(c.id), // opens the quick-view; user clicks Edit there
            disabled: !isLive,
          },
          { kind: 'separator' },
          {
            kind: 'action',
            label: selected.has(c.id) ? 'Deselect' : 'Select',
            icon: selected.has(c.id) ? CheckSquare : Square,
            onClick: () => toggleSelected(c.id),
          },
          { kind: 'separator' },
          {
            kind: 'action',
            label: 'Copy email',
            icon: Copy,
            onClick: () => {
              if (!c.email) { addToast('No email on file', 'error'); return }
              navigator.clipboard?.writeText(c.email).then(
                () => addToast('Email copied', 'success'),
                () => addToast('Copy failed', 'error'),
              )
            },
            disabled: !c.email,
          },
          {
            kind: 'action',
            label: 'Copy phone',
            icon: Copy,
            onClick: () => {
              if (!c.phone) { addToast('No phone on file', 'error'); return }
              navigator.clipboard?.writeText(c.phone).then(
                () => addToast('Phone copied', 'success'),
                () => addToast('Copy failed', 'error'),
              )
            },
            disabled: !c.phone,
          },
          { kind: 'separator' },
          {
            kind: 'action',
            label: 'Delete',
            icon: Trash2,
            destructive: true,
            disabled: !isLive,
            onClick: () => {
              setSelected(new Set([c.id]))
              handleBulkDelete()
            },
          },
        ]
        return (
          <ContextMenu
            x={ctxMenu.x}
            y={ctxMenu.y}
            items={items}
            onClose={() => setCtxMenu(null)}
          />
        )
      })()}
    </>
  )
}
