import { type NextFunction, type Request, type Response } from 'express'
import { type AuthPrincipal, type Permission } from './auth-types'
import { type createAuthService } from './auth-service'

export type AuthenticatedRequest = Request & {
  auth?: AuthPrincipal
}

type PermissionDecision = {
  status: 200 | 401 | 403
}

type AuthService = ReturnType<typeof createAuthService>

export function parseBearerToken(authorizationHeader?: string) {
  if (!authorizationHeader) {
    return undefined
  }

  const [scheme, token] = authorizationHeader.split(' ')

  if (scheme !== 'Bearer' || !token) {
    return undefined
  }

  return token
}

export function getPermissionDecision(
  permission: Permission,
  principal?: Pick<AuthPrincipal, 'permissions'>
): PermissionDecision {
  if (!principal) {
    return { status: 401 }
  }

  if (!principal.permissions.includes(permission)) {
    return { status: 403 }
  }

  return { status: 200 }
}

export function optionalAuth(authService: AuthService) {
  return async (
    request: AuthenticatedRequest,
    _response: Response,
    next: NextFunction
  ) => {
    const sessionToken = parseBearerToken(request.headers.authorization)
    request.auth = await authService.resolveSession(sessionToken)
    next()
  }
}

export function requirePermission(permission: Permission) {
  return (
    request: AuthenticatedRequest,
    response: Response,
    next: NextFunction
  ) => {
    const decision = getPermissionDecision(permission, request.auth)

    if (decision.status === 200) {
      next()
      return
    }

    response.status(decision.status).json({
      error:
        decision.status === 401
          ? 'Authentication required.'
          : 'Permission denied.',
    })
  }
}
