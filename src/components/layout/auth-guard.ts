import { getLoginRedirectTarget } from '@/lib/login-redirect'
import { type AppPermission, hasEveryPermission } from '@/lib/permissions'

type AuthGuardDecision =
  | { type: 'allow' }
  | { type: 'forbidden' }
  | { redirect: string; type: 'redirect-to-login' }

type AuthGuardInput = {
  currentHref: string
  hasSession: boolean
  permissions: string[]
  requiredPermissions: AppPermission[]
}

export function getAuthGuardDecision({
  currentHref,
  hasSession,
  permissions,
  requiredPermissions,
}: AuthGuardInput): AuthGuardDecision {
  if (!hasSession) {
    return {
      redirect: getLoginRedirectTarget(currentHref),
      type: 'redirect-to-login',
    }
  }

  if (
    requiredPermissions.length > 0 &&
    !hasEveryPermission(permissions, requiredPermissions)
  ) {
    return { type: 'forbidden' }
  }

  return { type: 'allow' }
}

export function getRoutePermissions(pathname: string): AppPermission[] {
  if (pathname.startsWith('/resumes/upload')) {
    return ['resumes:create']
  }

  if (pathname.startsWith('/resumes/preview')) {
    return ['resumes:read']
  }

  if (pathname.startsWith('/users')) {
    return ['users:manage']
  }

  if (pathname.startsWith('/permissions')) {
    return ['rbac:manage']
  }

  if (pathname.startsWith('/job-positions')) {
    return ['job-positions:read']
  }

  return []
}
