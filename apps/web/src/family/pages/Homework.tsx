import { useTranslation } from 'react-i18next'
import { CheckCheck, Paperclip } from 'lucide-react'
import { markHomeworkRead, useFamilyHomework, useFamilyMutation } from '@schoolos/api-client'
import { Badge, Button, Card, CardBody, CardHeader, toast } from '@schoolos/ui'
import { MockNotice, QueryState, ScreenLoading } from '../../components/Screen'
import { childName, FamilyPage, formatDay } from '../components'
import { useFamily } from '../context'

/** G5 — homework / cahier de textes with a per-guardian read marker. */
export function FamilyHomeworkPage() {
  const { t } = useTranslation()
  const { children, childId, selected, today } = useFamily()
  const query = useFamilyHomework(childId)
  const read = useFamilyMutation(markHomeworkRead)
  const items = [...(query.data?.data ?? [])].sort((a, b) => a.dueAt.localeCompare(b.dueAt))

  const markRead = async (id: string) => {
    try {
      await read.mutateAsync(id)
    } catch {
      toast.error(t('family.action.failed'))
    }
  }

  return (
    <FamilyPage
      title={t('family.homework.title')}
      subtitle={selected?.className}
      actions={<MockNotice mock={query.data?.mock} compact />}
    >
      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        isEmpty={items.length === 0}
        empty={<Card><CardBody><p className="text-sm text-content-muted">{t('family.homework.empty')}</p></CardBody></Card>}
        loading={<ScreenLoading variant="list" />}
      >
        <div className="space-y-4">
          {items.map(item => {
            const overdue = item.dueAt < today
            return (
              <Card key={item.id}>
                <CardHeader
                  title={<span className="flex flex-wrap items-center gap-2">{item.title}{item.readAt && <Badge tone="success">{t('family.homework.read')}</Badge>}</span>}
                  description={`${childName(children.find(child => child.id === item.childId))} · ${item.subject} · ${item.teacher}`}
                  action={<Badge tone={overdue ? 'danger' : 'neutral'}>{overdue ? t('family.homework.overdue') : t('family.homework.due', { date: formatDay(item.dueAt) })}</Badge>}
                />
                <CardBody className="space-y-3">
                  <p className="text-sm text-content">{item.description}</p>
                  {item.attachments.length > 0 && (
                    <ul className="flex flex-wrap gap-2">
                      {item.attachments.map(attachment => (
                        <li key={attachment.id}>
                          <Badge tone="info"><Paperclip className="mr-1 inline h-3 w-3" />{attachment.name}{attachment.sizeLabel ? ` · ${attachment.sizeLabel}` : ''}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                  {!item.readAt && (
                    <Button size="sm" variant="outline" onClick={() => void markRead(item.id)} loading={read.isPending}>
                      <CheckCheck className="h-4 w-4" />{t('family.homework.markRead')}
                    </Button>
                  )}
                </CardBody>
              </Card>
            )
          })}
        </div>
      </QueryState>
    </FamilyPage>
  )
}
