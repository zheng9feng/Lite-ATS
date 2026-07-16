import { sql, type Kysely } from 'kysely'

export async function up(database: Kysely<unknown>) {
  await database.schema
    .alterTable('t_roles')
    .addColumn('created_at', 'text', (column) =>
      column.notNull().defaultTo('')
    )
    .execute()
  await database.schema
    .alterTable('t_roles')
    .addColumn('updated_at', 'text', (column) =>
      column.notNull().defaultTo('')
    )
    .execute()

  const now = new Date().toISOString()
  await sql`
    UPDATE t_roles
    SET created_at = ${now}, updated_at = ${now}
    WHERE created_at = '' OR updated_at = ''
  `.execute(database)
}

export async function down(database: Kysely<unknown>) {
  await database.schema.alterTable('t_roles').dropColumn('updated_at').execute()
  await database.schema.alterTable('t_roles').dropColumn('created_at').execute()
}
