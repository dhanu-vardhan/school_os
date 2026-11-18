import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import { useDashboard } from '../state/DashboardContext'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function DashboardShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { toast } = useDashboard()

  return (
    <div className="ds">
      <button
        className={`ds-scrim ${menuOpen ? 'is-open' : ''}`}
        aria-label="Fermer le menu"
        tabIndex={menuOpen ? 0 : -1}
        onClick={() => setMenuOpen(false)}
      />
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="ds-main">
        <Topbar onOpenMenu={() => setMenuOpen(true)} />
        <main className="ds-content" id="main-content">
          <Outlet />
        </main>
      </div>
      {toast && <div className="ds-toast" role="status"><CheckCircle2 size={15} />{toast}</div>}
    </div>
  )
}
