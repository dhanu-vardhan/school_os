import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { demoLogin, sessionStore } from '@schoolos/api-client'
import { setLocale } from '@schoolos/i18n'
import App from '../App'
import { renderApp } from './utils'

async function signIn(role = 'director') {
  await demoLogin(role)
  await waitFor(() => expect(sessionStore.user?.roles).toContain(role))
}

describe('authentication and dashboards', () => {
  it('shows the demo profile picker and signs in as director', async () => {
    const user = userEvent.setup()
    renderApp(<App />, { route: '/login' })

    expect(await screen.findByRole('heading', { name: 'Bon retour !' })).toBeInTheDocument()
    expect(screen.getByText('Mode démonstration — données fictives, aucun service réel contacté.')).toBeInTheDocument()
    const directorButton = await screen.findByRole('button', { name: /Camille Durand/ })
    expect(directorButton).toBeInTheDocument()

    await user.click(directorButton)
    expect(await screen.findByRole('heading', { name: 'Bonjour, Camille' })).toBeInTheDocument()
    expect(screen.getAllByText(/Données fictives/).length).toBeGreaterThan(0)
  })

  it('redirects unauthenticated users to login', async () => {
    renderApp(<App />, { route: '/app/people/students' })
    expect(await screen.findByRole('heading', { name: 'Bon retour !' })).toBeInTheDocument()
  })
})

describe('students screen', () => {
  it('renders the roster with mock notice and no tenant identifier', async () => {
    await signIn()
    renderApp(<App />, { route: '/app/people/students' })

    expect(await screen.findByRole('heading', { name: 'Élèves', level: 1 })).toBeInTheDocument()
    expect((await screen.findAllByText(/Léa Martin/)).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Données fictives/).length).toBeGreaterThan(0)
    expect(document.body).not.toHaveTextContent('school_id')
    expect(document.body).not.toHaveTextContent('X-School-Id')
  })

  it('opens a student profile', async () => {
    await signIn()
    renderApp(<App />, { route: '/app/people/students/stu-1' })
    expect(await screen.findByRole('heading', { name: 'Léa Martin', level: 1 })).toBeInTheDocument()
  })
})

describe('safeguarding screen', () => {
  it('shows reference and status only, never the restricted summary', async () => {
    await signIn()
    renderApp(<App />, { route: '/app/safeguarding' })

    expect(await screen.findByText('SC-2026-014')).toBeInTheDocument()
    expect(screen.getAllByText('Accès restreint').length).toBeGreaterThan(0)
    expect(document.body).not.toHaveTextContent('Concern record — content restricted to authorised roles.')
    expect(document.body).not.toHaveTextContent('L.M.')
  })
})

describe('AI suggestions screen', () => {
  it('labels every output as a draft requiring review', async () => {
    await signIn()
    renderApp(<App />, { route: '/app/ai/suggestions' })

    expect(await screen.findByRole('heading', { name: 'Suggestions IA', level: 1 })).toBeInTheDocument()
    expect(screen.getAllByText(/Généré par IA/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/à vérifier/).length).toBeGreaterThan(0)
  })
})

describe('role-aware navigation', () => {
  it('denies platform administration to a director', async () => {
    await signIn('director')
    renderApp(<App />, { route: '/app/platform/flags' })
    expect(await screen.findByRole('heading', { name: 'Accès refusé' })).toBeInTheDocument()
  })

  it('allows platform administration to the platform operator', async () => {
    await signIn('operator')
    renderApp(<App />, { route: '/app/platform/flags' })
    expect(await screen.findByRole('heading', { name: /Fonctionnalités/ })).toBeInTheDocument()
  })
})

describe('localisation', () => {
  it('switches interface copy from French to English', async () => {
    await setLocale('en')
    const user = userEvent.setup()
    await signIn()
    renderApp(<App />, { route: '/app/people/students' })

    expect(await screen.findByRole('heading', { name: 'Students', level: 1 })).toBeInTheDocument()
    const languageButton = screen.getByRole('button', { name: 'Language' })
    await user.click(languageButton)
    expect(await screen.findByRole('menuitem', { name: /Français/ })).toBeInTheDocument()
    await setLocale('fr')
  })

  it('keeps the same student names in both locales', async () => {
    await setLocale('en')
    await signIn()
    const { unmount } = renderApp(<App />, { route: '/app/people/students/stu-1' })
    expect(await screen.findByRole('heading', { name: 'Léa Martin', level: 1 })).toBeInTheDocument()
    unmount()
    await setLocale('fr')
    renderApp(<App />, { route: '/app/people/students/stu-1' })
    expect(await screen.findByRole('heading', { name: 'Léa Martin', level: 1 })).toBeInTheDocument()
  })
})
