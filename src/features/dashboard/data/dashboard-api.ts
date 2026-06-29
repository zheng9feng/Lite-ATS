import { useAuthStore } from '@/stores/auth-store'
import { i18n } from '@/lib/i18n'
import { type ResumeFile } from '@/features/resumes/data/resume-store'

export type ResumeDashboardSummary = {
  latestUploadAt: string | null
  recentResumes: ResumeFile[]
  topPositions: { count: number; position: string }[]
  totalFileSize: number
  totalResumes: number
  uniquePositionCount: number
  uploadsByMonth: { count: number; month: string }[]
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

  let message = i18n.t('dashboard.api.failed')

  try {
    const body = (await response.json()) as { error?: string }
    message = body.error || message
  } catch {
    message = response.statusText || message
  }

  throw new Error(message)
}

export async function getResumeDashboardSummary() {
  const response = await fetch(apiUrl('/api/resumes/summary'), {
    headers: authHeaders(),
  })

  return parseApiResponse<ResumeDashboardSummary>(response)
}
