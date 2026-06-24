import { useAuthStore } from '@/stores/auth-store'
import { i18n } from '@/lib/i18n'
import { type User } from './schema'

type DatabaseUserStatus = 'active' | 'inactive'
type DatabaseUserRole = 'admin' | 'normal'

type DatabaseUser = {
  createdAt: string
  email: string
  id: string
  name: string
  roles: DatabaseUserRole[]
  status: DatabaseUserStatus
  updatedAt: string
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

  return {
    createdAt: new Date(user.createdAt),
    email: user.email,
    firstName,
    id: user.id,
    lastName,
    phoneNumber: '',
    role: user.roles.includes('admin') ? 'admin' : 'normal',
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
