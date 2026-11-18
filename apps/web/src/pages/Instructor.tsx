import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Card, CardBody, CardHeader, FormField, Select, StatusPill, Textarea, toast } from '@schoolos/ui'
import { OfflineNotice, PageHeader } from '../components/Screen'

const TABS = ['today','activities','sessions','attendance','pickup','ratio','notes','incidents','messages','waitlist','trips','hours','help'] as const
type Tab = typeof TABS[number]

export function InstructorPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('today')
  const [eligible, setEligible] = useState(true)
  const [attendance, setAttendance] = useState<Record<string,string>>({})
  const [note, setNote] = useState('')
  const [incident, setIncident] = useState('')

  const pupils = [
    { id:'p1', name:'Léa Martin', klass:'CE1', imageRights:true, attention:false },
    { id:'p2', name:'Tom Bernard', klass:'CE1', imageRights:false, attention:true },
  ]

  return (
    <div className="ui-page">
      <OfflineNotice />
      <PageHeader title="Espace animateur" subtitle="Activités périscolaires — données limitées à mes groupes" breadcrumbs={[{ label: 'Activités' }]} />

      {!eligible && (
        <div className="mb-4 rounded-lg border border-warning-300 bg-warning-50 p-4 text-sm text-warning-900">
          Accès bloqué : dossier d'éligibilité incomplet ou expiré (contrat, honorabilité, qualifications, charte, assurance). Les séances sont grisées. La direction et l'accueil sont alertés.
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map(tb => <Button key={tb} size="sm" variant={tab===tb?'primary':'outline'} onClick={()=>setTab(tb)}>{tb}</Button>)}
      </div>

      {tab === 'today' && (
        <Card><CardHeader title="Aujourd'hui" /><CardBody className="text-sm space-y-2">
          <p>Séances du jour : Échecs — CP/CE1 (16:30, Salle 4) — 12 inscrits.</p>
          <p>Présences en attente : 1. Ratio : OK (1/12). Récupération : 2 départs autonomes à vérifier.</p>
          <p>Alertes : document honorabilité expire dans 15 jours.</p>
        </CardBody></Card>
      )}

      {tab === 'activities' && (
        <Card><CardHeader title="Mes activités" /><CardBody className="text-sm space-y-2">
          <p>Échecs — CP/CE1 (Mardi 16:30), Arts plastiques (Jeudi 15:00). Propositions de modification (capacité, horaires, description) → validation par la direction; détection de conflits (double réservation élève/salle).</p>
          <Button onClick={()=>toast.success('Proposition envoyée à la direction')}>Proposer une modification</Button>
        </CardBody></Card>
      )}

      {tab === 'sessions' && (
        <Card><CardHeader title="Séances & présences" /><CardBody className="text-sm space-y-2">
          <p>Séances récurrentes, exceptions (vacances, fermetures, sorties), salle, capacité. Présence/absence/retard/sortie anticipée; absence inattendue à l'école signalée; notification automatique aux gardiens pour absence inexpliquée à l'activité.</p>
        </CardBody></Card>
      )}

      {tab === 'attendance' && (
        <Card><CardHeader title="Feuille de présence" /><CardBody className="space-y-2">
          {pupils.map(p => (
            <div key={p.id} className="flex items-center justify-between border-b border-line py-1 text-sm">
              <span>{p.name} — {p.klass}</span>
              <div className="flex gap-1">
                {['present','absent','late'].map(s => (
                  <Button key={s} size="sm" variant={attendance[p.id]===s?'primary':'outline'} onClick={()=>setAttendance(a=>({...a,[p.id]:s}))}>{s}</Button>
                ))}
              </div>
            </div>
          ))}
          <Button onClick={()=>toast.success('Présences enregistrées (idempotent)')}>Enregistrer</Button>
          <p className="text-xs text-content-subtle">Mode hors ligne : file visible avec statut; pas de cache sensible au-delà de la fenêtre de séance.</p>
        </CardBody></Card>
      )}

      {tab === 'pickup' && (
        <Card><CardHeader title="Départs & récupération" /><CardBody className="text-sm space-y-2">
          <p>Checklist de fin de séance : vérification du collecteur (gardien/personne autorisée, contrôle d'identité journalisé), départ autonome (consentement des gardiens), transmission au service suivant (étude, cantine, bus), escalade enfant non récupéré (appel gardien → direction) avec minuteur. Restrictions au départ (005/008) affichées comme consignes d'action.</p>
          <Button onClick={()=>toast.success('Vérification enregistrée')}>Vérifier un départ</Button>
        </CardBody></Card>
      )}

      {tab === 'ratio' && (
        <Card><CardHeader title="Ratio d'encadrement" /><CardBody className="text-sm space-y-2">
          <p>Effectif en direct vs ratio configuré par tranche d'âge; avertissements; renforcement suggéré (lien affectations); enregistrement des exceptions avec motif. Ratios configurables par établissement/commune (pas de valeurs codées en dur).</p>
        </CardBody></Card>
      )}

      {tab === 'notes' && (
        <Card><CardHeader title="Notes de séance" /><CardBody className="space-y-3">
          <Textarea value={note} onChange={e=>setNote(e.target.value)} rows={4} placeholder="Ce qui a été fait, matériel, objectifs" />
          <Button onClick={()=>{ setNote(''); toast.success('Note enregistrée') }}>Enregistrer</Button>
          <p className="text-xs text-content-subtle">Photos uniquement si droits à l'image = oui et selon la politique de l'établissement; stockage dans l'établissement; pas de partage sur les réseaux sociaux.</p>
        </CardBody></Card>
      )}

      {tab === 'incidents' && (
        <Card><CardHeader title="Incidents" /><CardBody className="space-y-3">
          <Textarea value={incident} onChange={e=>setIncident(e.target.value)} rows={4} placeholder="Faits, premiers soins (oui/non), escalade" />
          <Button onClick={()=>{ setIncident(''); toast.success('Incident signalé à la direction') }}>Signaler</Button>
          <p className="text-xs text-content-subtle">L'animateur ne décide pas des sanctions. En cas de révélation d'un enfant : écouter, ne pas enquêter, signaler immédiatement via « Signaler une inquiétude » (voir 007).</p>
        </CardBody></Card>
      )}

      {tab === 'messages' && (
        <Card><CardHeader title="Messages aux familles" /><CardBody className="text-sm space-y-2">
          <p>Uniquement aux gardiens des élèves inscrits; modèles (annulation, rappel, sortie); texte libre limité et modéré; réponses routées vers la boîte de l'animateur; pas de messagerie directe avec les élèves.</p>
          <Button onClick={()=>toast.success('Message envoyé (modèle)')}>Envoyer un message</Button>
        </CardBody></Card>
      )}

      {tab === 'waitlist' && (
        <Card><CardHeader title="Liste d'attente & promotion" /><CardBody className="text-sm space-y-2">
          <p>Compteur + ordre uniquement; promotion par le système/direction lorsqu'une place se libère; demandes d'exception par l'animateur, validation par la direction.</p>
        </CardBody></Card>
      )}

      {tab === 'trips' && (
        <Card><CardHeader title="Sorties" /><CardBody className="text-sm space-y-2">
          <p>Planification : date, lieu, adultes, ratio, transport, autorisations (envoyées via 005 G9), liste avec statut des consentements, feuille d'urgence imprimable/hors ligne à durée limitée, comptage (départ/arrivée/retour).</p>
          <Button onClick={()=>toast.success('Sortie planifiée')}>Planifier une sortie</Button>
        </CardBody></Card>
      )}

      {tab === 'hours' && (
        <Card><CardHeader title="Heures & documents" /><CardBody className="text-sm space-y-2">
          <p>Feuille d'heures (séances réalisées, préparation si autorisée), corrections avec approbation, statut du contrat, dépôt de documents (qualifications, honorabilité, assurance) avec rappels d'expiration, export pour la paie (agrégé).</p>
          <Button onClick={()=>toast.success('Document déposé')}>Déposer un document</Button>
        </CardBody></Card>
      )}

      {tab === 'help' && (
        <Card><CardHeader title="Aide" /><CardBody className="text-sm space-y-2">
          <p>Numéros d'urgence, étapes en cas d'incident, procédure si un enfant se confie (écouter, ne pas enquêter, signaler immédiatement), résumé PPMS.</p>
        </CardBody></Card>
      )}

      {eligible && (
        <div className="mt-4">
          <Card><CardHeader title="Roster — Échecs CP/CE1 (inscrits uniquement)" /><CardBody>
            {pupils.map(p => (
              <div key={p.id} className="flex items-center justify-between border-b border-line py-1 text-sm">
                <span>{p.name} — {p.klass}</span>
                <div className="flex gap-2">
                  {p.imageRights && <Badge tone="success">Droits image OK</Badge>}
                  {p.attention && <Badge tone="warning">Attention — voir direction</Badge>}
                </div>
              </div>
            ))}
            <p className="mt-2 text-xs text-content-subtle">Contacts d'urgence visibles uniquement pendant la fenêtre de séance, accès audité. Pas de données médicales ou familiales.</p>
          </CardBody></Card>
        </div>
      )}
    </div>
  )
}
