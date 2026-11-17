import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { fr } from './locales/fr'
import { en } from './locales/en'

export const SUPPORTED_LOCALES = ['fr', 'en'] as const
export type Locale = typeof SUPPORTED_LOCALES[number]
const LOCALE_KEY = 'schoolos_locale_v1'

export function getStoredLocale(): Locale {
  try {
    const value = localStorage.getItem(LOCALE_KEY)
    if (value === 'fr' || value === 'en') return value
  } catch { /* storage unavailable */ }
  return 'fr'
}

export function storeLocale(locale: Locale) {
  try { localStorage.setItem(LOCALE_KEY, locale) } catch { /* ignore */ }
}

export function initI18n(locale: Locale = getStoredLocale()) {
  if (!i18n.isInitialized) {
    void i18n.use(initReactI18next).init({
      resources: { fr: { translation: fr }, en: { translation: en } },
      lng: locale,
      fallbackLng: 'fr',
      interpolation: { escapeValue: false },
      returnNull: false,
    })
  }
  return i18n
}

export async function setLocale(locale: Locale) {
  storeLocale(locale)
  await i18n.changeLanguage(locale)
  document.documentElement.lang = locale
}

export type TranslationKey = keyof typeof fr

export const dateFormats: Record<Locale, Intl.DateTimeFormatOptions> = {
  fr: { day: '2-digit', month: '2-digit', year: 'numeric' },
  en: { month: 'short', day: 'numeric', year: 'numeric' },
}

export function formatDate(value: string | Date, locale: Locale = getStoredLocale()): string {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', dateFormats[locale]).format(date)
}

export function formatTime(value: string | Date, locale: Locale = getStoredLocale()): string {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }).format(date)
}

export function formatMoney(cents: number, currency = 'EUR', locale: Locale = getStoredLocale()): string {
  return new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', { style: 'currency', currency }).format(cents / 100)
}

export default i18n
