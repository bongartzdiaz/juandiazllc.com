'use client'

import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { BarChart3, Target, DollarSign, Users, Download, FileText, TrendingUp, Globe, Loader2, TableProperties } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { exportToCSV } from '@/lib/export'

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
  {
    id: 'performance',
    title: 'Performance Trends',
    description: 'Year-over-year performance analysis with growth metrics, trend identification, and forecasting.',
    icon: TrendingUp,
    color: 'var(--p)',
    colorBg: 'var(--p-bg)',
    colorBorder: 'var(--p-border)',
  },
  {
    id: 'regional',
    title: 'Regional Breakdown',
    description: 'Geographic distribution of projects, regional impact scores, and cross-border collaboration insights.',
    icon: Globe,
    color: 'var(--y)',
    colorBg: 'var(--y-bg)',
    colorBorder: 'var(--y-border)',
  },
]

const statusStyles: Record<string, { bg: string; txt: string; border: string }> = {
  published: { bg: 'var(--g-bg)', txt: 'var(--g-txt)', border: 'var(--g-border)' },
  draft: { bg: 'var(--y-bg)', txt: 'var(--y-txt)', border: 'var(--y-border)' },
}

interface ReportEntry {
  id: string
  name: string
  type: string
  generated: string
  status: string
}

const INITIAL_REPORTS: ReportEntry[] = [
  { id: '1', name: 'Q4 2025 Impact Report', type: 'Quarterly Impact', generated: '2026-01-15', status: 'published' },
  { id: '2', name: 'SDG Portfolio Mapping 2025', type: 'SDG Alignment', generated: '2026-01-10', status: 'published' },
  { id: '3', name: 'Q1 2026 Financial Summary', type: 'Financial Overview', generated: '2026-03-18', status: 'draft' },
  { id: '4', name: 'Board Presentation March 2026', type: 'Stakeholder Summary', generated: '2026-03-15', status: 'published' },
  { id: '5', name: 'Clean Water Project Update', type: 'Quarterly Impact', generated: '2026-03-20', status: 'draft' },
  { id: '6', name: 'Regional Impact Analysis APAC', type: 'Regional Breakdown', generated: '2026-03-12', status: 'published' },
  { id: '7', name: 'YoY Performance Trends 2024-2025', type: 'Performance Trends', generated: '2026-02-28', status: 'published' },
  { id: '8', name: 'Education Fund Allocation Report', type: 'Financial Overview', generated: '2026-03-08', status: 'published' },
]

function todayString() {
  return new Date().toISOString().slice(0, 10)
}

