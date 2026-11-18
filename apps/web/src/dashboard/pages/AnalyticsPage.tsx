import { BarSeriesChart, ChartLegend, DonutChart, RevenueChart } from '../components/charts'
import { Card, CardHeader, PageHeader } from '../components/primitives'
import { useDashboard } from '../state/DashboardContext'

export function AnalyticsPage() {
  const { data, period } = useDashboard()
  const max = Math.max(...data.funnel.map((step) => step.value))

  return (
    <>
      <PageHeader
        eyebrow="Pilotage"
        title="Analytics"
        subtitle="Comprendre l engagement, le parcours d activation et la fidelisation."
      />

      <div className="ds-grid-main">
        <Card>
          <CardHeader title="Engagement des familles" subtitle="Familles actives par periode" />
          <div className="ds-card-body">
            <BarSeriesChart points={data.engagement[period]} height={270} />
            <div className="ds-legend">
              <span><i style={{ background: '#4f46e5' }} />Actuel</span>
              <span><i style={{ background: '#e0e7ff' }} />Precedent</span>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Parcours d activation" subtitle="Du premier contact a la fidelisation" />
          <div className="ds-card-body">
            <div className="ds-funnel">
              {data.funnel.map((step, index) => (
                <div className="ds-funnel-row" key={step.label}>
                  <span>{step.label}</span>
                  <span className="ds-funnel-track"><span className="ds-funnel-fill" style={{ width: `${Math.max(6, (step.value / max) * 100)}%`, opacity: 1 - index * 0.16 }} /></span>
                  <span className="ds-funnel-value">{step.value.toLocaleString('fr-FR')}</span>
                </div>
              ))}
            </div>
            <p className="ds-ai-note" style={{ marginTop: 18 }}>Taux de conversion global : 10,3 %.</p>
          </div>
        </Card>
      </div>

      <div className="ds-grid-even">
        <Card>
          <CardHeader title="Retention dans le temps" subtitle="Actuel vs periode precedente" />
          <div className="ds-card-body"><RevenueChart points={data.retention} height={220} format="percent" /></div>
        </Card>
        <Card>
          <CardHeader title="Repartition des segments" subtitle="Base de familles actives" />
          <div className="ds-card-body">
            <DonutChart segments={data.segments} height={200} />
            <ChartLegend segments={data.segments} />
          </div>
        </Card>
      </div>
    </>
  )
}
