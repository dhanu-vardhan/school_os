import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Utensils, XCircle } from 'lucide-react'
import { cancelCanteenReservation, reserveCanteen, useFamilyCanteen, useFamilyMutation } from '@schoolos/api-client'
import { canteenCutoff } from '@schoolos/shared'
import { Badge, Banner, Button, Card, CardBody, CardHeader, toast } from '@schoolos/ui'
import { MockNotice, QueryState, ScreenLoading } from '../../components/Screen'
import { childName, FamilyPage, formatDay, SelectField } from '../components'
import { useFamily } from '../context'

/** G13 — canteen menus and reservations with a visible same-day cutoff. */
export function FamilyCanteenPage() {
  const { t } = useTranslation()
  const { children, childId, selected } = useFamily()
  const query = useFamilyCanteen(childId)
  const reserve = useFamilyMutation(reserveCanteen)
  const cancel = useFamilyMutation(cancelCanteenReservation)
  const [child, setChild] = useState(childId ?? children[0]?.id ?? '')

  const data = query.data?.data
  const commune = data?.mode === 'commune'
  const target = child || childId

  const doReserve = async (date: string) => {
    if (!target) return
    try {
      await reserve.mutateAsync({ childId: target, date })
      toast.success(t('family.canteen.reserved'))
    } catch {
      toast.error(t('family.canteen.cutoff'))
    }
  }

  const doCancel = async (id: string) => {
    try {
      await cancel.mutateAsync(id)
      toast.success(t('family.canteen.cancelled'))
    } catch {
      toast.error(t('family.canteen.cutoff'))
    }
  }

  return (
    <FamilyPage
      title={t('family.canteen.title')}
      subtitle={selected?.className}
      actions={<MockNotice mock={query.data?.mock} compact />}
    >
      <QueryState isLoading={query.isLoading} error={query.error} onRetry={() => void query.refetch()} loading={<ScreenLoading variant="cards" />}>
        {() => data && (
          <div className="space-y-5">
            {commune && <Banner tone="info" title={t('family.canteen.commune')}>{t('family.canteen.cutoff')}</Banner>}

            {!commune && (
              <Card>
                <CardBody className="flex flex-wrap items-end justify-between gap-3">
                  <div className="min-w-56 flex-1">
                    <SelectField label={t('family.childSwitcher')} value={child || childId}
                      onValueChange={setChild}
                      options={children.map(item => ({ value: item.id, label: `${item.firstName} · ${item.className}` }))} />
                  </div>
                  <p className="text-xs text-content-subtle">{t('family.canteen.cutoff')}</p>
                </CardBody>
              </Card>
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {data.menus.map(menu => {
                const cutoff = canteenCutoff(menu.day, new Date())
                const existing = data.reservations.find(item => item.date === menu.day && item.childId === target && item.status === 'reserved')
                return (
                  <Card key={menu.day}>
                    <CardHeader title={formatDay(menu.day)} action={<Utensils className="h-4 w-4 text-content-subtle" />} />
                    <CardBody className="space-y-2">
                      <p className="text-sm text-content">{menu.starter}</p>
                      <p className="text-sm font-medium text-content">{menu.main}</p>
                      <p className="text-sm text-content">{menu.side}</p>
                      <p className="text-sm text-content-muted">{menu.dessert}</p>
                      {menu.vegetarian && <Badge tone="success">Végétarien</Badge>}
                      {menu.allergens.length > 0 && (
                        <p className="text-xs text-warning-700 dark:text-warning-300">
                          {t('family.canteen.allergens')} : {menu.allergens.join(', ')}
                        </p>
                      )}
                      {!commune && (
                        existing
                          ? <Button size="sm" variant="ghost" onClick={() => void doCancel(existing.id)} loading={cancel.isPending}><XCircle className="h-4 w-4" />{t('family.canteen.cancel')}</Button>
                          : <Button size="sm" variant="outline" onClick={() => void doReserve(menu.day)} loading={reserve.isPending}
                              disabled={!target || !cutoff.open} disabledReason={!cutoff.open ? t('family.canteen.cutoff') : undefined}>
                              {t('family.canteen.reserve')}
                            </Button>
                      )}
                    </CardBody>
                  </Card>
                )
              })}
            </div>

            <Card>
              <CardHeader title={t('family.canteen.reservations')} />
              <CardBody className="p-0">
                {data.reservations.length === 0
                  ? <p className="px-5 py-6 text-center text-sm text-content-muted">{t('state.empty')}</p>
                  : (
                    <ul className="divide-y divide-line/60">
                      {data.reservations.map(reservation => (
                        <li key={reservation.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                          <div>
                            <p className="text-sm text-content">{formatDay(reservation.date)} · {childName(children.find(item => item.id === reservation.childId))}</p>
                            <p className="text-xs text-content-muted">{reservation.billed ? t('family.billing.invoices') : ''}</p>
                          </div>
                          <Badge tone={reservation.status === 'reserved' ? 'success' : reservation.status === 'absent' ? 'danger' : 'neutral'}>{reservation.status}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
              </CardBody>
            </Card>
            <p className="text-xs text-content-subtle">{t('family.canteen.allergens')} — {t('family.profile.privacyNotice')}</p>
          </div>
        )}
      </QueryState>
    </FamilyPage>
  )
}
