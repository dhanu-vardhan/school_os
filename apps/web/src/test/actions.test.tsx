import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  Button, BulkActionBar, ButtonGroup, CopyButton, DropdownMenu, RowActions, SegmentedControl,
} from '@schoolos/ui'
import { renderApp } from './utils'

afterEach(() => vi.restoreAllMocks())

describe('Button action system', () => {
  it('announces a disabled reason and blocks clicks', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    renderApp(<Button disabled disabledReason="Publication requise" onClick={onClick}>Enregistrer</Button>)
    const button = screen.getByRole('button', { name: /Enregistrer/ })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-describedby')
    expect(button.parentElement).toHaveAttribute('title', 'Publication requise')
    expect(screen.getByText('Publication requise')).toHaveClass('ui-sr-only')
    await user.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('keeps card-like actions keyboard accessible without preset button styling', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    renderApp(
      <Button variant="bare" onClick={onClick} aria-label="Open activity">
        <span>Chess club</span>
      </Button>,
    )
    const card = screen.getByRole('button', { name: 'Open activity' })
    expect(card).not.toHaveClass('bg-action-primary')
    expect(card).toHaveClass('focus-ring', 'ui-state')
    card.focus()
    await user.keyboard('{Enter}')
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('exposes shortcut hints to assistive technology', () => {
    renderApp(<Button shortcut="⌘S">Enregistrer l’emploi du temps</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('aria-keyshortcuts', '⌘S')
    expect(screen.getByText('⌘S').tagName).toBe('KBD')
  })

  it('keeps one tab stop in a ButtonGroup and skips disabled items', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    renderApp(
      <ButtonGroup label="Vue" items={[
        { id: 'day', label: 'Jour', onSelect },
        { id: 'hidden', label: 'Masqué', disabled: true, onSelect },
        { id: 'week', label: 'Semaine', onSelect },
      ]} />,
    )
    const toolbar = screen.getByRole('toolbar', { name: 'Vue' })
    const buttons = within(toolbar).getAllByRole('button')
    expect(buttons).toHaveLength(3)
    expect(buttons[0]).toHaveAttribute('tabindex', '0')
    expect(buttons[1]).toHaveAttribute('tabindex', '-1')
    buttons[0].focus()
    await user.keyboard('{ArrowRight}')
    expect(buttons[2]).toHaveFocus()
    expect(buttons[2]).toHaveAttribute('tabindex', '0')
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('moves selection with arrow keys in a SegmentedControl', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderApp(
      <SegmentedControl label="Vue" value="day" onValueChange={onChange}
        options={[{ value: 'day', label: 'Jour' }, { value: 'week', label: 'Semaine' }]} />,
    )
    const radios = screen.getAllByRole('radio')
    expect(radios[0]).toHaveAttribute('aria-checked', 'true')
    radios[0].focus()
    await user.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenCalledWith('week')
    expect(radios[1]).toHaveFocus()
  })
})

describe('Composite actions', () => {
  it('puts destructive menu items last and keeps shortcut hints', async () => {
    const user = userEvent.setup()
    renderApp(
      <DropdownMenu trigger={<Button>Ouvrir les actions</Button>} items={[
        { label: 'Supprimer le brouillon', danger: true, shortcut: '⌫' },
        { label: 'Modifier la classe', shortcut: '⌘E' },
      ]} />,
    )
    await user.click(screen.getByRole('button', { name: 'Ouvrir les actions' }))
    const items = await screen.findAllByRole('menuitem')
    expect(items[0]).toHaveTextContent('Modifier la classe')
    expect(items[items.length - 1]).toHaveTextContent('Supprimer le brouillon')
    expect(screen.getByText('⌘E')).toBeInTheDocument()
  })

  it('renders a selection summary and a clear action', async () => {
    const user = userEvent.setup()
    const onClear = vi.fn()
    const { container } = renderApp(
      <BulkActionBar count={2} onClear={onClear} actions={[{ label: 'Exporter la liste', onClick: vi.fn() }]} />,
    )
    expect(within(container).getByText('2 sélectionné(s)')).toBeVisible()
    await user.click(within(container).getByRole('button', { name: 'Effacer la sélection' }))
    expect(onClear).toHaveBeenCalledOnce()
  })

  it('exposes hidden row actions in a labelled menu', () => {
    renderApp(<RowActions items={[
      { label: 'Voir la fiche', icon: <span>Voir</span>, onSelect: vi.fn() },
      { label: 'Supprimer la fiche', danger: true, onSelect: vi.fn() },
    ]} />)
    expect(screen.getByRole('button', { name: 'Voir la fiche' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Autres actions' })).toBeVisible()
  })

  it('copies only the safe caller value and confirms without displaying it', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const { container } = renderApp(<CopyButton value="SC-DEMO-001" label="Copier la référence" />)
    await user.click(screen.getByRole('button', { name: /Copier la référence/ }))
    expect(writeText).toHaveBeenCalledWith('SC-DEMO-001')
    const status = container.querySelector('[role="status"].ui-sr-only')
    await waitFor(() => expect(status).toHaveTextContent('Copié'))
    expect(container.textContent).not.toContain('SC-DEMO-001')
  })
})
