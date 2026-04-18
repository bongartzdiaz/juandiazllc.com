'use client'

import { useState } from 'react'
import { Topbar } from '@/components/phily/layout/Topbar'
import { KpiCard } from '@/components/phily/ui/KpiCard'
import { Search, Mail, Phone, FolderKanban } from 'lucide-react'
import { useIndustry } from '@/hooks/phily/useIndustry'

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
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const isRE = industry === 'realestate'
  const isHOS = industry === 'hospitality'
  const contacts = isHOS ? HOS_CONTACTS : isRE ? RE_CONTACTS : DEMO_CONTACTS
  const filterOptions = isHOS
    ? ['all', 'guest', 'vendor', 'partner', 'staff']
    : isRE
    ? ['all', 'buyer', 'seller', 'tenant', 'investor', 'landlord']
    : ['all', 'partner', 'beneficiary', 'stakeholder', 'donor']

  const filtered = contacts.filter(c => {
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

  const countByType = (type: string) => contacts.filter(c => c.type === type).length

  return (
    <>
      <Topbar
        title="Contacts"
        sub={isHOS ? 'Guests, vendors & partners' : isRE ? 'Buyers, sellers & investors' : 'Partners, donors & stakeholders'}
        addLabel="New Contact"
      />

      <div style={{ padding: '18px 24px 40px' }}>
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
          {isHOS ? (
            <>
              <KpiCard label="Total Contacts" value={contacts.length} icon="users" accentColor="var(--accent)" delay={80} />
              <KpiCard label="Guests" value={countByType('guest')} delta={`${Math.round((countByType('guest') / contacts.length) * 100)}% of total`} deltaDir="neu" icon="heart" accentColor="var(--accent)" delay={130} />
              <KpiCard label="Vendors" value={countByType('vendor')} delta={`${Math.round((countByType('vendor') / contacts.length) * 100)}% of total`} deltaDir="up" icon="dollar-sign" accentColor="var(--o)" delay={180} />
              <KpiCard label="Staff" value={countByType('staff')} icon="globe" accentColor="var(--y)" delay={230} />
            </>
          ) : isRE ? (
            <>
              <KpiCard label="Total Contacts" value={contacts.length} icon="users" accentColor="var(--accent)" delay={80} />
              <KpiCard label="Buyers" value={countByType('buyer')} delta={`${Math.round((countByType('buyer') / contacts.length) * 100)}% of total`} deltaDir="neu" icon="heart" accentColor="var(--accent)" delay={130} />
              <KpiCard label="Sellers" value={countByType('seller')} delta={`${Math.round((countByType('seller') / contacts.length) * 100)}% of total`} deltaDir="up" icon="dollar-sign" accentColor="var(--g)" delay={180} />
              <KpiCard label="Investors" value={countByType('investor')} icon="globe" accentColor="var(--p)" delay={230} />
            </>
          ) : (
            <>
              <KpiCard label="Total Contacts" value={contacts.length} icon="users" accentColor="var(--accent)" delay={80} />
              <KpiCard label="Partners" value={countByType('partner')} delta={`${Math.round((countByType('partner') / contacts.length) * 100)}% of total`} deltaDir="neu" icon="heart" accentColor="var(--accent)" delay={130} />
              <KpiCard label="Donors" value={countByType('donor')} delta={`${Math.round((countByType('donor') / contacts.length) * 100)}% of total`} deltaDir="up" icon="dollar-sign" accentColor="var(--g)" delay={180} />
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
            <Search size={14} color="var(--txt3)" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search contacts..."
              style={{ border: 'none', background: 'none', flex: 1, fontSize: 13, padding: 0 }}
            />
          </div>
          {filterOptions.map(s => (
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
            const tc = typeColors[c.type] || typeColors.partner
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
                    background: avatarColors[c.type] || 'var(--accent)',
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
                    <span>connected {isHOS ? 'reservation' : isRE ? 'propert' : 'project'}{c.projects !== 1 ? (isHOS ? 's' : isRE ? 'ies' : 's') : (isRE ? 'y' : '')}</span>
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
