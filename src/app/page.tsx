'use client'

import { Topbar } from '@/components/layout/Topbar'
import { KpiCard } from '@/components/ui/KpiCard'
import { FunnelCard } from '@/components/dashboard/FunnelCard'
import { AlertsCard } from '@/components/dashboard/AlertsCard'
import { GoalsCard } from '@/components/dashboard/GoalsCard'
import { ChartsSection } from '@/components/dashboard/ChartsSection'
import { CampaignTable } from '@/components/dashboard/CampaignTable'
import { JourneyBar } from '@/components/dashboard/JourneyBar'
import { ApiErrorBanner } from '@/components/ui/ApiErrorBanner'
import { useMetaAds } from '@/hooks/useMetaAds'
import { useSales } from '@/hooks/useSales'
import { useChatbot } from '@/hooks/useChatbot'

export default function DashboardPage() {
  const meta = useMetaAds('NL')
  const sales = useSales()
  const chatbot = useChatbot()

  const loading = meta.loading || sales.loading || chatbot.loading

  // Journey steps from GHL pipeline (cumulative, properly decreasing)
  const pipeline = sales.data?.pipeline ?? []

  // Derive KPIs from same pipeline data as funnel — ensures consistency
  const totalLeads = sales.data?.totals?.leads ?? 0
  const cplMeta = meta.data?.totals?.avgCpl ?? 0
  const chatbotGesprekken = pipeline.find(s => s.stage === 'chatbot')?.value ?? 0
  const telefoonAfspraken = pipeline.find(s => s.stage === 'telefoon')?.value ?? 0
  const chatConv = chatbotGesprekken > 0 ? Math.round((telefoonAfspraken / chatbotGesprekken) * 100) : 0
  const afspraken = sales.data?.totals?.afspraken ?? 0
  const deals = sales.data?.totals?.deals ?? 0
  const omzet = sales.data?.totals?.omzet ?? 0
  const convRate = sales.data?.totals?.conversieRate ?? 0

  // Daily data for charts
  const dailySales = sales.data?.daily ?? []
  const dailyMeta = meta.data?.daily ?? []

  // Campaigns
  const campaigns = meta.data?.campaigns ?? []

  const refetchAll = () => {
    meta.refetch()
    sales.refetch()
    chatbot.refetch()
  }

  return (
    <>
      <Topbar
        title="Command Center"
        sub="Lead → Gesprek → Afspraak → Sale"
        onSync={refetchAll}
      />

      <div style={{ padding: '18px 22px 40px' }}>
        <ApiErrorBanner errors={[meta.error, sales.error, chatbot.error].filter((e): e is string => !!e)} />

        {/* Journey Bar — visual overview of entire process */}
        <JourneyBar
          pipeline={pipeline}
          loading={loading}
          extra={{
            metaSpend: meta.data?.totals?.spend,
            metaLeads: meta.data?.totals?.leads,
            metaCpl: meta.data?.totals?.avgCpl,
            chatbotGesprekken: chatbot.data?.totals?.gesprekken,
            chatbotGekwalificeerd: chatbot.data?.totals?.gekwalificeerd,
            chatbotConversie: chatbot.data?.totals?.conversieRate,
            omzet: sales.data?.totals?.omzet,
            deals: sales.data?.totals?.deals,
          }}
        />

        {/* KPI Strip */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 10, marginBottom: 16,
        }}>
          <KpiCard
            label="Leads totaal"
            value={loading ? '—' : totalLeads}
            delta={`${convRate}% conversie`}
            deltaDir="up"
            accentColor="var(--b)"
            icon="users"
            delay={80}
          />
          <KpiCard
            label="CPL Meta"
            value={loading ? '—' : `€${Math.round(cplMeta)}`}
            delta={cplMeta > 0 && cplMeta < 20 ? 'Onder doel' : cplMeta > 0 ? 'Boven doel' : ''}
            deltaDir={cplMeta > 0 && cplMeta < 20 ? 'up' : 'down'}
            goal="Doel < €20"
            accentColor="var(--o)"
            icon="trending-down"
            delay={130}
          />
          <KpiCard
            label="Chatbot conversie"
            value={loading ? '—' : `${Math.round(chatConv)}%`}
            delta={chatConv >= 25 ? 'Boven minimum' : chatConv > 0 ? 'Onder minimum' : ''}
            deltaDir={chatConv >= 25 ? 'up' : 'down'}
            goal="Min. 25%"
            icon="message-circle"
            delay={180}
          />
          <KpiCard
            label="Afspraken"
            value={loading ? '—' : afspraken}
            delta={`${afspraken} / 40 doel`}
            deltaDir={afspraken >= 30 ? 'up' : 'neu'}
            icon="calendar"
            delay={230}
          />
          <KpiCard
            label="Omzet"
            value={loading ? '—' : `€${(omzet / 1000).toFixed(1)}k`}
            delta={`${deals} deals gesloten`}
            deltaDir="up"
            hot={deals >= 10}
            icon="zap"
            delay={280}
          />
        </div>

        {/* Main Grid: Funnel + Sidebar */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 330px',
          gap: 12, marginBottom: 12,
        }}>
          <FunnelCard pipeline={pipeline} loading={loading} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <AlertsCard
              meta={meta.data}
              sales={sales.data}
              chatbot={chatbot.data}
            />
            <GoalsCard sales={sales.data} />
          </div>
        </div>

        {/* Charts */}
        <ChartsSection dailyMeta={dailyMeta} dailySales={dailySales} />

        {/* Campaign Table */}
        <CampaignTable campaigns={campaigns} />
      </div>
    </>
  )
}
