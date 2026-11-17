import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2 } from 'lucide-react'
import {
  Avatar, Badge, Button, Card, CardBody, CardHeader, SegmentedControl, Select, toast,
} from '@schoolos/ui'
import { useAttendance, useClasses, useSaveAttendance, useStudents } from '@schoolos/api-client'
import type { AttendanceStatus } from '@schoolos/shared'
import { useUnsavedGuard } from '../app/navigation-guard'
import { MockNotice, OfflineNotice, PageHeader, QueryState, ScreenLoading } from '../components/Screen'

const STATUSES: AttendanceStatus[] = ['present', 'late', 'absent']

/** One screen to take daily attendance: smart class default, one primary Save, dirty guard. */
export function AttendancePage() {
  const { t } = useTranslation()
  const studentsQ = useStudents()
  const classesQ = useClasses()
  const attendanceQ = useAttendance()
  const save = useSaveAttendance()
  const [classId, setClassId] = useState('')
  const [draft, setDraft] = useState<Record<string, AttendanceStatus>>({})
  const seeded = useRef<Set<string>>(new Set())

  const classes = classesQ.data?.data ?? []
  const students = studentsQ.data?.data ?? []
  const records = attendanceQ.data?.data ?? []
  const today = new Date().toISOString().slice(0, 10)
  const isLoading = studentsQ.isLoading || classesQ.isLoading || attendanceQ.isLoading
  const error = studentsQ.error ?? classesQ.error ?? attendanceQ.error
  const classStudents = students.filter(s => !classId || s.classId === classId)

  // Smart default: select the first class as soon as the catalogue resolves.
  useEffect(() => { if (!classId && classes.length) setClassId(classes[0].id) }, [classes, classId])

  // Seed the draft once per class from today's saved marks.
  useEffect(() => {
    if (!classId || !records.length || seeded.current.has(classId)) return
    seeded.current.add(classId)
    const next: Record<string, AttendanceStatus> = {}
    for (const student of classStudents) {
      const mark = records.find(r => r.studentId === student.id && r.date === today)
      if (mark) next[student.id] = mark.status
    }
    if (Object.keys(next).length) setDraft(previous => ({ ...next, ...previous }))
  }, [classId, records, classStudents, today])

  const dirty = classStudents.some(student => {
    const saved = records.find(r => r.studentId === student.id && r.date === today)?.status ?? 'present'
    return (draft[student.id] ?? saved) !== saved
  })
  const discard = useCallback(() => setDraft({}), [])
  useUnsavedGuard(dirty, discard)

  const saveMarks = async () => {
    const marks = classStudents.map(student => ({
      studentId: student.id,
      classId: student.classId ?? '',
      date: today,
      status: draft[student.id] ?? 'present',
    }))
    try {
      await save.mutateAsync(marks)
      toast.success(t('attendance.saved'))
    } catch { toast.error(t('state.error')) }
  }

  const statusOptions = STATUSES.map(status => ({
    value: status,
    label: t(`attendance.status.${status}`),
  }))

  return (
    <div className="ui-page">
      <OfflineNotice />
      <PageHeader
        title={t('attendance.title')}
        subtitle={t('attendance.subtitle', { date: new Intl.DateTimeFormat().format(new Date()) })}
        actions={<>
          <MockNotice mock={attendanceQ.data?.mock} compact />
          <Button onClick={() => void saveMarks()} disabled={!dirty || save.isPending} loading={save.isPending}>
            <CheckCircle2 className="h-4 w-4" />{t('attendance.save')}
          </Button>
        </>}
        breadcrumbs={[{ label: t('nav.group.people') }, { label: t('nav.attendance') }]}
      />
      <QueryState isLoading={isLoading} error={error} onRetry={() => void attendanceQ.refetch()}
        isEmpty={classStudents.length === 0} loading={<ScreenLoading variant="table" />}>{() => (
        <Card>
          <CardHeader title={t('attendance.title')} action={
            <div className="flex items-center gap-2">
              <Badge tone={dirty ? 'warning' : 'success'}>{dirty ? t('attendance.unsaved') : t('attendance.synced')}</Badge>
              <Select ariaLabel={t('attendance.class')} value={classId} onValueChange={setClassId}
                options={classes.map(c => ({ value: c.id, label: c.name }))} className="w-48" />
            </div>
          } />
          <CardBody className="divide-y divide-line/70 p-0">
            {classStudents.map(student => {
              const saved = records.find(r => r.studentId === student.id && r.date === today)?.status ?? 'present'
              const value = draft[student.id] ?? saved
              return (
                <div key={student.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={`${student.firstName} ${student.lastName}`} size="sm" />
                    <p className="truncate text-sm font-medium text-content">{student.firstName} {student.lastName}</p>
                  </div>
                  <SegmentedControl value={value} onValueChange={next => setDraft(previous => ({ ...previous, [student.id]: next as AttendanceStatus }))}
                    options={statusOptions} label={`${t('attendance.markFor')} ${student.firstName} ${student.lastName}`} />
                </div>
              )
            })}
          </CardBody>
        </Card>
      )}</QueryState>
    </div>
  )
}
