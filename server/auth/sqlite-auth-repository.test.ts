import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { migrateResumeDatabase } from '../resumes/sqlite-resume-migrations'
import { createSqliteAuthRepository } from './sqlite-auth-repository'

describe('createSqliteAuthRepository', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'lite-ats-auth-'))
  })

  afterEach(async () => {
    await rm(tempDir, { force: true, recursive: true })
  })

  it('seeds admin and normal roles with the required permissions', async () => {
    const databasePath = join(tempDir, 'auth.sqlite')
    await migrateResumeDatabase({ databasePath })

    const repository = createSqliteAuthRepository({ databasePath })

    expect(repository.listRoles().map((role) => role.name)).toEqual([
      'admin',
      'normal',
    ])
    expect(repository.listRolePermissions('admin')).toEqual(
      expect.arrayContaining([
        'resumes:read',
        'resumes:create',
        'resumes:update',
        'resumes:delete',
        'resumes:share',
        'users:manage',
        'rbac:manage',
      ])
    )
    expect(repository.listRolePermissions('normal')).toEqual(['resumes:read'])

    repository.close()
  })

  it('stores users, role assignments, and sessions', async () => {
    const databasePath = join(tempDir, 'auth.sqlite')
    await migrateResumeDatabase({ databasePath })

    const repository = createSqliteAuthRepository({ databasePath })
    const user = repository.createUser({
      email: 'admin@example.com',
      name: 'Admin User',
      passwordHash: 'hash',
      status: 'active',
    })
    const adminRole = repository.findRoleByName('admin')

    if (!adminRole) {
      throw new Error('Expected admin role to be seeded')
    }

    repository.setUserRoles(user.id, [adminRole.id])
    repository.saveSession({
      createdAt: new Date('2026-06-23T00:00:00.000Z'),
      expiresAt: new Date('2026-06-24T00:00:00.000Z'),
      id: 'session-1',
      lastUsedAt: new Date('2026-06-23T00:00:00.000Z'),
      tokenHash: 'token-hash',
      userId: user.id,
    })

    expect(repository.findUserByEmail('ADMIN@example.com')?.id).toBe(user.id)
    expect(repository.getUserRoles(user.id)).toEqual(['admin'])
    expect(repository.getUserPermissions(user.id)).toEqual(
      expect.arrayContaining(['resumes:read', 'rbac:manage'])
    )
    expect(repository.findSessionByTokenHash('token-hash')?.userId).toBe(
      user.id
    )

    repository.close()
  })
})
