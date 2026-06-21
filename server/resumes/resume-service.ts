import { randomUUID } from 'node:crypto'
import { type Readable } from 'node:stream'
import { normalizeUploadedFileName } from './file-name'

export const RESUME_SHARE_TTL_MS = 60 * 60 * 1000

export type ResumeApplicant = {
  email: string
  name: string
  positionApplied: string
}

export type StoredResume = {
  applicant: ResumeApplicant
  fileName: string
  fileSize: number
  fileType: string
  id: string
  previewUrl: string
  uploadedAt: string
}

export type ResumeShareLink = {
  expiresAt: string
  shareUrl: string
  token: string
}

export type UploadedResumeFile = {
  buffer: Buffer
  mimetype: string
  originalname: string
  size: number
}

type StoredResumeRecord = StoredResume & {
  objectName: string
}

type ShareRecord = {
  expiresAt: Date
  resumeId: string
  token: string
}

export type ResumeObjectStorage = {
  ensureBucket: (bucketName: string) => Promise<void>
  getObject: (payload: {
    bucketName: string
    objectName: string
  }) => Promise<Readable>
  putObject: (payload: {
    body: Buffer
    bucketName: string
    contentType: string
    objectName: string
    size: number
  }) => Promise<void>
}

type CreateResumeServiceOptions = {
  bucketName: string
  createId?: () => string
  createToken?: () => string
  getNow?: () => Date
  publicApiUrl: string
  shareTtlMs?: number
  storage: ResumeObjectStorage
}

type AddResumePayload = {
  applicant: ResumeApplicant
  file: UploadedResumeFile
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}

function sanitizeFileName(fileName: string) {
  const fallback = 'resume.pdf'
  const normalized = fileName
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return normalized || fallback
}

function toPublicResume(record: StoredResumeRecord): StoredResume {
  const { objectName: _objectName, ...resume } = record

  return resume
}

export function createResumeService({
  bucketName,
  createId = randomUUID,
  createToken = randomUUID,
  getNow = () => new Date(),
  publicApiUrl,
  shareTtlMs = RESUME_SHARE_TTL_MS,
  storage,
}: CreateResumeServiceOptions) {
  const resumes = new Map<string, StoredResumeRecord>()
  const shares = new Map<string, ShareRecord>()
  const normalizedPublicApiUrl = trimTrailingSlash(publicApiUrl)

  async function addResume({ applicant, file }: AddResumePayload) {
    const id = createId()
    const uploadedAt = getNow()
    const fileName = normalizeUploadedFileName(file.originalname)
    const objectName = `resumes/${id}/${sanitizeFileName(fileName)}`
    const fileType = file.mimetype || 'application/pdf'

    await storage.ensureBucket(bucketName)
    await storage.putObject({
      body: file.buffer,
      bucketName,
      contentType: fileType,
      objectName,
      size: file.size,
    })

    const resume: StoredResumeRecord = {
      applicant,
      fileName,
      fileSize: file.size,
      fileType,
      id,
      objectName,
      previewUrl: `${normalizedPublicApiUrl}/api/resumes/${id}/file`,
      uploadedAt: uploadedAt.toISOString(),
    }

    resumes.set(id, resume)

    return toPublicResume(resume)
  }

  function getResume(resumeId: string) {
    const resume = resumes.get(resumeId)

    if (!resume) {
      throw new Error('Resume not found')
    }

    return resume
  }

  async function getResumeFile(resumeId: string) {
    const resume = getResume(resumeId)
    const stream = await storage.getObject({
      bucketName,
      objectName: resume.objectName,
    })

    return {
      resume: toPublicResume(resume),
      stream,
    }
  }

  function createShareLink(resumeId: string): ResumeShareLink {
    getResume(resumeId)

    const token = createToken()
    const expiresAt = new Date(getNow().getTime() + shareTtlMs)

    shares.set(token, {
      expiresAt,
      resumeId,
      token,
    })

    return {
      expiresAt: expiresAt.toISOString(),
      shareUrl: `${normalizedPublicApiUrl}/api/resume-shares/${token}`,
      token,
    }
  }

  function getSharedResume(token: string) {
    const share = shares.get(token)

    if (!share) {
      throw new Error('Share link not found')
    }

    if (share.expiresAt.getTime() <= getNow().getTime()) {
      shares.delete(token)
      throw new Error('Share link has expired')
    }

    return getResume(share.resumeId)
  }

  async function getSharedResumeFile(token: string) {
    const resume = getSharedResume(token)
    const stream = await storage.getObject({
      bucketName,
      objectName: resume.objectName,
    })

    return {
      resume: toPublicResume(resume),
      stream,
    }
  }

  return {
    addResume,
    createShareLink,
    getResumeFile,
    getSharedResume,
    getSharedResumeFile,
  }
}
