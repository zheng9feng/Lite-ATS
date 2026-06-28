import { IncomingMessage, ServerResponse } from 'node:http'
import { type Socket } from 'node:net'
import { PassThrough, Readable } from 'node:stream'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createServerApp } from '../app'
import { createResumeService } from '../resumes/resume-service'
import { migrateResumeDatabase } from '../resumes/sqlite-resume-migrations'
import { createSqliteResumeRepository } from '../resumes/sqlite-resume-repository'
import { createAuthService } from './auth-service'
import { hashPassword } from './password'
import { createSqliteAuthRepository } from './sqlite-auth-repository'

type TestApi = {
  close: () => Promise<void>
  request: (path: string, init?: RequestInit) => Promise<Response>
}

async function requestApp(
  app: ReturnType<typeof createServerApp>,
  path: string,
  init: RequestInit = {}
) {
  const body = typeof init.body === 'string' ? init.body : undefined
  const socket = new PassThrough()
  const request = new IncomingMessage(socket as unknown as Socket)
  request.method = init.method ?? 'GET'
  request.url = path
  request.headers = Object.fromEntries(
    new Headers(init.headers).entries()
  ) as IncomingMessage['headers']

  if (body) {
    request.headers['content-length'] = String(Buffer.byteLength(body))
  }
  request.push(body ?? null)
  if (body) {
    request.push(null)
  }

  return await new Promise<Response>((resolve, reject) => {
    const response = new ServerResponse(request)
    const chunks: Buffer[] = []

    response.write = (chunk: unknown) => {
      chunks.push(Buffer.from(String(chunk)))
      return true
    }
    response.end = (chunk?: unknown) => {
      if (chunk) {
        chunks.push(Buffer.from(String(chunk)))
      }

      resolve(
        new Response(chunks.length ? Buffer.concat(chunks) : undefined, {
          headers: Object.entries(response.getHeaders()).reduce(
            (headers, [key, value]) => {
              if (typeof value === 'string') {
                headers[key] = value
              }

              return headers
            },
            {} as Record<string, string>
          ),
          status: response.statusCode,
        })
      )

      return response
    }

    ;(app as unknown as {
      handle: (
        request: IncomingMessage,
        response: ServerResponse,
        callback: (error: unknown) => void
      ) => void
    }).handle(request, response, reject)
  })
}

async function createTestApi(): Promise<TestApi> {
  const tempDir = await mkdtemp(join(tmpdir(), 'lite-ats-auth-api-'))
  const databasePath = join(tempDir, 'api.sqlite')
  await migrateResumeDatabase({ databasePath })

  const authRepository = createSqliteAuthRepository({ databasePath })
  const resumeRepository = createSqliteResumeRepository({ databasePath })
  const adminRole = authRepository.findRoleByName('admin')
  const normalRole = authRepository.findRoleByName('normal')

  if (!adminRole || !normalRole) {
    throw new Error('Expected default roles to be seeded')
  }

  const admin = authRepository.createUser({
    email: 'admin@example.com',
    name: 'Admin User',
    passwordHash: await hashPassword('password123'),
    status: 'active',
  })
  const normal = authRepository.createUser({
    email: 'normal@example.com',
    name: 'Normal User',
    passwordHash: await hashPassword('password123'),
    status: 'active',
  })
  authRepository.setUserRoles(admin.id, [adminRole.id])
  authRepository.setUserRoles(normal.id, [normalRole.id])

  const app = createServerApp({
    authService: createAuthService({
      createToken: () => 'session-token',
      repository: authRepository,
    }),
    resumeService: createResumeService({
      bucketName: 'resumes',
      publicApiUrl: 'http://localhost:3001',
      repository: resumeRepository,
      storage: {
        deleteObject: async () => undefined,
        ensureBucket: async () => undefined,
        getObject: async () => Readable.from(['pdf']),
        putObject: async () => undefined,
      },
    }),
  })
  return {
    close: async () => {
      authRepository.close()
      resumeRepository.close()
      await rm(tempDir, { force: true, recursive: true })
    },
    request: (path, init) => requestApp(app, path, init),
  }
}

