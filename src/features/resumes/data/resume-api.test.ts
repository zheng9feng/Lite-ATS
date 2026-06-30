import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth-store'
import {
  createResumeShareLink,
  deleteResume,
  fetchResumeFile,
  listResumes,
  updateResume,
  uploadResume,
} from './resume-api'

describe('resume API client', () => {
  const fetch = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetch)
    useAuthStore.getState().auth.reset()
    useAuthStore.getState().auth.setSessionToken('session-token')
  })

  it('uploads a resume PDF to the API and returns stored metadata', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        applicant: {
          email: 'ava@example.com',
          name: 'Ava Chen',
          positionApplied: 'Frontend Engineer',
        },
        fileName: 'ava.pdf',
        fileSize: 3,
        fileType: 'application/pdf',
        id: 'resume-1',
        previewUrl: 'http://localhost:3001/api/resumes/resume-1/file',
        uploadedAt: '2026-06-21T08:00:00.000Z',
      }),
    })

    const file = new File(['pdf'], 'ava.pdf', { type: 'application/pdf' })
    const resume = await uploadResume({
      applicant: {
        email: 'ava@example.com',
        name: 'Ava Chen',
        positionApplied: 'Frontend Engineer',
      },
      file,
      jobPositionId: 'job-frontend',
    })

    const body = fetch.mock.calls[0]?.[1]?.body as FormData

    expect(fetch).toHaveBeenCalledWith('/api/resumes', {
      body: expect.any(FormData),
      headers: {
        Authorization: 'Bearer session-token',
      },
      method: 'POST',
    })
    expect(body.get('jobPositionId')).toBe('job-frontend')
    expect(resume.previewUrl).toBe(
      'http://localhost:3001/api/resumes/resume-1/file'
    )
  })

  it('creates a limited-time share link for a stored resume', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        expiresAt: '2026-06-21T09:00:00.000Z',
        shareUrl: 'http://localhost:3001/api/resume-shares/share-token',
        token: 'share-token',
      }),
    })

    const share = await createResumeShareLink('resume-1')

    expect(fetch).toHaveBeenCalledWith('/api/resumes/resume-1/share', {
      headers: {
        Authorization: 'Bearer session-token',
      },
      method: 'POST',
    })
    expect(share.shareUrl).toBe(
      'http://localhost:3001/api/resume-shares/share-token'
    )
  })

  it('lists stored resume metadata from the API', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          applicant: {
            email: 'ava@example.com',
            name: 'Ava Chen',
            positionApplied: 'Frontend Engineer',
          },
          fileName: 'ava.pdf',
          fileSize: 3,
          fileType: 'application/pdf',
          id: 'resume-1',
          previewUrl: 'http://localhost:3001/api/resumes/resume-1/file',
          uploadedAt: '2026-06-21T08:00:00.000Z',
        },
      ],
    })

    const resumes = await listResumes()

    expect(fetch).toHaveBeenCalledWith('/api/resumes', {
      headers: {
        Authorization: 'Bearer session-token',
      },
    })
    expect(resumes).toHaveLength(1)
    expect(resumes[0]?.id).toBe('resume-1')
  })

  it('fetches a resume PDF with the current bearer token', async () => {
    const pdf = new Blob(['pdf'], { type: 'application/pdf' })
    fetch.mockResolvedValue({
      blob: async () => pdf,
      ok: true,
    })

    const result = await fetchResumeFile(
      'http://localhost:3001/api/resumes/resume-1/file'
    )

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/resumes/resume-1/file',
      {
        headers: {
          Authorization: 'Bearer session-token',
        },
      }
    )
    expect(result).toBe(pdf)
  })

  it('updates resume metadata and optionally sends a replacement PDF', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        applicant: {
          email: 'ava.updated@example.com',
          name: 'Ava Updated',
          positionApplied: 'Product Engineer',
        },
        fileName: 'ava-updated.pdf',
        fileSize: 7,
        fileType: 'application/pdf',
        id: 'resume-1',
        previewUrl: 'http://localhost:3001/api/resumes/resume-1/file',
        uploadedAt: '2026-06-21T08:00:00.000Z',
      }),
    })

    const file = new File(['pdf'], 'ava-updated.pdf', {
      type: 'application/pdf',
    })
    const resume = await updateResume({
      applicant: {
        email: 'ava.updated@example.com',
        name: 'Ava Updated',
        positionApplied: 'Product Engineer',
      },
      file,
      jobPositionId: 'job-product',
      resumeId: 'resume-1',
    })

    const body = fetch.mock.calls[0]?.[1]?.body as FormData

    expect(fetch).toHaveBeenCalledWith('/api/resumes/resume-1', {
      body: expect.any(FormData),
      headers: {
        Authorization: 'Bearer session-token',
      },
      method: 'PATCH',
    })
    expect(body.get('jobPositionId')).toBe('job-product')
    expect(resume.applicant.email).toBe('ava.updated@example.com')
    expect(resume.fileName).toBe('ava-updated.pdf')
  })

  it('deletes a stored resume from the API', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 204,
    })

    await deleteResume('resume-1')

    expect(fetch).toHaveBeenCalledWith('/api/resumes/resume-1', {
      headers: {
        Authorization: 'Bearer session-token',
      },
      method: 'DELETE',
    })
  })
})
