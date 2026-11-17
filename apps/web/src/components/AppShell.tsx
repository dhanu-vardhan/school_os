import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Bell, ChevronDown, GraduationCap, Languages, LogOut, Menu, Moon,
  Search, Settings2, ShieldAlert, Sun, Monitor, X, GraduationCap as SchoolIcon,
} from 'lucide-react'
import {
  Avatar, Badge, Button, CommandPalette, DropdownMenu, IconButton, Tooltip, toast,
} from '@schoolos/ui'
import { SHOW_UI_KIT, listSchools, useNotifications } from '@schoolos/api-client'
import { useSession } from '../app/session'
import { usePreferences, type Theme } from '../app/preferences'
import { ALL_NAV_ITEMS, visibleNavGroups } from '../app/nav'
import { useOnline } from '../app/hooks'
import { MockNotice } from './Screen'

function SchoolSwitcher() {
  const { t } = useTranslation()
  const { role, schoolId, login } = useSession()
  const navigate = useNavigate()
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([])
  const current = schools.find(s => s.id === schoolId)

  useEffect(() => {
    let active = true
    listSchools().then(res => { if (active) setSchools(res.data) }).catch(() => setSchools([]))
    return () => { active = false }
  }, [])

  return (
    <DropdownMenu
      trigger={
        <Button variant="ghost" size="sm" className="max-w-56 gap-2">
          <span className="truncate">{current?.name ?? t('common.school')}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
        </Button>
      }
      items={schools.map(s => ({
        label: s.name,
        onSelect: async () => {
          if (!role || s.id === schoolId) return
          try { await login(role, s.id); toast.success(t('common.school') + ' · ' + s.name); navigate('/app/dashboard') }
          catch { toast.error(t('state.error')) }
        },
      }))}
    />
  )
}

function LanguageThemeControls() {
  const { t } = useTranslation()
  const { setAppLocale, theme, setTheme } = usePreferences()
  return (
    <>
      <DropdownMenu
        trigger={<IconButton variant="ghost" size="icon-sm" label={t('common.language')}><Languages className="h-4 w-4" /></IconButton>}
        items={[
          { label: 'Français', onSelect: () => setAppLocale('fr') },
          { label: 'English', onSelect: () => setAppLocale('en') },
        ]}
      />
      <DropdownMenu
        trigger={<IconButton variant="ghost" size="icon-sm" label={t('common.theme')}>
          {theme === 'light' ? <Sun className="h-4 w-4" /> : theme === 'dark' ? <Moon className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
        </IconButton>}
        items={(['light', 'dark', 'system'] as Theme[]).map(value => ({
          label: { light: t('settings.themeLight'), dark: t('settings.themeDark'), system: t('settings.themeSystem') }[value],
          onSelect: () => setTheme(value),
        }))}
      />
    </>
  )
}

function NotificationBell() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data, isLoading } = useNotifications()
  const unread = data?.data?.filter(n => !n.read).length ?? 0
  return (
    <Tooltip content={t('common.notifications')}>
      <IconButton variant="ghost" size="icon-sm" label={`${t('common.notifications')}${unread ? ` (${unread})` : ''}`} onClick={() => navigate('/app/notifications')}>
        <span className="relative">
          <Bell className="h-4 w-4" />
          {!isLoading && unread > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-600 px-1 text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
        </span>
      </IconButton>
    </Tooltip>
  )
}

