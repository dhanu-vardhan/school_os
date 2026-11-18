import type { DashboardData, Period } from './models'

/**
 * Boundary between the dashboard UI and its data source. A real
 * tenant-scoped API client can replace the fixture implementation without
 * changing any component (AGENTS.md: no business logic in the client).
 */
export interface DashboardRepository {
  getData(period: Period): DashboardData
}
