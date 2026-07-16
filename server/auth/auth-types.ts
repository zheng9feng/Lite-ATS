export const permissions = [
  'job-positions:read',
  'job-positions:manage',
  'resumes:read',
  'resumes:create',
  'resumes:update',
  'resumes:delete',
  'resumes:share',
  'users:manage',
  'rbac:manage',
  'pages:view',
] as const

export type Permission = (typeof permissions)[number]
export type RoleName = string
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
  createdAt: string
  description: string
  id: string
  isSystem: boolean
  name: RoleName
  updatedAt: string
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

export type AuthUserRole = AuthRole

export type AuthUserWithRoles = PublicAuthUser & {
  permissions: Permission[]
  roles: AuthUserRole[]
}

export type AuthRoleDetails = AuthRole & {
  permissions: Permission[]
  userCount: number
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

export type CreateRolePayload = {
  description: string
  name: string
}

export type UpdateRolePayload = Partial<{
  description: string
  name: string
}>

export function toPublicAuthUser(user: AuthUser): PublicAuthUser {
  const { passwordHash: _passwordHash, ...publicUser } = user

  return publicUser
}
