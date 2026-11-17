import { useEffect } from 'react'

/**
 * Small in-app navigation guard for screens with unsaved work. The app uses a
 * plain Routes tree (no data router), so react-router's useBlocker is not
 * available; AppShell reads this registry before every programmatic or anchor
 * navigation and shows a confirmation dialog when a screen reports dirty state.
 */
export interface NavigationGuard {
  isDirty: () => boolean
  /** Called immediately before leaving, so the screen can drop its draft. */
  discard: () => void
}

let guard: NavigationGuard | null = null
const listeners = new Set<() => void>()

export function setNavigationGuard(next: NavigationGuard | null): () => void {
  guard = next
  listeners.forEach(listener => listener())
  return () => {
    if (guard === next) {
      guard = null
      listeners.forEach(listener => listener())
    }
  }
}

export function getNavigationGuard(): NavigationGuard | null {
  return guard
}

export function subscribeNavigationGuard(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** Register a screen's dirty state for the lifetime of the component. */
export function useUnsavedGuard(isDirty: boolean, discard: () => void) {
  useEffect(() => setNavigationGuard({ isDirty: () => isDirty, discard }), [isDirty, discard])
}
