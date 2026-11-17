import { useTranslation } from 'react-i18next'
import {
  AnalyticsChart, ChartCard, DrillDown, ExplainPanel, InsightCard, MetricCard,
  ScenarioPanel, type ChartPoint, type ScenarioControls,
} from '@schoolos/ui'
import { PageHeader } from '../components/Screen'

/** Design-system gallery: every analytics primitive with an aria summary and table. */
export function AnalyticsUiKitPage() {
  const { t } = useTranslation()
  const points: ChartPoint[] = [
    { key: '6e', label: '6e', value: 94.2, n: 142 },
    { key: '5e', label: '5e', value: 91.8, n: 128 },
    { key: 'cm2', label: 'CM2', value: 88.4, n: 96 },
    { key: 'other', label: 'Autres', value: 0, n: 3, suppressed: true },
  ]
  return (
    <div className="ui-page">
      <PageHeader title="Analytics UI kit" subtitle="Accessibles, adaptatifs et pilotés par les tokens." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Présence" value="93,4 %" n={366} ci={{ lower: 91, upper: 95, method: 'wilson-95' }} change={1.4} target={94} mock dataAsOf="2026-11-17T06:00:00Z" />
        <MetricCard label="Effectif faible" value="—" n={3} lowSample />
        <MetricCard label="Masqué" value="—" n={3} suppressed />
        <MetricCard label="Moyenne" value="11,8 / 20" n={412} change={-0.3} goodDirection="up" />
      </div>
      <ChartCard question="Comment la présence varie-t-elle par niveau ?" subtitle="Question + infobulle avec n + tableau alternatif" className="mt-4">
        <AnalyticsChart points={points} valueFormatter={v => `${v.toFixed(1)} %`}
          ariaSummary="Présence par niveau : 6e 94,2 %, n=142 ; 5e 91,8 %, n=128 ; CM2 88,4 %, n=96 ; un groupe masqué."
          tableLabel={t('analytics.tableAlternative')} />
      </ChartCard>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <InsightCard severity="warning" title="Baisse de présence en CM2" evidence="−3,4 pts sur deux périodes, n=96." action="Vérifier le calendrier et discuter avec l'équipe ; aucune décision automatique." why="Règle : écart > 3 pts avec intervalle de confiance non chevauchant." />
        <DrillDown title="Détail par classe" rows={points} selectedKey="6e" onSelect={() => undefined} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ExplainPanel caveats={['Association, pas de causalité.', 'Effectifs < 5 masqués.']}
          definition={{ name: 'Présence', definition: 'Part des demi-journées présentes sur les demi-journées attendues.', formula: 'present / expected × 100', grain: 'classe × période', unit: 'percent', nMin: 30 }}
          meta={{ n: 366, denominator: 'demi-journées attendues', suppressedCells: true, suppressionThreshold: 5, dataAsOf: '2026-11-17T06:00:00Z', mock: true, explain: { grouping: 'term', openSchoolDaysOnly: true }, associationNotCausation: true }}
          labels={{ title: 'Explication', formula: 'Formule', inputs: 'Intrants', caveats: 'Limites', freshness: 'Fraîcheur', mock: 'Données de démonstration' }} />
        <ScenarioPanel value={{ attendanceDelta: 0, homeworkDelta: 0, markDelta: 0, horizon: 3 } as ScenarioControls}
          onChange={() => undefined} onRun={() => undefined}
          labels={{ title: 'Simulateur', attendance: 'Présence', homework: 'Devoirs', mark: 'Moyenne', horizon: 'Horizon', run: 'Simuler', warning: 'Estimation, pas une prévision certifiée.' }} />
      </div>
    </div>
  )
}
