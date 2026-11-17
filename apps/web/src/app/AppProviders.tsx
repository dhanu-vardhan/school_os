import { useMemo, useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  ActionLabelsProvider, TooltipProvider, ToastHost, type ActionLabels,
} from '@schoolos/ui'
import { PreferencesProvider } from './preferences'
import { SessionProvider } from './session'

export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
      mutations: { retry: 0 },
    },
  }))
  const { t } = useTranslation()
  const actionLabels = useMemo<ActionLabels>(() => ({
    actions: t('action.actions'),
    more: t('action.more'),
    openMenu: t('action.openMenu'),
    add: t('action.add'),
    edit: t('action.edit'),
    view: t('action.view'),
    duplicate: t('action.duplicate'),
    remove: t('action.remove'),
    copy: t('action.copy'),
    copied: t('action.copied'),
    copyFailed: t('action.copyFailed'),
    copyLink: t('action.copyLink'),
    share: t('action.share'),
    export: t('action.export'),
    exportCsv: t('action.exportCsv'),
    quickAdd: t('action.quickAdd'),
    undo: t('action.undo'),
    cancel: t('action.cancel'),
    confirm: t('action.confirm'),
    close: t('action.close'),
    unavailable: t('action.unavailable'),
    destructive: t('action.destructive'),
    selected: count => t('action.selected', { count }),
    clearSelection: t('action.clearSelection'),
    previousPage: t('action.previousPage'),
    nextPage: t('action.nextPage'),
    clearSearch: t('action.clearSearch'),
    search: t('action.search'),
    selectAll: t('action.selectAll'),
    clear: t('action.clear'),
    columns: t('action.columns'),
    toggleDensity: t('action.toggleDensity'),
  }), [t])

  return (
    <QueryClientProvider client={client}>
      <PreferencesProvider>
        <SessionProvider>
          <ActionLabelsProvider labels={actionLabels}>
            <TooltipProvider delayDuration={250}>
              {children}
              <ToastHost />
            </TooltipProvider>
          </ActionLabelsProvider>
        </SessionProvider>
      </PreferencesProvider>
    </QueryClientProvider>
  )
}
