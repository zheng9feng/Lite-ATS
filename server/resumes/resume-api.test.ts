import { createServer } from 'node:http'
import { type AddressInfo } from 'node:net'
import { Readable } from 'node:stream'
import JSZip from 'jszip'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createServerApp } from '../app'
import { createAuthService } from '../auth/auth-service'
import { createJobPositionService } from '../job-positions/job-position-service'
import {
  createResumeService,
  type ResumeMetadataRepository,
  type ShareRecord,
  type StoredResumeRecord,
} from './resume-service'

function createMemoryResumeRepository(): ResumeMetadataRepository {
  const resumes = new Map<string, StoredResumeRecord>()
  const shares = new Map<string, ShareRecord>()

  return {
    close: () => undefined,
    deleteResume: (resumeId) => {
      resumes.delete(resumeId)
    },
    deleteShare: (token) => {
      shares.delete(token)
    },
    findResume: (resumeId) => resumes.get(resumeId),
    findShare: (token) => shares.get(token),
    listResumes: () => [...resumes.values()],
    saveResume: (resume) => {
      resumes.set(resume.id, resume)
    },
    saveShare: (share) => {
      shares.set(share.token, share)
    },
  }
}

function createMemoryJobPositionRepository() {
  return {
    close: () => undefined,
    deleteJobPosition: () => undefined,
    findJobPosition: (jobPositionId: string) =>
      jobPositionId === 'job-frontend'
        ? {
            createdAt: '2026-06-25T08:00:00.000Z',
            department: 'Engineering',
            description: '',
            id: 'job-frontend',
            location: 'Remote',
            status: 'active' as const,
            title: 'Frontend Engineer',
            updatedAt: '2026-06-25T08:00:00.000Z',
          }
        : undefined,
    listActiveJobPositions: () => [],
    listJobPositions: () => [],
    saveJobPosition: () => undefined,
  }
}

function createAuthRepository() {
  return {
    close: () => undefined,
    countActiveUsersWithPermission: vi.fn(() => 1),
    countActiveUsersWithPermissionExcludingRole: vi.fn(() => 1),
    countRoleUsers: vi.fn(() => 1),
    createRole: vi.fn(),
    createUser: vi.fn(),
    deleteRole: vi.fn(),
    deleteSession: vi.fn(),
    deleteUser: vi.fn(),
    findPermissionByName: vi.fn(),
    findRoleById: vi.fn(),
    findRoleByName: vi.fn(),
    findSessionByTokenHash: vi.fn(() => ({
      createdAt: new Date('2026-06-25T08:00:00.000Z'),
      expiresAt: new Date('2099-06-25T09:00:00.000Z'),
      id: 'session-1',
      token: 'session-token',
      userId: 'user-1',
    })),
    findUserById: vi.fn(() => ({
      createdAt: '2026-06-25T08:00:00.000Z',
      email: 'admin@example.com',
      id: 'user-1',
      name: 'Admin User',
      passwordHash: 'hash',
      status: 'active' as const,
      updatedAt: '2026-06-25T08:00:00.000Z',
    })),
    findUserByEmail: vi.fn(),
    getUserPermissions: vi.fn(() => [
      'resumes:create',
      'resumes:delete',
      'resumes:read',
      'resumes:share',
      'resumes:update',
      'rbac:manage',
    ]),
    getUserRoles: vi.fn(() => [
      {
        description: 'Administrator',
        id: 'role-admin',
        name: 'admin' as const,
      },
    ]),
    listPermissions: vi.fn(() => []),
    listRolePermissions: vi.fn(),
    listRoles: vi.fn(() => []),
    listUserRoles: vi.fn(() => ['admin']),
    listUsers: vi.fn(() => []),
    saveSession: vi.fn(),
    setRolePermissions: vi.fn(),
    setUserRoles: vi.fn(),
    updateRole: vi.fn(),
    updateSessionLastUsedAt: vi.fn(),
    updateUser: vi.fn(),
  }
}

