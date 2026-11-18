import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Card, CardBody, CardHeader, FormField, Select, StatusPill, Textarea, toast } from '@schoolos/ui'
import { OfflineNotice, PageHeader } from '../components/Screen'
import { useCan } from '../app/permissions'

const TABS = ['tenants','health','flags','support','security','compliance','billing','releases','templates','imports','backups','staff','audit','announcements'] as const
type Tab = typeof TABS[number]

const TENANTS = [
  { id:'t1', name:'Groupe scolaire Saint-Denis', state:'active', plan:'Pro', students:420 },
  { id:'t2', name:'Collège Victor Hugo', state:'provisioning', plan:'Standard', students:0 },
  { id:'t3', name:'École primaire Jules Ferry', state:'suspended', plan:'Standard', students:180 },
]

export function OperatorConsolePage() {
  const { t } = useTranslation()
  const can = useCan('platform.admin')
  const [tab, setTab] = useState<Tab>('tenants')
  const [jitReason, setJitReason] = useState('')
  const [maintenanceMsg, setMaintenanceMsg] = useState('')

  if (!can) return <div className="ui-page"><PageHeader title="Plateforme" /><p>Accès refusé.</p></div>

  return (
    <div className="ui-page">
      <OfflineNotice />
      <PageHeader title="Console plateforme" subtitle="Plane opérateur — aucune donnée élève par défaut" breadcrumbs={[{ label: 'Platform' }]} />
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map(tb => <Button key={tb} size="sm" variant={tab===tb?'primary':'outline'} onClick={()=>setTab(tb)}>{tb}</Button>)}
      </div>

      {tab === 'tenants' && (
        <Card><CardHeader title="Établissements (tenants)" /><CardBody className="space-y-2 text-sm">
          {TENANTS.map(tn => (
            <div key={tn.id} className="flex items-center justify-between border-b border-line py-2">
              <span>{tn.name} — {tn.plan} — {tn.students} élèves</span>
              <div className="flex items-center gap-2">
                <StatusPill status={tn.state} />
                <Button size="sm" variant="outline" onClick={()=>toast.success('Action à 4 yeux requise')}>Gérer</Button>
              </div>
            </div>
          ))}
          <Button onClick={()=>toast.success('Assistant de provisionnement lancé')}>Provisionner un établissement</Button>
          <p className="text-xs text-content-subtle">Cycle de vie : provisioning → actif → suspendu → offboarding → supprimé. Suspension préserve les données. Offboarding : export chiffré + période de grâce + suppression certifiée (respect du legal hold). Étapes à 4 yeux + audit.</p>
        </CardBody></Card>
      )}

      {tab === 'health' && (
        <Card><CardHeader title="Santé de la plateforme" /><CardBody className="text-sm space-y-2">
          <p>Uptime, taux d'erreur, latence, profondeur de file, échecs de jobs, stockage, délivrabilité e-mail/SMS, santé des webhooks PSP, échecs de connexion — sans PII.</p>
          <Button onClick={()=>toast.success('Règles d\'alerte configurées')}>Configurer les alertes</Button>
        </CardBody></Card>
      )}

      {tab === 'flags' && (
        <Card><CardHeader title="Options & plans" /><CardBody className="text-sm space-y-2">
          <p>Basculage de modules par établissement et par rôle (finance, périscolaire, thérapeute OFF par défaut, IA OFF par défaut), limites de plan, kill switches, flags planifiés. Changements audités.</p>
          <Button onClick={()=>toast.success('Flag mis à jour (audit)')}>Modifier un flag</Button>
        </CardBody></Card>
      )}

      {tab === 'support' && (
        <Card><CardHeader title="Support" /><CardBody className="text-sm space-y-2">
          <p>Tickets des administrateurs d'établissement, SLA, base de connaissances. Les tickets ne doivent pas contenir de PII (avertissement côté client + vérifications côté serveur).</p>
          <p>Session de support (break-glass-lite) : approbation du directeur (limitée dans le temps), approbation à 4 yeux pour les périmètres à risque, masquage par défaut, bannière rouge, expiration automatique, révocation instantanée, audit consultable par l'établissement.</p>
          <Button onClick={()=>toast.success('Demande de session envoyée')}>Demander une session de support</Button>
        </CardBody></Card>
      )}

      {tab === 'security' && (
        <Card><CardHeader title="Sécurité" /><CardBody className="text-sm space-y-2">
          <p>Révocation globale de sessions par établissement/utilisateur, réinscription MFA forcée, surcharges de limitation de débit, alertes d'activité suspecte, rotation des secrets/clés (KMS) à 4 yeux, inscription WebAuthn, registre des vulnérabilités lié au CI, avis de sécurité aux établissements.</p>
          <Button onClick={()=>toast.success('Action de sécurité enregistrée')}>Exécuter</Button>
        </CardBody></Card>
      )}

      {tab === 'compliance' && (
        <Card><CardHeader title="Conformité" /><CardBody className="text-sm space-y-2">
          <p>Registre DPA par établissement, liste des sous-traitants (page publique), registre des traitements, registre des violations avec horloge CNIL 72 h, suivi DSAR, statut des jobs de rétention, attestations de résidence, modèles DPIA, packs de preuves.</p>
          <Button onClick={()=>toast.success('Violation enregistrée (horloge 72 h)')}>Enregistrer une violation</Button>
        </CardBody></Card>
      )}

      {tab === 'billing' && (
        <Card><CardHeader title="Facturation plateforme (SaaS)" /><CardBody className="text-sm space-y-2">
          <p>Plans, mesure d'usage (élèves, stockage), factures aux établissements, statut de paiement, relances aux administrateurs d'établissement (pas aux parents), TVA/e-facturation (à vérifier avec le comptable).</p>
          <Button onClick={()=>toast.success('Facture générée')}>Générer une facture</Button>
        </CardBody></Card>
      )}

      {tab === 'releases' && (
        <Card><CardHeader title="Versions & maintenance" /><CardBody className="text-sm space-y-2">
          <p>Versions par environnement, journal des changements, plan de migration avec porte de sauvegarde, déploiement en anneaux par groupe d'établissements, retour arrière, bannières de maintenance, liste de vérification post-publication.</p>
          <Button onClick={()=>toast.success('Bannière de maintenance planifiée')}>Planifier une maintenance</Button>
        </CardBody></Card>
      )}

      {tab === 'templates' && (
        <Card><CardHeader title="Modèles & données de référence" /><CardBody className="text-sm space-y-2">
          <p>Politiques par défaut (seuils avec base légale), modèles de notification FR/EN, modèles de documents, calendriers scolaires par zone A/B/C (versionnés, poussés avec préavis), répertoire départemental (contacts CRIP/DSDEN à compléter par l'établissement).</p>
          <Button onClick={()=>toast.success('Modèle publié')}>Publier un modèle</Button>
        </CardBody></Card>
      )}

      {tab === 'imports' && (
        <Card><CardHeader title="Import en masse" /><CardBody className="text-sm space-y-2">
          <p>Statut des jobs d'import (comptes, erreurs) sans voir les lignes; aide au mappage via rapports d'erreurs avec valeurs masquées.</p>
        </CardBody></Card>
      )}

      {tab === 'backups' && (
        <Card><CardHeader title="Sauvegardes & restauration" /><CardBody className="text-sm space-y-2">
          <p>Statut des sauvegardes par établissement, exercices de restauration (environnement isolé, données masquées), demande de restauration par établissement (approbation + 4 yeux), vérification d'intégrité (chaîne de hash, solde du registre).</p>
          <Button onClick={()=>toast.success('Exercice de restauration planifié')}>Planifier un exercice</Button>
        </CardBody></Card>
      )}

      {tab === 'staff' && (
        <Card><CardHeader title="Équipe plateforme" /><CardBody className="text-sm space-y-2">
          <p>Invitation/départ des opérateurs, attribution de rôles, élévation just-in-time avec expiration, rapport de revue d'accès trimestriel, WebAuthn obligatoire, limites de session, attestation de vérification des antécédents (processus RH externe).</p>
          <FormField label="Motif d'élévation JIT">{() => <Textarea value={jitReason} onChange={e=>setJitReason(e.target.value)} rows={2} />}</FormField>
          <Button onClick={()=>{ setJitReason(''); toast.success('Élévation JIT demandée') }}>Demander une élévation</Button>
        </CardBody></Card>
      )}

      {tab === 'audit' && (
        <Card><CardHeader title="Journal d'audit plateforme" /><CardBody className="text-sm space-y-2">
          <p>Journal infalsifiable de toutes les actions opérateur; les établissements voient le sous-ensemble qui les concerne; vérification par le rôle d'audit; export pour les auditeurs.</p>
          <Button onClick={()=>toast.success('Export d\'audit demandé')}>Exporter</Button>
        </CardBody></Card>
      )}

      {tab === 'announcements' && (
        <Card><CardHeader title="Annonces aux administrateurs d'établissement" /><CardBody className="space-y-3">
          <FormField label="Message">{() => <Textarea value={maintenanceMsg} onChange={e=>setMaintenanceMsg(e.target.value)} rows={3} />}</FormField>
          <Button onClick={()=>{ setMaintenanceMsg(''); toast.success('Annonce envoyée') }}>Envoyer</Button>
        </CardBody></Card>
      )}
    </div>
  )
}
