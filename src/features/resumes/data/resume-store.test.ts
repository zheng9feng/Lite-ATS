import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useResumeStore } from './resume-store'

describe('useResumeStore', () => {
  const createObjectURL = vi.fn()
  const revokeObjectURL = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    createObjectURL.mockReturnValue('blob:resume')
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    })
    useResumeStore.setState({ resumes: [] })
  })

  it('stores metadata and an object URL for an uploaded PDF', () => {
    const file = new File(['resume'], 'candidate.pdf', {
      type: 'application/pdf',
    })

    useResumeStore.getState().addResume({
      applicant: {
        email: 'ava@example.com',
        name: 'Ava Chen',
        positionApplied: 'Frontend Engineer',
      },
      file,
    })

    expect(useResumeStore.getState().resumes).toHaveLength(1)
    expect(useResumeStore.getState().resumes[0]).toMatchObject({
      applicant: {
        email: 'ava@example.com',
        name: 'Ava Chen',
        positionApplied: 'Frontend Engineer',
      },
      fileName: 'candidate.pdf',
      fileSize: file.size,
      fileType: 'application/pdf',
      objectUrl: 'blob:resume',
    })
    expect(useResumeStore.getState().resumes[0]?.id).toEqual(expect.any(String))
    expect(useResumeStore.getState().resumes[0]?.uploadedAt).toEqual(
      expect.any(String)
    )
    expect(createObjectURL).toHaveBeenCalledWith(file)
  })

  it('adds multiple resumes without revoking previous object URLs', () => {
    createObjectURL
      .mockReturnValueOnce('blob:first-resume')
      .mockReturnValueOnce('blob:second-resume')

    useResumeStore.getState().addResume({
      applicant: {
        email: 'first@example.com',
        name: 'First Candidate',
        positionApplied: 'Designer',
      },
      file: new File(['first'], 'first.pdf', { type: 'application/pdf' }),
    })
    useResumeStore.getState().addResume({
      applicant: {
        email: 'second@example.com',
        name: 'Second Candidate',
        positionApplied: 'Developer',
      },
      file: new File(['second'], 'second.pdf', {
        type: 'application/pdf',
      }),
    })

    expect(useResumeStore.getState().resumes).toHaveLength(2)
    expect(
      useResumeStore.getState().resumes.map((resume) => resume.fileName)
    ).toEqual(['first.pdf', 'second.pdf'])
    expect(
      useResumeStore.getState().resumes.map((resume) => resume.objectUrl)
    ).toEqual(['blob:first-resume', 'blob:second-resume'])
    expect(revokeObjectURL).not.toHaveBeenCalled()
  })

  it('clears all resumes and revokes every object URL', () => {
    createObjectURL
      .mockReturnValueOnce('blob:first-resume')
      .mockReturnValueOnce('blob:second-resume')

    useResumeStore.getState().addResume({
      applicant: {
        email: 'first@example.com',
        name: 'First Candidate',
        positionApplied: 'Designer',
      },
      file: new File(['first'], 'first.pdf', {
        type: 'application/pdf',
      }),
    })
    useResumeStore.getState().addResume({
      applicant: {
        email: 'second@example.com',
        name: 'Second Candidate',
        positionApplied: 'Developer',
      },
      file: new File(['second'], 'second.pdf', {
        type: 'application/pdf',
      }),
    })

    useResumeStore.getState().clearResumes()

    expect(useResumeStore.getState().resumes).toEqual([])
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:first-resume')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:second-resume')
  })
})
