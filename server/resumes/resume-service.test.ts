import { Readable } from 'node:stream'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  RESUME_SHARE_TTL_MS,
  type ResumeMetadataRepository,
  type ShareRecord,
  type StoredResumeRecord,
  createResumeService,
} from './resume-service'
import { migrateResumeDatabase } from './sqlite-resume-migrations'
import { createSqliteResumeRepository } from './sqlite-resume-repository'

const now = new Date('2026-06-21T08:00:00.000Z')

function createMemoryResumeRepository(): ResumeMetadataRepository {
  const resumes = new Map<string, StoredResumeRecord>()
  const shares = new Map<string, ShareRecord>()

  return {
    close: () => undefined,
    deleteShare: (token) => {
      shares.delete(token)
    },
    findResume: (resumeId) => resumes.get(resumeId),
    findShare: (token) => shares.get(token),
    listResumes: () =>
      [...resumes.values()].sort((first, second) =>
        second.uploadedAt.localeCompare(first.uploadedAt)
      ),
    saveResume: (resume) => {
      resumes.set(resume.id, resume)
    },
    saveShare: (share) => {
      shares.set(share.token, share)
    },
  }
}

describe('createResumeService', () => {
  const storage = {
    ensureBucket: vi.fn(),
    getObject: vi.fn(),
    putObject: vi.fn(),
  }
  const createId = vi.fn()
  const createToken = vi.fn()
  const getNow = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    storage.getObject.mockResolvedValue(Readable.from(['pdf']))
    createId.mockReturnValue('resume-1')
    createToken.mockReturnValue('share-token')
    getNow.mockReturnValue(now)
  })

  it('stores an uploaded PDF in MinIO and returns resume metadata', async () => {
    const service = createResumeService({
      bucketName: 'resumes',
      createId,
      createToken,
      getNow,
      publicApiUrl: 'http://localhost:3001',
      repository: createMemoryResumeRepository(),
      storage,
    })

    const resume = await service.addResume({
      applicant: {
        email: 'ava@example.com',
        name: 'Ava Chen',
        positionApplied: 'Frontend Engineer',
      },
      file: {
        buffer: Buffer.from('pdf'),
        mimetype: 'application/pdf',
        originalname: 'ava resume.pdf',
        size: 3,
      },
    })

    expect(storage.ensureBucket).toHaveBeenCalledWith('resumes')
    expect(storage.putObject).toHaveBeenCalledWith({
      body: Buffer.from('pdf'),
      bucketName: 'resumes',
      contentType: 'application/pdf',
      objectName: 'resumes/resume-1/ava-resume.pdf',
      size: 3,
    })
    expect(resume).toEqual({
      applicant: {
        email: 'ava@example.com',
        name: 'Ava Chen',
        positionApplied: 'Frontend Engineer',
      },
      fileName: 'ava resume.pdf',
      fileSize: 3,
      fileType: 'application/pdf',
      id: 'resume-1',
      previewUrl: 'http://localhost:3001/api/resumes/resume-1/file',
      uploadedAt: now.toISOString(),
    })
  })

  it('creates an expiring public share link for a stored resume', async () => {
    const service = createResumeService({
      bucketName: 'resumes',
      createId,
      createToken,
      getNow,
      publicApiUrl: 'http://localhost:3001',
      repository: createMemoryResumeRepository(),
      storage,
    })
    await service.addResume({
      applicant: {
        email: 'ava@example.com',
        name: 'Ava Chen',
        positionApplied: 'Frontend Engineer',
      },
      file: {
        buffer: Buffer.from('pdf'),
        mimetype: 'application/pdf',
        originalname: 'ava.pdf',
        size: 3,
      },
    })

    const share = service.createShareLink('resume-1')

    expect(share).toEqual({
      expiresAt: new Date(now.getTime() + RESUME_SHARE_TTL_MS).toISOString(),
      shareUrl: 'http://localhost:3001/api/resume-shares/share-token',
      token: 'share-token',
    })
  })

  it('rejects an expired share token', async () => {
    const service = createResumeService({
      bucketName: 'resumes',
      createId,
      createToken,
      getNow,
      publicApiUrl: 'http://localhost:3001',
      repository: createMemoryResumeRepository(),
      storage,
    })
    await service.addResume({
      applicant: {
        email: 'ava@example.com',
        name: 'Ava Chen',
        positionApplied: 'Frontend Engineer',
      },
      file: {
        buffer: Buffer.from('pdf'),
        mimetype: 'application/pdf',
        originalname: 'ava.pdf',
        size: 3,
      },
    })
    service.createShareLink('resume-1')
    getNow.mockReturnValue(new Date(now.getTime() + RESUME_SHARE_TTL_MS + 1))

    expect(() => service.getSharedResume('share-token')).toThrow(
      'Share link has expired'
    )
  })

  it('persists resume metadata and share links across service instances', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'lite-ats-resume-service-'))
    const databasePath = join(tempDir, 'resumes.sqlite')

    try {
      await migrateResumeDatabase({ databasePath })

      const firstRepository = createSqliteResumeRepository({ databasePath })
      const firstService = createResumeService({
        bucketName: 'resumes',
        createId,
        createToken,
        getNow,
        publicApiUrl: 'http://localhost:3001',
        repository: firstRepository,
        storage,
      })

      await firstService.addResume({
        applicant: {
          email: 'ava@example.com',
          name: 'Ava Chen',
          positionApplied: 'Frontend Engineer',
        },
        file: {
          buffer: Buffer.from('pdf'),
          mimetype: 'application/pdf',
          originalname: 'ava.pdf',
          size: 3,
        },
      })
      firstService.createShareLink('resume-1')
      firstRepository.close()

      const secondRepository = createSqliteResumeRepository({ databasePath })
      const secondService = createResumeService({
        bucketName: 'resumes',
        createId,
        createToken,
        getNow,
        publicApiUrl: 'http://localhost:3001',
        repository: secondRepository,
        storage,
      })

      const { resume } = await secondService.getResumeFile('resume-1')

      expect(resume).toMatchObject({
        fileName: 'ava.pdf',
        id: 'resume-1',
        previewUrl: 'http://localhost:3001/api/resumes/resume-1/file',
      })
      expect(secondService.getSharedResume('share-token')).toMatchObject({
        fileName: 'ava.pdf',
        id: 'resume-1',
      })
      expect(storage.getObject).toHaveBeenCalledWith({
        bucketName: 'resumes',
        objectName: 'resumes/resume-1/ava.pdf',
      })

      secondRepository.close()
    } finally {
      await rm(tempDir, { force: true, recursive: true })
    }
  })
})
