import { useTranslation } from 'react-i18next'
import { Award } from 'lucide-react'
import { acknowledgeBulletin, useFamilyGrades, useFamilyMutation } from '@schoolos/api-client'
import { Badge, Button, Card, CardBody, CardHeader, StatCard, toast } from '@schoolos/ui'
import { MockNotice, QueryState, ScreenLoading } from '../../components/Screen'
import { FamilyPage, RecordsRestricted, formatDay } from '../components'
import { useFamily } from '../context'

/** G6 — published grades and bulletins. Records restrictions hide both. */
export function FamilyGradesPage() {
  const { t } = useTranslation()
  const { selected, recordsRestricted } = useFamily()
  const query = useFamilyGrades(selected?.id)
  const acknowledge = useFamilyMutation(acknowledgeBulletin)
  const data = query.data?.data

  const ack = async (id: string) => {
    try {
      await acknowledge.mutateAsync(id)
      toast.success(t('family.grades.acknowledged'))
    } catch {
      toast.error(t('family.action.failed'))
    }
  }

  return (
    <FamilyPage
      title={t('family.grades.title')}
      subtitle={selected?.className}
      actions={<MockNotice mock={query.data?.mock} compact />}
    >
      {recordsRestricted
        ? <RecordsRestricted />
        : (
          <QueryState isLoading={query.isLoading} error={query.error} onRetry={() => void query.refetch()} loading={<ScreenLoading variant="table" />}>
            {() => data && (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <StatCard label={t('family.grades.overall')} value={`${data.overall}/20`} icon={<Award className="h-4 w-4" />} />
                  {data.averages.slice(0, 2).map(average => (
                    <StatCard key={average.subject} label={average.subject} value={`${average.average}/20`}
                      hint={average.classAverage != null ? `${t('family.grades.classAverage')} ${average.classAverage}/20` : undefined} />
                  ))}
                </div>

                {!data.rankingEnabled && <p className="text-xs text-content-subtle">{t('family.grades.noRanking')}</p>}

                <div className="grid gap-5 lg:grid-cols-2">
                  <Card>
                    <CardHeader title={t('family.grades.evaluations')} />
                    <CardBody className="p-0">
                      {data.grades.length === 0
                        ? <p className="px-5 py-6 text-center text-sm text-content-muted">{t('family.grades.empty')}</p>
                        : (
                          <ul className="divide-y divide-line/60">
                            {data.grades.map(grade => (
                              <li key={grade.id} className="px-5 py-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-content">{grade.subject} · {grade.evaluation}</p>
                                    <p className="text-xs text-content-muted">
                                      {formatDay(grade.date)}
                                      {grade.classAverage != null ? ` · ${t('family.grades.classAverage')} ${grade.classAverage}/20` : ''}
                                      {` · coef. ${grade.coefficient}`}
                                    </p>
                                    {grade.teacherComment && <p className="mt-1 text-xs text-content-muted">{grade.teacherComment}</p>}
                                  </div>
                                  <span className="tnum shrink-0 text-sm font-semibold text-content">{grade.score}/{grade.outOf}</span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                    </CardBody>
                  </Card>

                  <Card>
                    <CardHeader title={t('family.grades.bulletins')} />
                    <CardBody className="p-0">
                      {data.bulletins.length === 0
                        ? <p className="px-5 py-6 text-center text-sm text-content-muted">{t('family.grades.empty')}</p>
                        : (
                          <ul className="divide-y divide-line/60">
                            {data.bulletins.map(bulletin => (
                              <li key={bulletin.id} className="px-5 py-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-sm font-medium text-content">{bulletin.period}</p>
                                  {bulletin.acknowledgedAt
                                    ? <Badge tone="success">{t('family.grades.acknowledged')}</Badge>
                                    : <Button size="sm" variant="outline" onClick={() => void ack(bulletin.id)} loading={acknowledge.isPending}>{t('family.grades.acknowledge')}</Button>}
                                </div>
                                <p className="mt-1 text-xs text-content-muted">{t('family.grades.publishedOn', { date: formatDay(bulletin.publishedAt) })} · {bulletin.fileName}</p>
                                <p className="mt-0.5 font-mono text-[0.6875rem] text-content-subtle">{t('family.hash')} : {bulletin.documentHash}</p>
                              </li>
                            ))}
                          </ul>
                        )}
                    </CardBody>
                  </Card>
                </div>
              </div>
            )}
          </QueryState>
        )}
    </FamilyPage>
  )
}
