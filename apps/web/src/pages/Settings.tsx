import { useTranslation } from 'react-i18next'
import { Monitor, Moon, Sun } from 'lucide-react'
import { Badge, Button, Card, CardBody, CardHeader, Select, Switch, Tabs, cn, toast } from '@schoolos/ui'
import { usePreferences, type Theme } from '../app/preferences'
import { useSession } from '../app/session'
import { PageHeader } from '../components/Screen'

export function SettingsPage() {
  const { t } = useTranslation()
  const { theme, setTheme, locale, setAppLocale, reduceMotion, setReduceMotion, highContrast, setHighContrast, largeText, setLargeText } = usePreferences()
  const { session, config, logout } = useSession()

  return (
    <div className="ui-page">
      <PageHeader title={t('settings.title')} subtitle={session.user?.name} breadcrumbs={[{ label: t('common.settings') }]} />
      <Card>
        <CardBody>
          <Tabs items={[
            { value: 'profile', label: t('settings.profile'), content: (
              <div className="grid max-w-xl gap-3 text-sm">
                <div className="flex justify-between border-b border-line py-2"><span className="text-content-subtle">{t('common.role')}</span><span className="font-medium text-content">{session.user?.roles?.[0] ?? '—'}</span></div>
                <div className="flex justify-between border-b border-line py-2"><span className="text-content-subtle">{t('common.school')}</span><span className="font-medium text-content">{session.user?.schoolId ?? '—'}</span></div>
                <div className="flex justify-between border-b border-line py-2"><span className="text-content-subtle">Session</span><Badge tone={session.authenticated ? 'success' : 'neutral'}>{session.authenticated ? t('common.online') : t('common.offline')}</Badge></div>
              </div>
            ) },
            { value: 'appearance', label: t('settings.appearance'), content: (
              <div className="max-w-xl space-y-5">
                <div>
                  <p className="mb-2 text-sm font-medium text-content">{t('common.theme')}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {([['light', Sun], ['dark', Moon], ['system', Monitor]] as [Theme, typeof Sun][]).map(([value, Icon]) => (
                      <Button key={value} variant="bare" onClick={() => setTheme(value)}
                        aria-pressed={theme === value}
                        className={cn('flex flex-col items-center gap-2 rounded-lg border p-4 text-sm',
                          theme === value ? 'border-brand-400 bg-brand-50 dark:bg-brand-500/10' : 'border-line')}>
                        <Icon className="h-5 w-5 text-brand-500" />{t(`settings.theme${value[0].toUpperCase()}${value.slice(1)}`)}
                      </Button>
                    ))}
                  </div>
                </div>
                <Switch checked={largeText} onCheckedChange={setLargeText} label={t('settings.fontSize')} description="17px" />
              </div>
            ) },
            { value: 'accessibility', label: t('settings.accessibility'), content: (
              <div className="max-w-xl space-y-4">
                <Switch checked={reduceMotion} onCheckedChange={setReduceMotion} label={t('settings.reduceMotion')} description={t('settings.accessibility')} />
                <Switch checked={highContrast} onCheckedChange={setHighContrast} label={t('settings.highContrast')} description={t('settings.accessibility')} />
              </div>
            ) },
            { value: 'language', label: t('settings.language'), content: (
              <div className="max-w-xl space-y-4">
                <p className="text-xs font-medium uppercase tracking-wide text-content-subtle">{t('common.language')}</p>
                <Select value={locale} onValueChange={v => setAppLocale(v as 'fr' | 'en')} options={config.locales.map(l => ({ value: l, label: l === 'fr' ? 'Français' : 'English' }))} />
                <p className="text-xs text-content-subtle">{config.timezone} · {config.version}</p>
              </div>
            ) },
            { value: 'notifications', label: t('settings.notifications'), content: (
              <div className="max-w-xl space-y-4">
                <Switch checked label="Email" description={t('common.notifications')} />
                <Switch checked={false} label="Push" description={t('common.notifications')} />
              </div>
            ) },
            { value: 'security', label: t('settings.security'), content: (
              <div className="max-w-xl space-y-4">
                <p className="text-sm text-content-muted">{t('auth.sessionExpiredBody')}</p>
                <Badge tone="brand">{config.authMode}</Badge>
                <div><Button variant="danger" onClick={() => void logout().then(() => window.location.assign('/login'))}>{t('common.logout')}</Button></div>
              </div>
            ) },
          ]} />
        </CardBody>
      </Card>
    </div>
  )
}
