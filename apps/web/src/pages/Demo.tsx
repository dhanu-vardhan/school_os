import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'
import { Button, Card, CardBody, CardHeader, Stepper } from '@schoolos/ui'
import { PageHeader } from '../components/Screen'

const steps = [
  { title: 'demo.step1', body: 'demo.step1Body', to: '/app/dashboard' },
  { title: 'demo.step2', body: 'demo.step2Body', to: '/app/people/students' },
  { title: 'demo.step3', body: 'demo.step3Body', to: '/app/activities' },
  { title: 'demo.step4', body: 'demo.step4Body', to: '/app/ai/suggestions' },
]

export function DemoPage() {
  const { t } = useTranslation()
  const [current, setCurrent] = useState(0)
  const step = steps[current]
  return (
    <div className="mx-auto max-w-3xl py-8">
      <PageHeader title={t('demo.title')} subtitle={t('demo.subtitle')} />
      <Card className="mb-5 p-5"><Stepper steps={steps.map(s => ({ title: t(s.title) }))} current={current} onStepClick={setCurrent} /></Card>
      <Card>
        <CardHeader title={t(step.title)} description={t('demo.step', { current: current + 1, total: steps.length })} />
        <CardBody>
          <div className="flex min-h-40 items-center gap-4 rounded-lg bg-gradient-to-br from-brand-50 to-accent-50 p-6 dark:from-brand-500/10 dark:to-accent-500/10">
            <Sparkles className="h-8 w-8 shrink-0 text-brand-500" />
            <p className="text-sm text-content-muted">{t(step.body)}</p>
          </div>
          <div className="mt-6 flex justify-between">
            <Button variant="outline" disabled={current === 0} onClick={() => setCurrent(i => i - 1)}><ArrowLeft className="h-4 w-4" />{t('common.previous')}</Button>
            {current < steps.length - 1
              ? <Button onClick={() => setCurrent(i => i + 1)}>{t('common.next')}<ArrowRight className="h-4 w-4" /></Button>
              : <Button asChild><Link to={step.to}>{t('demo.start')}</Link></Button>}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
