import { ChevronRight, Home } from 'lucide-react'
import { Link } from 'react-router-dom'

export interface Crumb { label: string; to?: string }

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-content-subtle">
      <Link to="/app/dashboard" aria-label="Home" className="focus-ring rounded p-1 hover:bg-surface-2 hover:text-content">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3" aria-hidden />
          {item.to ? (
            <Link to={item.to} className="focus-ring rounded px-1 hover:text-content hover:underline">{item.label}</Link>
          ) : (
            <span className="px-1 font-medium text-content-muted" aria-current="page">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
