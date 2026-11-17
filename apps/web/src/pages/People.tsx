import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft, BadgeCheck, BookOpen, Eye, FileText, History, Mail, Pencil, Plus, ShieldCheck, UsersRound,
} from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Avatar, Badge, Button, Card, CardBody, CardHeader, DataTable, FormField, Input, RowActions,
  Select, StatCard, Stepper, SwipeActions, Tabs, Timeline, toast, type DropdownMenuItem,
} from '@schoolos/ui'
import {
  useClasses, useCreateStudent, useGuardians, useMembers, useStaff, useStudent, useStudents,
  useUpdateStudent,
} from '@schoolos/api-client'
import { DISPLAY_ROLES, ROLE_ACCENT, ROLE_FAMILY, permissionsFor, type DisplayRole } from '@schoolos/shared'
import { formatDate } from '@schoolos/i18n'
import { MockNotice, OfflineNotice, PageHeader, QueryState, ScreenEmpty, ScreenError } from '../components/Screen'

const studentSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  birthDate: z.string().min(1, 'Required'),
  ineNumber: z.string().optional(),
  classId: z.string().min(1, 'Required'),
  languagesSpoken: z.string().optional(),
})
type StudentForm = z.infer<typeof studentSchema>

export function StudentsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const students = useStudents()
  const classes = useClasses()
  const classById = useMemo(() => new Map(classes.data?.data?.map(c => [c.id, c]) ?? []), [classes.data])

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      id: 'name', header: t('students.col.name'),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar name={`${row.original.firstName} ${row.original.lastName}`} size="sm" />
          <div className="min-w-0"><p className="truncate font-medium text-content">{row.original.firstName} {row.original.lastName}</p><p className="truncate text-xs text-content-subtle">{row.original.ineNumber}</p></div>
        </div>
      ),
    },
    { accessorKey: 'classId', header: t('students.col.class'), cell: ({ getValue }) => classById.get(getValue<string>())?.name ?? getValue<string>() },
    { accessorKey: 'birthDate', header: t('students.col.birth'), cell: ({ getValue }) => formatDate(getValue<string>()) },
    { accessorKey: 'languagesSpoken', header: t('students.col.languages') },
    { id: 'status', header: t('students.col.status'), cell: () => <Badge tone="success" dot>Active</Badge> },
    {
      id: 'actions', header: t('action.actions'), enableSorting: false, enableHiding: false, size: 96,
      cell: ({ row }) => {
        const items: DropdownMenuItem[] = [
          { label: t('action.view'), icon: <Eye className="h-4 w-4" aria-hidden />, onSelect: () => navigate(`/app/people/students/${row.original.id}`) },
          { label: t('action.edit'), icon: <Pencil className="h-4 w-4" aria-hidden />, onSelect: () => navigate(`/app/people/students/${row.original.id}/edit`) },
          { label: t('quick.messageParent'), icon: <Mail className="h-4 w-4" aria-hidden />, onSelect: () => navigate('/app/communication/messages') },
        ]
        return <RowActions items={items} label={`${t('action.actions')} ${row.original.firstName} ${row.original.lastName}`} />
      },
    },
  ], [t, classById, navigate])

  return (
    <div className="ui-page">
      <OfflineNotice />
      <PageHeader
        title={t('students.title')}
        subtitle={t('students.subtitle', { count: students.data?.data?.length ?? 0, year: '2026–2027' })}
        actions={<><MockNotice mock={students.data?.mock} compact /><Button asChild><Link to="/app/people/students/new"><Plus className="h-4 w-4" />{t('students.new')}</Link></Button></>}
        breadcrumbs={[{ label: t('nav.group.people') }, { label: t('nav.students') }]}
      />
      <QueryState isLoading={students.isLoading} error={students.error} onRetry={() => void students.refetch()} isEmpty={students.data?.data?.length === 0}>{() => (<>
        <DataTable
          data={students.data?.data ?? []}
          columns={columns}
          getRowId={row => row.id}
          searchPlaceholder={t('students.searchPlaceholder')}
          onRowClick={row => navigate(`/app/people/students/${row.id}`)}
          rowAriaLabel={row => `${row.firstName} ${row.lastName}`}
          bulkActions={[
            { label: t('action.exportCsv'), onAction: () => toast.info(t('common.mockHint')) },
            { label: t('quick.messageParent'), onAction: () => navigate('/app/communication/messages') },
          ]}
          emptyTitle={t('state.empty')}
          mobileCard={row => (
            <SwipeActions
              label={`${row.firstName} ${row.lastName}`}
              actions={[
                { label: t('action.view'), icon: <Eye className="h-4 w-4" aria-hidden />, tone: 'primary', onAction: () => navigate(`/app/people/students/${row.id}`) },
                { label: t('quick.messageParent'), icon: <Mail className="h-4 w-4" aria-hidden />, onAction: () => navigate('/app/communication/messages') },
              ]}
            >
              <div className="ui-card flex items-center gap-3 p-3 pr-10">
                <Avatar name={`${row.firstName} ${row.lastName}`} size="sm" />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-content">{row.firstName} {row.lastName}</p><p className="text-xs text-content-subtle">{classById.get(row.classId)?.name ?? row.classId}</p></div>
              </div>
            </SwipeActions>
          )}
        />
      </>)}</QueryState>
    </div>
  )
}

