import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Card, CardBody, CardHeader, FormField, Select, StatusPill, Textarea, toast } from '@schoolos/ui'
import { OfflineNotice, PageHeader } from '../components/Screen'

const TABS = ['home','org','documents','sessions','roster','attendance','pickup','report','incident','messages','invoices','rules','feedback','offboarding'] as const
type Tab = typeof TABS[number]

const GATE_OK = true

export function ProviderPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('home')
  const [invoice, setInvoice] = useState('')
  const [report, setReport] = useState('')
  const [incident, setIncident] = useState('')

  const pupils = [
    { id:'p1', name:'Léa Martin', klass:'CE1', imageRights:true, attention:false },
    { id:'p2', name:'Tom Bernard', klass:'CE1', imageRights:false, attention:true },
  ]

  return (
    <div className="ui-page">
      <OfflineNotice />
      <PageHeader title="Espace prestataire" subtitle="Accès minimal, encadré par la convention" breadcrumbs={[{ label: 'Activités' }]} />

      {!GATE_OK && (
        <div className="mb-4 rounded-lg border border-danger-300 bg-danger-50 p-4 text-sm text-danger-900">
          Accès au registre bloqué : contrat inactif, documents manquants/expirés, non affecté à la séance ou hors fenêtre horaire. Motif transmis à la direction/l'accueil.
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map(tb => <Button key={tb} size="sm" variant={tab===tb?'primary':'outline'} onClick={()=>setTab(tb)}>{tb}</Button>)}
      </div>

      {tab === 'home' && (
        <Card><CardHeader title="Accueil" /><CardBody className="text-sm space-y-2">
          <p>Séance dans la fenêtre : Échecs — CP/CE1 (16:30, Salle 4). Registre disponible de T−30 min à T+60 min.</p>
          <p>Documents : assurance expire dans 12 jours — pensez au renouvellement.</p>
        </CardBody></Card>
      )}

      {tab === 'org' && (
        <Card><CardHeader title="Mon organisation" /><CardBody className="text-sm space-y-2">
          <p>Club Échecs Paris — profil, statut (approuvé), convention versionnée, portée, dates, tarifs, résiliation.</p>
          <Button onClick={()=>toast.success('Profil enregistré')}>Mettre à jour</Button>
        </CardBody></Card>
      )}

      {tab === 'documents' && (
        <Card><CardHeader title="Documents & conformité" /><CardBody className="text-sm space-y-2">
          <p>Kbis/SIRET/RNA, attestation d'assurance (RC) avec expiration, acceptation du DPA, charte de bonne conduite, convention signée (e-signature), documents par intervenant (identité vérifiée, honorabilité, qualifications, formation). Rappels à 60/30/7 jours.</p>
          <Button onClick={()=>toast.success('Document déposé')}>Déposer un document</Button>
        </CardBody></Card>
      )}

      {tab === 'sessions' && (
        <Card><CardHeader title="Mes séances" /><CardBody className="text-sm space-y-2">
          <p>Calendrier des séances affectées par l'école (salle, horaire, groupe, effectif attendu, ratio, consignes). Demandes de remplacement validées par l'école; prévention des conflits.</p>
        </CardBody></Card>
      )}

      {tab === 'roster' && (
        <Card><CardHeader title="Registre (fenêtre de séance uniquement)" /><CardBody>
          {GATE_OK ? (
            <>
              {pupils.map(p => (
                <div key={p.id} className="flex items-center justify-between border-b border-line py-1 text-sm">
                  <span>{p.name} — {p.klass}</span>
                  <div className="flex gap-2">
                    {p.imageRights && <Badge tone="success">Droits image OK</Badge>}
                    {p.attention && <Badge tone="warning">Attention — voir l'école</Badge>}
                  </div>
                </div>
              ))}
              <p className="mt-2 text-xs text-content-subtle">Vue seule (pas d'export/copie/impression par défaut). Masqué automatiquement hors fenêtre. « Données masquées hors séance ».</p>
            </>
          ) : <p className="text-sm text-content-muted">Données masquées hors séance.</p>}
        </CardBody></Card>
      )}

      {tab === 'attendance' && (
        <Card><CardHeader title="Présences & départs" /><CardBody className="text-sm space-y-2">
          <p>Présence/absence/retard/sortie anticipée; collecteur inconnu → arrêt et appel à l'école; restrictions affichées comme consignes d'action; enregistrement de la transmission.</p>
          <Button onClick={()=>toast.success('Présence enregistrée')}>Enregistrer</Button>
        </CardBody></Card>
      )}

      {tab === 'pickup' && (
        <Card><CardHeader title="Récupération" /><CardBody className="text-sm space-y-2">
          <p>Vérification du collecteur, départ autonome selon consentement, transmission au service suivant, escalade si enfant non récupéré.</p>
        </CardBody></Card>
      )}

      {tab === 'report' && (
        <Card><CardHeader title="Rapport de séance" /><CardBody className="space-y-3">
          <Textarea value={report} onChange={e=>setReport(e.target.value)} rows={4} placeholder="Contenu délivré, effectif, remarques" />
          <Button onClick={()=>{ setReport(''); toast.success("Rapport envoye a l'ecole") }}>Envoyer</Button>
        </CardBody></Card>
      )}

      {tab === 'incident' && (
        <Card><CardHeader title="Incident" /><CardBody className="space-y-3">
          <Textarea value={incident} onChange={e=>setIncident(e.target.value)} rows={4} placeholder="Faits, premiers soins" />
          <Button onClick={()=>{ setIncident(''); toast.success('Incident signalé') }}>Signaler</Button>
          <p className="text-xs text-content-subtle">Si un enfant se confie : écouter, ne pas enquêter, signaler via « Signaler une inquiétude » vers le référent protection de l'école. Ne pas contacter la famille directement.</p>
        </CardBody></Card>
      )}

      {tab === 'messages' && (
        <Card><CardHeader title="Messages à l'école" /><CardBody className="text-sm space-y-2">
          <p>Uniquement vers la direction, le responsable d'activité, l'accueil. Pas de pièces jointes avec données d'élèves. Protection contre les abus.</p>
          <Button onClick={()=>toast.success('Message envoyé')}>Envoyer</Button>
        </CardBody></Card>
      )}

      {tab === 'invoices' && (
        <Card><CardHeader title="Factures" /><CardBody className="space-y-3">
          <Textarea value={invoice} onChange={e=>setInvoice(e.target.value)} rows={3} placeholder="Détails de la facture" />
          <Button onClick={()=>{ setInvoice(''); toast.success('Facture soumise pour approbation') }}>Soumettre</Button>
          <p className="text-xs text-content-subtle">Validation SIRET, montants vs convention, rapprochement avec les séances effectuées. Statut : soumise → approuvée → payée.</p>
        </CardBody></Card>
      )}

      {tab === 'rules' && (
        <Card><CardHeader title="Consignes & sécurité" /><CardBody className="text-sm space-y-2">
          <p>Règlement intérieur, résumé PPMS/évacuation, plan des salles, contacts, politique de protection/harcèlement, charte de bonne conduite (versionnée; ré-acceptation en cas de changement).</p>
        </CardBody></Card>
      )}

      {tab === 'feedback' && (
        <Card><CardHeader title="Performance & suivi (école)" /><CardBody className="text-sm space-y-2">
          <p>Notes et évaluations de la direction (non visibles au prestataire sauf choix de l'école), décision de renouvellement, historique des incidents.</p>
        </CardBody></Card>
      )}

      {tab === 'offboarding' && (
        <Card><CardHeader title="Fin de contrat" /><CardBody className="text-sm space-y-2">
          <p>Révocation immédiate de l'accès, conservation des données selon la politique, suppression certifiée des données dérivées des élèves dans les notes du prestataire, export de ses propres factures/rapports.</p>
          <Button onClick={()=>toast.success('Demande de clôture envoyée')}>Demander la clôture</Button>
        </CardBody></Card>
      )}
    </div>
  )
}
