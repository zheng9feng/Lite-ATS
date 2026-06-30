import { useAuthStore } from '@/stores/auth-store'
import { i18n } from '@/lib/i18n'

export type JobPositionStatus = 'active' | 'inactive'

export type JobPosition = {
  createdAt: string
  department: string
  description: string
  id: string
  location: string
  status: JobPositionStatus
  title: string
  updatedAt: string
}

export type SaveJobPositionPayload = {
  department?: string
  description?: string
  location?: string
  status?: JobPositionStatus
  title: string
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
    if (response.status === 204) {
      return undefined as T
    }

    return response.json() as Promise<T>
  }

  let message = i18n.t('jobPositionsPage.api.failed')

  try {
    const body = (await response.json()) as { error?: string }
    message = body.error || message
  } catch {
    message = response.statusText || message
  }

  throw new Error(message)
}

export async function listJobPositions(): Promise<JobPosition[]> {
  const response = await fetch(apiUrl('/api/job-positions'), {
    headers: authHeaders(),
  })

  return parseApiResponse<JobPosition[]>(response)
}

export async function listActiveJobPositions(): Promise<JobPosition[]> {
  const response = await fetch(apiUrl('/api/job-positions/active'), {
    headers: authHeaders(),
  })

  return parseApiResponse<JobPosition[]>(response)
}

export async function createJobPosition(
  payload: SaveJobPositionPayload
): Promise<JobPosition> {
  const response = await fetch(apiUrl('/api/job-positions'), {
    body: JSON.stringify(payload),
    headers: jsonAuthHeaders(),
    method: 'POST',
  })

  return parseApiResponse<JobPosition>(response)
}

export async function updateJobPosition(
  jobPositionId: string,
  payload: SaveJobPositionPayload
): Promise<JobPosition> {
  const response = await fetch(apiUrl(`/api/job-positions/${jobPositionId}`), {
    body: JSON.stringify(payload),
    headers: jsonAuthHeaders(),
    method: 'PATCH',
  })

  return parseApiResponse<JobPosition>(response)
}

export async function deleteJobPosition(jobPositionId: string): Promise<void> {
  const response = await fetch(apiUrl(`/api/job-positions/${jobPositionId}`), {
    headers: authHeaders(),
    method: 'DELETE',
  })

  await parseApiResponse<void>(response)
}
