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
        new Response(Buffer.concat(chunks), {
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
})
