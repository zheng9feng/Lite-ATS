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

    expect(
      repository.listRoles().map((role) => ({
        isSystem: role.isSystem,
        name: role.name,
      }))
    ).toEqual([
      { isSystem: true, name: 'admin' },
      { isSystem: true, name: 'normal' },
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

  it('stores custom roles, permissions, and user counts', async () => {
    const databasePath = join(tempDir, 'auth.sqlite')
    await migrateResumeDatabase({ databasePath })

    const repository = createSqliteAuthRepository({ databasePath })
    const reviewerRole = repository.createRole({
      description: 'Reviews resumes.',
      name: 'reviewer',
    })
    const readPermission = repository.findPermissionByName('resumes:read')
    const sharePermission = repository.findPermissionByName('resumes:share')

    if (!readPermission || !sharePermission) {
      throw new Error('Expected resume permissions to be seeded')
    }

    repository.setRolePermissions(reviewerRole.id, [
      readPermission.id,
      sharePermission.id,
    ])

    const user = repository.createUser({
      email: 'reviewer@example.com',
      name: 'Resume Reviewer',
      passwordHash: 'hash',
      status: 'active',
    })
    repository.setUserRoles(user.id, [reviewerRole.id])

    expect(repository.findRoleByName('reviewer')).toMatchObject({
      description: 'Reviews resumes.',
      isSystem: false,
      name: 'reviewer',
    })
    expect(repository.listRolePermissions('reviewer')).toEqual([
      'resumes:read',
      'resumes:share',
    ])
    expect(repository.countRoleUsers(reviewerRole.id)).toBe(1)

    repository.updateRole(reviewerRole.id, {
      description: 'Screens shared resumes.',
      name: 'resume-reviewer',
    })

    expect(repository.findRoleById(reviewerRole.id)).toMatchObject({
      description: 'Screens shared resumes.',
      name: 'resume-reviewer',
    })

    repository.deleteUser(user.id)
    repository.deleteRole(reviewerRole.id)

    expect(repository.findRoleById(reviewerRole.id)).toBeUndefined()

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
    expect(repository.getUserRoles(user.id)).toEqual([
      expect.objectContaining({ name: 'admin' }),
    ])
    expect(repository.getUserPermissions(user.id)).toEqual(
      expect.arrayContaining(['resumes:read', 'rbac:manage'])
    )
    expect(repository.findSessionByTokenHash('token-hash')?.userId).toBe(
      user.id
    )

    repository.close()
  })
})
