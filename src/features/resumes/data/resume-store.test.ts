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
    useResumeStore.setState({ resume: null })
  })

  it('stores metadata and an object URL for the latest PDF', () => {
    const file = new File(['resume'], 'candidate.pdf', {
      type: 'application/pdf',
    })

    useResumeStore.getState().setResume({
      applicant: {
        email: 'ava@example.com',
        name: 'Ava Chen',
        positionApplied: 'Frontend Engineer',
      },
      file,
    })

    expect(useResumeStore.getState().resume).toEqual({
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
    expect(createObjectURL).toHaveBeenCalledWith(file)
  })

  it('replaces the active resume and revokes the previous object URL', () => {
    createObjectURL
      .mockReturnValueOnce('blob:first-resume')
      .mockReturnValueOnce('blob:second-resume')

    useResumeStore.getState().setResume({
      applicant: {
        email: 'first@example.com',
        name: 'First Candidate',
        positionApplied: 'Designer',
      },
      file: new File(['first'], 'first.pdf', { type: 'application/pdf' }),
    })
    useResumeStore.getState().setResume({
      applicant: {
        email: 'second@example.com',
        name: 'Second Candidate',
        positionApplied: 'Developer',
      },
      file: new File(['second'], 'second.pdf', {
        type: 'application/pdf',
      }),
    })

    expect(useResumeStore.getState().resume?.objectUrl).toBe(
      'blob:second-resume'
    )
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:first-resume')
  })

  it('clears the active resume and revokes its object URL', () => {
    createObjectURL.mockReturnValue('blob:resume-to-clear')
    useResumeStore.getState().setResume({
      applicant: {
        email: 'resume@example.com',
        name: 'Resume Candidate',
        positionApplied: 'Product Manager',
      },
      file: new File(['resume'], 'resume.pdf', {
        type: 'application/pdf',
      }),
    })

    useResumeStore.getState().clearResume()

    expect(useResumeStore.getState().resume).toBeNull()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:resume-to-clear')
  })
})
