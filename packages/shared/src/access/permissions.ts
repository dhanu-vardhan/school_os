/**
 * Fine-grained permission helpers. The canonical implementation lives in `../roles` so the whole
 * frontend shares one `can()`; this module is the access-layer facade required by the Part 7 spec.
 */
import { permissionsFor, type Permission } from '../roles'

export { can, canAccess, normalisePermission, permissionsFor } from '../roles'
export type { Permission, PermissionInput, AccessUser, AccessResource } from '../roles'

/** Read-only role → permission matrix, handy for settings screens and tests. */
export const ROLE_PERMISSIONS: (role: string | undefined) => Permission[] = permissionsFor
