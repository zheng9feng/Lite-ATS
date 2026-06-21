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
  previewUrl: string
  uploadedAt: string
}

type ResumeStore = {
  resumes: ResumeFile[]
  addResume: (resume: ResumeFile) => void
  clearResumes: () => void
  setResumes: (resumes: ResumeFile[]) => void
}

export const useResumeStore = create<ResumeStore>((set) => ({
  resumes: [],
  addResume: (resume) => {
    set((state) => ({
      resumes: [...state.resumes, resume],
    }))
  },
  clearResumes: () => {
    set({ resumes: [] })
  },
  setResumes: (resumes) => {
    set({ resumes })
  },
}))
