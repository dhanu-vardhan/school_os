import {
  useMutation, useQuery, useQueryClient,
  type QueryKey, type UseQueryOptions,
} from '@tanstack/react-query'
import * as api from './client'
import type { ApiResponse } from './http'
import type { Notification, SafeguardingConcern, AiSuggestion, Invoice } from '@schoolos/shared'
import type { AnalyticsQuery, Intervention, ScenarioInput, Target } from './client'

export const queryKeys = {
  all: ['schoolos'] as const,
  students: () => [...queryKeys.all, 'students'] as const,
  student: (id: string) => [...queryKeys.students(), id] as const,
  schools: () => [...queryKeys.all, 'schools'] as const,
  school: (id: string) => [...queryKeys.schools(), id] as const,
  classes: () => [...queryKeys.all, 'classes'] as const,
  guardians: () => [...queryKeys.all, 'guardians'] as const,
  staff: () => [...queryKeys.all, 'staff'] as const,
  members: () => [...queryKeys.all, 'members'] as const,
  activities: () => [...queryKeys.all, 'activities'] as const,
  activity: (id: string) => [...queryKeys.activities(), id] as const,
  offerings: () => [...queryKeys.all, 'offerings'] as const,
  concerns: () => [...queryKeys.all, 'concerns'] as const,
  concern: (id: string) => [...queryKeys.concerns(), id] as const,
  suggestions: () => [...queryKeys.all, 'suggestions'] as const,
  notifications: () => [...queryKeys.all, 'notifications'] as const,
  messages: () => [...queryKeys.all, 'messages'] as const,
  announcements: () => [...queryKeys.all, 'announcements'] as const,
  invoices: () => [...queryKeys.all, 'invoices'] as const,
  consents: () => [...queryKeys.all, 'consents'] as const,
  audit: () => [...queryKeys.all, 'audit'] as const,
  retention: () => [...queryKeys.all, 'retention'] as const,
  dataRequests: () => [...queryKeys.all, 'dataRequests'] as const,
  holidays: () => [...queryKeys.all, 'holidays'] as const,
  timetable: () => [...queryKeys.all, 'timetable'] as const,
  attendance: () => [...queryKeys.all, 'attendance'] as const,
  dashboard: () => [...queryKeys.all, 'dashboard'] as const,
  report: (input: unknown) => [...queryKeys.all, 'report', input] as const,
  analytics: () => [...queryKeys.all, 'analytics'] as const,
  analyticsOverview: (params: AnalyticsQuery) => [...queryKeys.analytics(), 'overview', params] as const,
  analyticsSeries: (params: AnalyticsQuery) => [...queryKeys.analytics(), 'series', params] as const,
  analyticsTable: (params: AnalyticsQuery) => [...queryKeys.analytics(), 'table', params] as const,
  analyticsMatrix: (params: AnalyticsQuery) => [...queryKeys.analytics(), 'matrix', params] as const,
  analyticsInsights: (params: AnalyticsQuery) => [...queryKeys.analytics(), 'insights', params] as const,
  analyticsExplain: (metricId: string, params: AnalyticsQuery) => [...queryKeys.analytics(), 'explain', metricId, params] as const,
  analyticsTargets: () => [...queryKeys.analytics(), 'targets'] as const,
  analyticsInterventions: () => [...queryKeys.analytics(), 'interventions'] as const,
  analyticsDictionary: () => [...queryKeys.analytics(), 'dictionary'] as const,
  platform: () => [...queryKeys.all, 'platform'] as const,
  demoAccounts: () => [...queryKeys.all, 'demoAccounts'] as const,
  accountSecurity: () => [...queryKeys.all, 'accountSecurity'] as const,
  securityOverview: () => [...queryKeys.all, 'securityOverview'] as const,
  securityEvents: () => [...queryKeys.all, 'securityEvents'] as const,
}

export function useApiQuery<T>(
  key: QueryKey,
  fn: () => Promise<ApiResponse<T>>,
  options?: Omit<UseQueryOptions<ApiResponse<T>>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({ queryKey: key, queryFn: fn, staleTime: 30_000, retry: 1, ...options })
}

