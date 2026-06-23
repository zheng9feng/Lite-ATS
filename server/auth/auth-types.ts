export const permissions = [
  'resumes:read',
  'resumes:create',
  'resumes:update',
  'resumes:delete',
  'resumes:share',
  'users:manage',
  'rbac:manage',
] as const

export type Permission = (typeof permissions)[number]
export type RoleName = 'admin' | 'normal'
export type UserStatus = 'active' | 'inactive'

export type AuthUser = {
  createdAt: string
  email: string
  id: string
  name: string
  passwordHash: string
  status: UserStatus
  updatedAt: string
}

export type PublicAuthUser = Omit<AuthUser, 'passwordHash'>

export type AuthRole = {
  description: string
  id: string
  name: RoleName
}

export type AuthPermission = {
  description: string
  id: string
  name: Permission
}

export type AuthSession = {
  createdAt: Date
  expiresAt: Date
  id: string
  lastUsedAt: Date
  tokenHash: string
  userId: string
}

export type AuthPrincipal = {
  permissions: Permission[]
  roles: RoleName[]
  user: PublicAuthUser
}

export type CreateUserPayload = {
  email: string
  name: string
  passwordHash: string
  status: UserStatus
}

export type UpdateUserPayload = Partial<{
  email: string
  name: string
  passwordHash: string
  status: UserStatus
}>

export function toPublicAuthUser(user: AuthUser): PublicAuthUser {
  const { passwordHash: _passwordHash, ...publicUser } = user

  return publicUser
}
