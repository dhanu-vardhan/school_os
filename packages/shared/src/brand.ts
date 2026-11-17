import type { BrandConfig } from './types'

export const DEFAULT_BRAND: BrandConfig = {
  name: 'Acadia',
  tagline: 'School Management Platform',
  logoMark: 'graduation-cap-bars',
}

export function resolveBrand(override?: Partial<BrandConfig> | null): BrandConfig {
  return { ...DEFAULT_BRAND, ...(override ?? {}) }
}