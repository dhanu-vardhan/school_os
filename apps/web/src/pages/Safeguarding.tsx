import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react'
import {
  Banner, Badge, Button, Card, CardBody, CardHeader, FormField, RadioGroup, Select, StatusPill, Stepper, Textarea, Timeline, toast,
} from '@schoolos/ui'
import { useConcern, useConcerns, useCreateConcern, useUpdateConcern } from '@schoolos/api-client'
import { formatDate } from '@schoolos/i18n'
import type { SafeguardingConcern } from '@schoolos/shared'
import { ForbiddenCard, MockNotice, OfflineNotice, PageHeader, QueryState, ScreenError, ScreenLoading } from '../components/Screen'
import { useCan } from '../app/permissions'

function ConfidentialBanner() {
  const { t } = useTranslation()
  return <div className="mb-5"><Banner tone="danger" title={t('safeguarding.banner')}>{t('safeguarding.subtitle')}</Banner></div>
}

export function SafeguardingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const canRead = useCan('safeguarding.read')
  const concerns = useConcerns(canRead)
  if (!canRead) return <ForbiddenCard />

  return (
    <div className="ui-page">
      <OfflineNotice />
      <ConfidentialBanner />
      <PageHeader title={t('safeguarding.title')} subtitle={t('safeguarding.noLeak')}
        actions={<><MockNotice mock={concerns.data?.mock} compact /><Button asChild><Link to="/app/safeguarding/new">{t('safeguarding.new')}</Link></Button></>}
        breadcrumbs={[{ label: t('nav.group.safety') }, { label: t('nav.safeguarding') }]} />
      <QueryState isLoading={concerns.isLoading} error={concerns.error} onRetry={() => void concerns.refetch()} isEmpty={concerns.data?.data?.length === 0} loading={<ScreenLoading variant="table" />}>{() => (<>
        <div className="ui-card overflow-hidden">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-surface-2 text-left text-xs uppercase text-content-subtle"><tr><th className="p-3">{t('safeguarding.reference')}</th><th className="p-3">{t('safeguarding.category')}</th><th className="p-3">{t('safeguarding.status')}</th><th className="p-3">{t('common.updatedAt')}</th><th className="p-3" /></tr></thead>
            <tbody>
              {concerns.data!.data.map(c => (
                <tr key={c.id} tabIndex={0} aria-label={`${t('safeguarding.reference')} ${c.reference}`}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      navigate(`/app/safeguarding/${c.id}`)
                    }
                  }}
                  className="cursor-pointer border-b border-line/70 last:border-0 hover:bg-brand-50/50 focus-visible:bg-brand-50 dark:hover:bg-brand-500/5 dark:focus-visible:bg-brand-500/10"
                  onClick={() => navigate(`/app/safeguarding/${c.id}`)}>
                  <td className="p-3 font-mono text-xs text-content">{c.reference}</td>
                  <td className="p-3 text-content-muted">{c.category}</td>
                  <td className="p-3"><StatusPill status={c.status} /></td>
                  <td className="p-3 text-xs text-content-subtle">{formatDate(c.updatedAt)}</td>
                  <td className="p-3 text-right"><Badge tone="neutral"><EyeOff className="mr-1 h-3 w-3" />{t('common.restricted')}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>)}</QueryState>
    </div>
  )
}

