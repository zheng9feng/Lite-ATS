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
      expect.arrayContaining(['kysely_migration', 'resume_shares', 'resumes'])
    )
    expect(migrations.map((migration) => migration.name)).toContain(
      '20260621000000_create_resume_metadata'
    )

    database.close()
  })
})
