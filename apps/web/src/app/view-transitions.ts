type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => unknown
}

function motionReduced(): boolean {
  if (document.documentElement.classList.contains('ui-reduce-motion')) return true
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Progressively enhanced route change: browsers with the View Transitions API
 * get a single cross-fade, others fall back to the CSS `.ui-route-in` enter
 * animation. Both paths are skipped when motion is reduced.
 */
export function navigateWithTransition(navigate: (path: string) => void, path: string) {
  const doc = document as ViewTransitionDocument
  if (!doc.startViewTransition || motionReduced()) {
    navigate(path)
    return
  }
  doc.startViewTransition(() => navigate(path))
}
