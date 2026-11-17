import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  fireShortcutAction, isTypingTarget, useGlobalShortcuts, useShortcutAction,
} from '../app/shortcuts'

function ShortcutHarness({ onPalette, onHelp, onQuickAdd, onGo, onEscape }: {
  onPalette: () => void
  onHelp: () => void
  onQuickAdd: () => void
  onGo: (path: string) => void
  onEscape?: () => void
}) {
  useGlobalShortcuts({ onPalette, onHelp, onQuickAdd, onGo, onEscape })
  return <input aria-label="search box" />
}

function ActionHarness({ onPrimary, onSave }: { onPrimary: () => void; onSave: () => void }) {
  useShortcutAction('primary', onPrimary)
  useShortcutAction('save', onSave)
  return null
}

function setup(overrides: Partial<Parameters<typeof ShortcutHarness>[0]> = {}) {
  const handlers = {
    onPalette: vi.fn(),
    onHelp: vi.fn(),
    onQuickAdd: vi.fn(),
    onGo: vi.fn(),
    onEscape: vi.fn(),
    ...overrides,
  }
  render(<ShortcutHarness {...handlers} />)
  return handlers
}

const key = (value: string, init: KeyboardEventInit = {}) => fireEvent.keyDown(window, { key: value, ...init })

describe('isTypingTarget', () => {
  it('detects text inputs, textareas, editable regions and the command palette', () => {
    expect(isTypingTarget(document.createElement('input'))).toBe(true)
    expect(isTypingTarget(document.createElement('textarea'))).toBe(true)
    expect(isTypingTarget(document.createElement('select'))).toBe(true)

    const editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')
    expect(isTypingTarget(editable)).toBe(true)

    const textbox = document.createElement('div')
    textbox.setAttribute('role', 'textbox')
    expect(isTypingTarget(textbox)).toBe(true)

    const cmdk = document.createElement('input')
    cmdk.setAttribute('cmdk-input', '')
    expect(isTypingTarget(cmdk)).toBe(true)
  })

  it('does not treat content or null as typing targets', () => {
    expect(isTypingTarget(document.createElement('div'))).toBe(false)
    expect(isTypingTarget(document.createElement('button'))).toBe(false)
    expect(isTypingTarget(null)).toBe(false)
  })
})

describe('useGlobalShortcuts', () => {
  it('opens the palette with both Cmd+K and /', () => {
    const { onPalette } = setup()
    key('k', { metaKey: true })
    key('/')
    expect(onPalette).toHaveBeenCalledTimes(2)
  })

  it('opens help, quick add and the G chord targets', () => {
    const { onHelp, onQuickAdd, onGo } = setup()
    key('?')
    key('N')
    key('g')
    key('s')
    expect(onHelp).toHaveBeenCalledOnce()
    expect(onQuickAdd).toHaveBeenCalledOnce()
    expect(onGo).toHaveBeenCalledWith('/app/people/students')
    key('g')
    key('d')
    expect(onGo).toHaveBeenLastCalledWith('/app/dashboard')
  })

  it('resets the G chord after the timeout window', () => {
    vi.useFakeTimers()
    try {
      const { onGo } = setup()
      key('g')
      act(() => { vi.advanceTimersByTime(1600) })
      key('s')
      expect(onGo).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('ignores plain-letter shortcuts while typing but keeps modified shortcuts', () => {
    const { onPalette, onQuickAdd, onGo } = setup()
    const input = screen.getByLabelText('search box')
    fireEvent.keyDown(input, { key: 'n' })
    fireEvent.keyDown(input, { key: 'g' })
    fireEvent.keyDown(input, { key: 's' })
    expect(onQuickAdd).not.toHaveBeenCalled()
    expect(onGo).not.toHaveBeenCalled()
    fireEvent.keyDown(input, { key: 'k', metaKey: true })
    expect(onPalette).toHaveBeenCalledOnce()
  })

  it('forwards Escape and does not prevent default for unrelated keys', () => {
    const { onEscape } = setup()
    key('Escape')
    expect(onEscape).toHaveBeenCalledOnce()
    const event = new KeyboardEvent('keydown', { key: 'z', cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })
})

describe('screen shortcut actions', () => {
  it('routes Cmd/Ctrl+Enter and Cmd/Ctrl+S to registered screen handlers', () => {
    const onPrimary = vi.fn()
    const onSave = vi.fn()
    render(
      <>
        <ShortcutHarness onPalette={vi.fn()} onHelp={vi.fn()} onQuickAdd={vi.fn()} onGo={vi.fn()} />
        <ActionHarness onPrimary={onPrimary} onSave={onSave} />
      </>,
    )

    key('Enter', { metaKey: true })
    key('s', { ctrlKey: true })
    expect(onPrimary).toHaveBeenCalledOnce()
    expect(onSave).toHaveBeenCalledOnce()
  })

  it('supports manual dispatch for screen-level actions', () => {
    const onPrimary = vi.fn()
    render(<ActionHarness onPrimary={onPrimary} onSave={vi.fn()} />)
    fireShortcutAction('primary')
    expect(onPrimary).toHaveBeenCalledOnce()
  })
})
