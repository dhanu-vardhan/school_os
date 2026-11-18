import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Bell, ChevronDown, GraduationCap, Keyboard, KeyRound, Languages, LogOut, Menu, Moon,
  Search, Settings2, ShieldAlert, Sun, Monitor, X, GraduationCap as SchoolIcon,
} from 'lucide-react'
import {
  Avatar, Badge, Button, CommandPalette, DropdownMenu, IconButton, Modal, Tooltip, toast,
} from '@schoolos/ui'
import { SHOW_COMING_SOON, SHOW_UI_KIT, useNotifications } from '@schoolos/api-client'
import { CANONICAL_ROLE_LABEL_KEY, availableContexts, displayToCanonical, landingRouteFor, navGroupsForRole } from '@schoolos/shared'
import { useSession } from '../app/session'
import { usePreferences, type Theme } from '../app/preferences'
import { useUiContext } from '../app/context'
import { navIcon } from '../app/nav-icons'
import { useOnline } from '../app/hooks'
import { prefetchNavigation } from '../app/prefetch'
import { useGlobalShortcuts } from '../app/shortcuts'
import { navigateWithTransition } from '../app/view-transitions'
import { getNavigationGuard, subscribeNavigationGuard } from '../app/navigation-guard'
import { QuickAddDialog, ShortcutsHelpDialog } from './ShortcutDialogs'
import { MockNotice } from './Screen'
import { RouteGuard } from '../access'

function SchoolSwitcher() {
  const { t } = useTranslation()
  const { schoolId, schoolName, memberships, switchSchool } = useSession()
  const navigate = useNavigate()
  const current = memberships.find(s => s.schoolId === schoolId)
  const label = current?.schoolName ?? schoolName ?? t('common.school')
  if (memberships.length < 2) return <span className="hidden max-w-56 truncate px-2 text-sm text-content-muted sm:inline">{label}</span>

  return (
    <DropdownMenu
      trigger={
        <Button variant="ghost" size="sm" className="max-w-56 gap-2">
          <span className="truncate">{label}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
        </Button>
      }
      items={memberships.map(membership => ({
        label: membership.schoolName,
        onSelect: async () => {
          if (membership.schoolId === schoolId) return
          try {
            await switchSchool(membership.schoolId)
            toast.success(t('common.school') + ' · ' + membership.schoolName)
            navigate('/app/dashboard')
          } catch { toast.error(t('state.error')) }
        },
      }))}
    />
  )
}

function RoleSwitcher() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { roles, role } = useSession()
  const { viewingRole, setViewingRole } = useUiContext()
  const contexts = availableContexts(roles)
  if (contexts.length < 2) return null
  const active = viewingRole ?? role
  return (
    <DropdownMenu
      trigger={
        <Button variant="outline" size="sm" className="hidden max-w-44 gap-2 md:inline-flex">
          <span className="truncate">{t('common.viewingAs', { role: t(CANONICAL_ROLE_LABEL_KEY[contexts.find(c => c.role === displayToCanonical(active))?.role ?? contexts[0].role]) })}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
        </Button>
      }
      items={contexts.map(context => ({
        label: t(CANONICAL_ROLE_LABEL_KEY[context.role]),
        onSelect: () => {
          if (displayToCanonical(active) === context.role) return
          setViewingRole(context.role)
          navigate(landingRouteFor(context.role))
        },
      })).concat([{ label: t('role.switchReset'), onSelect: () => { setViewingRole(undefined); navigate('/') } }])}
    />
  )
}

