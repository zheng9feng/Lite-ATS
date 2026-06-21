import { type Kysely } from 'kysely'

export async function up(database: Kysely<unknown>) {
  await database.schema
    .createTable('resumes')
    .ifNotExists()
    .addColumn('id', 'text', (column) => column.primaryKey())
    .addColumn('applicant_email', 'text', (column) => column.notNull())
    .addColumn('applicant_name', 'text', (column) => column.notNull())
    .addColumn('position_applied', 'text', (column) => column.notNull())
    .addColumn('file_name', 'text', (column) => column.notNull())
    .addColumn('file_size', 'integer', (column) => column.notNull())
    .addColumn('file_type', 'text', (column) => column.notNull())
    .addColumn('object_name', 'text', (column) => column.notNull())
    .addColumn('preview_url', 'text', (column) => column.notNull())
    .addColumn('uploaded_at', 'text', (column) => column.notNull())
    .execute()

  await database.schema
    .createTable('resume_shares')
    .ifNotExists()
    .addColumn('token', 'text', (column) => column.primaryKey())
    .addColumn('resume_id', 'text', (column) =>
      column.notNull().references('resumes.id').onDelete('cascade')
    )
    .addColumn('expires_at', 'text', (column) => column.notNull())
    .execute()

  await database.schema
    .createIndex('idx_resumes_uploaded_at')
    .ifNotExists()
    .on('resumes')
    .column('uploaded_at')
    .execute()

  await database.schema
    .createIndex('idx_resume_shares_resume_id')
    .ifNotExists()
    .on('resume_shares')
    .column('resume_id')
    .execute()
}

export async function down(database: Kysely<unknown>) {
  await database.schema.dropTable('resume_shares').ifExists().execute()
  await database.schema.dropTable('resumes').ifExists().execute()
}
