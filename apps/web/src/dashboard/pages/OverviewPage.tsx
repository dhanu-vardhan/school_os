import { ArrowRight, Clock, Download, CreditCard, Sparkles, UserPlus, MessageSquare, CalendarCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AiDraftCard } from '../components/AiDraftCard'
import { BarSeriesChart, ChartLegend, DonutChart, RevenueChart } from '../components/charts'
import { Card, CardHeader, Delta, PageHeader, Sparkline } from '../components/primitives'
import type { Kpi } from '../domain/models'
import { useDashboard } from '../state/DashboardContext'

const activityIcon = {
  payment: CreditCard,
  enrollment: UserPlus,
  message: MessageSquare,
  attendance: CalendarCheck,
} as const

function KpiCard({ kpi }: { kpi: Kpi }) {
  return (
    <Card className="ds-kpi">
      <div className="ds-kpi-label">{kpi.label}</div>
      <div className="ds-kpi-row">
        <div className="ds-kpi-value">{kpi.value}</div>
        <Sparkline values={kpi.trend} tone={kpi.tone} />
      </div>
      <div className="ds-kpi-foot"><Delta value={kpi.delta} /><span>{kpi.hint}</span></div>
    </Card>
  )
}

export function OverviewPage() {
  const { data, period, drafts, notify } = useDashboard()

  return (
    <>
      <PageHeader
        eyebrow="Tableau de bord"
        title="Bonjour, Camille"
        subtitle="Voici la sante de vos etablissements pour la periode selectionnee."
        actions={
          <>
            <button className="ds-btn" onClick={() => notify('Export CSV prepare (demo)')}><Download size={14} />Exporter</button>
            <button className="ds-btn ds-btn-primary" onClick={() => notify('Rapport planifie (demo)')}>Nouveau rapport</button>
          </>
        }
      />

      <div className="ds-grid-kpi">
        {data.kpis.map((kpi) => <KpiCard key={kpi.id} kpi={kpi} />)}
      </div>

      <div className="ds-grid-main">
        <Card>
          <CardHeader
            title="Evolution du revenu"
            subtitle={`Periode : ${period === '30d' ? '30 jours' : period === '90d' ? '90 jours' : '12 mois'}`}
            action={<span className="ds-badge green">+12,4 %</span>}
          />
          <div className="ds-card-body">
            <RevenueChart points={data.revenue[period]} />
            <div className="ds-legend">
              <span><i style={{ background: '#4f46e5' }} />Periode actuelle</span>
              <span><i style={{ background: '#cbd5e1' }} />Periode precedente</span>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Activite recente" subtitle="Derniers evenements" />
          <div className="ds-card-body">
            <div className="ds-list">
              {data.activity.map((item) => {
                const Icon = activityIcon[item.id === 'E-5' ? 'attendance' : item.id === 'E-3' ? 'enrollment' : item.id === 'E-4' ? 'message' : 'payment']
                return (
                  <div className="ds-list-item" key={item.id}>
                    <div className="ds-list-icon"><Icon size={14} aria-hidden="true" /></div>
                    <div className="ds-list-text">
                      <strong>{item.actor}</strong> {item.action} <span>{item.target}</span>
                    </div>
                    <span className="ds-time">{item.time}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>
      </div>

      <div className="ds-grid-even">
        <Card>
          <CardHeader title="Fidelisation des familles" subtitle="Taux de retention sur 6 periodes" />
          <div className="ds-card-body">
            <BarSeriesChart points={data.retention} color="#059669" height={200} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Segments de familles" subtitle="1 284 familles actives" />
          <div className="ds-card-body">
            <DonutChart segments={data.segments} />
            <ChartLegend segments={data.segments} />
          </div>
        </Card>
      </div>

      <div className="ds-page-head" style={{ marginTop: 26, marginBottom: 12 }}>
        <div>
          <div className="ds-eyebrow"><Sparkles size={12} /> Intelligence artificielle</div>
          <h2 className="ds-title" style={{ fontSize: 20 }}>Suggestions a examiner</h2>
        </div>
        <Link className="ds-btn ds-btn-sm" to="/insights/ai">Tout voir <ArrowRight size={13} /></Link>
      </div>
      <div className="ds-ai-grid">
        {drafts.slice(0, 2).map((draft) => <AiDraftCard key={draft.id} draft={draft} />)}
      </div>
      <p className="ds-ai-note" style={{ marginTop: 12 }}><Clock size={11} /> Donnees de demonstration - aucune donnee reelle de famille.</p>
    </>
  )
}
