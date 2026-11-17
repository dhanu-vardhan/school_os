import type { QueryClient } from '@tanstack/react-query'
import {
  getDashboard, listActivities, listAnnouncements, listMessages, listNotifications,
  listOfferings, listStudents, listSuggestions, listTimetable, queryKeys,
} from '@schoolos/api-client'

type Prefetch = { key: readonly unknown[]; load: () => Promise<unknown> }

/** Routes whose first query can be warmed before the user commits the click. */
const WARM_ROUTES: Record<string, Prefetch> = {
  '/app/dashboard': { key: queryKeys.dashboard(), load: getDashboard },
  '/app/people/students': { key: queryKeys.students(), load: listStudents },
  '/app/activities': { key: queryKeys.activities(), load: listActivities },
  '/app/offerings': { key: queryKeys.offerings(), load: listOfferings },
  '/app/notifications': { key: queryKeys.notifications(), load: listNotifications },
  '/app/communication/messages': { key: queryKeys.messages(), load: listMessages },
  '/app/communication/announcements': { key: queryKeys.announcements(), load: listAnnouncements },
  '/app/ai/suggestions': { key: queryKeys.suggestions(), load: listSuggestions },
  '/app/calendar/timetable': { key: queryKeys.timetable(), load: listTimetable },
  '/app/timetable': { key: queryKeys.timetable(), load: listTimetable },
}

/**
 * Warm a route's first query on nav hover/focus. Restricted data (safeguarding,
 * compliance, audit) is deliberately excluded: it is fetched only after an
 * explicit navigation so no sensitive payload is requested speculatively.
 */
export function prefetchNavigation(client: QueryClient, path: string) {
  const route = Object.entries(WARM_ROUTES).find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`))?.[1]
  if (!route) return
  void client.prefetchQuery({ queryKey: route.key, queryFn: route.load, staleTime: 30_000 })
}