function ContextBanners() {
  const { t } = useTranslation()
  const { role } = useSession()
  const { impersonation, endImpersonation } = useUiContext()
  const canonical = displayToCanonical(role)
  const confidential = canonical === 'safeguarding-lead' || canonical === 'nurse'
  const readOnly = canonical === 'auditor'
  if (!confidential && !readOnly && !impersonation) return null
  const seconds = impersonation ? Math.max(0, Math.round((impersonation.endsAt - Date.now()) / 1000)) : 0
  return (
    <div className="space-y-2" role="status">
      {confidential && <div className="rounded-lg bg-slate-800 px-4 py-2 text-center text-sm font-medium text-neutral-0">{t('access.confidential')}</div>}
      {readOnly && <div className="rounded-lg bg-surface-2 px-4 py-2 text-center text-sm font-medium text-content-muted">{t('access.readOnly')}</div>}
      {impersonation && (
        <div className="flex flex-wrap items-center justify-center gap-3 rounded-lg bg-warning-50 px-4 py-2 text-sm text-warning-800 dark:bg-warning-500/15 dark:text-warning-200">
          <span>{t('access.impersonating', { name: impersonation.label, time: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` })}</span>
          <Button size="sm" variant="outline" onClick={endImpersonation}>{t('access.endSession')}</Button>
        </div>
      )}
    </div>
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
          {!isLoading && unread > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-600 px-1 text-[10px] font-bold text-neutral-0">{unread > 9 ? '9+' : unread}</span>}
        </span>
      </IconButton>
    </Tooltip>
  )
}

export function AppShell() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { session, role, roles, schoolId, stepUpActive, logout } = useSession()
  const { impersonation } = useUiContext()
  const online = useOnline()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [pendingPath, setPendingPath] = useState<string | null>(null)
  const [, forceGuardRender] = useState(0)
  const canonical = displayToCanonical(role)
  const groups = useMemo(
    () => navGroupsForRole(canonical, {
      role, roles, schoolId, stepUpActive,
      featureFlags: { SHOW_UI_KIT, SHOW_COMING_SOON },
      impersonating: !!impersonation,
    }, { includeSoon: SHOW_COMING_SOON }),
    [canonical, role, roles, schoolId, stepUpActive, impersonation],
  )

  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  // Native reload protection plus in-app interception via attemptNavigate below.
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (getNavigationGuard()?.isDirty()) { event.preventDefault(); event.returnValue = '' }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    const unsubscribe = subscribeNavigationGuard(() => forceGuardRender(n => n + 1))
    return () => { window.removeEventListener('beforeunload', onBeforeUnload); unsubscribe() }
  }, [])

  const togglePalette = useCallback(() => setPaletteOpen(open => !open), [])
  const openHelp = useCallback(() => setHelpOpen(true), [])
  const openQuickAdd = useCallback(() => setQuickAddOpen(true), [])
  const navigateDirect = useCallback((path: string) => navigateWithTransition(navigate, path), [navigate])
  const goTo = useCallback((path: string) => {
    if (getNavigationGuard()?.isDirty()) setPendingPath(path)
    else navigateDirect(path)
  }, [navigateDirect])
  const warm = useCallback((path: string) => prefetchNavigation(queryClient, path), [queryClient])
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])
  const confirmLeave = useCallback(() => {
    const path = pendingPath
    setPendingPath(null)
    if (path) { getNavigationGuard()?.discard(); navigateDirect(path) }
  }, [pendingPath, navigateDirect])

  useGlobalShortcuts({
    onPalette: togglePalette,
    onHelp: openHelp,
    onQuickAdd: openQuickAdd,
    onGo: goTo,
    onEscape: closeSidebar,
  })

  const commandItems = groups.flatMap(group => group.items.map(item => {
    const Icon = navIcon(item.icon)
    return {
      id: item.path,
      label: t(item.labelKey),
      group: t(group.labelKey),
      icon: <Icon className="h-4 w-4" />,
      onSelect: () => goTo(item.path),
    }
  }))

  return (
    <div className="min-h-screen bg-app text-content"
      onClickCapture={event => {
        const anchor = (event.target as HTMLElement).closest('a')
        if (!anchor || event.defaultPrevented || !getNavigationGuard()?.isDirty()) return
        const target = new URL(anchor.href, window.location.href)
        if (target.origin !== window.location.origin || target.hash) return
        event.preventDefault()
        setPendingPath(target.pathname + target.search)
      }}>
      <Button asChild variant="bare" className="ui-skip focus-ring">
        <a href="#main-content" data-skip-link>{t('common.skipToContent')}</a>
      </Button>

      {sidebarOpen && (
        <IconButton label={t('common.close')} variant="bare"
          className="fixed inset-0 z-30 h-auto w-auto rounded-none bg-overlay p-0 lg:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`ui-scroll fixed inset-y-0 left-0 z-40 w-72 overflow-y-auto border-r border-sidebar/40 bg-sidebar text-sidebar-text transition-transform duration-base lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-text/15 px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-neutral-0 shadow-sm"><SchoolIcon className="h-5 w-5" /></span>
          <div className="min-w-0">
            <p className="font-display text-base font-bold leading-tight text-neutral-0">SchoolOS</p>
            <p className="truncate text-[11px] text-sidebar-text/70">{t('app.tagline')}</p>
          </div>
          <IconButton variant="ghost" size="icon-sm" className="ml-auto lg:hidden" label={t('common.close')} onClick={() => setSidebarOpen(false)}><X className="h-4 w-4" /></IconButton>
        </div>

        <nav aria-label={t('common.openMenu')} className="space-y-5 px-3 py-5">
          {groups.map(group => (
            <div key={group.labelKey}>
              <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-sidebar-text/50">{t(group.labelKey)}</p>
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const Icon = navIcon(item.icon)
                  return (
                    <NavLink key={item.path} to={item.path}
                      onMouseEnter={() => warm(item.path)}
                      onFocus={() => warm(item.path)}
                      className={({ isActive }) => `focus-ring flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${isActive ? 'bg-brand-600 font-semibold text-neutral-0' : 'text-sidebar-text/80 hover:bg-sidebar-text/10 hover:text-neutral-0'}`}>
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="truncate">{t(item.labelKey)}</span>
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-auto border-t border-line p-4">
          <div className="flex items-center gap-3">
            <Avatar name={session.user?.name ?? 'User'} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-neutral-0">{session.user?.name}</p>
              <p className="truncate text-[11px] text-sidebar-text/70">{role ? t(`role.${role}`) : '—'}</p>
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
            <RoleSwitcher />
            <NotificationBell />
            <LanguageThemeControls />
            <Tooltip content={t('shortcuts.help')}>
              <IconButton variant="ghost" size="icon-sm" className="hidden sm:inline-flex" label={t('shortcuts.help')} aria-keyshortcuts="?" onClick={() => setHelpOpen(true)}><Keyboard className="h-4 w-4" /></IconButton>
            </Tooltip>
            {/* On small screens these destinations stay in the sidebar; hiding the duplicate
                header icons prevents the compact mock badge from pushing controls off-canvas. */}
            <Tooltip content={t('nav.accountSecurity')}>
              <IconButton variant="ghost" size="icon-sm" className="hidden sm:inline-flex" label={t('nav.accountSecurity')} onClick={() => navigate('/app/account/security')}><KeyRound className="h-4 w-4" /></IconButton>
            </Tooltip>
            <Tooltip content={t('common.settings')}>
              <IconButton variant="ghost" size="icon-sm" className="hidden sm:inline-flex" label={t('common.settings')} onClick={() => navigate('/app/settings')}><Settings2 className="h-4 w-4" /></IconButton>
            </Tooltip>
          </div>
        </header>

        <ContextBanners />
        <main key={location.pathname} id="main-content" className="ui-route-in mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <RouteGuard><Outlet /></RouteGuard>
        </main>
      </div>

      <nav aria-label={t('nav.more')} className="ui-safe-bottom ui-glass fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-line px-2 py-1.5 lg:hidden">
        {groups.flatMap(g => g.items).slice(0, 5).map(item => {
          const Icon = navIcon(item.icon)
          return (
            <NavLink key={item.path} to={item.path}
            onMouseEnter={() => warm(item.path)}
            onFocus={() => warm(item.path)}
            className={({ isActive }) => `focus-ring flex min-w-14 flex-col items-center gap-0.5 rounded-md px-2 py-1 text-[10px] ${isActive ? 'text-brand-600 dark:text-brand-300' : 'text-content-subtle'}`}>
              <Icon className="h-5 w-5" /><span className="max-w-16 truncate">{t(item.labelKey)}</span>
            </NavLink>
          )
        })}
      </nav>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} items={commandItems} />
      <QuickAddDialog open={quickAddOpen} onOpenChange={setQuickAddOpen} onNavigate={goTo} />
      <ShortcutsHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
      <Modal open={pendingPath !== null} onOpenChange={open => { if (!open) setPendingPath(null) }}
        title={t('unsaved.title')} description={t('unsaved.body')}
        footer={<>
          <Button variant="ghost" onClick={() => setPendingPath(null)}>{t('unsaved.keep')}</Button>
          <Button variant="danger" onClick={confirmLeave}>{t('unsaved.discard')}</Button>
        </>}>
        <p className="text-sm text-content-muted">{t('unsaved.body')}</p>
      </Modal>
      {!online && <div className="pointer-events-none fixed bottom-20 left-1/2 z-40 -translate-x-1/2 lg:bottom-6"><Badge tone="warning"><ShieldAlert className="h-3 w-3" />{t('common.offline')}</Badge></div>}
    </div>
  )
}

export function ShellFallback() {
  return <div className="flex min-h-screen items-center justify-center"><GraduationCap className="h-8 w-8 animate-pulse text-brand-500" /></div>
}

