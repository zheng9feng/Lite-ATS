import { useAuthStore } from '@/stores/auth-store'
import { i18n } from '@/lib/i18n'
import { type User } from './schema'

type DatabaseUserStatus = 'active' | 'inactive'
type DatabaseUserRoleDto = string | { id?: string; name: string }

type DatabaseUser = {
  createdAt: string
  email: string
  id: string
  name: string
  roles: DatabaseUserRoleDto[]
  status: DatabaseUserStatus
  updatedAt: string
}

export type UserRoleOption = {
  description: string
  id: string
  name: string
}

type DatabaseRole = UserRoleOption & {
  isSystem: boolean
  permissions: string[]
  userCount: number
}

type SaveUserPayload = {
  email: string
  name: string
  password?: string
  roleId: string
  status: DatabaseUserStatus
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

function jsonAuthHeaders() {
  return {
    ...authHeaders(),
    'Content-Type': 'application/json',
  }
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return response.json() as Promise<T>
  }

  let message = i18n.t('usersPage.api.failed')

  try {
    const body = (await response.json()) as { error?: string }
    message = body.error || message
  } catch {
    message = response.statusText || message
  }

  throw new Error(message)
}

function splitName(name: string) {
  const [firstName = '', ...rest] = name.trim().split(/\s+/)

  return {
    firstName,
    lastName: rest.join(' '),
  }
}

function toTableUser(user: DatabaseUser): User {
  const { firstName, lastName } = splitName(user.name)
  const [username] = user.email.split('@')
  const firstRole = user.roles[0]
  const role =
    typeof firstRole === 'string' ? firstRole : (firstRole?.name ?? 'normal')
  const roleId =
    typeof firstRole === 'string' ? firstRole : (firstRole?.id ?? role)

  return {
    createdAt: new Date(user.createdAt),
    email: user.email,
    firstName,
    id: user.id,
    lastName,
    phoneNumber: '',
    role,
    roleId,
    status: user.status,
    updatedAt: new Date(user.updatedAt),
    username: username || user.id,
  }
}

export async function listUsers(): Promise<User[]> {
  const response = await fetch(apiUrl('/api/users'), {
    headers: authHeaders(),
  })

  const users = await parseApiResponse<DatabaseUser[]>(response)

  return users.map(toTableUser)
}

export async function listUserRoleOptions(): Promise<UserRoleOption[]> {
  const response = await fetch(apiUrl('/api/roles'), {
    headers: authHeaders(),
  })

  const roles = await parseApiResponse<DatabaseRole[]>(response)

  return roles.map(({ description, id, name }) => ({
    description,
    id,
    name,
  }))
}

export async function createUser(payload: SaveUserPayload): Promise<User> {
  const response = await fetch(apiUrl('/api/users'), {
    body: JSON.stringify({
      email: payload.email,
      name: payload.name,
      password: payload.password,
      roleIds: [payload.roleId],
      status: payload.status,
    }),
    headers: jsonAuthHeaders(),
    method: 'POST',
  })

  return toTableUser(await parseApiResponse<DatabaseUser>(response))
}

export async function updateUser(
  userId: string,
  payload: SaveUserPayload
): Promise<User> {
  const response = await fetch(apiUrl(`/api/users/${userId}`), {
    body: JSON.stringify({
      email: payload.email,
      name: payload.name,
      password: payload.password,
      status: payload.status,
    }),
    headers: jsonAuthHeaders(),
    method: 'PATCH',
  })
  const user = toTableUser(await parseApiResponse<DatabaseUser>(response))

  const rolesResponse = await fetch(apiUrl(`/api/users/${userId}/roles`), {
    body: JSON.stringify({
      roleIds: [payload.roleId],
    }),
    headers: jsonAuthHeaders(),
    method: 'PUT',
  })

  if (!rolesResponse.ok) {
    await parseApiResponse(rolesResponse)
  }

  return {
    ...user,
    roleId: payload.roleId,
  }
}
