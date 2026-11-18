import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { demoLogin } from '@schoolos/api-client'
import App from '../App'
import { renderApp } from './utils'

describe('guardian portal', () => {
  it('lands on /family with only the guardian children', async () => {
    await demoLogin('guardian')
    renderApp(<App />, { route: '/family' })

    expect(await screen.findByRole('heading', { name: 'Espace famille', level: 1 })).toBeInTheDocument()
    expect((await screen.findAllByText(/Léa Martin/)).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Tom Martin/).length).toBeGreaterThan(0)
    // Another family's child must never appear on the guardian dashboard.
    expect(screen.queryByText(/Jade Petit/)).not.toBeInTheDocument()
    expect(document.body).not.toHaveTextContent('school_id')
  })

  it('sends the legacy /parent URL to the family landing', async () => {
    await demoLogin('guardian')
    renderApp(<App />, { route: '/parent' })
    expect(await screen.findByRole('heading', { name: 'Espace famille', level: 1 })).toBeInTheDocument()
  })

  it('shows pending authorisations with the signature rule', async () => {
    await demoLogin('guardian')
    renderApp(<App />, { route: '/family/forms' })

    expect(await screen.findByRole('heading', { name: 'Autorisations et formulaires', level: 1 })).toBeInTheDocument()
    expect((await screen.findAllByText(/Sortie au musée d’Orsay/)).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Les deux responsables légaux doivent signer.').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/TODO\(legal-review\)/).length).toBeGreaterThan(0)
  })

  it('bounds a separated guardian to the shared child and shows restrictions', async () => {
    await demoLogin('guardian2')
    renderApp(<App />, { route: '/family/children' })

    expect(await screen.findByRole('heading', { name: 'Mes enfants', level: 1 })).toBeInTheDocument()
    expect(await screen.findByText(/Tom Martin/)).toBeInTheDocument()
    expect(screen.queryByText(/Léa Martin/)).not.toBeInTheDocument()
  })

  it('shows the informative absence threshold and declarations', async () => {
    await demoLogin('guardian')
    renderApp(<App />, { route: '/family/attendance' })

    expect(await screen.findByRole('heading', { name: 'Présences et absences', level: 1 })).toBeInTheDocument()
    expect((await screen.findAllByText(/Seuil d’alerte/)).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /Déclarer une absence/ })).toBeInTheDocument()
  })

  it('keeps the family navigation and no teacher landing for parents', async () => {
    await demoLogin('guardian')
    renderApp(<App />, { route: '/family' })
    expect((await screen.findAllByRole('link', { name: /Mes enfants/ })).length).toBeGreaterThan(0)
    expect(screen.queryByRole('link', { name: /Élèves/ })).not.toBeInTheDocument()
  })

  it('renders billing with split-payer invoices only', async () => {
    await demoLogin('guardian2')
    renderApp(<App />, { route: '/family/billing' })

    expect(await screen.findByRole('heading', { name: 'Facturation', level: 1 })).toBeInTheDocument()
    expect(await screen.findByText(/Sortie musée d’Orsay/)).toBeInTheDocument()
    expect(screen.queryByText(/Garderie — Novembre 2026/)).not.toBeInTheDocument()
  })
})

describe('guardian portal access control', () => {
  it('denies the family portal to staff roles', async () => {
    await demoLogin('teacher')
    renderApp(<App />, { route: '/family' })
    expect(await screen.findByText(/Accès refusé|forbidden|403/i)).toBeInTheDocument()
  })
})
