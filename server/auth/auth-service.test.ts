import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { migrateResumeDatabase } from '../resumes/sqlite-resume-migrations'
import { createAuthService } from './auth-service'
import { hashPassword } from './password'
import { createSqliteAuthRepository } from './sqlite-auth-repository'

describe('createAuthService', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'lite-ats-auth-service-'))
  })

  afterEach(async () => {
    await rm(tempDir, { force: true, recursive: true })
  })

  it('logs in with a valid password and returns roles and permissions', async () => {
    const databasePath = join(tempDir, 'auth.sqlite')
    await migrateResumeDatabase({ databasePath })
    const repository = createSqliteAuthRepository({ databasePath })
    const adminRole = repository.findRoleByName('admin')

    if (!adminRole) {
      throw new Error('Expected admin role to be seeded')
    }

    const user = repository.createUser({
      email: 'admin@example.com',
      name: 'Admin User',
      passwordHash: await hashPassword('password123'),
      status: 'active',
    })
    repository.setUserRoles(user.id, [adminRole.id])

    const service = createAuthService({
      createToken: () => 'raw-session-token',
      getNow: () => new Date('2026-06-23T00:00:00.000Z'),
      repository,
    })

    const result = await service.login({
      email: 'ADMIN@example.com',
      password: 'password123',
    })

    expect(result.user.email).toBe('admin@example.com')
    expect(result.roles).toEqual(['admin'])
    expect(result.permissions).toEqual(
      expect.arrayContaining(['resumes:read', 'rbac:manage'])
    )
    expect(result.sessionToken).toBe('raw-session-token')

    repository.close()
  })

  it('rejects invalid credentials and inactive users', async () => {
    const databasePath = join(tempDir, 'auth.sqlite')
    await migrateResumeDatabase({ databasePath })
    const repository = createSqliteAuthRepository({ databasePath })
    repository.createUser({
      email: 'inactive@example.com',
      name: 'Inactive User',
      passwordHash: await hashPassword('password123'),
      status: 'inactive',
    })
    const service = createAuthService({ repository })

    await expect(
      service.login({ email: 'missing@example.com', password: 'password123' })
    ).rejects.toThrow('Invalid email or password.')
    await expect(
      service.login({ email: 'inactive@example.com', password: 'password123' })
    ).rejects.toThrow('Invalid email or password.')
    await expect(
      service.login({ email: 'inactive@example.com', password: 'wrong' })
    ).rejects.toThrow('Invalid email or password.')

    repository.close()
  })

  it('resolves sessions and rejects expired sessions', async () => {
    const databasePath = join(tempDir, 'auth.sqlite')
    await migrateResumeDatabase({ databasePath })
    const repository = createSqliteAuthRepository({ databasePath })
    const normalRole = repository.findRoleByName('normal')

    if (!normalRole) {
      throw new Error('Expected normal role to be seeded')
    }

    const user = repository.createUser({
      email: 'normal@example.com',
      name: 'Normal User',
      passwordHash: await hashPassword('password123'),
      status: 'active',
    })
    repository.setUserRoles(user.id, [normalRole.id])
    const getNow = vi
      .fn()
      .mockReturnValue(new Date('2026-06-23T00:00:00.000Z'))
    const service = createAuthService({
      createToken: () => 'normal-session-token',
      getNow,
      repository,
      sessionTtlMs: 1000,
    })

    await service.login({
      email: 'normal@example.com',
      password: 'password123',
    })
    await expect(
      service.resolveSession('normal-session-token')
    ).resolves.toMatchObject({
      permissions: ['resumes:read'],
      roles: ['normal'],
      user: {
        email: 'normal@example.com',
      },
    })

    getNow.mockReturnValue(new Date('2026-06-23T00:00:01.001Z'))

    await expect(
      service.resolveSession('normal-session-token')
    ).resolves.toBeUndefined()

    repository.close()
  })

  it('manages custom roles and permission assignments', async () => {
    const databasePath = join(tempDir, 'auth.sqlite')
    await migrateResumeDatabase({ databasePath })
    const repository = createSqliteAuthRepository({ databasePath })
    const service = createAuthService({ repository })

    const role = service.createRole({
      description: 'Can screen and share resumes.',
      name: 'reviewer',
      permissions: ['resumes:read', 'resumes:share'],
    })

    expect(role).toMatchObject({
      description: 'Can screen and share resumes.',
      isSystem: false,
      name: 'reviewer',
      permissions: ['resumes:read', 'resumes:share'],
      userCount: 0,
    })

    const updatedRole = service.updateRole(role.id, {
      description: 'Can screen resumes.',
      name: 'resume-reviewer',
      permissions: ['resumes:read'],
    })

    expect(updatedRole).toMatchObject({
      description: 'Can screen resumes.',
      name: 'resume-reviewer',
      permissions: ['resumes:read'],
    })

    service.deleteRole(role.id)

    expect(service.listRoles().map((item) => item.name)).not.toContain(
      'resume-reviewer'
    )

    repository.close()
  })

  it('assigns multiple roles by ID and returns effective permission unions', async () => {
    const databasePath = join(tempDir, 'auth.sqlite')
    await migrateResumeDatabase({ databasePath })
    const repository = createSqliteAuthRepository({ databasePath })
    const service = createAuthService({ repository })
    const readRole = service.createRole({
      description: 'Can read resumes.',
      name: 'reader',
      permissions: ['resumes:read'],
    })
    const shareRole = service.createRole({
      description: 'Can share resumes.',
      name: 'sharer',
      permissions: ['resumes:share'],
    })
    const user = await service.createUser({
      email: 'multi-role@example.com',
      name: 'Multi Role',
      password: 'password123',
      status: 'active',
    })

    service.setUserRoles(user.id, [readRole.id, shareRole.id])

    expect(service.listUsers()).toContainEqual(
      expect.objectContaining({
        email: 'multi-role@example.com',
        permissions: ['resumes:read', 'resumes:share'],
        roles: [
          expect.objectContaining({ id: readRole.id, name: 'reader' }),
          expect.objectContaining({ id: shareRole.id, name: 'sharer' }),
        ],
      })
    )

    repository.close()
  })

  it('protects system roles and prevents RBAC lockout', async () => {
    const databasePath = join(tempDir, 'auth.sqlite')
    await migrateResumeDatabase({ databasePath })
    const repository = createSqliteAuthRepository({ databasePath })
    const adminRole = repository.findRoleByName('admin')

    if (!adminRole) {
      throw new Error('Expected admin role to be seeded')
    }

    const adminUser = repository.createUser({
      email: 'admin@example.com',
      name: 'Admin User',
      passwordHash: await hashPassword('password123'),
      status: 'active',
    })
    repository.setUserRoles(adminUser.id, [adminRole.id])

    const service = createAuthService({ repository })

    expect(() =>
      service.updateRole(adminRole.id, { name: 'owner' })
    ).toThrow('System roles cannot be renamed.')
    expect(() =>
      service.updateRole(adminRole.id, {
        permissions: ['resumes:read'],
      })
    ).toThrow('The admin role must keep RBAC management access.')
    expect(() => service.deleteRole(adminRole.id)).toThrow(
      'System roles cannot be deleted.'
    )
    expect(() => service.setUserRoles(adminUser.id, [])).toThrow(
      'At least one active user must keep RBAC management access.'
    )

    repository.close()
  })

  it('rejects custom role permission changes that would remove the last RBAC manager', async () => {
    const databasePath = join(tempDir, 'auth.sqlite')
    await migrateResumeDatabase({ databasePath })
    const repository = createSqliteAuthRepository({ databasePath })
    const service = createAuthService({ repository })
    const rbacRole = service.createRole({
      description: 'Can manage RBAC.',
      name: 'rbac-owner',
      permissions: ['rbac:manage'],
    })
    const user = await service.createUser({
      email: 'owner@example.com',
      name: 'RBAC Owner',
      password: 'password123',
      status: 'active',
    })
    service.setUserRoles(user.id, [rbacRole.id])

    expect(() =>
      service.updateRole(rbacRole.id, {
        permissions: ['resumes:read'],
      })
    ).toThrow('At least one active user must keep RBAC management access.')
    expect(
      service.listRoles().find((role) => role.id === rbacRole.id)?.permissions
    ).toEqual(['rbac:manage'])

    repository.close()
  })
})
