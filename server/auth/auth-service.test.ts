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
})
