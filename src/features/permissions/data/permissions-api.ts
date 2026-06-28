import { useAuthStore } from '@/stores/auth-store'
import { i18n } from '@/lib/i18n'
import { type AppPermission } from '@/lib/permissions'

export type RoleSummary = {
  description: string
  id: string
  isSystem: boolean
  name: string
}

export type RoleDto = RoleSummary & {
  permissions: AppPermission[]
  userCount: number
}

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

export type PermissionUser = {
  createdAt: string
  email: string
  id: string
  name: string
  permissions: AppPermission[]
  roles: RoleSummary[]
  status: 'active' | 'inactive'
  updatedAt: string
}

export type PermissionResources = {
  permissionsByResource: PermissionResourceGroup[]
  roles: RoleDto[]
  users: PermissionUser[]
}

export type CreateRolePayload = {
  description: string
  name: string
  permissions: AppPermission[]
}

export type UpdateRolePayload = Partial<CreateRolePayload>

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

export async function listPermissionResources(): Promise<PermissionResources> {
  const [rolesResponse, permissionsResponse, usersResponse] = await Promise.all(
    [
      fetch(apiUrl('/api/roles'), {
        headers: authHeaders(),
      }),
      fetch(apiUrl('/api/permissions'), {
        headers: authHeaders(),
      }),
      fetch(apiUrl('/api/users'), {
        headers: authHeaders(),
      }),
    ]
  )

  const [roles, permissions, users] = await Promise.all([
    parseApiResponse<RoleDto[]>(rolesResponse),
    parseApiResponse<PermissionDto[]>(permissionsResponse),
    parseApiResponse<PermissionUser[]>(usersResponse),
  ])

  return {
    permissionsByResource: groupPermissions(permissions),
    roles,
    users,
  }
}

export async function createRole(payload: CreateRolePayload) {
  const response = await fetch(apiUrl('/api/roles'), {
    body: JSON.stringify(payload),
    headers: jsonHeaders(),
    method: 'POST',
  })

  return parseApiResponse<RoleDto>(response)
}

export async function updateRole(roleId: string, payload: UpdateRolePayload) {
  const response = await fetch(apiUrl(`/api/roles/${roleId}`), {
    body: JSON.stringify(payload),
    headers: jsonHeaders(),
    method: 'PATCH',
  })

  return parseApiResponse<RoleDto>(response)
}

export async function deleteRole(roleId: string) {
  const response = await fetch(apiUrl(`/api/roles/${roleId}`), {
    headers: authHeaders(),
    method: 'DELETE',
  })

  await parseApiResponse<void>(response)
}

export async function updateUserRoles(userId: string, roleIds: string[]) {
  const response = await fetch(apiUrl(`/api/users/${userId}/roles`), {
    body: JSON.stringify({ roleIds }),
    headers: jsonHeaders(),
    method: 'PUT',
  })

  await parseApiResponse<void>(response)
}
