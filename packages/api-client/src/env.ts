const meta = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {}

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}

export const USE_MOCK = bool(meta.VITE_USE_MOCK, true)
export const SHOW_UI_KIT = bool(meta.VITE_SHOW_UI_KIT, true)
export const SHOW_COMING_SOON = bool(meta.VITE_SHOW_COMING_SOON, true)
export const API_BASE_PATH = meta.VITE_API_BASE_PATH ?? '/api'
export const APP_VERSION = meta.VITE_APP_VERSION ?? '0.0.1'
