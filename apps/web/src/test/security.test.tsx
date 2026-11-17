import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { demoLogin, logout, sessionStore } from '@schoolos/api-client'
import { setLocale } from '@schoolos/i18n'
import App from '../App'
import { renderApp } from './utils'

async function signIn(role = 'director') {
  await demoLogin(role)
  await waitFor(() => expect(sessionStore.user?.roles).toContain(role))
}

describe('account and security', () => {
  it('shows MFA status, active sessions and the security log', async () => {
    await signIn('director')
    renderApp(<App />, { route: '/app/account/security' })

    expect(await screen.findByRole('heading', { name: 'Compte & sécurité', level: 1 })).toBeInTheDocument()
    expect((await screen.findAllByText('Authentification à deux facteurs')).length).toBeGreaterThan(0)
    expect(await screen.findByText('Sessions actives')).toBeInTheDocument()
    expect(await screen.findByText('login.success')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /Se déconnecter partout/ })).toBeInTheDocument()
  })

  it('lets a privileged role open the security centre', async () => {
    await signIn('director')
    renderApp(<App />, { route: '/app/security' })

    expect(await screen.findByRole('heading', { name: 'Centre de sécurité', level: 1 })).toBeInTheDocument()
    expect(await screen.findByText('Chaîne d’audit')).toBeInTheDocument()
    expect(await screen.findByText('Intègre (42 événements)')).toBeInTheDocument()
  })

  it('denies the security centre to a teacher', async () => {
    await signIn('teacher')
    renderApp(<App />, { route: '/app/security' })
    expect(await screen.findByRole('heading', { name: 'Accès refusé' })).toBeInTheDocument()
  })

  it('shows the password recovery flow', async () => {
    await logout()
    const user = userEvent.setup()
    renderApp(<App />, { route: '/forgot-password' })

    expect(await screen.findByRole('heading', { name: 'Mot de passe oublié ?' })).toBeInTheDocument()
    await user.type(screen.getByLabelText(/Adresse e-mail/), 'direction@demo.schoolos.invalid')
    await user.click(screen.getByRole('button', { name: 'Envoyer le lien' }))
    expect(await screen.findByText('Demande envoyée')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Continuer la réinitialisation (démo)' })).toHaveAttribute('href', expect.stringContaining('/reset-password?token='))
  })

  it('keeps security copy localised in English', async () => {
    await setLocale('en')
    await signIn('director')
    renderApp(<App />, { route: '/app/account/security' })
    expect(await screen.findByRole('heading', { name: 'Account & security', level: 1 })).toBeInTheDocument()
    await setLocale('fr')
  })
})
