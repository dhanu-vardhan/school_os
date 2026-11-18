import { Navigate, Route, Routes } from 'react-router-dom'
import { DashboardShell } from './components/DashboardShell'
import { AiPage } from './pages/AiPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { CustomersPage } from './pages/CustomersPage'
import { OverviewPage } from './pages/OverviewPage'
import { RevenuePage } from './pages/RevenuePage'
import { SettingsPage } from './pages/SettingsPage'
import { DashboardProvider } from './state/DashboardContext'
import './dashboard.css'

export default function DashboardApp() {
  return (
    <DashboardProvider>
      <Routes>
        <Route path="/insights" element={<DashboardShell />}>
          <Route index element={<OverviewPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="revenue" element={<RevenuePage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="ai" element={<AiPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/insights" replace />} />
        </Route>
      </Routes>
    </DashboardProvider>
  )
}
