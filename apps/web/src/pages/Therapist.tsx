import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Card, CardBody, CardHeader, FormField, Select, StatusPill, Textarea, toast } from '@schoolos/ui'
import { OfflineNotice, PageHeader } from '../components/Screen'

const TABS = ['home','consent','assignment','sessions','coordination','documents','messages','reports','offboarding'] as const
type Tab = typeof TABS[number]

export function TherapistPage() {
  const { t } = useTranslation()
  const [enabled, setEnabled] = useState(false)
  const [tab, setTab] = useState<Tab>('home')
  const [coord, setCoord] = useState('')

  if (!enabled) {
    return (
      <div className="ui-page">
        <OfflineNotice />
        <PageHeader title="Praticien externe (santé)" subtitle="Module désactivé par défaut" breadcrumbs={[{ label: 'Praticien' }]} />
        <Card><CardBody className="text-sm space-y-2">
          <p>Le module <code>module.therapist</code> est désactivé. Aucune donnée clinique n'est stockée dans SchoolOS (décision par défaut). Activation uniquement après validation juridique/DPO, textes de consentement et DPIA.</p>
          <p className="text-xs text-content-subtle">Aucun diagnostic, note clinique, résultat de test, plan de traitement ni document médical n'est stocké. Seules des données logistiques et des aménagements codés sont prévus.</p>
          <Button variant="outline" onClick={()=>setEnabled(true)}>Activer pour démonstration (flag)</Button>
        </CardBody></Card>
      </div>
    )
  }

  return (
    <div className="ui-page">
      <OfflineNotice />
      <PageHeader title="Praticien externe (santé)" subtitle="Logistique et coordination uniquement — pas de données cliniques" breadcrumbs={[{ label: 'Praticien' }]} />
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map(tb => <Button key={tb} size="sm" variant={tab===tb?'primary':'outline'} onClick={()=>setTab(tb)}>{tb}</Button>)}
      </div>

      {tab === 'home' && (
        <Card><CardHeader title="Accueil" /><CardBody className="text-sm space-y-2">
          <p>Élève assigné : démo. Créneau : mardi 10:00, salle 3. Consentement actif.</p>
          <p className="text-xs text-content-subtle">Aucune donnée clinique n'est stockée. Aménagements codés uniquement.</p>
        </CardBody></Card>
      )}

      {tab === 'consent' && (
        <Card><CardHeader title="Consentement des responsables" /><CardBody className="text-sm space-y-2">
          <p>Explication en langage clair : qui est le praticien, ce que l'école enregistre (pas de données cliniques), ce que les enseignants verront (statut générique + aménagements codés approuvés), durée. Signature électronique par les signataires requis; révocation immédiate bloque l'accès.</p>
          <StatusPill status="active" />
        </CardBody></Card>
      )}

      {tab === 'assignment' && (
        <Card><CardHeader title="Affectation & planning" /><CardBody className="text-sm space-y-2">
          <p>Affectation praticien↔élève validée par la direction; créneaux récurrents; vérification des conflits avec l'emploi du temps et les examens; fermetures/vacances; reprogrammation/annulation avec notifications. Les enseignants voient seulement « intervention programmée ».</p>
        </CardBody></Card>
      )}

      {tab === 'sessions' && (
        <Card><CardHeader title="Logistique de séance" /><CardBody className="text-sm space-y-2">
          <p>Prise en charge/sortie de classe (qui accompagne), codes de résultat (réalisée/absente/reprogrammée) sans motifs; absence inattendue escaladée génériquement; accès limité dans le temps (comme 011).</p>
          <Button onClick={()=>toast.success('Séance enregistrée')}>Enregistrer</Button>
        </CardBody></Card>
      )}

      {tab === 'coordination' && (
        <Card><CardHeader title="Points de coordination (codés)" /><CardBody className="space-y-3">
          <p className="text-sm">Le praticien propose des items d'un vocabulaire codé approuvé par la direction (temps supplémentaire, pause autorisée, placement, aide à la lecture). La direction approuve; publication aux enseignants comme « aménagements » sans diagnostic ni récit. Versionné avec dates de revue. Le gardien peut consulter et révoquer.</p>
          <FormField label="Proposition">{() => <Select value="" onValueChange={()=>{}} options={[{value:'extra_time',label:'Temps supplémentaire'},{value:'break',label:'Pause autorisée'},{value:'seating',label:'Placement'},{value:'reading',label:'Aide à la lecture'}]} />}</FormField>
          <Textarea value={coord} onChange={e=>setCoord(e.target.value)} rows={2} placeholder="Justification (non clinique)" />
          <Button onClick={()=>{ setCoord(''); toast.success('Proposition envoyée') }}>Proposer</Button>
        </CardBody></Card>
      )}

      {tab === 'documents' && (
        <Card><CardHeader title="Documents administratifs" /><CardBody className="text-sm space-y-2">
          <p>Convention, assurance, charte de confidentialité. Liste MIME autorisée excluant les formats cliniques par politique. Scan AV. Bannière : « Ne déposez aucun document médical ».</p>
          <Button onClick={()=>toast.success('Document déposé')}>Déposer</Button>
        </CardBody></Card>
      )}

      {tab === 'messages' && (
        <Card><CardHeader title="Messages" /><CardBody className="text-sm space-y-2">
          <p>Uniquement vers la direction/l'accueil pour la logistique. Avertissements automatiques pour les termes de santé (blocage souple avec explication). Pas de messagerie directe avec les élèves/parents.</p>
          <Button onClick={()=>toast.success('Message envoyé')}>Envoyer</Button>
        </CardBody></Card>
      )}

      {tab === 'reports' && (
        <Card><CardHeader title="Rapports pour l'école" /><CardBody className="text-sm space-y-2">
          <p>Comptages agrégés d'interventions par trimestre (sans signification clinique par élève), transmis à la direction. Exclus de l'analyse par défaut.</p>
        </CardBody></Card>
      )}

      {tab === 'offboarding' && (
        <Card><CardHeader title="Fin de convention" /><CardBody className="text-sm space-y-2">
          <p>Révocation immédiate de l'accès, archivage des plannings, révision des aménagements codés, notification au praticien.</p>
          <Button onClick={()=>toast.success('Clôture demandée')}>Demander la clôture</Button>
        </CardBody></Card>
      )}
    </div>
  )
}
