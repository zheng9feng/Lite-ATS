import { sql, type Kysely } from 'kysely'

export async function up(database: Kysely<unknown>) {
  await database.schema
    .alterTable('t_roles')
    .addColumn('is_system', 'integer', (column) =>
      column.notNull().defaultTo(0)
    )
    .execute()

  await sql`
    UPDATE t_roles
    SET is_system = 1
    WHERE name IN ('admin', 'normal')
  `.execute(database)
}

export async function down(database: Kysely<unknown>) {
  await database.schema.alterTable('t_roles').dropColumn('is_system').execute()
}
