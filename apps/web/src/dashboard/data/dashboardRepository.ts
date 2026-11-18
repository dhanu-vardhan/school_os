import type { DashboardRepository } from '../domain/ports'
import { dashboardFixture } from './fixtures'

/** Fixture adapter. Replace with a tenant-scoped API adapter in production. */
export const dashboardRepository: DashboardRepository = {
  getData: () => dashboardFixture,
}