describe('auth API integration', () => {
  let api: TestApi

  beforeEach(async () => {
    api = await createTestApi()
  })

  afterEach(async () => {
    await api.close()
  })

  it('logs in and returns the current auth snapshot', async () => {
    const loginResponse = await api.request('/api/auth/login', {
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'password123',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })
    const loginBody = (await loginResponse.json()) as {
      permissions: string[]
      sessionToken: string
    }

    expect(loginResponse.status).toBe(200)
    expect(loginBody.sessionToken).toBe('session-token')
    expect(loginBody.permissions).toContain('rbac:manage')

    const meResponse = await api.request('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${loginBody.sessionToken}`,
      },
    })
    const meBody = (await meResponse.json()) as { user: { email: string } }

    expect(meResponse.status).toBe(200)
    expect(meBody.user.email).toBe('admin@example.com')
  })

  it('protects resume mutation and keeps public share links unauthenticated', async () => {
    const unauthenticatedDelete = await api.request('/api/resumes/resume-1', {
      method: 'DELETE',
    })
    const shareResponse = await api.request('/api/resume-shares/share-token')

    expect(unauthenticatedDelete.status).toBe(401)
    expect(shareResponse.status).not.toBe(401)
  })

  it('rejects normal users from mutating resumes', async () => {
    await api.request('/api/auth/login', {
      body: JSON.stringify({
        email: 'normal@example.com',
        password: 'password123',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })

    const response = await api.request('/api/resumes/resume-1', {
      headers: {
        Authorization: 'Bearer session-token',
      },
      method: 'DELETE',
    })

    expect(response.status).toBe(403)
  })

  it('requires RBAC access for role management endpoints', async () => {
    await api.request('/api/auth/login', {
      body: JSON.stringify({
        email: 'normal@example.com',
        password: 'password123',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })

    const response = await api.request('/api/roles', {
      body: JSON.stringify({
        description: 'Can review resumes.',
        name: 'reviewer',
        permissions: ['resumes:read'],
      }),
      headers: {
        Authorization: 'Bearer session-token',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })

    expect(response.status).toBe(403)
  })

  it('manages roles and assigns users to multiple roles by ID', async () => {
    const loginResponse = await api.request('/api/auth/login', {
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'password123',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })
    const loginBody = (await loginResponse.json()) as {
      sessionToken: string
    }
    const authHeaders = {
      Authorization: `Bearer ${loginBody.sessionToken}`,
      'Content-Type': 'application/json',
    }

    const createRoleResponse = await api.request('/api/roles', {
      body: JSON.stringify({
        description: 'Can review resumes.',
        name: 'reviewer',
        permissions: ['resumes:read'],
      }),
      headers: authHeaders,
      method: 'POST',
    })
    const reviewerRole = (await createRoleResponse.json()) as {
      id: string
      isSystem: boolean
      name: string
      permissions: string[]
    }

    expect(createRoleResponse.status).toBe(201)
    expect(reviewerRole).toMatchObject({
      isSystem: false,
      name: 'reviewer',
      permissions: ['resumes:read'],
    })

    const createUserResponse = await api.request('/api/users', {
      body: JSON.stringify({
        email: 'new-reviewer@example.com',
        name: 'New Reviewer',
        password: 'password123',
        roleIds: [reviewerRole.id],
        status: 'active',
      }),
      headers: authHeaders,
      method: 'POST',
    })
    const createdUser = (await createUserResponse.json()) as {
      roles: Array<{ id: string; name: string }>
    }

    expect(createUserResponse.status).toBe(201)
    expect(createdUser.roles).toEqual([
      expect.objectContaining({ id: reviewerRole.id, name: 'reviewer' }),
    ])

    const usersResponse = await api.request('/api/users', {
      headers: {
        Authorization: `Bearer ${loginBody.sessionToken}`,
      },
    })
    const users = (await usersResponse.json()) as Array<{
      email: string
      id: string
      roles: Array<{ id: string; name: string }>
    }>
    const normalUser = users.find((user) => user.email === 'normal@example.com')

    if (!normalUser) {
      throw new Error('Expected normal user in test API')
    }

    const assignResponse = await api.request(
      `/api/users/${normalUser.id}/roles`,
      {
        body: JSON.stringify({
          roleIds: [reviewerRole.id],
        }),
        headers: authHeaders,
        method: 'PUT',
      }
    )

    expect(assignResponse.status).toBe(204)

    const updatedUsersResponse = await api.request('/api/users', {
      headers: {
        Authorization: `Bearer ${loginBody.sessionToken}`,
      },
    })
    const updatedUsers = (await updatedUsersResponse.json()) as Array<{
      email: string
      permissions: string[]
      roles: Array<{ id: string; name: string }>
    }>

    expect(
      updatedUsers.find((user) => user.email === 'normal@example.com')
    ).toMatchObject({
      permissions: ['resumes:read'],
      roles: [expect.objectContaining({ id: reviewerRole.id })],
    })

    const deleteRoleResponse = await api.request(`/api/roles/${reviewerRole.id}`, {
      headers: {
        Authorization: `Bearer ${loginBody.sessionToken}`,
      },
      method: 'DELETE',
    })

    expect(deleteRoleResponse.status).toBe(400)
    await expect(deleteRoleResponse.json()).resolves.toEqual({
      error: 'Assigned roles cannot be deleted.',
    })
  })
})
