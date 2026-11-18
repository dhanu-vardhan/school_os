import { BarSeriesChart } from '../components/charts'
import { Badge, Card, CardHeader, PageHeader } from '../components/primitives'
import { formatMoney } from '../domain/format'
import { useDashboard } from '../state/DashboardContext'

export function CustomersPage() {
  const { data, query } = useDashboard()
  const filtered = data.families.filter((family) => {
    const needle = query.trim().toLowerCase()
    return !needle || `${family.name} ${family.school} ${family.id} ${family.segment}`.toLowerCase().includes(needle)
  })

  return (
    <>
      <PageHeader
        eyebrow="Pilotage"
        title="Familles"
        subtitle="Segmentation, valeur vie et sante de la relation par famille."
      />

      <div className="ds-grid-kpi">
        {data.segments.map((segment) => (
          <Card className="ds-kpi" key={segment.name}>
            <div className="ds-kpi-label">Segment {segment.name}</div>
            <div className="ds-kpi-row"><div className="ds-kpi-value">{segment.value}</div><span style={{ color: segment.color, fontSize: 22 }}>●</span></div>
            <div className="ds-kpi-foot"><span>familles actives</span></div>
          </Card>
        ))}
        <Card className="ds-kpi">
          <div className="ds-kpi-label">Familles a risque</div>
          <div className="ds-kpi-row"><div className="ds-kpi-value">18</div></div>
          <div className="ds-kpi-foot"><Badge tone="amber">A examiner</Badge></div>
        </Card>
      </div>

      <div className="ds-stack">
        <Card>
          <CardHeader title="Sante de la relation" subtitle="Evolution du taux de retention" />
          <div className="ds-card-body"><BarSeriesChart points={data.retention} color="#0284c7" height={210} /></div>
        </Card>
      </div>

      <div className="ds-stack">
        <Card>
          <CardHeader title="Familles" subtitle={query ? `Resultats pour « ${query} »` : '8 familles representatives'} />
          <div className="ds-table-scroll">
            <table className="ds-table">
              <thead><tr><th>Ref.</th><th>Famille</th><th>Etablissement</th><th>Segment</th><th className="ds-table-num">Valeur vie</th><th>Sante</th><th>Derniere activite</th></tr></thead>
              <tbody>
                {filtered.map((family) => (
                  <tr key={family.id}>
                    <td>{family.id}</td>
                    <td>{family.name}</td>
                    <td>{family.school}</td>
                    <td><Badge tone={family.segment === 'Platinum' ? 'indigo' : family.segment === 'Growth' ? 'green' : 'gray'}>{family.segment}</Badge></td>
                    <td className="ds-table-num">{formatMoney(family.lifetimeCents)}</td>
                    <td>
                      <span className="ds-health">
                        <span className="ds-health-bar"><span className={`ds-health-fill ${family.health < 75 ? 'low' : ''}`} style={{ width: `${family.health}%` }} /></span>
                        {family.health}
                      </span>
                    </td>
                    <td>{family.lastActive}</td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={7} className="ds-empty">Aucune famille ne correspond a la recherche.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  )
}
