import { lazy, StrictMode, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, useLocation } from 'react-router-dom'
import { initI18n } from '@schoolos/i18n'
import App from './App'
import { AppProviders } from './app/AppProviders'
import './index.css'

const DashboardApp = lazy(() => import('./dashboard/DashboardApp'))

initI18n()

/** Static-fixture showcase; no tenant data, storage or backend access. */
function Root() {
  const location = useLocation()
  if (!location.pathname.startsWith('/insights')) return <App />
  return (
    <Suspense fallback={<div style={{ padding: 32, fontFamily: 'Inter, system-ui, sans-serif' }}>Chargement du tableau de bord…</div>}>
      <DashboardApp />
    </Suspense>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppProviders>
        <Root />
      </AppProviders>
    </BrowserRouter>
  </StrictMode>,
)
