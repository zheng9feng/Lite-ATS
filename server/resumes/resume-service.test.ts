import { Readable } from 'node:stream'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  RESUME_SHARE_TTL_MS,
  createResumeService,
} from './resume-service'

const now = new Date('2026-06-21T08:00:00.000Z')

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
})