export const useStudents = () => useApiQuery(queryKeys.students(), api.listStudents)
export const useStudent = (id: string, enabled = true) => useApiQuery(queryKeys.student(id), () => api.getStudent(id), { enabled })
export const useSchools = () => useApiQuery(queryKeys.schools(), api.listSchools)
export const useSchool = (id: string, enabled = true) => useApiQuery(queryKeys.school(id), () => api.getSchool(id), { enabled })
export const useClasses = () => useApiQuery(queryKeys.classes(), api.listClasses)
export const useGuardians = () => useApiQuery(queryKeys.guardians(), api.listGuardians)
export const useStaff = () => useApiQuery(queryKeys.staff(), api.listStaff)
export const useMembers = () => useApiQuery(queryKeys.members(), api.listMembers)
export const useActivities = () => useApiQuery(queryKeys.activities(), api.listActivities)
export const useActivity = (id: string, enabled = true) => useApiQuery(queryKeys.activity(id), () => api.getActivity(id), { enabled })
export const useOfferings = () => useApiQuery(queryKeys.offerings(), api.listOfferings)
export const useConcerns = (enabled = true) => useApiQuery(queryKeys.concerns(), api.listConcerns, { enabled })
export const useConcern = (id: string, enabled = true) => useApiQuery(queryKeys.concern(id), () => api.getConcern(id), { enabled })
export const useSuggestions = () => useApiQuery(queryKeys.suggestions(), api.listSuggestions)
export const useNotifications = () => useApiQuery(queryKeys.notifications(), api.listNotifications)
export const useMessages = () => useApiQuery(queryKeys.messages(), api.listMessages)
export const useAnnouncements = () => useApiQuery(queryKeys.announcements(), api.listAnnouncements)
export const useInvoices = () => useApiQuery(queryKeys.invoices(), api.listInvoices)
export const useConsents = (enabled = true) => useApiQuery(queryKeys.consents(), api.listConsents, { enabled })
export const useAudit = (enabled = true) => useApiQuery(queryKeys.audit(), api.listAudit, { enabled })
export const useRetention = (enabled = true) => useApiQuery(queryKeys.retention(), api.listRetention, { enabled })
export const useDataRequests = (enabled = true) => useApiQuery(queryKeys.dataRequests(), api.listDataRequests, { enabled })
export const useHolidays = () => useApiQuery(queryKeys.holidays(), api.listHolidays)
export const useTimetable = () => useApiQuery(queryKeys.timetable(), api.listTimetable)
export const useAttendance = () => useApiQuery(queryKeys.attendance(), api.listAttendance)

export function useSaveAttendance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.saveAttendance,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.attendance() })
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard() })
    },
  })
}
export const useDashboard = () => useApiQuery(queryKeys.dashboard(), api.getDashboard)
export const useSystemStatus = (enabled = true) => useApiQuery([...queryKeys.platform(), 'status'], api.getSystemStatus, { enabled })
export const useFeatureFlags = (enabled = true) => useApiQuery([...queryKeys.platform(), 'flags'], api.getFeatureFlags, { enabled })
export const useIntegrations = (enabled = true) => useApiQuery([...queryKeys.platform(), 'integrations'], api.getIntegrations, { enabled })
export const useModels = (enabled = true) => useApiQuery([...queryKeys.platform(), 'models'], api.getModels, { enabled })
export const useDemoAccounts = (enabled = true) => useApiQuery(queryKeys.demoAccounts(), api.demoAccounts, { enabled })
export const useAccountSecurity = (enabled = true) => useApiQuery(queryKeys.accountSecurity(), api.getAccountSecurity, { enabled })
export const useSecurityOverview = (enabled = true) => useApiQuery(queryKeys.securityOverview(), api.getSecurityOverview, { enabled })
export const useSecurityEvents = (enabled = true) => useApiQuery(queryKeys.securityEvents(), api.listSecurityEvents, { enabled })

export function useReport(input: { metric: string; groupBy: string; from: string; to: string }, enabled = false) {
  return useApiQuery(queryKeys.report(input), () => api.runReport(input), { enabled })
}

// ---------------------------------------------------------------------- analytics

export const useAnalyticsDictionary = (enabled = true) =>
  useApiQuery(queryKeys.analyticsDictionary(), api.getAnalyticsDictionary, { enabled })
export const useAnalyticsOverview = (params: AnalyticsQuery, enabled = true) =>
  useApiQuery(queryKeys.analyticsOverview(params), () => api.getAnalyticsOverview(params), { enabled })
export const useAnalyticsSeries = (params: AnalyticsQuery, enabled = true) =>
  useApiQuery(queryKeys.analyticsSeries(params), () => api.getAnalyticsSeries(params), { enabled })
export const useAnalyticsTable = (params: AnalyticsQuery, enabled = true) =>
  useApiQuery(queryKeys.analyticsTable(params), () => api.getAnalyticsTable(params), { enabled })
export const useAnalyticsMatrix = (params: AnalyticsQuery, enabled = true) =>
  useApiQuery(queryKeys.analyticsMatrix(params), () => api.getAnalyticsMatrix(params), { enabled })
export const useAnalyticsInsights = (params: AnalyticsQuery = {}, enabled = true) =>
  useApiQuery(queryKeys.analyticsInsights(params), () => api.getAnalyticsInsights(params), { enabled })