const profileTabs = ['overview', 'guardians', 'classes', 'activities', 'documents', 'notes', 'history'] as const

export function StudentProfilePage() {
  const { t } = useTranslation()
  const { id = '' } = useParams()
  const student = useStudent(id)
  const guardians = useGuardians()
  const classes = useClasses()
  const [tab, setTab] = useState<string>('overview')
  const s = student.data?.data

  if (student.isLoading) return <div className="ui-card p-6"><div className="ui-skeleton h-40 rounded-lg" /></div>
  if (student.isError || !s) return <ScreenError error={student.error} onRetry={() => void student.refetch()} />

  const cls = classes.data?.data?.find(c => c.id === s.classId)

  return (
    <div className="ui-page">
      <OfflineNotice />
      <PageHeader
        title={`${s.firstName} ${s.lastName}`}
        subtitle={`${t('students.col.ine')} ${s.ineNumber ?? '—'} · ${t('students.col.birth')} ${formatDate(s.birthDate ?? '')}`}
        breadcrumbs={[{ label: t('nav.students'), to: '/app/people/students' }, { label: `${s.firstName} ${s.lastName}` }]}
        actions={<><MockNotice mock={student.data?.mock} compact /><Button asChild variant="outline"><Link to={`/app/people/students/${id}/edit`}><Pencil className="h-4 w-4" />{t('common.edit')}</Link></Button></>}
      />
      <div className="grid gap-5 lg:grid-cols-4">
        <Card className="lg:col-span-1">
          <CardBody className="text-center">
            <Avatar name={`${s.firstName} ${s.lastName}`} size="lg" className="mx-auto" />
            <p className="mt-3 font-display text-lg font-semibold text-content">{s.firstName} {s.lastName}</p>
            <p className="text-sm text-content-muted">{cls?.name ?? s.classId}</p>
            <div className="mt-4 flex justify-center gap-2"><Badge tone="success">{t('platform.operational')}</Badge><Badge tone="neutral">v{s.version ?? 1}</Badge></div>
            <div className="mt-6 space-y-3 text-left text-sm">
              <div className="flex justify-between"><span className="text-content-subtle">{t('students.col.enrolment')}</span><span className="text-content">{formatDate(s.enrolmentDate ?? '')}</span></div>
              <div className="flex justify-between"><span className="text-content-subtle">{t('students.col.languages')}</span><span className="text-content">{s.languagesSpoken ?? '—'}</span></div>
            </div>
          </CardBody>
        </Card>
        <div className="lg:col-span-3">
          <Card>
            <CardBody>
              <Tabs value={tab} onValueChange={setTab} items={profileTabs.map(key => ({
                value: key,
                label: t(`students.detail.${key}`),
                content: (
                  <div className="min-h-64">
                    {key === 'overview' && (
                      <div className="grid gap-4 sm:grid-cols-3">
                        <StatCard label={t('dash.attendanceRate')} value="96%" tone="accent" />
                        <StatCard label={t('activities.title')} value={2} tone="brand" />
                        <StatCard label={t('dash.tasks')} value={1} tone="warning" />
                      </div>
                    )}
                    {key === 'guardians' && (
                      <div className="space-y-3">
                        {guardians.data?.data?.filter(g => g.studentIds.includes(s.id)).map(g => (
                          <div key={g.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-4">
                            <div><p className="font-medium text-content">{g.name}</p><p className="text-xs text-content-muted">{g.relation} · {g.email}</p></div>
                            <Badge tone={g.pickupAuthorised ? 'success' : 'warning'}>{g.pickupAuthorised ? t('common.yes') : t('common.no')}</Badge>
                          </div>
                        )) ?? <ScreenEmpty />}
                      </div>
                    )}
                    {key === 'classes' && <div className="rounded-lg border border-line p-4"><p className="font-medium text-content">{cls?.name}</p><p className="text-sm text-content-muted">{cls?.teacher} · {cls?.room}</p></div>}
                    {key === 'activities' && <div className="grid gap-3 sm:grid-cols-2"><Badge tone="brand">Échecs — CP/CE1</Badge><Badge tone="info">Arts plastiques</Badge></div>}
                    {key === 'documents' && <div className="flex items-center gap-3 rounded-lg border border-line p-4"><FileText className="h-5 w-5 text-brand-500" /><span className="text-sm text-content">Autorisation sortie musée · {t('common.status')}</span><Badge tone="warning">{t('common.status')}</Badge></div>}
                    {key === 'notes' && <Timeline items={[{ id: 'n1', title: t('dash.recentNotes'), description: 'Participation active en lecture.', time: formatDate('2026-11-10') }]} />}
                    {key === 'history' && <Timeline items={[{ id: 'a1', title: 'STUDENT_CREATED', time: formatDate(s.enrolmentDate ?? '') }, { id: 'a2', title: 'STUDENT_UPDATED', time: formatDate('2026-11-01') }]} />}
                  </div>
                ),
              }))}
            />
          </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}

export function StudentWizardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const editing = Boolean(id)
  const student = useStudent(id ?? '', editing)
  const classes = useClasses()
  const create = useCreateStudent()
  const update = useUpdateStudent()
  const [step, setStep] = useState(0)

  const form = useForm<StudentForm>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      firstName: student.data?.data?.firstName ?? '',
      lastName: student.data?.data?.lastName ?? '',
      birthDate: student.data?.data?.birthDate ?? '',
      ineNumber: student.data?.data?.ineNumber ?? '',
      classId: student.data?.data?.classId ?? '',
      languagesSpoken: student.data?.data?.languagesSpoken ?? '',
    },
  })

  const submit = async (values: StudentForm) => {
    try {
      if (editing) await update.mutateAsync({ id: id!, input: values })
      else await create.mutateAsync(values)
      toast.success(t('common.save'))
      navigate('/app/people/students')
    } catch { toast.error(t('state.error')) }
  }

  if (editing && student.isLoading) return <div className="ui-card p-6"><div className="ui-skeleton h-40 rounded-lg" /></div>

  const steps = [t('students.wizard.identity'), t('students.wizard.school'), t('students.wizard.guardians'), t('students.wizard.review')]
  const values = form.watch()

  return (
    <div className="ui-page">
      <PageHeader title={editing ? t('students.wizard.editTitle') : t('students.wizard.title')}
        breadcrumbs={[{ label: t('nav.students'), to: '/app/people/students' }, { label: editing ? t('common.edit') : t('common.new') }]} />
      <Card className="mb-6 p-5"><Stepper steps={steps.map(title => ({ title }))} current={step} onStepClick={setStep} /></Card>
      <form onSubmit={form.handleSubmit(submit)}>
        <Card>
          <CardBody className="space-y-5">
            {step === 0 && (
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label={t('students.col.name')} error={form.formState.errors.firstName?.message} required>
                  {props => <Input {...props} {...form.register('firstName')} placeholder="Léa" />}
                </FormField>
                <FormField label={t('students.col.lastName')} error={form.formState.errors.lastName?.message} required>
                  {props => <Input {...props} {...form.register('lastName')} placeholder="Martin" />}
                </FormField>
                <FormField label={t('students.col.birth')} error={form.formState.errors.birthDate?.message} required>
                  {props => <Input {...props} type="date" {...form.register('birthDate')} />}
                </FormField>
                <FormField label={t('students.col.ine')} hint={t('common.optional')}>
                  {props => <Input {...props} {...form.register('ineNumber')} />}
                </FormField>
              </div>
            )}
            {step === 1 && (
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label={t('students.col.class')} error={form.formState.errors.classId?.message} required>
                  {() => <Select value={values.classId} onValueChange={v => form.setValue('classId', v)}
                    options={(classes.data?.data ?? []).map(c => ({ value: c.id, label: c.name }))} placeholder={t('students.col.class')} />}
                </FormField>
                <FormField label={t('students.col.languages')} hint={t('common.optional')}>
                  {props => <Input {...props} {...form.register('languagesSpoken')} />}
                </FormField>
              </div>
            )}
            {step === 2 && (
              <div className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-content-muted">
                <UsersRound className="mx-auto mb-2 h-6 w-6 text-brand-400" />{t('students.detail.guardians')} — {t('common.optional')}
              </div>
            )}
            {step === 3 && (
              <div className="space-y-2 text-sm">
                <p><span className="text-content-subtle">{t('students.col.name')} : </span><span className="font-medium text-content">{values.firstName} {values.lastName}</span></p>
                <p><span className="text-content-subtle">{t('students.col.class')} : </span><span className="font-medium text-content">{classes.data?.data?.find(c => c.id === values.classId)?.name ?? values.classId}</span></p>
              </div>
            )}
          </CardBody>
          <div className="flex items-center justify-between border-t border-line px-5 py-4">
            <Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep(s => s - 1)}><ArrowLeft className="h-4 w-4" />{t('common.previous')}</Button>
            {step < steps.length - 1
              ? <Button type="button" onClick={() => void form.trigger(step === 0 ? ['firstName', 'lastName', 'birthDate'] : ['classId']).then(ok => ok && setStep(s => s + 1))}>{t('common.next')}</Button>
              : <Button type="submit" loading={create.isPending || update.isPending}><BadgeCheck className="h-4 w-4" />{t('common.save')}</Button>}
          </div>
        </Card>
      </form>
    </div>
  )
}

