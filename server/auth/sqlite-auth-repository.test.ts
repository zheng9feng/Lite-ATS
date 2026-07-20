import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { migrateResumeDatabase } from '../resumes/sqlite-resume-migrations'
import { createSqliteAuthRepository } from './sqlite-auth-repository'

describe('createSqliteAuthRepository', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'lite-ats-auth-'))
  })

  afterEach(async () => {
    vi.useRealTimers()
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
        'pages:view',
      ])
    )
    expect(repository.listRolePermissions('normal')).toEqual(['resumes:read'])
    expect(repository.findRoleByName('admin')?.description).toBe(
      'Full access to user management, RBAC, example pages, and resumes.'
    )

    repository.close()
  })

  it('stores custom roles, permissions, and user counts', async () => {
    const databasePath = join(tempDir, 'auth.sqlite')
    await migrateResumeDatabase({ databasePath })

    const repository = createSqliteAuthRepository({ databasePath })
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-17T01:00:00.000Z'))
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
      createdAt: '2026-07-17T01:00:00.000Z',
      description: 'Reviews resumes.',
      isSystem: false,
      name: 'reviewer',
      updatedAt: '2026-07-17T01:00:00.000Z',
    })
    expect(repository.listRolePermissions('reviewer')).toEqual([
      'resumes:read',
      'resumes:share',
    ])
    expect(repository.countRoleUsers(reviewerRole.id)).toBe(1)

    vi.setSystemTime(new Date('2026-07-17T02:00:00.000Z'))
    const updatedRole = repository.updateRole(reviewerRole.id, {
      description: 'Screens shared resumes.',
      name: 'resume-reviewer',
    })

    expect(updatedRole).toMatchObject({
      description: 'Screens shared resumes.',
      name: 'resume-reviewer',
      updatedAt: '2026-07-17T02:00:00.000Z',
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

  it('rolls back user creation when an atomic role assignment fails', async () => {
    const databasePath = join(tempDir, 'auth.sqlite')
    await migrateResumeDatabase({ databasePath })

    const repository = createSqliteAuthRepository({ databasePath })

    expect(() =>
      repository.createUserWithRoles(
        {
          email: 'rolled-back@example.com',
          name: 'Rolled Back',
          passwordHash: 'hash',
          status: 'active',
        },
        ['missing-role']
      )
    ).toThrow()
    expect(
      repository.findUserByEmail('rolled-back@example.com')
    ).toBeUndefined()

    repository.close()
  })
})
