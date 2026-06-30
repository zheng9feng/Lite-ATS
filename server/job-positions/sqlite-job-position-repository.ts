import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import Database from 'better-sqlite3'
import {
  type JobPosition,
  type JobPositionRepository,
  type JobPositionStatus,
} from './job-position-service'

type CreateSqliteJobPositionRepositoryOptions = {
  databasePath: string
}

type JobPositionRow = {
  created_at: string
  department: string
  description: string
  id: string
  location: string
  status: JobPositionStatus
  title: string
  updated_at: string
}

function ensureDatabaseDirectory(databasePath: string) {
  if (databasePath === ':memory:') return

  mkdirSync(dirname(databasePath), { recursive: true })
}

function toJobPosition(row: JobPositionRow): JobPosition {
  return {
    createdAt: row.created_at,
    department: row.department,
    description: row.description,
    id: row.id,
    location: row.location,
    status: row.status,
    title: row.title,
    updatedAt: row.updated_at,
  }
}

export function createSqliteJobPositionRepository({
  databasePath,
}: CreateSqliteJobPositionRepositoryOptions): JobPositionRepository {
  ensureDatabaseDirectory(databasePath)

  const database = new Database(databasePath)
  database.pragma('foreign_keys = ON')

  const saveJobPosition = database.prepare(`
    INSERT OR REPLACE INTO job_positions (
      id,
      title,
      department,
      location,
      description,
      status,
      created_at,
      updated_at
    ) VALUES (
      @id,
      @title,
      @department,
      @location,
      @description,
      @status,
      @createdAt,
      @updatedAt
    )
  `)
  const findJobPosition = database.prepare<string>(`
    SELECT
      id,
      title,
      department,
      location,
      description,
      status,
      created_at,
      updated_at
    FROM job_positions
    WHERE id = ?
  `)
  const listJobPositions = database.prepare(`
    SELECT
      id,
      title,
      department,
      location,
      description,
      status,
      created_at,
      updated_at
    FROM job_positions
    ORDER BY updated_at DESC, title
  `)
  const listActiveJobPositions = database.prepare(`
    SELECT
      id,
      title,
      department,
      location,
      description,
      status,
      created_at,
      updated_at
    FROM job_positions
    WHERE status = 'active'
    ORDER BY title
  `)
  const deleteJobPosition = database.prepare<string>(`
    DELETE FROM job_positions
    WHERE id = ?
  `)

  return {
    close: () => database.close(),
    deleteJobPosition: (jobPositionId) => {
      deleteJobPosition.run(jobPositionId)
    },
    findJobPosition: (jobPositionId) => {
      const row = findJobPosition.get(jobPositionId) as
        | JobPositionRow
        | undefined

      return row ? toJobPosition(row) : undefined
    },
    listActiveJobPositions: () =>
      (listActiveJobPositions.all() as JobPositionRow[]).map(toJobPosition),
    listJobPositions: () =>
      (listJobPositions.all() as JobPositionRow[]).map(toJobPosition),
    saveJobPosition: (jobPosition) => {
      saveJobPosition.run(jobPosition)
    },
  }
}
