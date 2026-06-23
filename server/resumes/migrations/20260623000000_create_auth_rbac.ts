import { sql, type Kysely } from 'kysely'

const permissions = [
  'resumes:read',
  'resumes:create',
  'resumes:update',
  'resumes:delete',
  'resumes:share',
  'users:manage',
  'rbac:manage',
] as const

const roles = [
  {
    id: 'role-admin',
    name: 'admin',
    description: 'Full access to user management, RBAC, and resumes.',
  },
  {
    id: 'role-normal',
    name: 'normal',
    description: 'Read-only access to resumes.',
  },
] as const

const permissionDescriptions: Record<(typeof permissions)[number], string> = {
  'rbac:manage': 'Manage role and permission assignments.',
  'resumes:create': 'Upload new resumes.',
  'resumes:delete': 'Delete resumes.',
  'resumes:read': 'View resumes and resume files.',
  'resumes:share': 'Create public resume share links.',
  'resumes:update': 'Edit resume metadata and files.',
  'users:manage': 'Manage local users.',
}

export async function up(database: Kysely<unknown>) {
  await database.schema
    .createTable('t_users')
    .ifNotExists()
    .addColumn('id', 'text', (column) => column.primaryKey())
    .addColumn('email', 'text', (column) => column.notNull().unique())
    .addColumn('name', 'text', (column) => column.notNull())
    .addColumn('password_hash', 'text', (column) => column.notNull())
    .addColumn('status', 'text', (column) => column.notNull())
    .addColumn('created_at', 'text', (column) => column.notNull())
    .addColumn('updated_at', 'text', (column) => column.notNull())
    .execute()

  await database.schema
    .createTable('t_sessions')
    .ifNotExists()
    .addColumn('id', 'text', (column) => column.primaryKey())
    .addColumn('user_id', 'text', (column) =>
      column.notNull().references('t_users.id').onDelete('cascade')
    )
    .addColumn('token_hash', 'text', (column) => column.notNull().unique())
    .addColumn('expires_at', 'text', (column) => column.notNull())
    .addColumn('created_at', 'text', (column) => column.notNull())
    .addColumn('last_used_at', 'text', (column) => column.notNull())
    .execute()

  await database.schema
    .createTable('t_roles')
    .ifNotExists()
    .addColumn('id', 'text', (column) => column.primaryKey())
    .addColumn('name', 'text', (column) => column.notNull().unique())
    .addColumn('description', 'text', (column) => column.notNull())
    .execute()

  await database.schema
    .createTable('t_permissions')
    .ifNotExists()
    .addColumn('id', 'text', (column) => column.primaryKey())
    .addColumn('name', 'text', (column) => column.notNull().unique())
    .addColumn('description', 'text', (column) => column.notNull())
    .execute()

  await database.schema
    .createTable('t_user_roles')
    .ifNotExists()
    .addColumn('user_id', 'text', (column) =>
      column.notNull().references('t_users.id').onDelete('cascade')
    )
    .addColumn('role_id', 'text', (column) =>
      column.notNull().references('t_roles.id').onDelete('cascade')
    )
    .addPrimaryKeyConstraint('pk_t_user_roles', ['user_id', 'role_id'])
    .execute()

  await database.schema
    .createTable('t_role_permissions')
    .ifNotExists()
    .addColumn('role_id', 'text', (column) =>
      column.notNull().references('t_roles.id').onDelete('cascade')
    )
    .addColumn('permission_id', 'text', (column) =>
      column.notNull().references('t_permissions.id').onDelete('cascade')
    )
    .addPrimaryKeyConstraint('pk_t_role_permissions', [
      'role_id',
      'permission_id',
    ])
    .execute()

  await database.schema
    .createIndex('idx_t_sessions_token_hash')
    .ifNotExists()
    .on('t_sessions')
    .column('token_hash')
    .execute()

  await database.schema
    .createIndex('idx_t_users_email')
    .ifNotExists()
    .on('t_users')
    .column('email')
    .execute()

  for (const role of roles) {
    await sql`
      INSERT OR IGNORE INTO t_roles (id, name, description)
      VALUES (${role.id}, ${role.name}, ${role.description})
    `.execute(database)
  }

  for (const permission of permissions) {
    await sql`
      INSERT OR IGNORE INTO t_permissions (id, name, description)
      VALUES (
        ${`permission-${permission.replace(':', '-')}`},
        ${permission},
        ${permissionDescriptions[permission]}
      )
    `.execute(database)
  }

  for (const permission of permissions) {
    await sql`
      INSERT OR IGNORE INTO t_role_permissions (role_id, permission_id)
      VALUES (
        'role-admin',
        ${`permission-${permission.replace(':', '-')}`}
      )
    `.execute(database)
  }

  await sql`
    INSERT OR IGNORE INTO t_role_permissions (role_id, permission_id)
    VALUES ('role-normal', 'permission-resumes-read')
  `.execute(database)
}

export async function down(database: Kysely<unknown>) {
  await database.schema.dropTable('t_role_permissions').ifExists().execute()
  await database.schema.dropTable('t_user_roles').ifExists().execute()
  await database.schema.dropTable('t_permissions').ifExists().execute()
  await database.schema.dropTable('t_roles').ifExists().execute()
  await database.schema.dropTable('t_sessions').ifExists().execute()
  await database.schema.dropTable('t_users').ifExists().execute()
}
