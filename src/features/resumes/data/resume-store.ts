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
  objectUrl: string
}

type ResumeStore = {
  resume: ResumeFile | null
  setResume: (payload: { applicant: ResumeApplicant; file: File }) => void
  clearResume: () => void
}

function revokeResumeUrl(resume: ResumeFile | null) {
  if (resume) {
    URL.revokeObjectURL(resume.objectUrl)
  }
}

export const useResumeStore = create<ResumeStore>((set, get) => ({
  resume: null,
  setResume: ({ applicant, file }) => {
    revokeResumeUrl(get().resume)

    set({
      resume: {
        applicant,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || 'application/pdf',
        objectUrl: URL.createObjectURL(file),
      },
    })
  },
  clearResume: () => {
    revokeResumeUrl(get().resume)
    set({ resume: null })
  },
}))
