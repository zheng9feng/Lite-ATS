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
    deleteResume: (resumeId) => {
      resumes.delete(resumeId)
      for (const [token, share] of shares) {
        if (share.resumeId === resumeId) {
          shares.delete(token)
        }
      }
    },
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
    deleteObject: vi.fn(),
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
      jobPositionId: null,
      previewUrl: 'http://localhost:3001/api/resumes/resume-1/file',
      uploadedAt: now.toISOString(),
    })
  })

  it('stores the selected database job position with resume metadata', async () => {
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
        originalname: 'ava.pdf',
        size: 3,
      },
      jobPositionId: 'job-frontend',
    })

    expect(resume).toMatchObject({
      applicant: {
        positionApplied: 'Frontend Engineer',
      },
      jobPositionId: 'job-frontend',
    })
    expect(service.listResumes()[0]?.jobPositionId).toBe('job-frontend')
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

  it('updates applicant metadata without replacing the stored PDF', async () => {
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

    const resume = await service.updateResume('resume-1', {
      applicant: {
        email: 'ava.updated@example.com',
        name: 'Ava Updated',
        positionApplied: 'Product Engineer',
      },
    })

    expect(resume).toMatchObject({
      applicant: {
        email: 'ava.updated@example.com',
        name: 'Ava Updated',
        positionApplied: 'Product Engineer',
      },
      fileName: 'ava.pdf',
      fileSize: 3,
      id: 'resume-1',
      uploadedAt: now.toISOString(),
    })
    expect(storage.putObject).toHaveBeenCalledTimes(1)
    expect(storage.deleteObject).not.toHaveBeenCalled()
  })

  it('replaces the stored PDF and deletes the previous object', async () => {
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
        buffer: Buffer.from('old pdf'),
        mimetype: 'application/pdf',
        originalname: 'ava.pdf',
        size: 7,
      },
    })

    const resume = await service.updateResume('resume-1', {
      applicant: {
        email: 'ava@example.com',
        name: 'Ava Chen',
        positionApplied: 'Frontend Engineer',
      },
      file: {
        buffer: Buffer.from('new pdf'),
        mimetype: 'application/pdf',
        originalname: 'ava updated.pdf',
        size: 7,
      },
    })

    expect(storage.putObject).toHaveBeenLastCalledWith({
      body: Buffer.from('new pdf'),
      bucketName: 'resumes',
      contentType: 'application/pdf',
      objectName: 'resumes/resume-1/ava-updated.pdf',
      size: 7,
    })
    expect(storage.deleteObject).toHaveBeenCalledWith({
      bucketName: 'resumes',
      objectName: 'resumes/resume-1/ava.pdf',
    })
    expect(resume).toMatchObject({
      fileName: 'ava updated.pdf',
      fileSize: 7,
      id: 'resume-1',
      previewUrl: 'http://localhost:3001/api/resumes/resume-1/file',
      uploadedAt: now.toISOString(),
    })
  })

  it('deletes stored PDF metadata, object storage, and share access', async () => {
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

    await service.deleteResume('resume-1')

    expect(storage.deleteObject).toHaveBeenCalledWith({
      bucketName: 'resumes',
      objectName: 'resumes/resume-1/ava.pdf',
    })
    expect(service.listResumes()).toEqual([])
    expect(() => service.getSharedResume('share-token')).toThrow(
      'Share link not found'
    )
  })

  it('summarizes stored resume metadata for the dashboard', async () => {
    createId
      .mockReturnValueOnce('resume-1')
      .mockReturnValueOnce('resume-2')
      .mockReturnValueOnce('resume-3')
      .mockReturnValueOnce('resume-4')
      .mockReturnValueOnce('resume-5')
      .mockReturnValueOnce('resume-6')
    getNow
      .mockReturnValueOnce(new Date('2026-04-10T08:00:00.000Z'))
      .mockReturnValueOnce(new Date('2026-05-12T08:00:00.000Z'))
      .mockReturnValueOnce(new Date('2026-05-13T08:00:00.000Z'))
      .mockReturnValueOnce(new Date('2026-06-01T08:00:00.000Z'))
      .mockReturnValueOnce(new Date('2026-06-02T08:00:00.000Z'))
      .mockReturnValueOnce(new Date('2026-06-03T08:00:00.000Z'))

    const service = createResumeService({
      bucketName: 'resumes',
      createId,
      createToken,
      getNow,
      publicApiUrl: 'http://localhost:3001',
      repository: createMemoryResumeRepository(),
      storage,
    })

    for (const [index, positionApplied] of [
      'Designer',
      'Frontend Engineer',
      'Frontend Engineer',
      'Backend Engineer',
      'Frontend Engineer',
      'Backend Engineer',
    ].entries()) {
      await service.addResume({
        applicant: {
          email: `candidate${index + 1}@example.com`,
          name: `Candidate ${index + 1}`,
          positionApplied,
        },
        file: {
          buffer: Buffer.from('pdf'),
          mimetype: 'application/pdf',
          originalname: `candidate-${index + 1}.pdf`,
          size: 1000 * (index + 1),
        },
      })
    }

    expect(service.getResumeSummary()).toEqual({
      latestUploadAt: '2026-06-03T08:00:00.000Z',
      recentResumes: [
        expect.objectContaining({ id: 'resume-6' }),
        expect.objectContaining({ id: 'resume-5' }),
        expect.objectContaining({ id: 'resume-4' }),
        expect.objectContaining({ id: 'resume-3' }),
        expect.objectContaining({ id: 'resume-2' }),
      ],
      topPositions: [
        { count: 3, position: 'Frontend Engineer' },
        { count: 2, position: 'Backend Engineer' },
        { count: 1, position: 'Designer' },
      ],
      totalFileSize: 21000,
      totalResumes: 6,
      uniquePositionCount: 3,
      uploadsByMonth: [
        { count: 1, month: '2026-04' },
        { count: 2, month: '2026-05' },
        { count: 3, month: '2026-06' },
      ],
    })
  })

  it('returns an empty dashboard summary when no resumes are stored', () => {
    const service = createResumeService({
      bucketName: 'resumes',
      createId,
      createToken,
      getNow,
      publicApiUrl: 'http://localhost:3001',
      repository: createMemoryResumeRepository(),
      storage,
    })

    expect(service.getResumeSummary()).toEqual({
      latestUploadAt: null,
      recentResumes: [],
      topPositions: [],
      totalFileSize: 0,
      totalResumes: 0,
      uniquePositionCount: 0,
      uploadsByMonth: [],
    })
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
