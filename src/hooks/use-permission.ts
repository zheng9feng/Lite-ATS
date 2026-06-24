import { useAuthStore } from '@/stores/auth-store'
import { type AppPermission, hasEveryPermission } from '@/lib/permissions'

export function useCan(requiredPermissions: AppPermission[]) {
  const permissions = useAuthStore((state) => state.auth.permissions)

  return hasEveryPermission(permissions, requiredPermissions)
}
