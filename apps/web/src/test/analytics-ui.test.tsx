import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import {
  createAnalyticsExport, demoLogin, getAnalyticsDictionary, getAnalyticsOverview,
  getAnalyticsSeries, getAnalyticsTable, saveTarget, sessionStore,
} from '@schoolos/api-client'
import { AnalyticsChart, MetricCard } from '@schoolos/ui'
import App from '../App'
import { useAnalyticsFilters, toAnalyticsQuery } from '../app/analytics'
import { renderApp } from './utils'

async function signIn(role: string) {
  await demoLogin(role)
  await waitFor(() => expect(sessionStore.user?.roles).toContain(role === 'guardian' ? 'parent' : role))
}

describe('governed analytics API contract (flagged mock)', () => {
  it('marks every payload as mock and reports that no upstream source is available', async () => {
    await signIn('director')
    const response = await getAnalyticsOverview({ dashboard: 'principal' })

    expect(response.data.meta.mock).toBe(true)
    expect(response.data.meta.suppressionThreshold).toBe(5)
    expect(response.data.data.freshness.mock).toBe(true)
    expect(response.data.data.freshness.sourceAvailable).toBe(false)
    expect(response.data.data.freshness.refreshState).toBe('demo')
  })

  it('scopes metrics and class filters to the caller role', async () => {
    await signIn('teacher')
    const dictionary = await getAnalyticsDictionary()
    // The mock wraps the dictionary in the same { data, meta } envelope as the API.
    const ids = (dictionary.data as unknown as { data: { metricIds: string[] } }).data.metricIds
    expect(ids).toContain('attendance.rate')
    expect(ids).not.toContain('finance.collection_rate')

    const allowed = await getAnalyticsSeries({ metric: 'attendance.rate', classId: 'c-6e' })
    expect(allowed.data.meta.mock).toBe(true)

    await expect(getAnalyticsSeries({ metric: 'attendance.rate', classId: 'c-cp' }))
      .rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' })
    await expect(getAnalyticsSeries({ metric: 'finance.collection_rate' }))
      .rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' })
  })

  it('enforces pagination bounds and suppression metadata', async () => {
    await signIn('director')
    const response = await getAnalyticsTable({ metric: 'attendance.rate', page: 1, pageSize: 999 })
    expect(response.data.data.pageSize).toBeLessThanOrEqual(100)
    expect(response.data.data.pageSize).toBeGreaterThanOrEqual(5)
    expect(response.data.meta.suppressionThreshold).toBe(5)
    expect(response.data.meta).toHaveProperty('suppressedCells')
  })

  it('requires fresh step-up for exports and rejects target writes from non-head roles', async () => {
    await signIn('director')
    const queued = await createAnalyticsExport({ metricId: 'attendance.rate', format: 'csv' })
    expect(queued.data.data.watermark).toMatch(/Confidential/)
    expect(queued.data.meta.explain).toMatchObject({ stepUpVerified: true })

    const user = sessionStore.user!
    const original = user.stepUpUntil
    user.stepUpUntil = 0
    await expect(createAnalyticsExport({ metricId: 'attendance.rate' }))
      .rejects.toMatchObject({ status: 403, code: 'STEP_UP_REQUIRED' })
    user.stepUpUntil = original

    await signIn('guardian')
    await expect(saveTarget({ metricId: 'attendance.rate', value: 99 }))
      .rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' })
  })
})

describe('accessible analytics presentation', () => {
  it('gives every chart a spoken summary and a table alternative with sample sizes', async () => {
    render(
      <AnalyticsChart
        points={[
          { label: '6e', value: 94.2, n: 142, key: '6e', ci: { lower: 91, upper: 96, method: 'wilson-95' } },
          { label: 'Autres', value: 0, n: 3, key: 'other', suppressed: true },
        ]}
        ariaSummary="Présence par niveau : 6e 94,2 %, n=142 ; un groupe masqué."
        tableLabel="Voir le tableau de données"
      />,
    )

    const visual = screen.getByRole('img', { name: /n=142/ })
    expect(visual).toBeInTheDocument()
    expect(screen.getByLabelText(/n = 142/)).toHaveAttribute('title', expect.stringContaining('n = 142'))
    fireEvent.click(screen.getByText('Voir le tableau de données'))
    const table = screen.getByRole('table')
    expect(table).toHaveAccessibleName(/Présence par niveau/)
    expect(table).toHaveTextContent('142')
    expect(table).toHaveTextContent('masqué')
    expect(table).toHaveTextContent('94.2') // numeric table cell; the caption carries the question wording
    expect(table).toHaveTextContent('94,2 %')
  })

  it('never prints a suppressed value and always prints the sample size', () => {
    render(<MetricCard label="Effectif faible" value="87,5 %" n={3} suppressed mock dataAsOf="2026-11-17T06:00:00Z" />)
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.getByText('Données masquées')).toBeInTheDocument()
    expect(screen.getByText(/n = 3/)).toBeInTheDocument()
    expect(screen.queryByText('87,5 %')).not.toBeInTheDocument()
    expect(screen.getByText('Démo')).toBeInTheDocument()
  })
})

