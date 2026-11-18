import { Bell, Menu, Search } from 'lucide-react'
import { useDashboard } from '../state/DashboardContext'
import type { Period } from '../domain/models'

const periods: { value: Period; label: string }[] = [
  { value: '30d', label: '30 j' },
  { value: '90d', label: '90 j' },
  { value: '12m', label: '12 m' },
]

export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { period, setPeriod, query, setQuery, notify } = useDashboard()

  return (
    <header className="ds-topbar">
      <button className="ds-icon-btn ds-menu-btn" onClick={onOpenMenu} aria-label="Ouvrir le menu">
        <Menu size={17} />
      </button>
      <div className="ds-search">
        <Search size={15} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher une famille, une facture..."
          aria-label="Rechercher"
        />
      </div>
      <div className="ds-topbar-spacer" />
      <div className="ds-segmented" role="group" aria-label="Periode d analyse">
        {periods.map((item) => (
          <button
            key={item.value}
            type="button"
            className={period === item.value ? 'active' : ''}
            aria-pressed={period === item.value}
            onClick={() => setPeriod(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <button className="ds-icon-btn" aria-label="Notifications" onClick={() => notify('Aucune nouvelle notification')}>
        <Bell size={16} />
        <span className="ds-dot" aria-hidden="true" />
      </button>
      <div className="ds-avatar" title="Administrateur">AD</div>
    </header>
  )
}