export function AppShell() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { session, role, logout } = useSession()
  const online = useOnline()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const groups = useMemo(() => visibleNavGroups(role, SHOW_UI_KIT), [role])

  useEffect(() => { setSidebarOpen(false) }, [location.pathname])
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen(v => !v) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const commandItems = ALL_NAV_ITEMS
    .filter(item => (!item.devOnly || SHOW_UI_KIT) && (!item.permission || groups.some(g => g.items.includes(item))))
    .map(item => ({ id: item.to, label: t(item.labelKey), group: t('common.actions'), icon: <item.icon className="h-4 w-4" />, onSelect: () => navigate(item.to) }))

  return (
    <div className="min-h-screen bg-app text-content">
      <a href="#main-content" className="ui-skip focus-ring">{t('common.skipToContent')}</a>

      {sidebarOpen && <button className="fixed inset-0 z-30 bg-black/40 lg:hidden" aria-label={t('common.close')} onClick={() => setSidebarOpen(false)} />}

      <aside className={`ui-scroll fixed inset-y-0 left-0 z-40 w-72 overflow-y-auto border-r border-line bg-surface transition-transform duration-base lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-16 items-center gap-3 border-b border-line px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm"><SchoolIcon className="h-5 w-5" /></span>
          <div className="min-w-0">
            <p className="font-display text-base font-bold leading-tight text-content">SchoolOS</p>
            <p className="truncate text-[11px] text-content-subtle">{t('app.tagline')}</p>
          </div>
          <IconButton variant="ghost" size="icon-sm" className="ml-auto lg:hidden" label={t('common.close')} onClick={() => setSidebarOpen(false)}><X className="h-4 w-4" /></IconButton>
        </div>

        <nav aria-label={t('common.openMenu')} className="space-y-5 px-3 py-5">
          {groups.map(group => (
            <div key={group.labelKey}>
              <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-content-subtle">{t(group.labelKey)}</p>
              <div className="space-y-0.5">
                {group.items.map(item => (
                  <NavLink key={item.to} to={item.to}
                    className={({ isActive }) => `focus-ring flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${isActive ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-200' : 'text-content-muted hover:bg-surface-2 hover:text-content'}`}>
                    <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="truncate">{t(item.labelKey)}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-auto border-t border-line p-4">
          <div className="flex items-center gap-3">
            <Avatar name={session.user?.name ?? 'User'} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-content">{session.user?.name}</p>
              <p className="truncate text-[11px] text-content-subtle">{role ? t(`role.${role}`) : '—'}</p>
            </div>
            <IconButton variant="ghost" size="icon-sm" label={t('common.logout')} onClick={() => void logout().then(() => navigate('/login'))}><LogOut className="h-4 w-4" /></IconButton>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="ui-glass ui-safe-top sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-line px-4 sm:px-6">
          <IconButton variant="ghost" size="icon-sm" label={t('common.openMenu')} className="lg:hidden" onClick={() => setSidebarOpen(true)}><Menu className="h-5 w-5" /></IconButton>
          <Button variant="outline" size="sm" className="hidden gap-2 sm:inline-flex" onClick={() => setPaletteOpen(true)}>
            <Search className="h-4 w-4" />{t('common.search')}<kbd className="ml-4 rounded border border-line bg-surface-2 px-1.5 text-[10px] text-content-subtle">⌘K</kbd>
          </Button>
          <IconButton variant="ghost" size="icon-sm" label={t('common.search')} className="sm:hidden" onClick={() => setPaletteOpen(true)}><Search className="h-4 w-4" /></IconButton>
          <div className="ml-auto flex items-center gap-1">
            {!online && <Badge tone="warning" dot>{t('common.offline')}</Badge>}
            <MockNotice mock compact />
            <div className="hidden sm:block"><SchoolSwitcher /></div>
            <NotificationBell />
            <LanguageThemeControls />
            <Tooltip content={t('common.settings')}>
              <IconButton variant="ghost" size="icon-sm" label={t('common.settings')} onClick={() => navigate('/app/settings')}><Settings2 className="h-4 w-4" /></IconButton>
            </Tooltip>
          </div>
        </header>

        <main id="main-content" className="ui-page mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>

      <nav aria-label={t('nav.more')} className="ui-safe-bottom ui-glass fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-line px-2 py-1.5 lg:hidden">
        {groups.flatMap(g => g.items).slice(0, 5).map(item => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `focus-ring flex min-w-14 flex-col items-center gap-0.5 rounded-md px-2 py-1 text-[10px] ${isActive ? 'text-brand-600 dark:text-brand-300' : 'text-content-subtle'}`}>
            <item.icon className="h-5 w-5" /><span className="max-w-16 truncate">{t(item.labelKey)}</span>
          </NavLink>
        ))}
      </nav>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} items={commandItems} />
      {!online && <div className="pointer-events-none fixed bottom-20 left-1/2 z-40 -translate-x-1/2 lg:bottom-6"><Badge tone="warning"><ShieldAlert className="h-3 w-3" />{t('common.offline')}</Badge></div>}
    </div>
  )
}

export function ShellFallback() {
  return <div className="flex min-h-screen items-center justify-center"><GraduationCap className="h-8 w-8 animate-pulse text-brand-500" /></div>
}

