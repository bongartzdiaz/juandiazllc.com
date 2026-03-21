'use client'

import { Topbar } from '@/components/layout/Topbar'
import { BarChart3, Target, DollarSign, Users, Download, FileText } from 'lucide-react'

const REPORT_TEMPLATES = [
  {
    id: 'quarterly',
    title: 'Quarterly Impact',
    description: 'Comprehensive overview of project outcomes, KPIs, and beneficiary reach for the quarter.',
    icon: BarChart3,
    color: 'var(--accent)',
    colorBg: 'var(--accent-bg)',
    colorBorder: 'var(--accent-border)',
  },
  {
    id: 'sdg',
    title: 'SDG Alignment',
    description: 'Analysis of portfolio alignment with UN Sustainable Development Goals and contribution metrics.',
    icon: Target,
    color: 'var(--g)',
    colorBg: 'var(--g-bg)',
    colorBorder: 'var(--g-border)',
  },
  {
    id: 'financial',
    title: 'Financial Overview',
    description: 'Budget allocation, expenditure tracking, ROI analysis, and funding utilization rates.',
    icon: DollarSign,
    color: 'var(--o)',
    colorBg: 'var(--o-bg)',
    colorBorder: 'var(--o-border)',
  },
  {
    id: 'stakeholder',
    title: 'Stakeholder Summary',
    description: 'Executive summary tailored for board presentations with key highlights and recommendations.',
    icon: Users,
    color: 'var(--b)',
    colorBg: 'var(--b-bg)',
    colorBorder: 'var(--b-border)',
  },
]

const statusStyles: Record<string, { bg: string; txt: string; border: string }> = {
  published: { bg: 'var(--g-bg)', txt: 'var(--g-txt)', border: 'var(--g-border)' },
  draft: { bg: 'var(--y-bg)', txt: 'var(--y-txt)', border: 'var(--y-border)' },
}

const RECENT_REPORTS = [
  { id: '1', name: 'Q4 2025 Impact Report', type: 'Quarterly Impact', generated: '2026-01-15', status: 'published' },
  { id: '2', name: 'SDG Portfolio Mapping 2025', type: 'SDG Alignment', generated: '2026-01-10', status: 'published' },
  { id: '3', name: 'Q1 2026 Financial Summary', type: 'Financial Overview', generated: '2026-03-18', status: 'draft' },
  { id: '4', name: 'Board Presentation March 2026', type: 'Stakeholder Summary', generated: '2026-03-15', status: 'published' },
  { id: '5', name: 'Clean Water Project Update', type: 'Quarterly Impact', generated: '2026-03-20', status: 'draft' },
]

export default function ReportsPage() {
  return (
    <>
      <Topbar title="Reports" sub="Generate impact reports" />

      <div style={{ padding: '18px 24px 40px' }}>
        {/* Report template cards */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Report Templates</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {REPORT_TEMPLATES.map(tmpl => {
              const Icon = tmpl.icon
              return (
                <div key={tmpl.id} className="card-hover" style={{
                  background: 'var(--panel)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: '18px 16px', cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex', flexDirection: 'column', gap: 10,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 9,
                    background: tmpl.colorBg, border: `1px solid ${tmpl.colorBorder}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={18} color={tmpl.color} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{tmpl.title}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--txt3)', lineHeight: 1.45, flex: 1 }}>
                    {tmpl.description}
                  </div>
                  <button style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '7px 14px', borderRadius: 8,
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: 'var(--accent)', color: '#fff',
                    border: 'none', boxShadow: 'var(--shadow-sm)',
                    fontFamily: 'inherit', width: '100%',
                  }}>
                    <FileText size={12} />
                    Generate
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Reports table */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Recent Reports</div>
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Report Name', 'Type', 'Generated', 'Status', 'Download'].map(h => (
                    <th key={h} style={{
                      padding: '10px 14px', textAlign: 'left', fontSize: 10.5,
                      fontWeight: 600, textTransform: 'uppercase', color: 'var(--txt3)',
                      letterSpacing: '0.05em',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RECENT_REPORTS.map(r => {
                  const ss = statusStyles[r.status] || statusStyles.draft
                  return (
                    <tr key={r.id} className="card-hover" style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                      <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600 }}>{r.name}</td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--txt2)' }}>{r.type}</td>
                      <td className="mono" style={{ padding: '12px 14px', fontSize: 12, color: 'var(--txt2)' }}>{r.generated}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                          background: ss.bg, color: ss.txt, border: `1px solid ${ss.border}`,
                          textTransform: 'capitalize',
                        }}>{r.status}</span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <button style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '4px 10px', borderRadius: 6,
                          fontSize: 11, fontWeight: 600, cursor: 'pointer',
                          background: 'var(--bg2)', color: 'var(--txt2)',
                          border: '1px solid var(--border)', fontFamily: 'inherit',
                        }}>
                          <Download size={11} /> PDF
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
