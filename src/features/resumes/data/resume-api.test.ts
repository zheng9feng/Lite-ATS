import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createResumeShareLink, listResumes, uploadResume } from './resume-api'

describe('resume API client', () => {
  const fetch = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetch)
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
    })

    expect(fetch).toHaveBeenCalledWith('/api/resumes', {
      body: expect.any(FormData),
      method: 'POST',
    })
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

    expect(fetch).toHaveBeenCalledWith('/api/resumes')
    expect(resumes).toHaveLength(1)
    expect(resumes[0]?.id).toBe('resume-1')
  })
})
