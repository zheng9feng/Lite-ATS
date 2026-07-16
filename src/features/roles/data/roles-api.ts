import { useAuthStore } from '@/stores/auth-store'
import { i18n } from '@/lib/i18n'
import { type AppPermission } from '@/lib/permissions'

export type RoleDto = {
  createdAt: string
  description: string
  id: string
  isSystem: boolean
  name: string
  permissions: AppPermission[]
  updatedAt: string
  userCount: number
}

export type CreateRolePayload = {
  description: string
  name: string
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

  let message = i18n.t('rolesPage.api.failed')

  try {
    const body = (await response.json()) as { error?: string }
    message = body.error || message
  } catch {
    message = response.statusText || message
  }

  throw new Error(message)
}

export async function listRoles() {
  const response = await fetch(apiUrl('/api/roles'), {
    headers: authHeaders(),
  })

  return parseApiResponse<RoleDto[]>(response)
}

export async function createRole(payload: CreateRolePayload) {
  const response = await fetch(apiUrl('/api/roles'), {
    body: JSON.stringify({ ...payload, permissions: [] }),
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
