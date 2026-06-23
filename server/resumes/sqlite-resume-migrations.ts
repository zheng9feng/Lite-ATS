import { mkdirSync, promises as fs } from 'node:fs'
import path, { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import { Kysely, SqliteDialect } from 'kysely'
import { FileMigrationProvider, Migrator } from 'kysely/migration'

type MigrateResumeDatabaseOptions = {
  databasePath: string
  migrationFolder?: string
}

const defaultMigrationFolder = join(
  dirname(fileURLToPath(import.meta.url)),
  'migrations'
)

function ensureDatabaseDirectory(databasePath: string) {
  if (databasePath === ':memory:') return

  mkdirSync(dirname(databasePath), { recursive: true })
}

export async function migrateResumeDatabase({
  databasePath,
  migrationFolder = defaultMigrationFolder,
}: MigrateResumeDatabaseOptions) {
  ensureDatabaseDirectory(databasePath)

  const sqliteDatabase = new Database(databasePath)
  const database = new Kysely<unknown>({
    dialect: new SqliteDialect({
      database: sqliteDatabase,
    }),
  })

  try {
    const migrator = new Migrator({
      db: database,
      provider: new FileMigrationProvider({
        fs,
        migrationFolder,
        path,
      }),
    })
    const { error, results } = await migrator.migrateToLatest()

    if (error) {
      const failedMigration = results?.find(
        (result) => result.status === 'Error'
      )
      const migrationName = failedMigration
        ? ` "${failedMigration.migrationName}"`
        : ''

      const detail =
        error instanceof Error && error.message ? ` ${error.message}` : ''

      throw new Error(
        `Failed to run resume database migration${migrationName}.${detail}`
      )
    }
  } finally {
    await database.destroy()
  }
}
