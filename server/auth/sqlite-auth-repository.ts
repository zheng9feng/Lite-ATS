import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import Database from 'better-sqlite3'
import {
  type AuthPermission,
  type AuthRole,
  type AuthSession,
  type AuthUser,
  type CreateRolePayload,
  type CreateUserPayload,
  type Permission,
  type RoleName,
  type UpdateRolePayload,
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
  created_at: string
  description: string
  id: string
  is_system: 0 | 1
  name: RoleName
  updated_at: string
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
    createdAt: row.created_at,
    description: row.description,
    id: row.id,
    isSystem: Boolean(row.is_system),
    name: row.name,
    updatedAt: row.updated_at,
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
    SELECT id, name, description, is_system, created_at, updated_at
    FROM t_roles
    ORDER BY CASE name WHEN 'admin' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END, name
  `)
  const findRoleByName = database.prepare<string>(`
    SELECT id, name, description, is_system, created_at, updated_at
    FROM t_roles
    WHERE name = ?
  `)
  const findRoleById = database.prepare<string>(`
    SELECT id, name, description, is_system, created_at, updated_at
    FROM t_roles
    WHERE id = ?
  `)
  const insertRole = database.prepare(`
    INSERT INTO t_roles (
      id,
      name,
      description,
      is_system,
      created_at,
      updated_at
    )
    VALUES (@id, @name, @description, 0, @createdAt, @updatedAt)
  `)
  const updateRole = database.prepare(`
    UPDATE t_roles
    SET name = @name, description = @description, updated_at = @updatedAt
    WHERE id = @id
  `)
  const deleteRole = database.prepare<string>(`
    DELETE FROM t_roles
    WHERE id = ?
  `)
  const countRoleUsers = database.prepare<string>(`
    SELECT COUNT(*) AS count
    FROM t_user_roles
    WHERE role_id = ?
  `)
  const countActiveUsersWithPermission = database.prepare<string>(`
    SELECT COUNT(DISTINCT u.id) AS count
    FROM t_users u
    INNER JOIN t_user_roles ur ON ur.user_id = u.id
    INNER JOIN t_role_permissions rp ON rp.role_id = ur.role_id
    INNER JOIN t_permissions p ON p.id = rp.permission_id
    WHERE u.status = 'active' AND p.name = ?
  `)
  const countActiveUsersWithPermissionExcludingRole = database.prepare(`
    SELECT COUNT(DISTINCT u.id) AS count
    FROM t_users u
    INNER JOIN t_user_roles ur ON ur.user_id = u.id
    INNER JOIN t_role_permissions rp ON rp.role_id = ur.role_id
    INNER JOIN t_permissions p ON p.id = rp.permission_id
    WHERE u.status = 'active'
      AND p.name = @permission
      AND ur.role_id <> @roleId
  `)
  const listPermissions = database.prepare(`
    SELECT id, name, description
    FROM t_permissions
    ORDER BY name
  `)
  const findPermissionByName = database.prepare<string>(`
    SELECT id, name, description
    FROM t_permissions
    WHERE name = ?
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
    SELECT r.id, r.name, r.description, r.is_system, r.created_at, r.updated_at
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
  const deleteRolePermissions = database.prepare<string>(`
    DELETE FROM t_role_permissions
    WHERE role_id = ?
  `)
  const insertRolePermission = database.prepare(`
    INSERT OR IGNORE INTO t_role_permissions (role_id, permission_id)
    VALUES (@roleId, @permissionId)
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
  const setRolePermissionsTransaction = database.transaction(
    (roleId: string, permissionIds: string[]) => {
      deleteRolePermissions.run(roleId)
      for (const permissionId of permissionIds) {
        insertRolePermission.run({ permissionId, roleId })
      }
    }
  )

  function createUserRecord(payload: CreateUserPayload) {
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
  }

  const createUserWithRolesTransaction = database.transaction(
    (payload: CreateUserPayload, roleIds: string[]) => {
      const user = createUserRecord(payload)

      for (const roleId of roleIds) {
        insertUserRole.run({ roleId, userId: user.id })
      }

      return user
    }
  )

  return {
    close: () => database.close(),
    createRole: (payload: CreateRolePayload) => {
      const now = new Date().toISOString()
      const role: AuthRole = {
        createdAt: now,
        description: payload.description,
        id: randomUUID(),
        isSystem: false,
        name: payload.name,
        updatedAt: now,
      }

      insertRole.run({
        createdAt: role.createdAt,
        description: role.description,
        id: role.id,
        name: role.name,
        updatedAt: role.updatedAt,
      })

      return role
    },
    createUser: createUserRecord,
    createUserWithRoles: (payload: CreateUserPayload, roleIds: string[]) =>
      createUserWithRolesTransaction(payload, roleIds),
    deleteSession: (sessionId: string) => {
      deleteSession.run(sessionId)
    },
    deleteRole: (roleId: string) => {
      deleteRole.run(roleId)
    },
    deleteUser: (userId: string) => {
      deleteUser.run(userId)
    },
    findRoleByName: (roleName: RoleName) => {
      const row = findRoleByName.get(roleName) as RoleRow | undefined

      return row ? toRole(row) : undefined
    },
    findRoleById: (roleId: string) => {
      const row = findRoleById.get(roleId) as RoleRow | undefined

      return row ? toRole(row) : undefined
    },
    findPermissionByName: (permission: Permission) => {
      const row = findPermissionByName.get(permission) as
        | PermissionRow
        | undefined

      return row ? toPermission(row) : undefined
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
      (getUserRoles.all(userId) as RoleRow[]).map((row) => toRole(row)),
    countActiveUsersWithPermission: (permission: Permission) =>
      (
        countActiveUsersWithPermission.get(permission) as
          | { count: number }
          | undefined
      )?.count ?? 0,
    countActiveUsersWithPermissionExcludingRole: (
      permission: Permission,
      roleId: string
    ) =>
      (
        countActiveUsersWithPermissionExcludingRole.get({
          permission,
          roleId,
        }) as { count: number } | undefined
      )?.count ?? 0,
    countRoleUsers: (roleId: string) =>
      (countRoleUsers.get(roleId) as { count: number } | undefined)?.count ??
      0,
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
    setRolePermissions: (roleId: string, permissionIds: string[]) => {
      setRolePermissionsTransaction(roleId, permissionIds)
    },
    updateSessionLastUsedAt: (sessionId: string, lastUsedAt: Date) => {
      updateSessionLastUsedAt.run({
        id: sessionId,
        lastUsedAt: lastUsedAt.toISOString(),
      })
    },
    updateRole: (roleId: string, payload: UpdateRolePayload) => {
      const currentRole = (findRoleById.get(roleId) as RoleRow | undefined)
        ? toRole(findRoleById.get(roleId) as RoleRow)
        : undefined

      if (!currentRole) {
        return undefined
      }

      const nextRole: AuthRole = {
        ...currentRole,
        description: payload.description ?? currentRole.description,
        name: payload.name ?? currentRole.name,
        updatedAt: new Date().toISOString(),
      }

      updateRole.run({
        description: nextRole.description,
        id: nextRole.id,
        name: nextRole.name,
        updatedAt: nextRole.updatedAt,
      })

      return nextRole
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