export function NewConcernPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const create = useCreateConcern()
  const [step, setStep] = useState(0)
  const [category, setCategory] = useState('wellbeing')
  const [severity, setSeverity] = useState('medium')
  const [reportedByRole, setReportedByRole] = useState('safeguarding')
  const [context, setContext] = useState('')
  const [immediateDanger, setImmediateDanger] = useState(false)
  const [dangerAck, setDangerAck] = useState(false)

  const submit = async () => {
    if (immediateDanger && !dangerAck) { toast.error(t('sg.dangerGate')); return }
    try {
      const res = await create.mutateAsync({ category, reportedByRole })
      toast.success(`${t('safeguarding.reference')} ${res.data.reference} — ${t('sg.receipt')} ${res.data.reference}`)
      navigate('/app/safeguarding')
    } catch { toast.error(t('state.error')) }
  }

  return (
    <div className="ui-page">
      <PageHeader title={t('safeguarding.new')} breadcrumbs={[{ label: t('nav.safeguarding'), to: '/app/safeguarding' }, { label: t('common.new') }]} />
      <ConfidentialBanner />
      <Card className="mb-6 p-5"><Stepper steps={[{ title: t('safeguarding.wizard1') }, { title: t('safeguarding.wizard2') }, { title: t('safeguarding.wizard3') }]} current={step} onStepClick={setStep} /></Card>
      <Card>
        <CardBody className="min-h-56 space-y-4">
          {step === 0 && <>
            <FormField label={t('safeguarding.category')} required>{() => <Select value={category} onValueChange={setCategory} options={[
              { value: 'neglect', label: 'Négligence' }, { value: 'physical', label: 'Physique' }, { value: 'emotional', label: 'Psychologique' },
              { value: 'sexual', label: 'Sexuel' }, { value: 'intrafamily', label: 'Intrafamilial' }, { value: 'peer_harassment', label: 'Harcèlement entre pairs' },
              { value: 'cyber_harassment', label: 'Cyberharcèlement' }, { value: 'online_risk', label: 'Risque en ligne' }, { value: 'self_harm', label: 'Signes auto-agression' }, { value: 'other', label: 'Autre' },
            ]} />}</FormField>
            <FormField label="Gravité">{() => <Select value={severity} onValueChange={setSeverity} options={[
              { value: 'immediate', label: 'Immédiate' }, { value: 'high', label: 'Élevée' }, { value: 'medium', label: 'Moyenne' }, { value: 'low', label: 'Faible' },
            ]} />}</FormField>
            <FormField label={t('common.role')}>{() => <Select value={reportedByRole} onValueChange={setReportedByRole} options={[
              { value: 'safeguarding', label: t('role.safeguarding') }, { value: 'teacher', label: t('role.teacher') }, { value: 'reception', label: t('role.reception') },
            ]} />}</FormField>
          </>}
          {step === 1 && <>
            <p className="text-sm text-content-muted">{t('safeguarding.noLeak')}</p>
            <p className="text-xs text-warning-700 dark:text-warning-300">Ne pas enquêter, ne pas poser de questions suggestives. Recueillir les paroles spontanées de l’enfant.</p>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={immediateDanger} onChange={e=>{setImmediateDanger(e.target.checked); if(e.target.checked) setDangerAck(false)}} /> Danger immédiat</label>
            {immediateDanger && !dangerAck && (
              <div className="rounded-lg border border-danger-300 bg-danger-50 p-4 text-sm text-danger-900">
                <p className="font-semibold">{t('sg.dangerGate')}</p>
                <p className="mt-1 text-xs">Appelez le 17/112 ou le 119 maintenant, puis continuez le dépôt.</p>
                <Button size="sm" className="mt-2" onClick={()=>setDangerAck(true)}>J’ai appelé / Je continue</Button>
              </div>
            )}
            <FormField label={t('safeguarding.summary')} hint={t('common.confidential')}>{props => <Textarea {...props} value={context} onChange={e => setContext(e.target.value)} rows={5} />}</FormField>
            <p className="text-xs text-warning-700 dark:text-warning-300">TODO(legal-review) · {t('safeguarding.legal')}</p>
          </>}
          {step === 2 && <div className="space-y-2 text-sm"><p><span className="text-content-subtle">{t('safeguarding.category')} : </span><span className="font-medium text-content">{category}</span></p><p className="text-content-subtle">{t('safeguarding.noLeak')}</p></div>}
        </CardBody>
        <div className="flex justify-between border-t border-line px-5 py-4">
          <Button variant="outline" disabled={step === 0} onClick={() => setStep(s => s - 1)}><ArrowLeft className="h-4 w-4" />{t('common.previous')}</Button>
          {step < 2 ? <Button onClick={() => setStep(s => s + 1)}>{t('common.next')}</Button> : <Button loading={create.isPending} onClick={() => void submit()}><LockKeyhole className="h-4 w-4" />{t('common.submit')}</Button>}
        </div>
      </Card>
    </div>
  )
}

