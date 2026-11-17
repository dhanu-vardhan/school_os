import { can, permissionsFor, type Permission } from '@schoolos/shared'
import { useSession } from './session'

export function useCan(permission: Permission): boolean {
  const { role } = useSession()
  return can(role, permission)
}

export function usePermissions(): Permission[] {
  const { role } = useSession()
  return permissionsFor(role)
}
