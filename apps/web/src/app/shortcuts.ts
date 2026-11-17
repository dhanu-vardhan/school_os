import { useEffect, useRef } from 'react'

/** Actions a screen can expose to the global keyboard layer. */
export type ShortcutAction = 'primary' | 'save'

const ACTION_EVENT = 'schoolos:shortcut-action'

/** True while the user is typing, so plain-letter shortcuts never steal keystrokes. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.tagName === 'INPUT'
    || target.tagName === 'TEXTAREA'
    || target.tagName === 'SELECT'
    || target.isContentEditable
    || target.getAttribute('contenteditable') === 'true'
    || target.getAttribute('role') === 'textbox'
    || Boolean(target.closest('[cmdk-input]'))
}

/** Let a screen publish the handler for Cmd/Ctrl+Enter or Cmd/Ctrl+S. */
export function fireShortcutAction(action: ShortcutAction) {
  window.dispatchEvent(new CustomEvent<ShortcutAction>(ACTION_EVENT, { detail: action }))
}

export function useShortcutAction(action: ShortcutAction, handler: () => void) {
  useEffect(() => {
    const listener = (event: Event) => {
      if ((event as CustomEvent<ShortcutAction>).detail === action) handler()
    }
    window.addEventListener(ACTION_EVENT, listener)
    return () => window.removeEventListener(ACTION_EVENT, listener)
  }, [action, handler])
}

const GO_TARGETS: Record<string, string> = {
  s: '/app/people/students',
  d: '/app/dashboard',
  a: '/app/activities',
  n: '/app/notifications',
}

export interface GlobalShortcutHandlers {
  onPalette: () => void
  onHelp: () => void
  onQuickAdd: () => void
  onGo: (path: string) => void
  onEscape?: () => void
}

/**
 * One window-level keydown listener for the whole app. Modified shortcuts work
 * even while typing ( Cmd+K / Cmd+S / Cmd+Enter ); plain-letter shortcuts and
 * the G chord are suspended inside inputs, textareas and the command palette.
 */
export function useGlobalShortcuts({
  onPalette, onHelp, onQuickAdd, onGo, onEscape,
}: GlobalShortcutHandlers) {
  const chord = useRef(false)
  const chordTimer = useRef<number | undefined>(undefined)

  const clearChord = () => {
    chord.current = false
    window.clearTimeout(chordTimer.current)
  }

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey) return
      const modified = event.metaKey || event.ctrlKey
      const key = event.key.toLowerCase()

      if (modified) {
        if (key === 'k') { event.preventDefault(); onPalette(); clearChord(); return }
        if (key === 'enter') { event.preventDefault(); fireShortcutAction('primary'); return }
        if (key === 's') { event.preventDefault(); fireShortcutAction('save'); return }
        return
      }

      if (isTypingTarget(event.target)) return

      if (chord.current) {
        clearChord()
        const target = GO_TARGETS[key]
        if (target) { event.preventDefault(); onGo(target) }
        return
      }

      switch (event.key) {
        case '/':
          event.preventDefault()
          onPalette()
          break
        case '?':
          event.preventDefault()
          onHelp()
          break
        case 'n':
        case 'N':
          event.preventDefault()
          onQuickAdd()
          break
        case 'g':
        case 'G':
          chord.current = true
          chordTimer.current = window.setTimeout(clearChord, 1500)
          break
        case 'Escape':
          clearChord()
          onEscape?.()
          break
        default:
          clearChord()
      }
    }

    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
      window.clearTimeout(chordTimer.current)
    }
  }, [onEscape, onGo, onHelp, onPalette, onQuickAdd])
}