describe('resume bulk upload API', () => {
  const storage = {
    deleteObject: vi.fn(),
    ensureBucket: vi.fn(),
    getObject: vi.fn(),
    putObject: vi.fn(),
  }
  let baseUrl = ''
  let server: ReturnType<typeof createServer>

  beforeEach(async () => {
    vi.clearAllMocks()
    storage.getObject.mockResolvedValue(Readable.from(['pdf']))
    const createId = vi
      .fn()
      .mockReturnValueOnce('resume-1')
      .mockReturnValueOnce('resume-2')
      .mockReturnValueOnce('resume-3')
      .mockReturnValueOnce('resume-4')
      .mockReturnValueOnce('resume-5')

    const app = createServerApp({
      authService: createAuthService({
        repository: createAuthRepository() as unknown as Parameters<
          typeof createAuthService
        >[0]['repository'],
      }),
      captchaVerifier: {
        verify: async () => 'unavailable',
      },
      jobPositionService: createJobPositionService({
        repository: createMemoryJobPositionRepository(),
      }),
      resumeService: createResumeService({
        bucketName: 'resumes',
        createId,
        getNow: () => new Date('2026-06-25T08:00:00.000Z'),
        publicApiUrl: 'http://localhost:3001',
        repository: createMemoryResumeRepository(),
        storage,
      }),
    })

    server = createServer(app)
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve)
    })
    const address = server.address() as AddressInfo
    baseUrl = `http://127.0.0.1:${address.port}`
  })

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error)
        else resolve()
      })
    })
  })

  function authHeaders() {
    return {
      Authorization: 'Bearer session-token',
    }
  }

  it('uploads multiple PDF files through the bulk endpoint', async () => {
    const body = new FormData()
    body.append('jobPositionId', 'job-frontend')
    body.append(
      'resumes',
      new Blob(['pdf-one'], { type: 'application/pdf' }),
      'ava.pdf'
    )
    body.append(
      'resumes',
      new Blob(['pdf-two'], { type: 'application/pdf' }),
      'ben.pdf'
    )

    const response = await fetch(`${baseUrl}/api/resumes/bulk`, {
      body,
      headers: authHeaders(),
      method: 'POST',
    })
    const resumes = (await response.json()) as { fileName: string }[]

    expect(response.status).toBe(201)
    expect(resumes.map((resume) => resume.fileName)).toEqual([
      'ava.pdf',
      'ben.pdf',
    ])
    expect(storage.putObject).toHaveBeenCalledTimes(2)
  })

  it('uploads multiple PDF files without a position applied', async () => {
    const body = new FormData()
    body.append(
      'resumes',
      new Blob(['pdf-one'], { type: 'application/pdf' }),
      'ava.pdf'
    )
    body.append(
      'resumes',
      new Blob(['pdf-two'], { type: 'application/pdf' }),
      'ben.pdf'
    )

    const response = await fetch(`${baseUrl}/api/resumes/bulk`, {
      body,
      headers: authHeaders(),
      method: 'POST',
    })
    const resumes = (await response.json()) as {
      applicant: { positionApplied: string }
      jobPositionId: string | null
    }[]

    expect(response.status).toBe(201)
    expect(resumes.map((resume) => resume.applicant.positionApplied)).toEqual([
      '',
      '',
    ])
    expect(resumes.map((resume) => resume.jobPositionId)).toEqual([null, null])
  })

  it('uses optional position applied text for bulk uploads', async () => {
    const body = new FormData()
    body.append('positionApplied', 'Talent Pool')
    body.append(
      'resumes',
      new Blob(['pdf-one'], { type: 'application/pdf' }),
      'ava.pdf'
    )

    const response = await fetch(`${baseUrl}/api/resumes/bulk`, {
      body,
      headers: authHeaders(),
      method: 'POST',
    })
    const resumes = (await response.json()) as {
      applicant: { positionApplied: string }
      jobPositionId: string | null
    }[]

    expect(response.status).toBe(201)
    expect(resumes[0]?.applicant.positionApplied).toBe('Talent Pool')
    expect(resumes[0]?.jobPositionId).toBeNull()
  })

  it('uploads PDF files extracted from a ZIP archive', async () => {
    const zip = new JSZip()
    zip.file('ava.pdf', 'pdf-one')
    zip.file('__MACOSX/._ava.pdf', 'metadata')
    const archive = await zip.generateAsync({ type: 'blob' })
    const body = new FormData()
    body.append('jobPositionId', 'job-frontend')
    body.append('archive', archive, 'resumes.zip')

    const response = await fetch(`${baseUrl}/api/resumes/bulk`, {
      body,
      headers: authHeaders(),
      method: 'POST',
    })
    const resumes = (await response.json()) as { fileName: string }[]

    expect(response.status).toBe(201)
    expect(resumes.map((resume) => resume.fileName)).toEqual(['ava.pdf'])
  })

  it('rejects mixed archive and PDF bulk requests', async () => {
    const zip = new JSZip()
    zip.file('ava.pdf', 'pdf-one')
    const archive = await zip.generateAsync({ type: 'blob' })
    const body = new FormData()
    body.append('jobPositionId', 'job-frontend')
    body.append('archive', archive, 'resumes.zip')
    body.append(
      'resumes',
      new Blob(['pdf'], { type: 'application/pdf' }),
      'ava.pdf'
    )

    const response = await fetch(`${baseUrl}/api/resumes/bulk`, {
      body,
      headers: authHeaders(),
      method: 'POST',
    })
    const error = (await response.json()) as { error: string }

    expect(response.status).toBe(400)
    expect(error.error).toBe('Upload either PDF files or one ZIP archive.')
  })

  it('rejects ZIP archives containing non-PDF user files', async () => {
    const zip = new JSZip()
    zip.file('ava.pdf', 'pdf-one')
    zip.file('notes.txt', 'not pdf')
    const archive = await zip.generateAsync({ type: 'blob' })
    const body = new FormData()
    body.append('jobPositionId', 'job-frontend')
    body.append('archive', archive, 'resumes.zip')

    const response = await fetch(`${baseUrl}/api/resumes/bulk`, {
      body,
      headers: authHeaders(),
      method: 'POST',
    })
    const error = (await response.json()) as { error: string }

    expect(response.status).toBe(400)
    expect(error.error).toBe('ZIP archives can only contain PDF files.')
  })

  it('rejects bulk uploads with more than twenty PDF files', async () => {
    const body = new FormData()
    body.append('jobPositionId', 'job-frontend')
    for (let index = 1; index <= 21; index += 1) {
      body.append(
        'resumes',
        new Blob(['pdf'], { type: 'application/pdf' }),
        `candidate-${index}.pdf`
      )
    }

    const response = await fetch(`${baseUrl}/api/resumes/bulk`, {
      body,
      headers: authHeaders(),
      method: 'POST',
    })
    const error = (await response.json()) as { error: string }

    expect(response.status).toBe(400)
    expect(error.error).toBe('Upload between 1 and 20 resume files.')
  })
})
