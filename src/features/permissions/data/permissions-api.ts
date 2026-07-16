import { useAuthStore } from '@/stores/auth-store'
import { i18n } from '@/lib/i18n'
import { type AppPermission } from '@/lib/permissions'
import { listRoles, type RoleDto } from '@/features/roles/data/roles-api'

export type PermissionDto = {
  description: string
  id: string
  name: AppPermission
}

export type PermissionOption = PermissionDto & {
  action: string
  resource: string
}

export type PermissionResourceGroup = {
  permissions: PermissionOption[]
  resource: string
}

export type PermissionAssignmentData = {
  permissionsByResource: PermissionResourceGroup[]
  roles: RoleDto[]
}

const apiBaseUrl = import.meta.env.VITE_RESUME_API_BASE_URL ?? ''

function apiUrl(path: string) {
  return `${apiBaseUrl}${path}`
}

function authHeaders() {
  const { sessionToken } = useAuthStore.getState().auth

  return sessionToken
    ? {
        Authorization: `Bearer ${sessionToken}`,
      }
    : undefined
}

function jsonHeaders() {
  return {
    ...authHeaders(),
    'Content-Type': 'application/json',
  }
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    if (response.status === 204) {
      return undefined as T
    }

    return response.json() as Promise<T>
  }

  let message = i18n.t('permissionsPage.api.failed')

  try {
    const body = (await response.json()) as { error?: string }
    message = body.error || message
  } catch {
    message = response.statusText || message
  }

  throw new Error(message)
}

function toPermissionOption(permission: PermissionDto): PermissionOption {
  const [resource, action = permission.name] = permission.name.split(':')

  return {
    ...permission,
    action,
    resource,
  }
}

function groupPermissions(permissions: PermissionDto[]) {
  const groups = new Map<string, PermissionOption[]>()

  for (const permission of permissions.map(toPermissionOption)) {
    groups.set(permission.resource, [
      ...(groups.get(permission.resource) ?? []),
      permission,
    ])
  }

  return Array.from(groups.entries())
    .map(([resource, resourcePermissions]) => ({
      permissions: [...resourcePermissions].sort((a, b) =>
        a.action.localeCompare(b.action)
      ),
      resource,
    }))
    .sort((a, b) => a.resource.localeCompare(b.resource))
}

export async function listPermissionAssignmentData(): Promise<PermissionAssignmentData> {
  const [roles, permissionsResponse] = await Promise.all([
    listRoles(),
    fetch(apiUrl('/api/permissions'), {
      headers: authHeaders(),
    }),
  ])
  const permissions =
    await parseApiResponse<PermissionDto[]>(permissionsResponse)

  return {
    permissionsByResource: groupPermissions(permissions),
    roles,
  }
}

export async function updateRolePermissions(
  roleId: string,
  permissions: AppPermission[]
) {
  const response = await fetch(apiUrl(`/api/roles/${roleId}/permissions`), {
    body: JSON.stringify({ permissions }),
    headers: jsonHeaders(),
    method: 'PUT',
  })

  await parseApiResponse<void>(response)
}
