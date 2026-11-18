import { createContext, useCallback, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useFamilyOverview } from '@schoolos/api-client'
import { restrictionBlocks, type FamilyChild, type FamilyOverview } from '@schoolos/shared'

/**
 * Family portal context. The guardian subject, the child list and every policy flag come
 * from `/v1/family/overview`; the selected child is an explicit `?child=` parameter so a
 * link can be shared between the two guardians without leaking a different scope.
 */
interface FamilyContextValue {
  overview?: FamilyOverview
  children: FamilyChild[]
  selected?: FamilyChild
  childId?: string
  setChildId: (id?: string) => void
  withChild: (path: string) => string
  today: string
  informationRestricted: boolean
  recordsRestricted: boolean
  isLoading: boolean
  error: unknown
  refetch: () => void
}

const FamilyContext = createContext<FamilyContextValue | null>(null)

export function FamilyProvider({ children }: { children: ReactNode }) {
  const query = useFamilyOverview()
  const [params, setParams] = useSearchParams()
  const overview = query.data?.data
  const list = overview?.children ?? []
  const requested = params.get('child') ?? undefined
  const selected = list.find(child => child.id === requested) ?? (list.length === 1 ? list[0] : undefined)
  const today = new Date().toISOString().slice(0, 10)

  const setChildId = useCallback((id?: string) => {
    setParams(previous => {
      const next = new URLSearchParams(previous)
      if (id) next.set('child', id)
      else next.delete('child')
      return next
    }, { replace: true })
  }, [setParams])

  const withChild = useCallback((path: string) => {
    if (!selected) return path
    return `${path}${path.includes('?') ? '&' : '?'}child=${encodeURIComponent(selected.id)}`
  }, [selected])

  const value = useMemo<FamilyContextValue>(() => ({
    overview,
    children: list,
    selected,
    childId: selected?.id,
    setChildId,
    withChild,
    today,
    informationRestricted: !!selected && restrictionBlocks(selected.restrictions, 'information', today),
    recordsRestricted: !!selected && restrictionBlocks(selected.restrictions, 'records', today),
    isLoading: query.isLoading,
    error: query.error,
    refetch: () => void query.refetch(),
  }), [overview, list, selected, setChildId, withChild, today, query])

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>
}

export function useFamily(): FamilyContextValue {
  const context = useContext(FamilyContext)
  if (!context) throw new Error('useFamily must be used inside FamilyProvider')
  return context
}
