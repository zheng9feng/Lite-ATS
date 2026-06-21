import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useResumeStore } from './resume-store'

describe('useResumeStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useResumeStore.setState({ resumes: [] })
  })

  it('stores metadata returned by the resume API', () => {
    useResumeStore.getState().addResume({
      applicant: {
        email: 'ava@example.com',
        name: 'Ava Chen',
        positionApplied: 'Frontend Engineer',
      },
      fileName: 'candidate.pdf',
      fileSize: 6,
      fileType: 'application/pdf',
      id: 'resume-1',
      previewUrl: 'http://localhost:3001/api/resumes/resume-1/file',
      uploadedAt: '2026-06-21T08:00:00.000Z',
    })

    expect(useResumeStore.getState().resumes).toEqual([
      {
        applicant: {
          email: 'ava@example.com',
          name: 'Ava Chen',
          positionApplied: 'Frontend Engineer',
        },
        fileName: 'candidate.pdf',
        fileSize: 6,
        fileType: 'application/pdf',
        id: 'resume-1',
        previewUrl: 'http://localhost:3001/api/resumes/resume-1/file',
        uploadedAt: '2026-06-21T08:00:00.000Z',
      },
    ])
  })

  it('adds multiple resumes without replacing existing rows', () => {
    useResumeStore.getState().addResume({
      applicant: {
        email: 'first@example.com',
        name: 'First Candidate',
        positionApplied: 'Designer',
      },
      fileName: 'first.pdf',
      fileSize: 5,
      fileType: 'application/pdf',
      id: 'first-resume',
      previewUrl: 'http://localhost:3001/api/resumes/first-resume/file',
      uploadedAt: '2026-06-21T07:00:00.000Z',
    })
    useResumeStore.getState().addResume({
      applicant: {
        email: 'second@example.com',
        name: 'Second Candidate',
        positionApplied: 'Developer',
      },
      fileName: 'second.pdf',
      fileSize: 6,
      fileType: 'application/pdf',
      id: 'second-resume',
      previewUrl: 'http://localhost:3001/api/resumes/second-resume/file',
      uploadedAt: '2026-06-21T08:00:00.000Z',
    })

    expect(useResumeStore.getState().resumes).toHaveLength(2)
    expect(
      useResumeStore.getState().resumes.map((resume) => resume.fileName)
    ).toEqual(['first.pdf', 'second.pdf'])
  })

  it('clears all stored resume metadata', () => {
    useResumeStore.getState().addResume({
      applicant: {
        email: 'first@example.com',
        name: 'First Candidate',
        positionApplied: 'Designer',
      },
      fileName: 'first.pdf',
      fileSize: 5,
      fileType: 'application/pdf',
      id: 'first-resume',
      previewUrl: 'http://localhost:3001/api/resumes/first-resume/file',
      uploadedAt: '2026-06-21T07:00:00.000Z',
    })

    useResumeStore.getState().clearResumes()

    expect(useResumeStore.getState().resumes).toEqual([])
  })
})
