import { BarChart3, LayoutDashboard, Settings, Sparkles, Users, Wallet, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useDashboard } from '../state/DashboardContext'

const mainNav = [
  { to: '/insights', label: 'Vue d ensemble', icon: LayoutDashboard, end: true },
  { to: '/insights/analytics', label: 'Analytics', icon: BarChart3, end: false },
  { to: '/insights/revenue', label: 'Revenu', icon: Wallet, end: false },
  { to: '/insights/customers', label: 'Familles', icon: Users, end: false },
]

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { drafts } = useDashboard()
  const pending = drafts.filter((draft) => draft.status === 'draft').length

  return (
    <aside className={`ds-sidebar ${open ? 'is-open' : ''}`} aria-label="Navigation principale">
      <div className="ds-brand">
        <div className="ds-brand-mark" aria-hidden="true">S</div>
        <div>
          <div className="ds-brand-name">SchoolOS Insights</div>
          <div className="ds-brand-sub">Espace direction</div>
        </div>
        <button className="ds-icon-btn" style={{ marginLeft: 'auto', background: 'transparent', borderColor: '#2a3853', color: '#cbd5e1' }} onClick={onClose} aria-label="Fermer le menu">
          <X size={16} />
        </button>
      </div>

      <nav className="ds-nav-group" aria-label="Pilotage">
        <div className="ds-nav-label">Pilotage</div>
        {mainNav.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `ds-nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="ds-nav-icon"><Icon size={17} aria-hidden="true" /></span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <nav className="ds-nav-group" aria-label="Assistance">
        <div className="ds-nav-label">Assistance</div>
        <NavLink to="/insights/ai" className={({ isActive }) => `ds-nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
          <span className="ds-nav-icon"><Sparkles size={17} aria-hidden="true" /></span>
          <span>Recommandations IA</span>
          {pending > 0 && <span className="ds-nav-count">{pending}</span>}
        </NavLink>
        <NavLink to="/insights/settings" className={({ isActive }) => `ds-nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
          <span className="ds-nav-icon"><Settings size={17} aria-hidden="true" /></span>
          <span>Parametres</span>
        </NavLink>
      </nav>

      <div className="ds-sidebar-foot">
        <strong>Etablissement demo</strong>
        Donnees fictives · 12 etablissements
      </div>
    </aside>
  )
}
