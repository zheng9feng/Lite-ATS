import { describe, expect, it } from 'vitest'
import { resources } from '@/lib/i18n'

const userTranslationKeys = [
  'actions.add',
  'actions.invite',
  'columns.email',
  'columns.name',
  'columns.phoneNumber',
  'columns.role',
  'columns.username',
  'filters.role',
  'filters.searchPlaceholder',
  'filters.status',
  'roles.admin',
  'roles.cashier',
  'roles.manager',
  'roles.normal',
  'roles.superadmin',
  'api.failed',
  'status.active',
  'status.inactive',
  'status.invited',
  'status.suspended',
  'table.selectAll',
  'table.selectRow',
] as const

const dataTableTranslationKeys = [
  'clearFilters',
  'filterPlaceholder',
  'hideColumn',
  'selectedCount',
  'sortAsc',
  'sortDesc',
  'toggleColumns',
  'view',
] as const

const permissionsTranslationKeys = [
  'actions.create',
  'actions.delete',
  'actions.save',
  'api.failed',
  'createRole.description',
  'createRole.title',
  'description',
  'fields.description',
  'fields.roleName',
  'roleEditor.description',
  'systemRole',
  'tabs.roles',
  'tabs.users',
  'title',
  'userCount',
  'userRoles.assignedRoles',
  'userRoles.effectivePermissions',
] as const

function getResourceValue(
  locale: keyof typeof resources,
  namespace: 'dataTable' | 'permissionsPage' | 'usersPage',
  key: string
) {
  return key.split('.').reduce<unknown>((value, part) => {
    if (typeof value !== 'object' || value === null) {
      return undefined
    }

    return (value as Record<string, unknown>)[part]
  }, resources[locale].translation[namespace])
}

describe('users i18n resources', () => {
  it.each(Object.keys(resources) as Array<keyof typeof resources>)(
    'defines users table translations for %s',
    (locale) => {
      for (const key of userTranslationKeys) {
        expect(getResourceValue(locale, 'usersPage', key), key).toEqual(
          expect.any(String)
        )
      }

      for (const key of dataTableTranslationKeys) {
        expect(getResourceValue(locale, 'dataTable', key), key).toEqual(
          expect.any(String)
        )
      }

      for (const key of permissionsTranslationKeys) {
        expect(getResourceValue(locale, 'permissionsPage', key), key).toEqual(
          expect.any(String)
        )
      }
    }
  )
})
