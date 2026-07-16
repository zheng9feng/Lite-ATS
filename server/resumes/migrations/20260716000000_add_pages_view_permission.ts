import { sql, type Kysely } from 'kysely'

const permission = {
  description: 'Access authentication and error example pages.',
  id: 'permission-pages-view',
  name: 'pages:view',
} as const

const adminRoleDescriptions = {
  current:
    'Full access to user management, RBAC, example pages, and resumes.',
  previous: 'Full access to user management, RBAC, and resumes.',
} as const

export async function up(database: Kysely<unknown>) {
  await sql`
    INSERT OR IGNORE INTO t_permissions (id, name, description)
    VALUES (${permission.id}, ${permission.name}, ${permission.description})
  `.execute(database)

  await sql`
    INSERT OR IGNORE INTO t_role_permissions (role_id, permission_id)
    VALUES ('role-admin', ${permission.id})
  `.execute(database)

  await sql`
    UPDATE t_roles
    SET description = ${adminRoleDescriptions.current}
    WHERE id = 'role-admin'
      AND description = ${adminRoleDescriptions.previous}
  `.execute(database)
}

export async function down(database: Kysely<unknown>) {
  await sql`
    UPDATE t_roles
    SET description = ${adminRoleDescriptions.previous}
    WHERE id = 'role-admin'
      AND description = ${adminRoleDescriptions.current}
  `.execute(database)

  await sql`
    DELETE FROM t_role_permissions
    WHERE permission_id = ${permission.id}
  `.execute(database)

  await sql`
    DELETE FROM t_permissions
    WHERE id = ${permission.id}
  `.execute(database)
}
