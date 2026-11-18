import type { BrandConfig } from './types'

export const DEFAULT_BRAND: BrandConfig = {
  name: 'SchoolOS',
  tagline: 'Plateforme de gestion scolaire',
  logoMark: 'graduation-cap-bars',
}

export function resolveBrand(override?: Partial<BrandConfig> | null): BrandConfig {
  return { ...DEFAULT_BRAND, ...(override ?? {}) }
}