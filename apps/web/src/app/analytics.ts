import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { AnalyticsFilterValue } from '@schoolos/ui'

/**
 * URL is the single source of truth for analytics filters: views are shareable and
 * survive reload. Saved views are kept in memory until a governed server-side store
 * exists; filters never enter localStorage/sessionStorage.
 */
const savedViews = new Map<string, Array<{ id: string; name: string; filters: AnalyticsFilterValue }>>()

const KEYS: Array<keyof AnalyticsFilterValue> = ['year', 'term', 'classId', 'level', 'subject', 'grain', 'from', 'to']

export function useAnalyticsFilters(key = 'default') {
  const [params, setParams] = useSearchParams()
  const [views, setViews] = useState(() => (savedViews.get(key) ?? []).map(({ id, name }) => ({ id, name })))

  useEffect(() => {
    setViews((savedViews.get(key) ?? []).map(({ id, name }) => ({ id, name })))
  }, [key])

  const value = useMemo<AnalyticsFilterValue>(() => {
    const out: AnalyticsFilterValue = {}
    for (const key of KEYS) {
      const v = params.get(key)
      if (v) out[key] = v
    }
    return out
  }, [params])

  const update = useCallback((patch: Partial<AnalyticsFilterValue>) => {
    setParams((previous) => {
      const next = new URLSearchParams(previous)
      for (const [k, v] of Object.entries(patch)) {
        if (!KEYS.includes(k as keyof AnalyticsFilterValue)) continue
        if (v === undefined || v === '') next.delete(k)
        else next.set(k, v)
      }
      return next
    }, { replace: true })
  }, [setParams])

  const reset = useCallback(() => setParams(new URLSearchParams(), { replace: true }), [setParams])

  const saveView = useCallback((name: string) => {
    const list = [...(savedViews.get(key) ?? []), { id: `${Date.now()}`, name, filters: { ...value } }]
    savedViews.set(key, list)
    setViews(list.map(({ id, name: viewName }) => ({ id, name: viewName })))
  }, [key, value])

  const loadView = useCallback((id: string) => {
    const view = (savedViews.get(key) ?? []).find(v => v.id === id)
    if (view) {
      const next = new URLSearchParams()
      for (const [k, v] of Object.entries(view.filters)) if (v) next.set(k, v)
      setParams(next, { replace: true })
    }
  }, [key, setParams])

  return { value, update, reset, views, saveView, loadView }
}

/** Convert the URL-synced filter shape into the API query shape. */
export function toAnalyticsQuery(filters: AnalyticsFilterValue) {
  return {
    year: filters.year,
    term: filters.term,
    classId: filters.classId,
    level: filters.level,
    subject: filters.subject,
    grain: filters.grain as 'day' | 'week' | 'month' | 'term' | 'year' | undefined,
    from: filters.from,
    to: filters.to,
  }
}
