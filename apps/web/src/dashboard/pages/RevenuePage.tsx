import { AlertCircle, CheckCircle2, Clock, Download } from 'lucide-react'
import { ChartLegend, DonutChart, RevenueChart } from '../components/charts'
import { Badge, Card, CardHeader, Delta, PageHeader } from '../components/primitives'
import { formatMoney } from '../domain/format'
import type { Invoice } from '../domain/models'
import { useDashboard } from '../state/DashboardContext'

function statusTone(status: Invoice['status']) {
  if (status === 'Paid') return 'green' as const
  if (status === 'Pending') return 'amber' as const
  return 'red' as const
}

export function RevenuePage() {
  const { data, period, query, notify } = useDashboard()
  const byStatus = (status: Invoice['status']) => data.invoices.filter((invoice) => invoice.status === status)
  const sumCents = (invoices: Invoice[]) => invoices.reduce((sum, invoice) => sum + invoice.amountCents, 0)
  const outstanding = sumCents([...byStatus('Pending'), ...byStatus('Overdue')])
  const filtered = data.invoices.filter((invoice) => {
    const needle = query.trim().toLowerCase()
    return !needle || `${invoice.family} ${invoice.id} ${invoice.label}`.toLowerCase().includes(needle)
  })

  return (
    <>
      <PageHeader
        eyebrow="Pilotage"
        title="Revenu"
        subtitle="Scolarite, activites et cantine — montants en centimes, affichages en EUR."
        actions={<button className="ds-btn" onClick={() => notify('Export comptable prepare (demo)')}><Download size={14} />Exporter</button>}
      />

      <div className="ds-grid-kpi">
        <Card className="ds-kpi">
          <div className="ds-kpi-label">Revenu collecte</div>
          <div className="ds-kpi-row"><div className="ds-kpi-value">{data.kpis[0].value}</div></div>
          <div className="ds-kpi-foot"><Delta value={data.kpis[0].delta} /><span>vs periode precedente</span></div>
        </Card>
        <Card className="ds-kpi">
          <div className="ds-kpi-label">A recouvrer</div>
          <div className="ds-kpi-row"><div className="ds-kpi-value">{formatMoney(outstanding)}</div></div>
          <div className="ds-kpi-foot"><Badge tone="amber">{byStatus('Pending').length + byStatus('Overdue').length} factures</Badge><span>dont {byStatus('Overdue').length} en retard</span></div>
        </Card>
        <Card className="ds-kpi">
          <div className="ds-kpi-label">Ticket moyen</div>
          <div className="ds-kpi-row"><div className="ds-kpi-value">{formatMoney(13200)}</div></div>
          <div className="ds-kpi-foot"><Delta value={3.6} /><span>par facture</span></div>
        </Card>
        <Card className="ds-kpi">
          <div className="ds-kpi-label">Recouvrement</div>
          <div className="ds-kpi-row"><div className="ds-kpi-value">91,7 %</div></div>
          <div className="ds-kpi-foot"><Badge tone="green">Objectif atteint</Badge></div>
        </Card>
      </div>

      <div className="ds-stack">
        <Card>
          <CardHeader title="Entrees par periode" subtitle={`Montants collectes — ${period}`} />
          <div className="ds-card-body">
            <RevenueChart points={data.revenue[period]} height={280} />
          </div>
        </Card>
      </div>

      <div className="ds-grid-even">
        <Card>
          <CardHeader title="Composition du revenu" subtitle="Par nature de facturation" />
          <div className="ds-card-body">
            <DonutChart segments={data.planMix} height={200} />
            <ChartLegend segments={data.planMix} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Sante du recouvrement" subtitle="Etat du portefeuille de factures" />
          <div className="ds-card-body">
            <div className="ds-list">
              <div className="ds-list-item"><div className="ds-list-icon green"><CheckCircle2 size={14} /></div><div className="ds-list-text"><strong>Payees</strong><span>{byStatus('Paid').length} factures · {formatMoney(sumCents(byStatus('Paid')))}</span></div></div>
              <div className="ds-list-item"><div className="ds-list-icon amber"><Clock size={14} /></div><div className="ds-list-text"><strong>En attente</strong><span>{byStatus('Pending').length} factures · {formatMoney(sumCents(byStatus('Pending')))}</span></div></div>
              <div className="ds-list-item"><div className="ds-list-icon red"><AlertCircle size={14} /></div><div className="ds-list-text"><strong>En retard</strong><span>{byStatus('Overdue').length} facture · {formatMoney(sumCents(byStatus('Overdue')))}</span></div></div>
            </div>
          </div>
        </Card>
      </div>

      <div className="ds-stack">
        <Card>
          <CardHeader title="Dernieres factures" subtitle={query ? `Resultats pour « ${query} »` : '6 factures recentes'} />
          <div className="ds-table-scroll">
            <table className="ds-table">
              <thead><tr><th>Reference</th><th>Famille</th><th>Libelle</th><th>Echeance</th><th className="ds-table-num">Montant</th><th>Statut</th></tr></thead>
              <tbody>
                {filtered.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>{invoice.id}</td>
                    <td>{invoice.family}</td>
                    <td>{invoice.label}</td>
                    <td>{invoice.due}</td>
                    <td className="ds-table-num">{formatMoney(invoice.amountCents)}</td>
                    <td><Badge tone={statusTone(invoice.status)}>{invoice.status}</Badge></td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={6} className="ds-empty">Aucune facture ne correspond a la recherche.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  )
}