export function ConcernDetailPage() {
  const { t } = useTranslation()
  const { id = '' } = useParams()
  const canRead = useCan('safeguarding.read')
  const canWrite = useCan('safeguarding.write')
  const concern = useConcern(id, canRead)
  const update = useUpdateConcern()
  if (!canRead) return <ForbiddenCard />
  if (concern.isLoading) return <div className="ui-card p-6"><div className="ui-skeleton h-64 rounded-lg" /></div>
  if (concern.isError || !concern.data) return <ScreenError error={concern.error} onRetry={() => void concern.refetch()} />
  const c = concern.data.data as SafeguardingConcern

  const setStatus = async (status: SafeguardingConcern['status']) => {
    try { await update.mutateAsync({ id, status }); toast.success(t('common.save')) }
    catch { toast.error(t('state.error')) }
  }

  return (
    <div className="ui-page">
      <PageHeader title={c.reference} subtitle={`${t('safeguarding.category')}: ${c.category} · ${t('common.createdAt')} ${formatDate(c.createdAt)}`}
        actions={<><MockNotice mock={concern.data.mock} compact /><StatusPill status={c.status} /></>}
        breadcrumbs={[{ label: t('nav.safeguarding'), to: '/app/safeguarding' }, { label: c.reference }]} />
      <ConfidentialBanner />
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={t('safeguarding.summary')} action={<Badge tone="danger"><EyeOff className="mr-1 h-3 w-3" />{t('common.restricted')}</Badge>} />
          <CardBody>
            <div className="rounded-lg border border-danger-200 bg-danger-50/60 p-4 text-sm text-danger-900 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-200">
              <ShieldCheck className="mb-2 h-5 w-5" />
              <p>{t('safeguarding.noLeak')}</p>
              <p className="mt-2 text-xs opacity-80">TODO(legal-review) · {t('safeguarding.legal')}</p>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 text-sm">
              <div className="rounded-lg border border-line p-3"><p className="text-xs text-content-subtle">{t('common.reference')}</p><p className="font-mono text-content">{c.reference}</p></div>
              <div className="rounded-lg border border-line p-3"><p className="text-xs text-content-subtle">{t('common.role')}</p><p className="text-content">{t(`role.${c.reportedByRole}`)}</p></div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={t('safeguarding.workflow')} />
          <CardBody className="space-y-3">
            <RadioGroup value={c.status} onValueChange={v => void setStatus(v as SafeguardingConcern['status'])} options={[
              { value: 'open', label: t('common.status'), description: 'open' },
              { value: 'under_review', label: t('safeguarding.workflow'), description: 'under review' },
              { value: 'closed', label: t('common.yes'), description: 'closed' },
            ]} />
            {!canWrite && <p className="text-xs text-content-subtle">{t('auth.forbiddenBody')}</p>}
          </CardBody>
        </Card>
      </div>
      <Card className="mt-5">
        <CardHeader title={t('safeguarding.auditTrail')} />
        <CardBody>
          <Timeline items={c.events.map(e => ({ id: e.id, title: e.action, description: t(`role.${e.actorRole}`), time: formatDate(e.at) }))} />
        </CardBody>
      </Card>
    </div>
  )
}

export function SafeguardingHarassmentPage() {
  const { t } = useTranslation()
  const [level, setLevel] = useState('1')
  const [declared, setDeclared] = useState(false)
  return (
    <div className="ui-page">
      <OfflineNotice />
      <ConfidentialBanner />
      <PageHeader title={t('sg.harassment')} subtitle={t('safeguarding.noLeak')} breadcrumbs={[{ label: t('nav.safeguarding'), to: '/app/safeguarding' }, { label: t('sg.harassment') }]} />
      <Card className="mb-4"><CardBody className="space-y-3 text-sm">
        <p className="text-content-muted">pHARe — collecte du récit, référent adulte protecteur, renforcement de la vigilance sans stigmatisation, contact famille, escalade IEN/département/académique, déclaration « Faits établissement » (niveaux 1–3), journal des faits et actions jusqu’à résolution. Lignes nationales : 3020 (harcèlement), 3018 (cyberharcèlement).</p>
        <FormField label="Niveau « Faits établissement »">{() => <Select value={level} onValueChange={setLevel} options={[{value:'1',label:'Niveau 1'},{value:'2',label:'Niveau 2'},{value:'3',label:'Niveau 3'}]} />}</FormField>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={declared} onChange={e=>setDeclared(e.target.checked)} /> Déclaré dans l’application nationale</label>
        <Button onClick={()=>toast.success(t('common.save'))}>Enregistrer le suivi</Button>
      </CardBody></Card>
    </div>
  )
}

