import { createHash, randomUUID } from 'node:crypto'
import {
  type AuthPrincipal,
  type CreateUserPayload,
  type Permission,
  type PublicAuthUser,
  type RoleName,
  type UpdateUserPayload,
  toPublicAuthUser,
} from './auth-types'
import { hashPassword, verifyPassword } from './password'
import { type AuthRepository } from './sqlite-auth-repository'

export type AuthSnapshot = AuthPrincipal & {
  sessionToken: string
}

export type AuthUserWithRoles = PublicAuthUser & {
  roles: RoleName[]
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
  roles?: RoleName[]
}

type UpdateLocalUserPayload = Omit<UpdateUserPayload, 'passwordHash'> & {
  password?: string
}

export const DEFAULT_SESSION_TTL_MS = 24 * 60 * 60 * 1000

function hashSessionToken(sessionToken: string) {
  return createHash('sha256').update(sessionToken).digest('hex')
}

function invalidCredentialsError() {
  return new Error('Invalid email or password.')
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
      roles: repository.getUserRoles(user.id),
      user: toPublicAuthUser(user),
    }
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
    const user = repository.createUser({
      email: payload.email,
      name: payload.name,
      passwordHash: await hashPassword(payload.password),
      status: payload.status,
    })

    if (payload.roles?.length) {
      const roleIds = payload.roles.map((roleName) => {
        const role = repository.findRoleByName(roleName)

        if (!role) {
          throw new Error(`Role not found: ${roleName}`)
        }

        return role.id
      })

      repository.setUserRoles(user.id, roleIds)
    }

    return {
      ...toPublicAuthUser(user),
      roles: repository.getUserRoles(user.id),
    }
  }

  return {
    createUser,
    deleteUser: (userId: string) => {
      repository.deleteUser(userId)
    },
    listPermissions: () => repository.listPermissions(),
    listRoles: () => repository.listRoles(),
    listUsers: (): AuthUserWithRoles[] =>
      repository.listUsers().map((user) => ({
        ...toPublicAuthUser(user),
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
    setUserRoles: (userId: string, roleNames: RoleName[]) => {
      const roleIds = roleNames.map((roleName) => {
        const role = repository.findRoleByName(roleName)

        if (!role) {
          throw new Error(`Role not found: ${roleName}`)
        }

        return role.id
      })

      repository.setUserRoles(userId, roleIds)
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
        roles: repository.getUserRoles(updatedUser.id),
      }
    },
  }
}
