'use client'

import { useState, useEffect } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Zap, Play, Pause, Plus, Clock, CheckCircle2 } from 'lucide-react'

interface AutomationRule {
  id: string
  name: string
  trigger: string
  actionType: string
  enabled: boolean
  createdAt: string
  _count: { automationLogs: number }
}

const TRIGGER_LABELS: Record<string, string> = {
  onEntityCreate: 'On Create',
  onFieldChange: 'On Field Change',
  onStageChange: 'On Stage Change',
  onSchedule: 'Scheduled',
  onDateApproach: 'Date Approach',
}

const ACTION_LABELS: Record<string, string> = {
  sendEmail: 'Send Email',
  sendSMS: 'Send SMS',
  createTask: 'Create Task',
  updateField: 'Update Field',
  moveStage: 'Move Stage',
  createNotification: 'Notification',
  callWebhook: 'Webhook',
}

export default function AutomationsPage() {
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/automations')
      .then(r => r.json())
      .then(j => setRules(j.data ?? []))
      .catch(() => setRules([]))
      .finally(() => setLoading(false))
  }, [])

  const toggleEnabled = async (id: string, enabled: boolean) => {
    // Optimistic update
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !enabled } : r))
  }

  return (
    <>
      <Topbar title="Automations" sub="Automate workflows and notifications" />
      <div style={{ padding: '18px 24px 40px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          <StatCard icon={Zap} label="Total Rules" value={rules.length} />
          <StatCard icon={Play} label="Active" value={rules.filter(r => r.enabled).length} />
          <StatCard icon={CheckCircle2} label="Total Runs" value={rules.reduce((s, r) => s + r._count.automationLogs, 0)} />
        </div>

        {/* Rules List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>Loading...</div>
          ) : rules.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13, background: 'var(--panel)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <Zap size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              No automation rules yet.
            </div>
          ) : rules.map(rule => (
            <div key={rule.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--panel)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: rule.enabled ? 'var(--g-bg)' : 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Zap size={16} style={{ color: rule.enabled ? 'var(--g-txt)' : 'var(--txt3)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>{rule.name}</div>
                <div style={{ fontSize: 11, color: 'var(--txt3)', display: 'flex', gap: 8, marginTop: 2 }}>
                  <span>{TRIGGER_LABELS[rule.trigger] ?? rule.trigger}</span>
                  <span>→</span>
                  <span>{ACTION_LABELS[rule.actionType] ?? rule.actionType}</span>
                </div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--txt3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={10} /> {rule._count.automationLogs} runs
              </div>
              <button onClick={() => toggleEnabled(rule.id, rule.enabled)} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', background: rule.enabled ? 'var(--g-bg)' : 'var(--bg2)', color: rule.enabled ? 'var(--g-txt)' : 'var(--txt3)', fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
                {rule.enabled ? <><Pause size={10} /> Active</> : <><Play size={10} /> Paused</>}
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div style={{ padding: '14px 18px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--panel)', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={15} style={{ color: 'var(--accent-txt)' }} />
      </div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--txt)', fontFamily: "var(--font-red-hat-mono), monospace" }}>{value}</div>
        <div style={{ fontSize: 10, color: 'var(--txt3)', fontWeight: 600 }}>{label}</div>
      </div>
    </div>
  )
}
