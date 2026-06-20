import { create } from 'zustand'

export type ResumeApplicant = {
  email: string
  name: string
  positionApplied: string
}

export type ResumeFile = {
  applicant: ResumeApplicant
  fileName: string
  fileSize: number
  fileType: string
  id: string
  objectUrl: string
  uploadedAt: string
}

type ResumeStore = {
  resumes: ResumeFile[]
  addResume: (payload: { applicant: ResumeApplicant; file: File }) => void
  clearResumes: () => void
}

function createResumeId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function revokeResumeUrls(resumes: ResumeFile[]) {
  resumes.forEach((resume) => {
    URL.revokeObjectURL(resume.objectUrl)
  })
}

export const useResumeStore = create<ResumeStore>((set) => ({
  resumes: [],
  addResume: ({ applicant, file }) => {
    set((state) => ({
      resumes: [
        ...state.resumes,
        {
          applicant,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || 'application/pdf',
          id: createResumeId(),
          objectUrl: URL.createObjectURL(file),
          uploadedAt: new Date().toISOString(),
        },
      ],
    }))
  },
  clearResumes: () => {
    set((state) => {
      revokeResumeUrls(state.resumes)

      return { resumes: [] }
    })
  },
}))
