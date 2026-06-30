export const appPermissions = [
  'job-positions:read',
  'job-positions:manage',
  'resumes:read',
  'resumes:create',
  'resumes:update',
  'resumes:delete',
  'resumes:share',
  'users:manage',
  'rbac:manage',
] as const

export type AppPermission = (typeof appPermissions)[number]

export function hasPermission(
  userPermissions: string[],
  permission: AppPermission
) {
  return userPermissions.includes(permission)
}

export function hasAnyPermission(
  userPermissions: string[],
  requiredPermissions: AppPermission[]
) {
  return requiredPermissions.some((permission) =>
    hasPermission(userPermissions, permission)
  )
}

export function hasEveryPermission(
  userPermissions: string[],
  requiredPermissions: AppPermission[]
) {
  return requiredPermissions.every((permission) =>
    hasPermission(userPermissions, permission)
  )
}
