import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import Database from 'better-sqlite3'
import {
  type ResumeMetadataRepository,
  type ShareRecord,
  type StoredResumeRecord,
} from './resume-service'

type CreateSqliteResumeRepositoryOptions = {
  databasePath: string
}

type ResumeRow = {
  applicant_email: string
  applicant_name: string
  file_name: string
  file_size: number
  file_type: string
  id: string
  object_name: string
  position_applied: string
  preview_url: string
  uploaded_at: string
}

type ShareRow = {
  expires_at: string
  resume_id: string
  token: string
}

function ensureDatabaseDirectory(databasePath: string) {
  if (databasePath === ':memory:') return

  mkdirSync(dirname(databasePath), { recursive: true })
}

function toResumeRecord(row: ResumeRow): StoredResumeRecord {
  return {
    applicant: {
      email: row.applicant_email,
      name: row.applicant_name,
      positionApplied: row.position_applied,
    },
    fileName: row.file_name,
    fileSize: row.file_size,
    fileType: row.file_type,
    id: row.id,
    objectName: row.object_name,
    previewUrl: row.preview_url,
    uploadedAt: row.uploaded_at,
  }
}

function toShareRecord(row: ShareRow): ShareRecord {
  return {
    expiresAt: new Date(row.expires_at),
    resumeId: row.resume_id,
    token: row.token,
  }
}

export function createSqliteResumeRepository({
  databasePath,
}: CreateSqliteResumeRepositoryOptions): ResumeMetadataRepository {
  ensureDatabaseDirectory(databasePath)

  const database = new Database(databasePath)
  database.pragma('foreign_keys = ON')

  const insertResume = database.prepare(`
    INSERT OR REPLACE INTO resumes (
      id,
      applicant_email,
      applicant_name,
      position_applied,
      file_name,
      file_size,
      file_type,
      object_name,
      preview_url,
      uploaded_at
    ) VALUES (
      @id,
      @applicantEmail,
      @applicantName,
      @positionApplied,
      @fileName,
      @fileSize,
      @fileType,
      @objectName,
      @previewUrl,
      @uploadedAt
    )
  `)
  const findResume = database.prepare<string>(`
    SELECT
      id,
      applicant_email,
      applicant_name,
      position_applied,
      file_name,
      file_size,
      file_type,
      object_name,
      preview_url,
      uploaded_at
    FROM resumes
    WHERE id = ?
  `)
  const listResumes = database.prepare(`
    SELECT
      id,
      applicant_email,
      applicant_name,
      position_applied,
      file_name,
      file_size,
      file_type,
      object_name,
      preview_url,
      uploaded_at
    FROM resumes
    ORDER BY uploaded_at DESC
  `)
  const insertShare = database.prepare(`
    INSERT OR REPLACE INTO resume_shares (
      token,
      resume_id,
      expires_at
    ) VALUES (
      @token,
      @resumeId,
      @expiresAt
    )
  `)
  const findShare = database.prepare<string>(`
    SELECT
      token,
      resume_id,
      expires_at
    FROM resume_shares
    WHERE token = ?
  `)
  const deleteShare = database.prepare<string>(`
    DELETE FROM resume_shares
    WHERE token = ?
  `)

  return {
    close: () => database.close(),
    deleteShare: (token) => {
      deleteShare.run(token)
    },
    findResume: (resumeId) => {
      const row = findResume.get(resumeId) as ResumeRow | undefined

      return row ? toResumeRecord(row) : undefined
    },
    findShare: (token) => {
      const row = findShare.get(token) as ShareRow | undefined

      return row ? toShareRecord(row) : undefined
    },
    listResumes: () =>
      (listResumes.all() as ResumeRow[]).map((row) => toResumeRecord(row)),
    saveResume: (resume) => {
      insertResume.run({
        applicantEmail: resume.applicant.email,
        applicantName: resume.applicant.name,
        fileName: resume.fileName,
        fileSize: resume.fileSize,
        fileType: resume.fileType,
        id: resume.id,
        objectName: resume.objectName,
        positionApplied: resume.applicant.positionApplied,
        previewUrl: resume.previewUrl,
        uploadedAt: resume.uploadedAt,
      })
    },
    saveShare: (share) => {
      insertShare.run({
        expiresAt: share.expiresAt.toISOString(),
        resumeId: share.resumeId,
        token: share.token,
      })
    },
  }
}