describe('URL-synced analytics filters', () => {
  function Harness({ storageKey }: { storageKey: string }) {
    const filters = useAnalyticsFilters(storageKey)
    const location = useLocation()
    return (
      <div>
        <output data-testid="search">{location.search}</output>
        <output data-testid="value">{JSON.stringify(filters.value)}</output>
        <button onClick={() => filters.update({ year: '2025-26', classId: 'c-6e' })}>apply</button>
        <button onClick={() => filters.reset()}>reset</button>
        <button onClick={() => filters.saveView('Vue A')}>save</button>
        <button onClick={() => filters.loadView(filters.views[0]?.id ?? '')}>load</button>
      </div>
    )
  }

  it('uses the URL as the single source of truth and never writes filters to browser storage', () => {
    const key = `test-${Date.now()}`
    render(<MemoryRouter initialEntries={['/app/analytics?term=T1']}><Harness storageKey={key} /></MemoryRouter>)
    const storageBefore = JSON.stringify(Object.fromEntries(Object.entries(window.localStorage).sort()))

    expect(screen.getByTestId('value')).toHaveTextContent('"term":"T1"')
    fireEvent.click(screen.getByText('apply'))
    expect(screen.getByTestId('search')).toHaveTextContent('term=T1')
    expect(screen.getByTestId('search')).toHaveTextContent('year=2025-26')
    expect(screen.getByTestId('value')).toHaveTextContent('"classId":"c-6e"')

    fireEvent.click(screen.getByText('save'))
    fireEvent.click(screen.getByText('reset'))
    expect(screen.getByTestId('search')).toBeEmptyDOMElement()
    fireEvent.click(screen.getByText('load'))
    expect(screen.getByTestId('search')).toHaveTextContent('year=2025-26')

    expect(JSON.stringify(Object.fromEntries(Object.entries(window.localStorage).sort()))).toBe(storageBefore)
    expect(window.sessionStorage.length).toBe(0)
    expect(toAnalyticsQuery({ year: '2025-26', grain: 'week' })).toEqual({
      year: '2025-26', term: undefined, classId: undefined, level: undefined,
      subject: undefined, grain: 'week', from: undefined, to: undefined,
    })
  })
})

describe('role-scoped dashboards', () => {
  it('renders the director dashboard with mock disclosure and a question-led chart', async () => {
    await signIn('director')
    renderApp(<App />, { route: '/app/analytics' })

    expect(await screen.findByRole('heading', { name: 'Pilotage', level: 1 })).toBeInTheDocument()
    expect(screen.getAllByText('Données fictives').length).toBeGreaterThan(0)
    expect(await screen.findByText('Données de démonstration synthétiques. Aucune décision automatique.')).toBeInTheDocument()
    const visuals = await screen.findAllByRole('img')
    expect(visuals[0]).toHaveAttribute('aria-label', expect.stringContaining('n='))
    expect(document.body).not.toHaveTextContent('school_id')
  })

  it('hides finance metrics from a teacher and denies roles without analytics.read', async () => {
    await signIn('teacher')
    const { unmount } = renderApp(<App />, { route: '/app/analytics' })
    expect(await screen.findByRole('heading', { name: 'Pilotage', level: 1 })).toBeInTheDocument()
    expect(screen.queryByText(/Taux de recouvrement/)).not.toBeInTheDocument()
    unmount()

    await signIn('provider')
    renderApp(<App />, { route: '/app/analytics' })
    expect(await screen.findByRole('heading', { name: 'Accès refusé' })).toBeInTheDocument()
  })

  it('disables export until step-up is active', async () => {
    await signIn('director')
    sessionStore.user!.stepUpUntil = 0
    renderApp(<App />, { route: '/app/analytics' })

    const button = await screen.findByRole('button', { name: 'Exporter' })
    await waitFor(() => expect(button).toBeDisabled())
    expect(screen.getByText(/vérification renforcée/)).toBeInTheDocument()
  })
})
