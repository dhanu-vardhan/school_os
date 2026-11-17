import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { Button, Badge } from '@schoolos/ui'
import { MockNotice, QueryState, ScreenError } from '../components/Screen'
import { renderApp } from './utils'

describe('Button', () => {
  it('renders asChild with a single link child (Slot regression)', () => {
    renderApp(<Button asChild variant="outline"><a href="/app/dashboard">Voir</a></Button>)
    const link = screen.getByRole('link', { name: 'Voir' })
    expect(link).toHaveAttribute('href', '/app/dashboard')
    expect(link).toHaveClass('focus-ring')
  })

  it('shows a spinner when loading without asChild', () => {
    renderApp(<Button loading>Enregistrer</Button>)
    expect(screen.getByRole('button', { name: /Enregistrer/ })).toHaveAttribute('aria-busy', 'true')
  })
})

describe('QueryState', () => {
  it('does not evaluate data-dependent children while loading', () => {
    const renderContent = vi.fn(() => <div>Contenu chargé</div>)
    const { container } = renderApp(<QueryState isLoading>{renderContent}</QueryState>)
    expect(renderContent).not.toHaveBeenCalled()
    expect(within(container).getByRole('status')).toBeInTheDocument()
  })

  it('renders children once loaded', () => {
    renderApp(<QueryState isLoading={false}><div>Contenu chargé</div></QueryState>)
    expect(screen.getByText('Contenu chargé')).toBeInTheDocument()
  })

  it('renders the empty state when requested', () => {
    renderApp(<QueryState isLoading={false} isEmpty><div>ignored</div></QueryState>)
    expect(screen.getByText(/Rien à afficher/)).toBeInTheDocument()
  })

  it('renders errors with a retry action', () => {
    const retry = vi.fn()
    renderApp(<ScreenError error={{ code: 'NETWORK', message: 'Réseau indisponible' }} onRetry={retry} />)
    expect(screen.getByText('Réseau indisponible')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Réessayer/ })).toBeInTheDocument()
  })
})

describe('MockNotice', () => {
  it('is hidden for real API data and visible for mock data', () => {
    const { rerender } = renderApp(<MockNotice mock={false} />)
    expect(screen.queryByText('Données fictives')).not.toBeInTheDocument()
    rerender(<MockNotice mock />)
    expect(screen.getByText(/Données fictives/)).toBeInTheDocument()
  })

  it('never renders a tenant id', () => {
    renderApp(<><Badge tone="brand">Établissement</Badge><MockNotice mock /></>)
    expect(document.body).not.toHaveTextContent('school-id')
  })
})