export const useMetricExplain = (metricId: string, params: AnalyticsQuery = {}, enabled = false) =>
  useApiQuery(queryKeys.analyticsExplain(metricId, params), () => api.explainMetric(metricId, params), { enabled })
export const useAnalyticsTargets = (enabled = true) =>
  useApiQuery(queryKeys.analyticsTargets(), api.listTargets, { enabled })
export const useInterventions = (enabled = true) =>
  useApiQuery(queryKeys.analyticsInterventions(), api.listInterventions, { enabled })

function invalidateAnalytics(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: queryKeys.analytics() })
  void qc.invalidateQueries({ queryKey: queryKeys.dashboard() })
}

export function useSaveTarget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.saveTarget,
    onSuccess: () => invalidateAnalytics(qc),
  })
}

export function useCreateIntervention() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createIntervention,
    onSuccess: () => invalidateAnalytics(qc),
  })
}

export function useUpdateIntervention() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Intervention['status'] }) => api.updateIntervention(id, status),
    onSuccess: () => invalidateAnalytics(qc),
  })
}

export function useDismissInsight() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.dismissInsight,
    onSuccess: () => invalidateAnalytics(qc),
  })
}

export function useSnoozeInsight() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ dedupeKey, days }: { dedupeKey: string; days?: number }) => api.snoozeInsight(dedupeKey, days),
    onSuccess: () => invalidateAnalytics(qc),
  })
}

export function useScenario() {
  return useMutation({ mutationFn: api.runScenario })
}

export function useAnalyticsExport() {
  return useMutation({ mutationFn: api.createAnalyticsExport })
}

export function useCreateStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createStudent,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.students() }),
  })
}

export function useUpdateStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof api.updateStudent>[1] }) => api.updateStudent(id, input),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.students() })
      qc.invalidateQueries({ queryKey: queryKeys.student(variables.id) })
    },
  })
}

export function useUpdateSchool() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof api.updateSchool>[1] }) => api.updateSchool(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.schools() }),
  })
}

export function useEnrolInActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.enrolInActivity,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.offerings() }),
  })
}

export function useCreateConcern() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createConcern,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.concerns() }),
  })
}

export function useUpdateConcern() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: SafeguardingConcern['status'] }) => api.updateConcern(id, { status }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.concerns() })
      qc.invalidateQueries({ queryKey: queryKeys.concern(variables.id) })
    },
  })
}

export function useDecideSuggestion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AiSuggestion['status'] }) => api.decideSuggestion(id, status),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: queryKeys.suggestions() })
      const previous = qc.getQueryData<ApiResponse<AiSuggestion[]>>(queryKeys.suggestions())
      qc.setQueryData<ApiResponse<AiSuggestion[]>>(queryKeys.suggestions(), old => old && ({
        ...old, data: old.data.map(s => s.id === id ? { ...s, status } : s),
      }))
      return { previous }
    },
    onError: (_err, _vars, ctx) => { if (ctx?.previous) qc.setQueryData(queryKeys.suggestions(), ctx.previous) },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.suggestions() }),
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.markNotificationRead,
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: queryKeys.notifications() })
      const previous = qc.getQueryData<ApiResponse<Notification[]>>(queryKeys.notifications())
      qc.setQueryData<ApiResponse<Notification[]>>(queryKeys.notifications(), old => old && ({
        ...old, data: old.data.map(n => n.id === id ? { ...n, read: true } : n),
      }))
      return { previous }
    },
    onError: (_e, _id, ctx) => { if (ctx?.previous) qc.setQueryData(queryKeys.notifications(), ctx.previous) },
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: api.markAllNotificationsRead, onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.notifications() }) })
}

export function useSendMessage() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: api.sendMessage, onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.messages() }) })
}

export function useCreateAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createAnnouncement,
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.announcements() }); qc.invalidateQueries({ queryKey: queryKeys.dashboard() }) },
  })
}

export function usePayInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.payInvoice,
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: queryKeys.invoices() })
      const previous = qc.getQueryData<ApiResponse<Invoice[]>>(queryKeys.invoices())
      qc.setQueryData<ApiResponse<Invoice[]>>(queryKeys.invoices(), old => old && ({ ...old, data: old.data.map(i => i.id === id ? { ...i, status: 'paid' } : i) }))
      return { previous }
    },
    onError: (_e, _id, ctx) => { if (ctx?.previous) qc.setQueryData(queryKeys.invoices(), ctx.previous) },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.invoices() }),
  })
}

export function useCreateDataRequest() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: api.createDataRequest, onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.dataRequests() }) })
}

export function useInviteMember() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: api.inviteMember, onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.members() }) })
}