export function GuardiansPage() {
  const { t } = useTranslation()
  const guardians = useGuardians()
  return (
    <div className="ui-page">
      <OfflineNotice />
      <PageHeader title={t('nav.guardians')} actions={<MockNotice mock={guardians.data?.mock} compact />} breadcrumbs={[{ label: t('nav.group.people') }, { label: t('nav.guardians') }]} />
      <QueryState isLoading={guardians.isLoading} error={guardians.error} onRetry={() => void guardians.refetch()} isEmpty={guardians.data?.data?.length === 0}>{() => (<>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {guardians.data!.data.map(g => (
            <Card key={g.id} className="p-5">
              <div className="flex items-center gap-3"><Avatar name={g.name} /><div className="min-w-0"><p className="truncate font-semibold text-content">{g.name}</p><p className="text-xs text-content-muted">{g.relation}</p></div></div>
              <div className="mt-4 space-y-1.5 text-sm text-content-muted"><p>{g.email}</p><p>{g.phone}</p></div>
              <div className="mt-4 flex items-center justify-between border-t border-line pt-3"><Badge tone="neutral">{g.studentIds.length} {t('dash.myChildren').toLowerCase()}</Badge><Badge tone={g.pickupAuthorised ? 'success' : 'warning'}>{g.pickupAuthorised ? t('common.yes') : t('common.no')}</Badge></div>
            </Card>
          ))}
        </div>
      </>)}</QueryState>
    </div>
  )
}

