import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react'
import { roleContextStorageKey } from '@schoolos/shared'
import { useSession } from './session'

export interface Impersonation {
  label: string
  endsAt: number
}

interface UiContextValue {
  /** Explicit "Viewing as" role for multi-role users; never merges permissions. */
  viewingRole: string | undefined
  setViewingRole: (role: string | undefined) => void
  /** Parent/family child context; the URL remains the source of truth for ?child=. */
  selectedChild: string | undefined
  setSelectedChild: (id: string | undefined) => void
  impersonation: Impersonation | undefined
  beginImpersonation: (label: string, durationMs: number) => void
  endImpersonation: () => void
}

const UiContext = createContext<UiContextValue | null>(null)

function readStoredRole(schoolId: string | undefined): string | undefined {
  if (!schoolId) return undefined
  try { return localStorage.getItem(roleContextStorageKey(schoolId)) ?? undefined } catch { return undefined }
}

export function UiContextProvider({ children }: { children: ReactNode }) {
  const { schoolId, roles } = useSession()
  const [viewingRole, setViewingRoleState] = useState<string | undefined>(() => readStoredRole(schoolId))
  const [selectedChild, setSelectedChild] = useState<string | undefined>()
  const [impersonation, setImpersonation] = useState<Impersonation>()

  useEffect(() => {
    setViewingRoleState(readStoredRole(schoolId))
  }, [schoolId])

  const setViewingRole = useCallback((role: string | undefined) => {
    setViewingRoleState(role)
    if (!role || !roles.includes(role)) role = undefined
    try {
      if (schoolId) {
        const key = roleContextStorageKey(schoolId)
        if (role) localStorage.setItem(key, role)
        else localStorage.removeItem(key)
      }
    } catch { /* private browsing: UI preference only, safe to skip */ }
  }, [roles, schoolId])

  const beginImpersonation = useCallback((label: string, durationMs: number) => {
    setImpersonation({ label, endsAt: Date.now() + Math.max(durationMs, 60_000) })
  }, [])
  const endImpersonation = useCallback(() => setImpersonation(undefined), [])

  const value = useMemo<UiContextValue>(() => ({
    viewingRole, setViewingRole, selectedChild, setSelectedChild,
    impersonation, beginImpersonation, endImpersonation,
  }), [viewingRole, setViewingRole, selectedChild, impersonation, beginImpersonation, endImpersonation])

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>
}

export function useUiContext(): UiContextValue {
  const ctx = useContext(UiContext)
  if (!ctx) throw new Error('useUiContext must be used within UiContextProvider')
  return ctx
}
