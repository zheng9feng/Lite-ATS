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

export type StoredResumeRecord = StoredResume & {
  objectName: string
}

export type ShareRecord = {
  expiresAt: Date
  resumeId: string
  token: string
}

export type ResumeMetadataRepository = {
  close: () => void
  deleteResume: (resumeId: string) => void
  deleteShare: (token: string) => void
  findResume: (resumeId: string) => StoredResumeRecord | undefined
  findShare: (token: string) => ShareRecord | undefined
  listResumes: () => StoredResumeRecord[]
  saveResume: (resume: StoredResumeRecord) => void
  saveShare: (share: ShareRecord) => void
}

export type ResumeObjectStorage = {
  deleteObject: (payload: {
    bucketName: string
    objectName: string
  }) => Promise<void>
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
  repository: ResumeMetadataRepository
  shareTtlMs?: number
  storage: ResumeObjectStorage
}

type AddResumePayload = {
  applicant: ResumeApplicant
  file: UploadedResumeFile
}

type UpdateResumePayload = {
  applicant: ResumeApplicant
  file?: UploadedResumeFile
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
  repository,
  shareTtlMs = RESUME_SHARE_TTL_MS,
  storage,
}: CreateResumeServiceOptions) {
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

    repository.saveResume(resume)

    return toPublicResume(resume)
  }

  async function updateResume(
    resumeId: string,
    { applicant, file }: UpdateResumePayload
  ) {
    const currentResume = getResume(resumeId)
    let nextResume: StoredResumeRecord = {
      ...currentResume,
      applicant,
    }

    if (file) {
      const fileName = normalizeUploadedFileName(file.originalname)
      const objectName = `resumes/${resumeId}/${sanitizeFileName(fileName)}`
      const fileType = file.mimetype || 'application/pdf'

      await storage.ensureBucket(bucketName)
      await storage.putObject({
        body: file.buffer,
        bucketName,
        contentType: fileType,
        objectName,
        size: file.size,
      })

      nextResume = {
        ...nextResume,
        fileName,
        fileSize: file.size,
        fileType,
        objectName,
      }
    }

    repository.saveResume(nextResume)

    if (file && currentResume.objectName !== nextResume.objectName) {
      await storage.deleteObject({
        bucketName,
        objectName: currentResume.objectName,
      })
    }

    return toPublicResume(nextResume)
  }

  function getResume(resumeId: string) {
    const resume = repository.findResume(resumeId)

    if (!resume) {
      throw new Error('Resume not found')
    }

    return resume
  }

  function listResumes() {
    return repository.listResumes().map((resume) => toPublicResume(resume))
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

    repository.saveShare({
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
    const share = repository.findShare(token)

    if (!share) {
      throw new Error('Share link not found')
    }

    if (share.expiresAt.getTime() <= getNow().getTime()) {
      repository.deleteShare(token)
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

  async function deleteResume(resumeId: string) {
    const resume = getResume(resumeId)

    await storage.deleteObject({
      bucketName,
      objectName: resume.objectName,
    })
    repository.deleteResume(resumeId)
  }

  return {
    addResume,
    createShareLink,
    deleteResume,
    getResumeFile,
    getSharedResume,
    getSharedResumeFile,
    listResumes,
    updateResume,
  }
}
