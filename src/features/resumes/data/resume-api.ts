import { useAuthStore } from '@/stores/auth-store'
import { i18n } from '@/lib/i18n'
import { type ResumeApplicant, type ResumeFile } from './resume-store'

export type ResumeShareLink = {
  expiresAt: string
  shareUrl: string
  token: string
}

type UploadResumePayload = {
  applicant: ResumeApplicant
  file: File
}

type UpdateResumePayload = {
  applicant: ResumeApplicant
  file?: File
  resumeId: string
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

  let message = i18n.t('resumes.api.failed')

  try {
    const body = (await response.json()) as { error?: string }
    message = body.error || message
  } catch {
    message = response.statusText || message
  }

  throw new Error(message)
}

export async function uploadResume({
  applicant,
  file,
}: UploadResumePayload): Promise<ResumeFile> {
  const body = new FormData()
  body.append('name', applicant.name)
  body.append('email', applicant.email)
  body.append('positionApplied', applicant.positionApplied)
  body.append('resume', file)

  const response = await fetch(apiUrl('/api/resumes'), {
    body,
    headers: authHeaders(),
    method: 'POST',
  })

  return parseApiResponse<ResumeFile>(response)
}

export async function listResumes(): Promise<ResumeFile[]> {
  const response = await fetch(apiUrl('/api/resumes'), {
    headers: authHeaders(),
  })

  return parseApiResponse<ResumeFile[]>(response)
}

export async function updateResume({
  applicant,
  file,
  resumeId,
}: UpdateResumePayload): Promise<ResumeFile> {
  const body = new FormData()
  body.append('name', applicant.name)
  body.append('email', applicant.email)
  body.append('positionApplied', applicant.positionApplied)

  if (file) {
    body.append('resume', file)
  }

  const response = await fetch(apiUrl(`/api/resumes/${resumeId}`), {
    body,
    headers: authHeaders(),
    method: 'PATCH',
  })

  return parseApiResponse<ResumeFile>(response)
}

export async function deleteResume(resumeId: string): Promise<void> {
  const response = await fetch(apiUrl(`/api/resumes/${resumeId}`), {
    headers: authHeaders(),
    method: 'DELETE',
  })

  if (response.ok) {
    return
  }

  await parseApiResponse<never>(response)
}

export async function createResumeShareLink(
  resumeId: string
): Promise<ResumeShareLink> {
  const response = await fetch(apiUrl(`/api/resumes/${resumeId}/share`), {
    headers: authHeaders(),
    method: 'POST',
  })

  return parseApiResponse<ResumeShareLink>(response)
}
