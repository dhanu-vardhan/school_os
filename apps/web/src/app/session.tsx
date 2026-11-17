import {
  createContext, useCallback, useContext, useMemo, type ReactNode,
} from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  DEFAULT_CONFIG, demoLogin, getConfig, getSession, logout as apiLogout, switchSchool as apiSwitchSchool,
  sessionStore,
} from '@schoolos/api-client'
import type { AppConfig, PublicSession, SessionMembership } from '@schoolos/shared'

interface SessionContextValue {
  session: PublicSession
  config: AppConfig
  loading: boolean
  role: string | undefined
  apiRole: string | undefined
  roles: string[]
  schoolId: string | undefined
  schoolName: string | undefined
  memberships: SessionMembership[]
  mfa: boolean
  stepUpActive: boolean
  login: (role: string, schoolId?: string) => Promise<void>
  switchSchool: (schoolId: string) => Promise<void>
  refresh: () => Promise<void>
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
  const switchMutation = useMutation({
    mutationFn: apiSwitchSchool,
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

  const switchSchool = useCallback(async (schoolId: string) => {
    await switchMutation.mutateAsync(schoolId)
  }, [switchMutation])

  const refresh = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ['session'] })
  }, [qc])

  const logout = useCallback(async () => { await logoutMutation.mutateAsync() }, [logoutMutation])

  const value = useMemo<SessionContextValue>(() => ({
    session,
    config,
    loading: configQuery.isLoading || sessionQuery.isLoading,
    role: session.user?.roles?.[0],
    apiRole: session.user?.apiRoles?.[0],
    roles: session.user?.roles ?? [],
    schoolId: session.user?.schoolId,
    schoolName: session.user?.schoolName,
    memberships: session.user?.memberships ?? [],
    mfa: !!session.user?.mfa,
    stepUpActive: (session.user?.stepUpUntil ?? 0) > Date.now(),
    login,
    switchSchool,
    refresh,
    logout,
  }), [session, config, configQuery.isLoading, sessionQuery.isLoading, login, switchSchool, refresh, logout])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within SessionProvider')
  return ctx
}
