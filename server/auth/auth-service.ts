import { createHash, randomUUID } from 'node:crypto'
import {
  type AuthRole,
  type AuthRoleDetails,
  type AuthPrincipal,
  type AuthUserWithRoles,
  type CreateUserPayload,
  type Permission,
  type RoleName,
  type UpdateUserPayload,
  toPublicAuthUser,
} from './auth-types'
import { hashPassword, verifyPassword } from './password'
import { type AuthRepository } from './sqlite-auth-repository'

export type AuthSnapshot = AuthPrincipal & {
  sessionToken: string
}

type CreateAuthServiceOptions = {
  createSessionId?: () => string
  createToken?: () => string
  getNow?: () => Date
  repository: AuthRepository
  sessionTtlMs?: number
}

type LoginPayload = {
  email: string
  password: string
}

type CreateLocalUserPayload = Omit<CreateUserPayload, 'passwordHash'> & {
  password: string
  roleIds?: string[]
  roles?: RoleName[]
}

type UpdateLocalUserPayload = Omit<UpdateUserPayload, 'passwordHash'> & {
  password?: string
}

type CreateLocalRolePayload = {
  description: string
  name: string
  permissions: Permission[]
}

type UpdateLocalRolePayload = Partial<CreateLocalRolePayload>

export const DEFAULT_SESSION_TTL_MS = 24 * 60 * 60 * 1000

function hashSessionToken(sessionToken: string) {
  return createHash('sha256').update(sessionToken).digest('hex')
}

function invalidCredentialsError() {
  return new Error('Invalid email or password.')
}

function normalizeRoleName(roleName: string) {
  return roleName.trim().toLowerCase()
}

function normalizeRoleDescription(description: string) {
  return description.trim()
}

