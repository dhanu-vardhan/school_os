import { Outlet } from 'react-router-dom'
import { FamilyProvider } from './context'

/**
 * Family portal shell. The global navigation already exposes the `/family/*` tree; this
 * layout only installs the guardian context so every page reads the same child scope.
 */
export function FamilyLayout() {
  return (
    <FamilyProvider>
      <Outlet />
    </FamilyProvider>
  )
}