function downloadReportHTML(report: ReportEntry) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${report.name}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 24px; color: #1a1a1a; }
  h1 { font-size: 24px; border-bottom: 2px solid #2563eb; padding-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; margin: 24px 0; }
  th, td { text-align: left; padding: 10px 14px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
  th { background: #f9fafb; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; text-transform: capitalize; }
  .badge-published { background: #dcfce7; color: #166534; }
  .badge-draft { background: #fef9c3; color: #854d0e; }
  .footer { margin-top: 40px; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 16px; }
</style>
</head>
<body>
  <h1>${report.name}</h1>
  <table>
    <tr><th>Type</th><td>${report.type}</td></tr>
    <tr><th>Generated</th><td>${report.generated}</td></tr>
    <tr><th>Status</th><td><span class="badge badge-${report.status}">${report.status}</span></td></tr>
    <tr><th>Report ID</th><td>${report.id}</td></tr>
  </table>
  <p>This is a generated report document. In a production environment, this file would contain the full analytics data, charts, and narrative for the <strong>${report.type}</strong> report type.</p>
  <div class="footer">Generated by Philly Dashboard on ${todayString()}</div>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${report.name.replace(/\s+/g, '-').toLowerCase()}.html`
  link.click()
  URL.revokeObjectURL(url)
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportEntry[]>(INITIAL_REPORTS)
  const [generating, setGenerating] = useState<string | null>(null)
  const { addToast } = useToast()

  function handleGenerate(tmpl: typeof REPORT_TEMPLATES[number]) {
    setGenerating(tmpl.id)
    setTimeout(() => {
      const newReport: ReportEntry = {
        id: `gen-${Date.now()}`,
        name: `${tmpl.title} - ${todayString()}`,
        type: tmpl.title,
        generated: todayString(),
        status: 'draft',
      }
      setReports(prev => [newReport, ...prev])
      setGenerating(null)
      addToast('Report generated', 'success')
    }, 1000)
  }

  function handleDownload(report: ReportEntry) {
    downloadReportHTML(report)
    addToast(`Downloading ${report.name}`, 'info')
  }

  function handleExportCSV() {
    const data = reports.map(r => ({
      name: r.name,
      type: r.type,
      generated: r.generated,
      status: r.status,
    }))
    exportToCSV(data, 'reports')
    addToast('CSV exported', 'success')
  }

  return (
    <>
      <Topbar title="Reports" sub="Generate impact reports" />

      <div style={{ padding: '18px 24px 40px' }}>
        {/* Report template cards */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Report Templates</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {REPORT_TEMPLATES.map(tmpl => {
              const Icon = tmpl.icon
              const isGenerating = generating === tmpl.id
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
                  <button
                    disabled={isGenerating || generating !== null}
                    onClick={() => handleGenerate(tmpl)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '7px 14px', borderRadius: 8,
                      fontSize: 12, fontWeight: 600,
                      cursor: isGenerating || generating !== null ? 'not-allowed' : 'pointer',
                      background: isGenerating ? 'var(--accent-border)' : 'var(--accent)',
                      color: '#fff',
                      border: 'none', boxShadow: 'var(--shadow-sm)',
                      fontFamily: 'inherit', width: '100%',
                      opacity: generating !== null && !isGenerating ? 0.5 : 1,
                      transition: 'opacity 0.15s, background 0.15s',
                    }}>
                    {isGenerating ? (
                      <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <FileText size={12} />
                    )}
                    {isGenerating ? 'Generating...' : 'Generate'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Reports table */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Recent Reports</div>
            <button
              onClick={handleExportCSV}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '5px 12px', borderRadius: 7,
                fontSize: 11, fontWeight: 600, cursor: 'pointer',
                background: 'var(--bg2)', color: 'var(--txt2)',
                border: '1px solid var(--border)', fontFamily: 'inherit',
              }}>
              <TableProperties size={11} /> Export All CSV
            </button>
          </div>
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Report Name', 'Type', 'Generated', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{
                      padding: '10px 14px', textAlign: 'left', fontSize: 10.5,
                      fontWeight: 600, textTransform: 'uppercase', color: 'var(--txt3)',
                      letterSpacing: '0.05em',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reports.map(r => {
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
                      <td style={{ padding: '12px 14px', display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => handleDownload(r)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '4px 10px', borderRadius: 6,
                            fontSize: 11, fontWeight: 600, cursor: 'pointer',
                            background: 'var(--bg2)', color: 'var(--txt2)',
                            border: '1px solid var(--border)', fontFamily: 'inherit',
                          }}>
                          <Download size={11} /> PDF
                        </button>
                        <button
                          onClick={() => {
                            exportToCSV([{ name: r.name, type: r.type, generated: r.generated, status: r.status }], r.name.replace(/\s+/g, '-').toLowerCase())
                            addToast('CSV exported', 'success')
                          }}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '4px 10px', borderRadius: 6,
                            fontSize: 11, fontWeight: 600, cursor: 'pointer',
                            background: 'var(--bg2)', color: 'var(--txt2)',
                            border: '1px solid var(--border)', fontFamily: 'inherit',
                          }}>
                          <TableProperties size={11} /> CSV
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

      {/* Inline keyframe for the spinner since this is a client component */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  )
}
