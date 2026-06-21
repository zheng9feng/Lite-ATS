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

const apiBaseUrl = import.meta.env.VITE_RESUME_API_BASE_URL ?? ''

function apiUrl(path: string) {
  return `${apiBaseUrl}${path}`
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return response.json() as Promise<T>
  }

  let message = 'Resume API request failed.'

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
    method: 'POST',
  })

  return parseApiResponse<ResumeFile>(response)
}

export async function listResumes(): Promise<ResumeFile[]> {
  const response = await fetch(apiUrl('/api/resumes'))

  return parseApiResponse<ResumeFile[]>(response)
}

export async function createResumeShareLink(
  resumeId: string
): Promise<ResumeShareLink> {
  const response = await fetch(apiUrl(`/api/resumes/${resumeId}/share`), {
    method: 'POST',
  })

  return parseApiResponse<ResumeShareLink>(response)
}