export function StaffPage() {
  const { t } = useTranslation()
  const staff = useStaff()
  return (
    <div className="ui-page">
      <OfflineNotice />
      <PageHeader title={t('nav.staff')} actions={<MockNotice mock={staff.data?.mock} compact />} breadcrumbs={[{ label: t('nav.group.people') }, { label: t('nav.staff') }]} />
      <QueryState isLoading={staff.isLoading} error={staff.error} onRetry={() => void staff.refetch()}>{() => (<>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {staff.data!.data.map(person => (
            <div key={person.sub} className="ui-card flex items-center gap-3 p-4"><Avatar name={person.name} /><div className="min-w-0 flex-1"><p className="truncate font-medium text-content">{person.name}</p><p className="truncate text-xs text-content-subtle">{person.email}</p></div><Badge tone="brand">{t(`role.${person.role}`)}</Badge></div>
          ))}
        </div>
      </>)}</QueryState>
    </div>
  )
}

export function RolesPage() {
  const { t } = useTranslation()
  const perms = ['students.read', 'students.write', 'school.settings', 'safeguarding.read', 'ai.use', 'billing.read', 'reports.read', 'platform.admin']
  return (
    <div className="ui-page">
      <PageHeader title={t('nav.roles')} subtitle={t('auth.forbiddenBody')} breadcrumbs={[{ label: t('nav.group.people') }, { label: t('nav.roles') }]} />
      <div className="ui-scroll ui-card overflow-x-auto">
        <table className="w-full min-w-[800px] border-collapse text-sm">
          <thead><tr className="border-b border-line text-left text-xs uppercase text-content-subtle"><th className="p-3">{t('common.role')}</th>{perms.map(p => <th key={p} className="p-3 font-medium">{p}</th>)}</tr></thead>
          <tbody>
            {DISPLAY_ROLES.map(role => {
              const allowed = permissionsFor(role)
              return (
                <tr key={role} className="border-b border-line/70 last:border-0">
                  <td className="p-3"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: `rgb(var(--role-${ROLE_ACCENT[role as DisplayRole]}))` }} /><span className="font-medium text-content">{t(`role.${role}`)}</span><Badge tone="neutral">{ROLE_FAMILY[role as DisplayRole]}</Badge></div></td>
                  {perms.map(p => <td key={p} className="p-3">{(allowed as readonly string[]).includes(p) ? <BadgeCheck className="h-4 w-4 text-accent-600" /> : <span className="text-content-subtle">—</span>}</td>)}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function MembersPage() {
  const { t } = useTranslation()
  const members = useMembers()
  return (
    <div className="ui-page">
      <PageHeader title={t('school.members')} actions={<MockNotice mock={members.data?.mock} compact />} breadcrumbs={[{ label: t('nav.group.school') }, { label: t('nav.members') }]} />
      <QueryState isLoading={members.isLoading} error={members.error} onRetry={() => void members.refetch()}>{() => (<>
        <div className="grid gap-3 md:grid-cols-2">
          {members.data!.data.map(m => <div key={m.id} className="ui-card flex items-center gap-3 p-4"><Avatar name={m.name} size="sm" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-content">{m.name}</p><p className="truncate text-xs text-content-subtle">{m.userEmail}</p></div><Badge tone="brand">{t(`role.${m.role}`)}</Badge></div>)}
        </div>
      </>)}</QueryState>
    </div>
  )
}

export function InvitationsPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('teacher')
  return (
    <div className="ui-page">
      <PageHeader title={t('nav.invitations')} breadcrumbs={[{ label: t('nav.group.school') }, { label: t('nav.invitations') }]} />
      <Card className="max-w-xl p-5">
        <div className="space-y-4">
          <FormField label="Email" required>{props => <Input {...props} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="prenom.nom@ecole.fr" />}</FormField>
          <FormField label={t('common.role')} required>{() => <Select value={role} onValueChange={setRole} options={DISPLAY_ROLES.map(r => ({ value: r, label: t(`role.${r}`) }))} />}</FormField>
          <Button onClick={() => toast.success(t('school.inviteSent'))}><Plus className="h-4 w-4" />{t('school.invite')}</Button>
        </div>
      </Card>
    </div>
  )
}