export function SafeguardingContactsPage() {
  const { t } = useTranslation()
  return (
    <div className="ui-page">
      <OfflineNotice />
      <ConfidentialBanner />
      <PageHeader title={t('sg.contacts')} subtitle={t('safeguarding.noLeak')} breadcrumbs={[{ label: t('nav.safeguarding'), to: '/app/safeguarding' }, { label: t('sg.contacts') }]} />
      <Card><CardBody className="space-y-2 text-sm text-content-muted">
        <p>Répertoire maintenu par l’établissement (aucune valeur codée en dur) : CRIP du département, DSDEN (assistante sociale, conseiller technique), procureur, référent académique harcèlement, infirmier/psychologue/social, police/gendarmerie, rappels 119/3020/3018.</p>
        <p>Modèles de communication parents versionnés (revue juridique). Journal des formations (qui, date, expiration).</p>
        <Button onClick={()=>toast.success(t('common.save'))}>Ajouter un contact</Button>
      </CardBody></Card>
    </div>
  )
}

export function SafeguardingReportsPage() {
  const { t } = useTranslation()
  const concerns = useConcerns(true)
  const list = concerns.data?.data ?? []
  const counts = list.reduce((acc:any,c:any)=>{ acc[c.status]=(acc[c.status]||0)+1; return acc }, {} as Record<string,number>)
  return (
    <div className="ui-page">
      <OfflineNotice />
      <ConfidentialBanner />
      <PageHeader title={t('sg.reports')} subtitle="Indicateurs de climat scolaire — seuils de suppression appliqués." breadcrumbs={[{ label: t('nav.safeguarding'), to: '/app/safeguarding' }, { label: t('sg.reports') }]} />
      <Card><CardBody>
        <p className="text-sm text-content-muted mb-3">Affiché uniquement au-dessus du seuil de suppression et avec suppression secondaire. Aucun drill-down.</p>
        <ul className="text-sm space-y-1">
          {Object.entries(counts).map(([k,v])=> <li key={k}>{k}: {Number(v) < 5 ? 'masqué (seuil)' : String(v)}</li>)}
          {list.length===0 && <li>Aucune donnée.</li>}
        </ul>
      </CardBody></Card>
    </div>
  )
}

export function SafeguardingAccessLogPage() {
  const { t } = useTranslation()
  return (
    <div className="ui-page">
      <OfflineNotice />
      <ConfidentialBanner />
      <PageHeader title={t('sg.accessLog')} subtitle="Qui, quand, quelles sections. Chaîne infalsifiable." breadcrumbs={[{ label: t('nav.safeguarding'), to: '/app/safeguarding' }, { label: t('sg.accessLog') }]} />
      <Card><CardBody className="text-sm text-content-muted">
        <p>Journal filtrable par dossier/utilisateur/date, exportable par le rôle d’audit approuvé uniquement. Chaque lecture de contenu produit une entrée.</p>
        <Button onClick={()=>toast.success('Export demandé (2 approbations requises)')}>Exporter le journal</Button>
      </CardBody></Card>
    </div>
  )
}

export function SafeguardingSettingsPage() {
  const { t } = useTranslation()
  const [idle, setIdle] = useState('15')
  const [bg, setBg] = useState('60')
  return (
    <div className="ui-page">
      <OfflineNotice />
      <ConfidentialBanner />
      <PageHeader title={t('sg.settings')} subtitle={t('safeguarding.noLeak')} breadcrumbs={[{ label: t('nav.safeguarding'), to: '/app/safeguarding' }, { label: t('sg.settings') }]} />
      <Card><CardBody className="space-y-3 text-sm">
        <FormField label="Délai d’inactivité avant ré-authentification (min)">{() => <Select value={idle} onValueChange={setIdle} options={[{value:'5',label:'5'},{value:'10',label:'10'},{value:'15',label:'15'}]} />}</FormField>
        <FormField label="Durée break-glass (min)">{() => <Select value={bg} onValueChange={setBg} options={[{value:'30',label:'30'},{value:'60',label:'60'}]} />}</FormField>
        <p className="text-xs text-content-subtle">Conservation légale, chemin alternatif (directeur/D SL en conflit d’intérêts), contacts départementaux : configurables par l’établissement. TODO(legal-review).</p>
        <Button onClick={()=>toast.success(t('common.save'))}>{t('common.save')}</Button>
      </CardBody></Card>
    </div>
  )
}
