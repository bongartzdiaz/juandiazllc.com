'use client'

import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { KpiCard } from '@/components/ui/KpiCard'
import { Search, Mail, Phone, FolderKanban } from 'lucide-react'

interface Contact {
  id: string
  firstName: string
  lastName: string
  company: string
  type: 'partner' | 'donor' | 'stakeholder' | 'beneficiary'
  email: string
  phone: string
  projects: number
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

const typeColors: Record<string, { bg: string; txt: string; border: string }> = {
  partner: { bg: 'var(--accent-bg)', txt: 'var(--accent-txt)', border: 'var(--accent-border)' },
  donor: { bg: 'var(--g-bg)', txt: 'var(--g-txt)', border: 'var(--g-border)' },
  stakeholder: { bg: 'var(--p-bg)', txt: 'var(--p-txt)', border: 'var(--p-border)' },
  beneficiary: { bg: 'var(--o-bg)', txt: 'var(--o-txt)', border: 'var(--o-border)' },
}

const avatarColors: Record<string, string> = {
  partner: 'var(--accent)',
  donor: 'var(--g)',
  stakeholder: 'var(--p)',
  beneficiary: 'var(--o)',
}

export default function ContactsPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const filtered = DEMO_CONTACTS.filter(c => {
    if (typeFilter !== 'all' && c.type !== typeFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
      )
    }
    return true
  })

  const partnerCount = DEMO_CONTACTS.filter(c => c.type === 'partner').length
  const donorCount = DEMO_CONTACTS.filter(c => c.type === 'donor').length
  const stakeholderCount = DEMO_CONTACTS.filter(c => c.type === 'stakeholder').length

  return (
    <>
      <Topbar title="Contacts" sub="Partners, donors & stakeholders" addLabel="New Contact" />

      <div style={{ padding: '18px 24px 40px' }}>
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
          <KpiCard label="Total Contacts" value={DEMO_CONTACTS.length} icon="users" accentColor="var(--accent)" delay={80} />
          <KpiCard label="Partners" value={partnerCount} delta={`${Math.round((partnerCount / DEMO_CONTACTS.length) * 100)}% of total`} deltaDir="neu" icon="heart" accentColor="var(--accent)" delay={130} />
          <KpiCard label="Donors" value={donorCount} delta={`${Math.round((donorCount / DEMO_CONTACTS.length) * 100)}% of total`} deltaDir="up" icon="dollar-sign" accentColor="var(--g)" delay={180} />
          <KpiCard label="Stakeholders" value={stakeholderCount} icon="globe" accentColor="var(--p)" delay={230} />
        </div>

        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '10px 14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, background: 'var(--bg2)', borderRadius: 8, padding: '6px 10px' }}>
            <Search size={14} color="var(--txt3)" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search contacts..."
              style={{ border: 'none', background: 'none', flex: 1, fontSize: 13, padding: 0 }}
            />
          </div>
          {['all', 'partner', 'beneficiary', 'stakeholder', 'donor'].map(s => (
            <button key={s} onClick={() => setTypeFilter(s)} style={{
              padding: '5px 12px', borderRadius: 7, fontSize: 11.5, fontWeight: 600,
              background: typeFilter === s ? 'var(--txt)' : 'var(--bg2)',
              color: typeFilter === s ? 'var(--panel)' : 'var(--txt2)',
              border: 'none', cursor: 'pointer', textTransform: 'capitalize',
            }}>{s}</button>
          ))}
        </div>

        {/* Contact cards grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {filtered.map(c => {
            const tc = typeColors[c.type]
            const initials = c.firstName[0] + c.lastName[0]
            return (
              <div key={c.id} className="card-hover" style={{
                background: 'var(--panel)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '16px', cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  {/* Avatar */}
                  <div style={{
                    width: 40, height: 40, borderRadius: 20,
                    background: avatarColors[c.type],
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, color: '#fff',
                    flexShrink: 0,
                  }}>{initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
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
                    <Mail size={12} color="var(--txt3)" />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.email}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--txt2)' }}>
                    <Phone size={12} color="var(--txt3)" />
                    <span>{c.phone}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--txt2)' }}>
                    <FolderKanban size={12} color="var(--txt3)" />
                    <span className="mono" style={{ fontWeight: 600 }}>{c.projects}</span>
                    <span>connected project{c.projects !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
