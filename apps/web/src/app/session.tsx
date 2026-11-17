import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  DEFAULT_CONFIG, demoLogin, getConfig, getSession, logout as apiLogout,
  sessionStore,
} from '@schoolos/api-client'
import type { AppConfig, PublicSession } from '@schoolos/shared'

interface SessionContextValue {
  session: PublicSession
  config: AppConfig
  loading: boolean
  role: string | undefined
  roles: string[]
  schoolId: string | undefined
  login: (role: string, schoolId?: string) => Promise<void>
  logout: () => Promise<void>
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const configQuery = useQuery({ queryKey: ['config'], queryFn: getConfig, staleTime: Infinity, retry: 1 })
  const sessionQuery = useQuery({ queryKey: ['session'], queryFn: getSession, staleTime: 30_000, retry: 1 })

  const loginMutation = useMutation({
    mutationFn: ({ role, schoolId }: { role: string; schoolId?: string }) => demoLogin(role, schoolId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['session'] })
      await qc.invalidateQueries()
    },
  })
  const logoutMutation = useMutation({
    mutationFn: apiLogout,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['session'] })
      await qc.clear()
    },
  })

  const session = sessionQuery.data?.data ?? sessionStore.get()
  const config = configQuery.data?.data ?? DEFAULT_CONFIG

  const login = useCallback(async (role: string, schoolId?: string) => {
    await loginMutation.mutateAsync({ role, schoolId })
  }, [loginMutation])

  const logout = useCallback(async () => { await logoutMutation.mutateAsync() }, [logoutMutation])

  const value = useMemo<SessionContextValue>(() => ({
    session,
    config,
    loading: configQuery.isLoading || sessionQuery.isLoading,
    role: session.user?.roles?.[0],
    roles: session.user?.roles ?? [],
    schoolId: session.user?.schoolId,
    login,
    logout,
  }), [session, config, configQuery.isLoading, sessionQuery.isLoading, login, logout])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within SessionProvider')
  return ctx
}
