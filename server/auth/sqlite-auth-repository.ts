import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import Database from 'better-sqlite3'
import {
  type AuthPermission,
  type AuthRole,
  type AuthSession,
  type AuthUser,
  type CreateUserPayload,
  type Permission,
  type RoleName,
  type UpdateUserPayload,
  type UserStatus,
} from './auth-types'

type CreateSqliteAuthRepositoryOptions = {
  databasePath: string
}

type UserRow = {
  created_at: string
  email: string
  id: string
  name: string
  password_hash: string
  status: UserStatus
  updated_at: string
}

type RoleRow = {
  description: string
  id: string
  name: RoleName
}

type PermissionRow = {
  description: string
  id: string
  name: Permission
}

type SessionRow = {
  created_at: string
  expires_at: string
  id: string
  last_used_at: string
  token_hash: string
  user_id: string
}

export type AuthRepository = ReturnType<typeof createSqliteAuthRepository>

function ensureDatabaseDirectory(databasePath: string) {
  if (databasePath === ':memory:') return

  mkdirSync(dirname(databasePath), { recursive: true })
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function toUser(row: UserRow): AuthUser {
  return {
    createdAt: row.created_at,
    email: row.email,
    id: row.id,
    name: row.name,
    passwordHash: row.password_hash,
    status: row.status,
    updatedAt: row.updated_at,
  }
}

function toRole(row: RoleRow): AuthRole {
  return {
    description: row.description,
    id: row.id,
    name: row.name,
  }
}

function toPermission(row: PermissionRow): AuthPermission {
  return {
    description: row.description,
    id: row.id,
    name: row.name,
  }
}

function toSession(row: SessionRow): AuthSession {
  return {
    createdAt: new Date(row.created_at),
    expiresAt: new Date(row.expires_at),
    id: row.id,
    lastUsedAt: new Date(row.last_used_at),
    tokenHash: row.token_hash,
    userId: row.user_id,
  }
}

export function createSqliteAuthRepository({
  databasePath,
}: CreateSqliteAuthRepositoryOptions) {
  ensureDatabaseDirectory(databasePath)

  const database = new Database(databasePath)
  database.pragma('foreign_keys = ON')

  const listRoles = database.prepare(`
    SELECT id, name, description
    FROM t_roles
    ORDER BY CASE name WHEN 'admin' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END, name
  `)
  const findRoleByName = database.prepare<string>(`
    SELECT id, name, description
    FROM t_roles
    WHERE name = ?
  `)
  const listPermissions = database.prepare(`
    SELECT id, name, description
    FROM t_permissions
    ORDER BY name
  `)
  const listRolePermissions = database.prepare<string>(`
    SELECT p.name
    FROM t_permissions p
    INNER JOIN t_role_permissions rp ON rp.permission_id = p.id
    INNER JOIN t_roles r ON r.id = rp.role_id
    WHERE r.name = ?
    ORDER BY p.name
  `)
  const insertUser = database.prepare(`
    INSERT INTO t_users (
      id,
      email,
      name,
      password_hash,
      status,
      created_at,
      updated_at
    ) VALUES (
      @id,
      @email,
      @name,
      @passwordHash,
      @status,
      @createdAt,
      @updatedAt
    )
  `)
  const updateUser = database.prepare(`
    UPDATE t_users
    SET
      email = @email,
      name = @name,
      password_hash = @passwordHash,
      status = @status,
      updated_at = @updatedAt
    WHERE id = @id
  `)
  const findUserByEmail = database.prepare<string>(`
    SELECT id, email, name, password_hash, status, created_at, updated_at
    FROM t_users
    WHERE email = ?
  `)
  const findUserById = database.prepare<string>(`
    SELECT id, email, name, password_hash, status, created_at, updated_at
    FROM t_users
    WHERE id = ?
  `)
  const listUsers = database.prepare(`
    SELECT id, email, name, password_hash, status, created_at, updated_at
    FROM t_users
    ORDER BY created_at DESC, email
  `)
  const deleteUser = database.prepare<string>(`
    DELETE FROM t_users
    WHERE id = ?
  `)
  const deleteUserRoles = database.prepare<string>(`
    DELETE FROM t_user_roles
    WHERE user_id = ?
  `)
  const insertUserRole = database.prepare(`
    INSERT OR IGNORE INTO t_user_roles (user_id, role_id)
    VALUES (@userId, @roleId)
  `)
  const getUserRoles = database.prepare<string>(`
    SELECT r.name
    FROM t_roles r
    INNER JOIN t_user_roles ur ON ur.role_id = r.id
    WHERE ur.user_id = ?
    ORDER BY CASE r.name WHEN 'admin' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END, r.name
  `)
  const getUserPermissions = database.prepare<string>(`
    SELECT DISTINCT p.name
    FROM t_permissions p
    INNER JOIN t_role_permissions rp ON rp.permission_id = p.id
    INNER JOIN t_user_roles ur ON ur.role_id = rp.role_id
    WHERE ur.user_id = ?
    ORDER BY p.name
  `)
  const insertSession = database.prepare(`
    INSERT OR REPLACE INTO t_sessions (
      id,
      user_id,
      token_hash,
      expires_at,
      created_at,
      last_used_at
    ) VALUES (
      @id,
      @userId,
      @tokenHash,
      @expiresAt,
      @createdAt,
      @lastUsedAt
    )
  `)
  const findSessionByTokenHash = database.prepare<string>(`
    SELECT id, user_id, token_hash, expires_at, created_at, last_used_at
    FROM t_sessions
    WHERE token_hash = ?
  `)
  const updateSessionLastUsedAt = database.prepare(`
    UPDATE t_sessions
    SET last_used_at = @lastUsedAt
    WHERE id = @id
  `)
  const deleteSession = database.prepare<string>(`
    DELETE FROM t_sessions
    WHERE id = ?
  `)

  const setUserRolesTransaction = database.transaction(
    (userId: string, roleIds: string[]) => {
      deleteUserRoles.run(userId)
      for (const roleId of roleIds) {
        insertUserRole.run({ roleId, userId })
      }
    }
  )

  return {
    close: () => database.close(),
    createUser: (payload: CreateUserPayload) => {
      const now = new Date().toISOString()
      const user: AuthUser = {
        createdAt: now,
        email: normalizeEmail(payload.email),
        id: randomUUID(),
        name: payload.name,
        passwordHash: payload.passwordHash,
        status: payload.status,
        updatedAt: now,
      }

      insertUser.run({
        createdAt: user.createdAt,
        email: user.email,
        id: user.id,
        name: user.name,
        passwordHash: user.passwordHash,
        status: user.status,
        updatedAt: user.updatedAt,
      })

      return user
    },
    deleteSession: (sessionId: string) => {
      deleteSession.run(sessionId)
    },
    deleteUser: (userId: string) => {
      deleteUser.run(userId)
    },
    findRoleByName: (roleName: RoleName) => {
      const row = findRoleByName.get(roleName) as RoleRow | undefined

      return row ? toRole(row) : undefined
    },
    findSessionByTokenHash: (tokenHash: string) => {
      const row = findSessionByTokenHash.get(tokenHash) as
        | SessionRow
        | undefined

      return row ? toSession(row) : undefined
    },
    findUserByEmail: (email: string) => {
      const row = findUserByEmail.get(normalizeEmail(email)) as
        | UserRow
        | undefined

      return row ? toUser(row) : undefined
    },
    findUserById: (userId: string) => {
      const row = findUserById.get(userId) as UserRow | undefined

      return row ? toUser(row) : undefined
    },
    getUserPermissions: (userId: string) =>
      (getUserPermissions.all(userId) as { name: Permission }[]).map(
        (row) => row.name
      ),
    getUserRoles: (userId: string) =>
      (getUserRoles.all(userId) as { name: RoleName }[]).map(
        (row) => row.name
      ),
    listPermissions: () =>
      (listPermissions.all() as PermissionRow[]).map((row) =>
        toPermission(row)
      ),
    listRolePermissions: (roleName: RoleName) =>
      (listRolePermissions.all(roleName) as { name: Permission }[]).map(
        (row) => row.name
      ),
    listRoles: () => (listRoles.all() as RoleRow[]).map((row) => toRole(row)),
    listUsers: () => (listUsers.all() as UserRow[]).map((row) => toUser(row)),
    saveSession: (session: AuthSession) => {
      insertSession.run({
        createdAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
        id: session.id,
        lastUsedAt: session.lastUsedAt.toISOString(),
        tokenHash: session.tokenHash,
        userId: session.userId,
      })
    },
    setUserRoles: (userId: string, roleIds: string[]) => {
      setUserRolesTransaction(userId, roleIds)
    },
    updateSessionLastUsedAt: (sessionId: string, lastUsedAt: Date) => {
      updateSessionLastUsedAt.run({
        id: sessionId,
        lastUsedAt: lastUsedAt.toISOString(),
      })
    },
    updateUser: (userId: string, payload: UpdateUserPayload) => {
      const currentUser = (findUserById.get(userId) as UserRow | undefined)
        ? toUser(findUserById.get(userId) as UserRow)
        : undefined

      if (!currentUser) {
        return undefined
      }

      const nextUser: AuthUser = {
        ...currentUser,
        email: payload.email
          ? normalizeEmail(payload.email)
          : currentUser.email,
        name: payload.name ?? currentUser.name,
        passwordHash: payload.passwordHash ?? currentUser.passwordHash,
        status: payload.status ?? currentUser.status,
        updatedAt: new Date().toISOString(),
      }

      updateUser.run({
        email: nextUser.email,
        id: nextUser.id,
        name: nextUser.name,
        passwordHash: nextUser.passwordHash,
        status: nextUser.status,
        updatedAt: nextUser.updatedAt,
      })

      return nextUser
    },
  }
}