export function createAuthService({
  createSessionId = randomUUID,
  createToken = randomUUID,
  getNow = () => new Date(),
  repository,
  sessionTtlMs = DEFAULT_SESSION_TTL_MS,
}: CreateAuthServiceOptions) {
  function buildPrincipal(userId: string): AuthPrincipal | undefined {
    const user = repository.findUserById(userId)

    if (!user || user.status !== 'active') {
      return undefined
    }

    return {
      permissions: repository.getUserPermissions(user.id),
      roles: repository.getUserRoles(user.id).map((role) => role.name),
      user: toPublicAuthUser(user),
    }
  }

  function readRolePermissions(role: AuthRole) {
    return repository.listRolePermissions(role.name)
  }

  function buildRoleDetails(role: AuthRole): AuthRoleDetails {
    return {
      ...role,
      permissions: readRolePermissions(role),
      userCount: repository.countRoleUsers(role.id),
    }
  }

  function resolvePermissionIds(permissionNames: Permission[]) {
    return permissionNames.map((permissionName) => {
      const permission = repository.findPermissionByName(permissionName)

      if (!permission) {
        throw new Error(`Permission not found: ${permissionName}`)
      }

      return permission.id
    })
  }

  function resolveRolesById(roleIds: string[]) {
    return roleIds.map((roleId) => {
      const role = repository.findRoleById(roleId)

      if (!role) {
        throw new Error(`Role not found: ${roleId}`)
      }

      return role
    })
  }

  function resolveRoleIdsByName(roleNames: RoleName[]) {
    return roleNames.map((roleName) => {
      const role = repository.findRoleByName(roleName)

      if (!role) {
        throw new Error(`Role not found: ${roleName}`)
      }

      return role.id
    })
  }

  function roleIdsGrantPermission(roleIds: string[], permission: Permission) {
    const permissions = new Set(
      resolveRolesById(roleIds).flatMap((role) => readRolePermissions(role))
    )

    return permissions.has(permission)
  }

  function assertActiveRbacUserRemains(userId?: string, roleIds?: string[]) {
    const currentActiveRbacUsers =
      repository.countActiveUsersWithPermission('rbac:manage')

    if (currentActiveRbacUsers === 0) {
      return
    }

    const user = userId ? repository.findUserById(userId) : undefined

    if (!user || user.status !== 'active') {
      return
    }

    const currentlyHasRbac = repository
      .getUserPermissions(user.id)
      .includes('rbac:manage')
    const willHaveRbac = roleIds
      ? roleIdsGrantPermission(roleIds, 'rbac:manage')
      : currentlyHasRbac
    const nextActiveRbacUsers =
      currentActiveRbacUsers - (currentlyHasRbac ? 1 : 0) + (willHaveRbac ? 1 : 0)

    if (nextActiveRbacUsers < 1) {
      throw new Error(
        'At least one active user must keep RBAC management access.'
      )
    }
  }

  function assertRoleCanBeUpdated(
    role: AuthRole,
    payload: UpdateLocalRolePayload
  ) {
    if (role.isSystem && payload.name && payload.name !== role.name) {
      throw new Error('System roles cannot be renamed.')
    }

    if (
      role.isSystem &&
      role.name === 'admin' &&
      payload.permissions &&
      !payload.permissions.includes('rbac:manage')
    ) {
      throw new Error('The admin role must keep RBAC management access.')
    }

    if (
      payload.permissions &&
      readRolePermissions(role).includes('rbac:manage') &&
      !payload.permissions.includes('rbac:manage') &&
      repository.countActiveUsersWithPermissionExcludingRole(
        'rbac:manage',
        role.id
      ) < 1
    ) {
      throw new Error(
        'At least one active user must keep RBAC management access.'
      )
    }
  }

  function setRolePermissions(role: AuthRole, permissionNames: Permission[]) {
    repository.setRolePermissions(role.id, resolvePermissionIds(permissionNames))
  }

  async function login({ email, password }: LoginPayload): Promise<AuthSnapshot> {
    const user = repository.findUserByEmail(email)

    if (!user || user.status !== 'active') {
      throw invalidCredentialsError()
    }

    const passwordMatches = await verifyPassword(password, user.passwordHash)

    if (!passwordMatches) {
      throw invalidCredentialsError()
    }

    const sessionToken = createToken()
    const now = getNow()
    repository.saveSession({
      createdAt: now,
      expiresAt: new Date(now.getTime() + sessionTtlMs),
      id: createSessionId(),
      lastUsedAt: now,
      tokenHash: hashSessionToken(sessionToken),
      userId: user.id,
    })

    const principal = buildPrincipal(user.id)

    if (!principal) {
      throw invalidCredentialsError()
    }

    return {
      ...principal,
      sessionToken,
    }
  }

  async function createUser(payload: CreateLocalUserPayload) {
    if (!payload.roleIds?.length && !payload.roles?.length) {
      throw new Error('Every user must have at least one role.')
    }

    const user = repository.createUser({
      email: payload.email,
      name: payload.name,
      passwordHash: await hashPassword(payload.password),
      status: payload.status,
    })

    if (payload.roleIds?.length) {
      resolveRolesById(payload.roleIds)
      repository.setUserRoles(user.id, payload.roleIds)
    } else if (payload.roles?.length) {
      repository.setUserRoles(user.id, resolveRoleIdsByName(payload.roles))
    }

    return {
      ...toPublicAuthUser(user),
      permissions: repository.getUserPermissions(user.id),
      roles: repository.getUserRoles(user.id),
    }
  }

  return {
    createRole: (payload: CreateLocalRolePayload) => {
      const role = repository.createRole({
        description: normalizeRoleDescription(payload.description),
        name: normalizeRoleName(payload.name),
      })

      setRolePermissions(role, payload.permissions)

      return buildRoleDetails(role)
    },
    createUser,
    deleteRole: (roleId: string) => {
      const role = repository.findRoleById(roleId)

      if (!role) {
        throw new Error('Role not found')
      }

      if (role.isSystem) {
        throw new Error('System roles cannot be deleted.')
      }

      if (repository.countRoleUsers(role.id) > 0) {
        throw new Error('Assigned roles cannot be deleted.')
      }

      repository.deleteRole(role.id)
    },
    deleteUser: (userId: string) => {
      repository.deleteUser(userId)
    },
    listPermissions: () => repository.listPermissions(),
    listRoles: () => repository.listRoles().map((role) => buildRoleDetails(role)),
    listUsers: (): AuthUserWithRoles[] =>
      repository.listUsers().map((user) => ({
        ...toPublicAuthUser(user),
        permissions: repository.getUserPermissions(user.id),
        roles: repository.getUserRoles(user.id),
      })),
    login,
    logout: (sessionToken?: string) => {
      if (!sessionToken) return

      const session = repository.findSessionByTokenHash(
        hashSessionToken(sessionToken)
      )

      if (session) {
        repository.deleteSession(session.id)
      }
    },
    resolveSession: async (
      sessionToken?: string
    ): Promise<AuthPrincipal | undefined> => {
      if (!sessionToken) {
        return undefined
      }

      const session = repository.findSessionByTokenHash(
        hashSessionToken(sessionToken)
      )

      if (!session) {
        return undefined
      }

      const now = getNow()

      if (session.expiresAt.getTime() <= now.getTime()) {
        repository.deleteSession(session.id)

        return undefined
      }

      repository.updateSessionLastUsedAt(session.id, now)

      return buildPrincipal(session.userId)
    },
    setUserRoles: (userId: string, roleIds: string[]) => {
      resolveRolesById(roleIds)
      assertActiveRbacUserRemains(userId, roleIds)

      if (roleIds.length === 0) {
        throw new Error('Every user must have at least one role.')
      }

      repository.setUserRoles(userId, roleIds)
    },
    setRolePermissions: (roleId: string, permissionNames: Permission[]) => {
      const role = repository.findRoleById(roleId)

      if (!role) {
        throw new Error('Role not found')
      }

      assertRoleCanBeUpdated(role, { permissions: permissionNames })
      setRolePermissions(role, permissionNames)
      assertActiveRbacUserRemains()
    },
    updateRole: (roleId: string, payload: UpdateLocalRolePayload) => {
      const role = repository.findRoleById(roleId)

      if (!role) {
        throw new Error('Role not found')
      }

      const normalizedPayload: UpdateLocalRolePayload = {
        description: payload.description
          ? normalizeRoleDescription(payload.description)
          : undefined,
        name: payload.name ? normalizeRoleName(payload.name) : undefined,
        permissions: payload.permissions,
      }

      assertRoleCanBeUpdated(role, normalizedPayload)

      const updatedRole =
        normalizedPayload.description || normalizedPayload.name
          ? repository.updateRole(role.id, {
              description: normalizedPayload.description,
              name: normalizedPayload.name,
            })
          : role

      if (!updatedRole) {
        throw new Error('Role not found')
      }

      if (normalizedPayload.permissions) {
        setRolePermissions(updatedRole, normalizedPayload.permissions)
      }

      return buildRoleDetails(updatedRole)
    },
    updateUser: async (userId: string, payload: UpdateLocalUserPayload) => {
      const updatedUser = repository.updateUser(userId, {
        email: payload.email,
        name: payload.name,
        passwordHash: payload.password
          ? await hashPassword(payload.password)
          : undefined,
        status: payload.status,
      })

      if (!updatedUser) {
        throw new Error('User not found')
      }

      return {
        ...toPublicAuthUser(updatedUser),
        permissions: repository.getUserPermissions(updatedUser.id),
        roles: repository.getUserRoles(updatedUser.id),
      }
    },
  }
}
