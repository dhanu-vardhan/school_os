import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { dashboardRepository } from '../data/dashboardRepository'
import type { AiDraft, DashboardData, Period } from '../domain/models'
import type { DashboardRepository } from '../domain/ports'

type DraftAction = 'accepted' | 'dismissed'

interface DashboardContextValue {
  period: Period
  setPeriod: (period: Period) => void
  data: DashboardData
  drafts: AiDraft[]
  reviewDraft: (id: string, action: DraftAction) => void
  toast: string | null
  notify: (message: string) => void
  query: string
  setQuery: (query: string) => void
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

interface Props {
  children: ReactNode
  repository?: DashboardRepository
}

export function DashboardProvider({ children, repository = dashboardRepository }: Props) {
  const [period, setPeriod] = useState<Period>('30d')
  const [query, setQuery] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const data = useMemo(() => repository.getData(period), [repository, period])
  const [drafts, setDrafts] = useState<AiDraft[]>(() => dashboardRepository.getData('30d').drafts)

  const notify = useCallback((message: string) => setToast(message), [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const reviewDraft = useCallback((id: string, action: DraftAction) => {
    setDrafts((current) => current.map((draft) =>
      draft.id === id
        ? { ...draft, status: action, reviewedAt: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }
        : draft,
    ))
    notify(action === 'accepted' ? 'Recommendation approuvee et archivee' : 'Recommendation masquee')
  }, [notify])

  const value = useMemo(() => ({
    period, setPeriod, data, drafts, reviewDraft, toast, notify, query, setQuery,
  }), [period, data, drafts, reviewDraft, toast, notify, query])

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
}

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider')
  return ctx
}
