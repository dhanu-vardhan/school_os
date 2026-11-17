import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getStoredLocale, setLocale, type Locale } from '@schoolos/i18n'

export type Theme = 'light' | 'dark' | 'system'

interface Preferences {
  theme: Theme
  locale: Locale
  reduceMotion: boolean
  highContrast: boolean
  largeText: boolean
  setTheme: (theme: Theme) => void
  setAppLocale: (locale: Locale) => void
  setReduceMotion: (value: boolean) => void
  setHighContrast: (value: boolean) => void
  setLargeText: (value: boolean) => void
}

const PreferencesContext = createContext<Preferences | null>(null)

function read<T extends string | boolean>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`schoolos_pref_${key}`)
    if (raw == null) return fallback
    return (typeof fallback === 'boolean' ? raw === 'true' : raw) as T
  } catch { return fallback }
}

function save(key: string, value: string | boolean) {
  try { localStorage.setItem(`schoolos_pref_${key}`, String(value)) } catch { /* unavailable */ }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => read<Theme>('theme', 'system'))
  const [locale, setLocaleState] = useState<Locale>(() => getStoredLocale())
  const [reduceMotion, setReduceMotionState] = useState(() => read<boolean>('reduceMotion', false))
  const [highContrast, setHighContrastState] = useState(() => read<boolean>('highContrast', false))
  const [largeText, setLargeTextState] = useState(() => read<boolean>('largeText', false))

  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => root.classList.toggle('dark', theme === 'dark' || (theme === 'system' && media.matches))
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('ui-reduce-motion', reduceMotion)
    root.classList.toggle('ui-high-contrast', highContrast)
    root.classList.toggle('ui-large-text', largeText)
  }, [reduceMotion, highContrast, largeText])

  useEffect(() => { void setLocale(locale); document.documentElement.lang = locale }, [locale])

  const setTheme = useCallback((next: Theme) => { setThemeState(next); save('theme', next) }, [])
  const setAppLocale = useCallback((next: Locale) => { setLocaleState(next) }, [])
  const setReduceMotion = useCallback((next: boolean) => { setReduceMotionState(next); save('reduceMotion', next) }, [])
  const setHighContrast = useCallback((next: boolean) => { setHighContrastState(next); save('highContrast', next) }, [])
  const setLargeText = useCallback((next: boolean) => { setLargeTextState(next); save('largeText', next) }, [])

  const value = useMemo<Preferences>(() => ({
    theme, locale, reduceMotion, highContrast, largeText,
    setTheme, setAppLocale, setReduceMotion, setHighContrast, setLargeText,
  }), [theme, locale, reduceMotion, highContrast, largeText, setTheme, setAppLocale, setReduceMotion, setHighContrast, setLargeText])

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

export function usePreferences(): Preferences {
  const ctx = useContext(PreferencesContext)
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider')
  return ctx
}
