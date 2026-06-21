import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { migrateResumeDatabase } from './sqlite-resume-migrations'
import { createSqliteResumeRepository } from './sqlite-resume-repository'

describe('createSqliteResumeRepository', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'lite-ats-resumes-'))
  })

  afterEach(async () => {
    await rm(tempDir, { force: true, recursive: true })
  })

  it('lists stored resumes with newest uploads first', async () => {
    const databasePath = join(tempDir, 'resumes.sqlite')
    await migrateResumeDatabase({ databasePath })

    const repository = createSqliteResumeRepository({ databasePath })

    repository.saveResume({
      applicant: {
        email: 'older@example.com',
        name: 'Older Candidate',
        positionApplied: 'Designer',
      },
      fileName: 'older.pdf',
      fileSize: 5,
      fileType: 'application/pdf',
      id: 'resume-old',
      objectName: 'resumes/resume-old/older.pdf',
      previewUrl: 'http://localhost:3001/api/resumes/resume-old/file',
      uploadedAt: '2026-06-21T07:00:00.000Z',
    })
    repository.saveResume({
      applicant: {
        email: 'newer@example.com',
        name: 'Newer Candidate',
        positionApplied: 'Frontend Engineer',
      },
      fileName: 'newer.pdf',
      fileSize: 6,
      fileType: 'application/pdf',
      id: 'resume-new',
      objectName: 'resumes/resume-new/newer.pdf',
      previewUrl: 'http://localhost:3001/api/resumes/resume-new/file',
      uploadedAt: '2026-06-21T08:00:00.000Z',
    })

    expect(repository.listResumes().map((resume) => resume.id)).toEqual([
      'resume-new',
      'resume-old',
    ])

    repository.close()
  })

  it('deletes stored resumes and cascades share rows', async () => {
    const databasePath = join(tempDir, 'resumes.sqlite')
    await migrateResumeDatabase({ databasePath })

    const repository = createSqliteResumeRepository({ databasePath })

    repository.saveResume({
      applicant: {
        email: 'ava@example.com',
        name: 'Ava Chen',
        positionApplied: 'Frontend Engineer',
      },
      fileName: 'ava.pdf',
      fileSize: 3,
      fileType: 'application/pdf',
      id: 'resume-1',
      objectName: 'resumes/resume-1/ava.pdf',
      previewUrl: 'http://localhost:3001/api/resumes/resume-1/file',
      uploadedAt: '2026-06-21T08:00:00.000Z',
    })
    repository.saveShare({
      expiresAt: new Date('2026-06-21T09:00:00.000Z'),
      resumeId: 'resume-1',
      token: 'share-token',
    })

    repository.deleteResume('resume-1')

    expect(repository.findResume('resume-1')).toBeUndefined()
    expect(repository.findShare('share-token')).toBeUndefined()

    repository.close()
  })
})
