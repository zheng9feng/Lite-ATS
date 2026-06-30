import { sql, type Kysely } from 'kysely'

const permissions = [
  {
    description: 'View job positions and use active positions in resume forms.',
    id: 'permission-job-positions-read',
    name: 'job-positions:read',
  },
  {
    description: 'Create, edit, and delete job positions.',
    id: 'permission-job-positions-manage',
    name: 'job-positions:manage',
  },
] as const

export async function up(database: Kysely<unknown>) {
  await database.schema
    .createTable('job_positions')
    .ifNotExists()
    .addColumn('id', 'text', (column) => column.primaryKey())
    .addColumn('title', 'text', (column) => column.notNull())
    .addColumn('department', 'text', (column) => column.notNull())
    .addColumn('location', 'text', (column) => column.notNull())
    .addColumn('description', 'text', (column) => column.notNull())
    .addColumn('status', 'text', (column) => column.notNull())
    .addColumn('created_at', 'text', (column) => column.notNull())
    .addColumn('updated_at', 'text', (column) => column.notNull())
    .execute()

  await database.schema
    .alterTable('resumes')
    .addColumn('job_position_id', 'text', (column) =>
      column.references('job_positions.id').onDelete('set null')
    )
    .execute()

  await database.schema
    .createIndex('idx_job_positions_status')
    .ifNotExists()
    .on('job_positions')
    .column('status')
    .execute()

  await database.schema
    .createIndex('idx_resumes_job_position_id')
    .ifNotExists()
    .on('resumes')
    .column('job_position_id')
    .execute()

  for (const permission of permissions) {
    await sql`
      INSERT OR IGNORE INTO t_permissions (id, name, description)
      VALUES (${permission.id}, ${permission.name}, ${permission.description})
    `.execute(database)

    await sql`
      INSERT OR IGNORE INTO t_role_permissions (role_id, permission_id)
      VALUES ('role-admin', ${permission.id})
    `.execute(database)
  }
}

export async function down(database: Kysely<unknown>) {
  await database.schema
    .dropIndex('idx_resumes_job_position_id')
    .ifExists()
    .execute()
  await database.schema
    .dropIndex('idx_job_positions_status')
    .ifExists()
    .execute()
  await database.schema
    .alterTable('resumes')
    .dropColumn('job_position_id')
    .execute()
  await database.schema.dropTable('job_positions').ifExists().execute()

  for (const permission of permissions) {
    await sql`
      DELETE FROM t_role_permissions
      WHERE permission_id = ${permission.id}
    `.execute(database)
    await sql`
      DELETE FROM t_permissions
      WHERE id = ${permission.id}
    `.execute(database)
  }
}
