import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Card, CardBody, CardHeader, FormField, Select, StatusPill, Textarea, toast } from '@schoolos/ui'
import { OfflineNotice, PageHeader } from '../components/Screen'

const TABS = ['overview','explore','saved','reports','dictionary','quality','exports','queries'] as const
type Tab = typeof TABS[number]

const METRICS = [
  { id:'att_rate', label:'Taux de présence', sensitivity:'standard', minCell:10 },
  { id:'abs_unexcused', label:'Absences injustifiées', sensitivity:'standard', minCell:10 },
  { id:'enrolment', label:'Effectifs', sensitivity:'standard', minCell:10 },
  { id:'grade_dist', label:'Distribution des notes (bandes)', sensitivity:'standard', minCell:10 },
  { id:'activity_part', label:'Participation activités', sensitivity:'standard', minCell:10 },
  { id:'collection_rate', label:'Taux de recouvrement', sensitivity:'finance', minCell:15 },
]

export function AnalystPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('overview')
  const [metric, setMetric] = useState('att_rate')
  const [period, setPeriod] = useState('term')
  const [result, setResult] = useState<{value:string; n:number; suppressed:boolean} | null>(null)
  const [viewName, setViewName] = useState('')
  const [savedViews, setSavedViews] = useState<string[]>([])
  const [queryLog, setQueryLog] = useState<string[]>([])

  const runQuery = () => {
    const m = METRICS.find(x=>x.id===metric)!
    const n = Math.floor(Math.random()*25)
    const suppressed = n < m.minCell
    const r = { value: suppressed ? '< seuil' : `${(Math.random()*100).toFixed(1)}%`, n, suppressed }
    setResult(r)
    setQueryLog(l=>[`[${new Date().toLocaleTimeString('fr-FR')}] ${m.label} · ${period} · n=${n} · ${suppressed?'SUPPRIMÉ':'ok'}`, ...l])
    if (suppressed) toast.warning('Cellule masquée (seuil minimal)')
  }

  return (
    <div className="ui-page">
      <OfflineNotice />
      <PageHeader title="Analyse de données" subtitle="Agrégats uniquement — aucune donnée individuelle" breadcrumbs={[{ label: 'Analyse' }]} />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map(tb => <Button key={tb} size="sm" variant={tab===tb?'primary':'outline'} onClick={()=>setTab(tb)}>{tb}</Button>)}
      </div>

      {tab === 'overview' && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card><CardHeader title="Présence" /><CardBody className="text-sm">
            <p>Tendance sur la période, comparaison avec la période précédente, intervalles de confiance. Prévisions étiquetées « estimations ».</p>
          </CardBody></Card>
          <Card><CardHeader title="Effectifs & rétention" /><CardBody className="text-sm">
            <p>Entonnoir d'inscription, rétention par niveau. Suppression appliquée.</p>
          </CardBody></Card>
          <Card><CardHeader title="Activités" /><CardBody className="text-sm">
            <p>Participation aux activités et services (cantine, garderie).</p>
          </CardBody></Card>
          <Card><CardHeader title="Finance (agrégé)" /><CardBody className="text-sm">
            <p>Taux de recouvrement et ancienneté des créances par classe d'âge de créance. Aucun détail par famille.</p>
          </CardBody></Card>
        </div>
      )}

      {tab === 'explore' && (
        <Card><CardHeader title="Explorateur gouverné" /><CardBody className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField label="Métrique">{() => <Select value={metric} onValueChange={setMetric} options={METRICS.map(m=>({value:m.id,label:m.label}))} />}</FormField>
            <FormField label="Période">{() => <Select value={period} onValueChange={setPeriod} options={[{value:'week',label:'Semaine'},{value:'term',label:'Trimestre'},{value:'year',label:'Année'}]} />}</FormField>
            <div className="flex items-end"><Button onClick={runQuery}>Exécuter</Button></div>
          </div>
          {result && (
            <div className="rounded-lg border border-line p-4 text-sm">
              <p>Valeur : <strong>{result.value}</strong></p>
              <p>n = {result.n} {result.suppressed && '— masqué (< seuil minimal)'}</p>
              {result.suppressed && <p className="text-xs text-content-subtle">La cellule est masquée pour éviter la ré-identification. Suppression primaire + secondaire appliquées sur lignes/colonnes/totaux.</p>}
            </div>
          )}
          <p className="text-xs text-content-subtle">Dimensions autorisées : niveau, groupe de classe, service, trimestre. Jamais d'identifiants individuels. Protection contre le différentiel (requêtes trop proches → refus + audit).</p>
        </CardBody></Card>
      )}

      {tab === 'saved' && (
        <Card><CardHeader title="Vues enregistrées" /><CardBody className="space-y-3">
          <div className="flex gap-2">
            <input className="ui-input flex-1" placeholder="Nom de la vue" value={viewName} onChange={e=>setViewName(e.target.value)} />
            <Button onClick={()=>{ if(viewName.trim()){ setSavedViews(v=>[viewName,...v]); setViewName(''); toast.success('Vue enregistrée') } }}>Enregistrer</Button>
          </div>
          <ul className="text-sm space-y-1">{savedViews.map(v=> <li key={v}>{v}</li>)}</ul>
          <p className="text-xs text-content-subtle">Le partage ne transporte que la définition, jamais les données.</p>
        </CardBody></Card>
      )}

      {tab === 'reports' && (
        <Card><CardHeader title="Rapports planifiés" /><CardBody className="text-sm space-y-2">
          <p>Rapports hebdomadaires/mensuels (PDF/CSV) vers des destinataires approuvés (validation de la direction pour les nouveaux destinataires). Suppression appliquée à la génération, filigrane, liens expirants, journal de délivrance.</p>
          <Button onClick={()=>toast.success('Rapport planifié')}>Planifier</Button>
        </CardBody></Card>
      )}

      {tab === 'dictionary' && (
        <Card><CardHeader title="Dictionnaire des métriques" /><CardBody className="text-sm space-y-2">
          <p>Chaque métrique : id, libellé FR/EN, définition, formule, grain, dimensions autorisées, seuil minimal, classe de sensibilité, propriétaire, version, tables sources, cadence de rafraîchissement, limitations connues. Versionné; la CI échoue en cas d'écart avec docs/METRIC_DICTIONARY.md.</p>
          <ul className="text-xs space-y-1">{METRICS.map(m=> <li key={m.id}>{m.id} — {m.label} (seuil {m.minCell}, classe {m.sensitivity})</li>)}</ul>
        </CardBody></Card>
      )}

      {tab === 'quality' && (
        <Card><CardHeader title="Qualité des données" /><CardBody className="text-sm space-y-2">
          <p>Fraîcheur par métrique, complétude (couverture des présences par classe/jour), anomalies (chutes soudaines), réconciliation vs totaux sources (tests golden), santé des jobs de rafraîchissement.</p>
        </CardBody></Card>
      )}

      {tab === 'exports' && (
        <Card><CardHeader title="Exports agrégés" /><CardBody className="text-sm space-y-2">
          <p>CSV agrégé uniquement; protection contre l'injection de formules; filigrane (utilisateur, heure, hash de requête); plafonds de taille; entrées d'audit; job asynchrone avec statut; journal des exports visible par la direction.</p>
          <Button onClick={()=>toast.success('Export demandé (asynchrone)')}>Exporter</Button>
        </CardBody></Card>
      )}

      {tab === 'queries' && (
        <Card><CardHeader title="Mes requêtes" /><CardBody className="space-y-2">
          <ul className="text-xs space-y-1">{queryLog.map((q,i)=> <li key={i}>{q}</li>)}</ul>
          <p className="text-xs text-content-subtle">Journal personnel des requêtes, exports, refus (avec motifs). Les administrateurs/DPO peuvent examiner.</p>
        </CardBody></Card>
      )}
    </div>
  )
}
