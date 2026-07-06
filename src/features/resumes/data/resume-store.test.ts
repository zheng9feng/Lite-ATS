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

  it('appends a batch of resume metadata without replacing existing rows', () => {
    useResumeStore.getState().addResume({
      applicant: {
        email: 'existing@example.com',
        name: 'Existing Candidate',
        positionApplied: 'Designer',
      },
      fileName: 'existing.pdf',
      fileSize: 5,
      fileType: 'application/pdf',
      id: 'existing-resume',
      previewUrl: 'http://localhost:3001/api/resumes/existing-resume/file',
      uploadedAt: '2026-06-21T07:00:00.000Z',
    })

    useResumeStore.getState().addResumes([
      {
        applicant: {
          email: 'first@bulk-upload.local',
          name: 'First',
          positionApplied: 'Frontend Engineer',
        },
        fileName: 'first.pdf',
        fileSize: 6,
        fileType: 'application/pdf',
        id: 'first-resume',
        previewUrl: 'http://localhost:3001/api/resumes/first-resume/file',
        uploadedAt: '2026-06-21T08:00:00.000Z',
      },
      {
        applicant: {
          email: 'second@bulk-upload.local',
          name: 'Second',
          positionApplied: 'Frontend Engineer',
        },
        fileName: 'second.pdf',
        fileSize: 7,
        fileType: 'application/pdf',
        id: 'second-resume',
        previewUrl: 'http://localhost:3001/api/resumes/second-resume/file',
        uploadedAt: '2026-06-21T08:01:00.000Z',
      },
    ])

    expect(
      useResumeStore.getState().resumes.map((resume) => resume.fileName)
    ).toEqual(['existing.pdf', 'first.pdf', 'second.pdf'])
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

  it('replaces stored resume metadata with an API result', () => {
    useResumeStore.getState().addResume({
      applicant: {
        email: 'old@example.com',
        name: 'Old Candidate',
        positionApplied: 'Designer',
      },
      fileName: 'old.pdf',
      fileSize: 5,
      fileType: 'application/pdf',
      id: 'old-resume',
      previewUrl: 'http://localhost:3001/api/resumes/old-resume/file',
      uploadedAt: '2026-06-21T07:00:00.000Z',
    })

    useResumeStore.getState().setResumes([
      {
        applicant: {
          email: 'new@example.com',
          name: 'New Candidate',
          positionApplied: 'Frontend Engineer',
        },
        fileName: 'new.pdf',
        fileSize: 6,
        fileType: 'application/pdf',
        id: 'new-resume',
        previewUrl: 'http://localhost:3001/api/resumes/new-resume/file',
        uploadedAt: '2026-06-21T08:00:00.000Z',
      },
    ])

    expect(useResumeStore.getState().resumes).toHaveLength(1)
    expect(useResumeStore.getState().resumes[0]?.id).toBe('new-resume')
  })

  it('updates one stored resume by id', () => {
    useResumeStore.getState().setResumes([
      {
        applicant: {
          email: 'old@example.com',
          name: 'Old Candidate',
          positionApplied: 'Designer',
        },
        fileName: 'old.pdf',
        fileSize: 5,
        fileType: 'application/pdf',
        id: 'resume-1',
        previewUrl: 'http://localhost:3001/api/resumes/resume-1/file',
        uploadedAt: '2026-06-21T07:00:00.000Z',
      },
      {
        applicant: {
          email: 'second@example.com',
          name: 'Second Candidate',
          positionApplied: 'Developer',
        },
        fileName: 'second.pdf',
        fileSize: 6,
        fileType: 'application/pdf',
        id: 'resume-2',
        previewUrl: 'http://localhost:3001/api/resumes/resume-2/file',
        uploadedAt: '2026-06-21T08:00:00.000Z',
      },
    ])

    useResumeStore.getState().updateResume({
      applicant: {
        email: 'updated@example.com',
        name: 'Updated Candidate',
        positionApplied: 'Product Engineer',
      },
      fileName: 'updated.pdf',
      fileSize: 7,
      fileType: 'application/pdf',
      id: 'resume-1',
      previewUrl: 'http://localhost:3001/api/resumes/resume-1/file',
      uploadedAt: '2026-06-21T07:00:00.000Z',
    })

    expect(useResumeStore.getState().resumes).toHaveLength(2)
    expect(useResumeStore.getState().resumes[0]?.applicant.email).toBe(
      'updated@example.com'
    )
    expect(useResumeStore.getState().resumes[1]?.id).toBe('resume-2')
  })

  it('removes one stored resume by id', () => {
    useResumeStore.getState().setResumes([
      {
        applicant: {
          email: 'first@example.com',
          name: 'First Candidate',
          positionApplied: 'Designer',
        },
        fileName: 'first.pdf',
        fileSize: 5,
        fileType: 'application/pdf',
        id: 'resume-1',
        previewUrl: 'http://localhost:3001/api/resumes/resume-1/file',
        uploadedAt: '2026-06-21T07:00:00.000Z',
      },
      {
        applicant: {
          email: 'second@example.com',
          name: 'Second Candidate',
          positionApplied: 'Developer',
        },
        fileName: 'second.pdf',
        fileSize: 6,
        fileType: 'application/pdf',
        id: 'resume-2',
        previewUrl: 'http://localhost:3001/api/resumes/resume-2/file',
        uploadedAt: '2026-06-21T08:00:00.000Z',
      },
    ])

    useResumeStore.getState().removeResume('resume-1')

    expect(useResumeStore.getState().resumes).toHaveLength(1)
    expect(useResumeStore.getState().resumes[0]?.id).toBe('resume-2')
  })
})
