import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { LifeBuoy, Mail, Phone } from 'lucide-react'
import { Button, Card, CardBody, CardHeader } from '@schoolos/ui'
import { FamilyPage } from '../components'
import { useFamily } from '../context'

/** G19 — help centre: FAQ, school contacts and emergency numbers. */
export function FamilyHelpPage() {
  const { t } = useTranslation()
  const { selected } = useFamily()
  const faq = [1, 2, 3, 4] as const

  return (
    <FamilyPage title={t('family.help.title')} childScoped={false}>
      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader title={t('family.help.faq')} />
          <CardBody className="divide-y divide-line/60 p-0">
            {faq.map(index => (
              <details key={index} className="group px-5 py-4">
                <summary className="cursor-pointer list-none text-sm font-medium text-content marker:hidden">
                  {t(`family.help.q${index}`)}
                </summary>
                <p className="mt-2 text-sm text-content-muted">{t(`family.help.a${index}`)}</p>
              </details>
            ))}
          </CardBody>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title={t('family.help.contacts')} action={<LifeBuoy className="h-4 w-4 text-content-subtle" />} />
            <CardBody className="space-y-2 text-sm">
              {selected?.schoolLifeContact ? (
                <>
                  <p className="font-medium text-content">{selected.schoolLifeContact.name}</p>
                  <p className="text-xs text-content-muted">{selected.schoolLifeContact.role}</p>
                  <p className="flex items-center gap-1 text-xs text-content-muted"><Mail className="h-3.5 w-3.5" />{selected.schoolLifeContact.email}</p>
                  {selected.schoolLifeContact.phone && <p className="flex items-center gap-1 text-xs text-content-muted"><Phone className="h-3.5 w-3.5" />{selected.schoolLifeContact.phone}</p>}
                </>
              ) : <p className="text-sm text-content-muted">{t('family.noChildrenHint')}</p>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t('family.help.emergencyNumbers')} />
            <CardBody className="space-y-1.5 text-sm text-content">
              <p>{t('family.help.119')}</p>
              <p>{t('family.help.3020')}</p>
              <p>{t('family.help.3018')}</p>
              <p>{t('family.help.112')}</p>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-3">
              <Button asChild variant="outline" className="w-full"><Link to="/family/concerns">{t('family.concerns.title')}</Link></Button>
              <Button asChild variant="outline" className="w-full"><Link to="/family/messages">{t('family.messages.title')}</Link></Button>
              <p className="text-xs text-content-subtle">{t('family.help.legal')}</p>
            </CardBody>
          </Card>
        </div>
      </div>
    </FamilyPage>
  )
}
