import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DoorOpen, Users, Phone, ClipboardList, Calendar, Mail, Key, AlertTriangle, BookOpen, Handshake } from 'lucide-react'
import { Banner, Badge, Button, Card, CardBody, CardHeader, FormField, Select, StatusPill, Textarea, toast } from '@schoolos/ui'
import { OfflineNotice, PageHeader } from '../components/Screen'
import { useCan } from '../app/permissions'

const TABS = ['dashboard','visitors','movements','absences','requests','enrolment','appointments','mail','emergency','directory','handover'] as const
type Tab = typeof TABS[number]

export function ReceptionPage() {
  const { t } = useTranslation()
  const canRead = true
  const [tab, setTab] = useState<Tab>('dashboard')
  const [posture, setPosture] = useState('vigilance')
  const [visitorName, setVisitorName] = useState('')
  const [visitors, setVisitors] = useState<{id:string;name:string;org:string;host:string;checkedOut:boolean}[]>([
    { id:'v1', name:'Marie Lefèvre', org:'Mairie', host:'Direction', checkedOut:false },
    { id:'v2', name:'Tech informatique', org:'Prestataire', host:'IT', checkedOut:true },
  ])
  const [movements, setMovements] = useState<{id:string;pupil:string;type:string;time:string}[]>([])
  const [absenceCalls, setAbsenceCalls] = useState<{id:string;pupil:string;caller:string;reason:string}[]>([])
  const [requests, setRequests] = useState<{id:string;title:string;status:string}[]>([{id:'r1',title:'Demande de certificat de scolarité',status:'open'}])
  const [handover, setHandover] = useState('')

  const checkIn = () => {
    if (!visitorName.trim()) return
    setVisitors(v => [{ id:`v-${Date.now()}`, name:visitorName, org:'Visiteur', host:'Accueil', checkedOut:false }, ...v])
    setVisitorName('')
    toast.success('Visiteur enregistré — badge imprimé')
  }
  const checkOut = (id:string) => setVisitors(v => v.map(x=> x.id===id ? {...x, checkedOut:true} : x))

  return (
    <div className="ui-page">
      <OfflineNotice />
      <Banner tone="info" title="Accueil — poste de réception">
        Données minimales. Accès aux données restreintes uniquement à la demande et audité.
      </Banner>
      <PageHeader title="Réception" subtitle="Tableau de bord du jour" breadcrumbs={[{ label: 'Accueil' }]} />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map(tb => (
          <Button key={tb} size="sm" variant={tab===tb?'primary':'outline'} onClick={()=>setTab(tb)}>{tb}</Button>
        ))}
      </div>

      {tab === 'dashboard' && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card><CardHeader title="Aujourd'hui" /><CardBody className="text-sm space-y-1">
            <p>Visiteurs sur site : {visitors.filter(v=>!v.checkedOut).length}</p>
            <p>Mouvements élèves : {movements.length}</p>
            <p>Appels absence à traiter : {absenceCalls.length}</p>
            <p>Demandes ouvertes : {requests.filter(r=>r.status==='open').length}</p>
          </CardBody></Card>
          <Card><CardHeader title="Posture / alerte" /><CardBody className="space-y-2 text-sm">
            <FormField label="Niveau de posture">{() => <Select value={posture} onValueChange={setPosture} options={[{value:'normal',label:'Normal'},{value:'vigilance',label:'Vigilance'},{value:'renforcee',label:'Renforcée'}]} />}</FormField>
            <p className="text-xs text-content-subtle">Bannière affichée à tout l'établissement selon le niveau configuré par la direction.</p>
          </CardBody></Card>
        </div>
      )}

      {tab === 'visitors' && (
        <Card><CardHeader title="Registre des visiteurs" /><CardBody className="space-y-3">
          <div className="flex gap-2">
            <input className="ui-input flex-1" placeholder="Nom du visiteur" value={visitorName} onChange={e=>setVisitorName(e.target.value)} />
            <Button onClick={checkIn}>Enregistrer l'entrée</Button>
          </div>
          <ul className="text-sm space-y-1">
            {visitors.map(v => (
              <li key={v.id} className="flex items-center justify-between border-b border-line py-1">
                <span>{v.name} — {v.org} (hôte: {v.host})</span>
                {v.checkedOut ? <Badge tone="neutral">Sorti</Badge> : <Button size="sm" variant="outline" onClick={()=>checkOut(v.id)}>Sortie</Button>}
              </li>
            ))}
          </ul>
          <p className="text-xs text-content-subtle">Vérification prestataire/contractant : si contrat/honorabilité expiré, l'enregistrement est bloqué et la direction alertée. Liste de restriction (interdiction d'accès) maintenue par la direction : « refuser l'accès — voir direction ».</p>
        </CardBody></Card>
      )}

      {tab === 'movements' && (
        <Card><CardHeader title="Mouvements élèves (retard / sortie anticipée)" /><CardBody className="space-y-3">
          <Button onClick={() => { setMovements(m=>[{id:`m-${Date.now()}`,pupil:'Élève démo',type:'retard',time:new Date().toLocaleTimeString('fr-FR')},...m]); toast.success('Retard enregistré — gardiens et enseignant notifiés (texte générique)') }}>Enregistrer un retard</Button>
          <Button variant="outline" onClick={() => { setMovements(m=>[{id:`m-${Date.now()}`,pupil:'Élève démo',type:'sortie anticipée',time:new Date().toLocaleTimeString('fr-FR')},...m]); toast.success('Sortie anticipée — vérification du collecteur requise') }}>Enregistrer une sortie anticipée</Button>
          <ul className="text-sm space-y-1">{movements.map(m=> <li key={m.id}>{m.time} — {m.pupil} — {m.type}</li>)}</ul>
          <p className="text-xs text-content-subtle">Sortie anticipée : vérification contre les liens gardiens/personnes autorisées/restrictions; journal de contrôle d'identité (pas d'image par défaut); signature à l'écran; personne inconnue → blocage et appel au gardien, exception par la direction.</p>
        </CardBody></Card>
      )}

      {tab === 'absences' && (
        <Card><CardHeader title="Appels absence" /><CardBody className="space-y-3">
          <Button onClick={() => { setAbsenceCalls(c=>[{id:`a-${Date.now()}`,pupil:'Élève démo',caller:'Parent',reason:'Maladie'},...c]); toast.success('Justification en attente créée') }}>Nouvel appel absence</Button>
          <ul className="text-sm space-y-1">{absenceCalls.map(a=> <li key={a.id}>{a.pupil} — appelant: {a.caller} — {a.reason}</li>)}</ul>
          <p className="text-xs text-content-subtle">Détection de doublons; suivi des absences injustifiées; aucune raison dans les notifications push/e-mail.</p>
        </CardBody></Card>
      )}

      {tab === 'requests' && (
        <Card><CardHeader title="Demandes des familles" /><CardBody className="space-y-3">
          <ul className="text-sm space-y-1">{requests.map(r=> <li key={r.id} className="flex justify-between"><span>{r.title}</span><StatusPill status={r.status} /></li>)}</ul>
          <Button onClick={() => { setRequests(r=>[{id:`r-${Date.now()}`,title:'Nouvelle demande',status:'open'},...r]); toast.success('Ticket créé') }}>Nouvelle demande</Button>
          <p className="text-xs text-content-subtle">Réception ne peut pas approuver les changements sensibles (restrictions, payeur, autorité) — crée une approbation pour la direction.</p>
        </CardBody></Card>
      )}

      {tab === 'enrolment' && (
        <Card><CardHeader title="Inscriptions — accueil" /><CardBody className="text-sm space-y-2">
          <p>Rendez-vous, liste de documents requis, dépôt de scans (AV + lisibilité), statut de complétude, transmission à la direction pour décision.</p>
          <p className="text-xs text-content-subtle">Documents : livret de famille, justificatif de domicile, preuve de vaccination (traitée selon la politique de l'établissement), certificat de radiation, jugement si parents séparés. Aucun parsing dans le portail.</p>
          <Button onClick={()=>toast.success('Rendez-vous d\'inscription créé')}>Planifier un rendez-vous</Button>
        </CardBody></Card>
      )}

      {tab === 'appointments' && (
        <Card><CardHeader title="Rendez-vous (prise pour les familles)" /><CardBody className="text-sm space-y-2">
          <p>Réservation/annulation pour la direction/les enseignants selon les créneaux publiés; détection de conflits; rappels.</p>
          <Button onClick={()=>toast.success('Rendez-vous réservé')}>Réserver</Button>
        </CardBody></Card>
      )}

      {tab === 'mail' && (
        <Card><CardHeader title="Courrier, colis, objets trouvés, salles & clés" /><CardBody className="text-sm space-y-2">
          <p>Journal réception/remise (qui/quand), objets trouvés avec photo et réclamation (sans noms d'élèves en vue publique), réservation de salles avec conflits, journal d'emprunt de clés.</p>
          <Button onClick={()=>toast.success('Entrée enregistrée')}>Enregistrer</Button>
        </CardBody></Card>
      )}

      {tab === 'emergency' && (
        <Card><CardHeader title="Listes d'urgence & alertes" /><CardBody className="text-sm space-y-2">
          <p>Rôle d'évacuation : élèves présents par classe, personnel sur site, visiteurs/prestataires sur site, numéros d'urgence des gardiens. Impression/PDF et paquet hors ligne (cache chiffré avec TTL, effacé à la déconnexion; PDF quotidien pour archivage papier).</p>
          <p>Alerte (évacuation, confinement, exercice) vers tous les appareils avec accusé de réception et mode exercice; rapport post-événement pour le registre de sécurité.</p>
          <Button onClick={()=>toast.success('Liste d\'urgence générée')}>Générer la liste</Button>
          <Button variant="outline" onClick={()=>toast.success('Alerte envoyée (mode exercice)')}>Déclencher une alerte</Button>
        </CardBody></Card>
      )}

      {tab === 'directory' && (
        <Card><CardHeader title="Annuaire" /><CardBody className="text-sm space-y-2">
          <p>Noms/rôles/postes du personnel, contacts externes (mairie, bus, cantine, maintenance), résumé du règlement. Aucune donnée personnelle au-delà du contact professionnel.</p>
        </CardBody></Card>
      )}

      {tab === 'handover' && (
        <Card><CardHeader title="Notes de passation" /><CardBody className="space-y-3">
          <Textarea value={handover} onChange={e=>setHandover(e.target.value)} rows={4} placeholder="Notes opérationnelles (pas de données sensibles)" />
          <Button onClick={()=>{ setHandover(''); toast.success('Note de passation enregistrée') }}>Enregistrer</Button>
        </CardBody></Card>
      )}
    </div>
  )
}
