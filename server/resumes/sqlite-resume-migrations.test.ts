import Database from 'better-sqlite3'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { migrateResumeDatabase } from './sqlite-resume-migrations'

describe('migrateResumeDatabase', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'lite-ats-resume-migrations-'))
  })

  afterEach(async () => {
    await rm(tempDir, { force: true, recursive: true })
  })

  it('creates resume metadata tables through the migration runner', async () => {
    const databasePath = join(tempDir, 'resumes.sqlite')

    await migrateResumeDatabase({ databasePath })

    const database = new Database(databasePath, { readonly: true })
    const tables = database
      .prepare(
        `
          SELECT name
          FROM sqlite_master
          WHERE type = 'table'
          ORDER BY name
        `
      )
      .all() as Array<{ name: string }>
    const migrations = database
      .prepare('SELECT name FROM kysely_migration ORDER BY name')
      .all() as Array<{ name: string }>

    expect(tables.map((table) => table.name)).toEqual(
      expect.arrayContaining([
        'job_positions',
        'kysely_migration',
        'resume_shares',
        'resumes',
      ])
    )
    expect(migrations.map((migration) => migration.name)).toContain(
      '20260621000000_create_resume_metadata'
    )
    expect(migrations.map((migration) => migration.name)).toContain(
      '20260625000000_create_job_positions'
    )
    expect(migrations.map((migration) => migration.name)).toContain(
      '20260716000000_add_pages_view_permission'
    )

    const resumeColumns = database
      .prepare('PRAGMA table_info(resumes)')
      .all() as Array<{ name: string }>
    const permissions = database
      .prepare('SELECT name FROM t_permissions ORDER BY name')
      .all() as Array<{ name: string }>

    expect(resumeColumns.map((column) => column.name)).toContain(
      'job_position_id'
    )
    expect(permissions.map((permission) => permission.name)).toEqual(
      expect.arrayContaining([
        'job-positions:manage',
        'job-positions:read',
        'pages:view',
      ])
    )

    database.close()
  })
})
