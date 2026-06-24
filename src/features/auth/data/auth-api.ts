import { useAuthStore, type AuthSnapshot } from '@/stores/auth-store'
import { i18n } from '@/lib/i18n'

type AuthPrincipal = Omit<AuthSnapshot, 'sessionToken'>

type LoginPayload = {
  email: string
  password: string
}

const apiBaseUrl = import.meta.env.VITE_RESUME_API_BASE_URL ?? ''

function apiUrl(path: string) {
  return `${apiBaseUrl}${path}`
}

async function parseAuthResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return response.json() as Promise<T>
  }

  let message = i18n.t('resumes.api.failed')

  try {
    const body = (await response.json()) as { error?: string }
    message = body.error || message
  } catch {
    message = response.statusText || message
  }

  throw new Error(message)
}

export async function loginWithPassword(payload: LoginPayload) {
  const response = await fetch(apiUrl('/api/auth/login'), {
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  return parseAuthResponse<AuthSnapshot>(response)
}

export async function getCurrentAuth() {
  const { sessionToken } = useAuthStore.getState().auth
  const response = await fetch(apiUrl('/api/auth/me'), {
    headers: {
      Authorization: `Bearer ${sessionToken}`,
    },
  })

  return parseAuthResponse<AuthPrincipal>(response)
}
