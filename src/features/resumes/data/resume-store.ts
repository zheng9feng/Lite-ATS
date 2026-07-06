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
  jobPositionId?: string | null
  previewUrl: string
  uploadedAt: string
}

type ResumeStore = {
  resumes: ResumeFile[]
  addResume: (resume: ResumeFile) => void
  addResumes: (resumes: ResumeFile[]) => void
  clearResumes: () => void
  removeResume: (resumeId: string) => void
  setResumes: (resumes: ResumeFile[]) => void
  updateResume: (resume: ResumeFile) => void
}

export const useResumeStore = create<ResumeStore>((set) => ({
  resumes: [],
  addResume: (resume) => {
    set((state) => ({
      resumes: [...state.resumes, resume],
    }))
  },
  addResumes: (resumes) => {
    set((state) => ({
      resumes: [...state.resumes, ...resumes],
    }))
  },
  clearResumes: () => {
    set({ resumes: [] })
  },
  removeResume: (resumeId) => {
    set((state) => ({
      resumes: state.resumes.filter((resume) => resume.id !== resumeId),
    }))
  },
  setResumes: (resumes) => {
    set({ resumes })
  },
  updateResume: (resume) => {
    set((state) => ({
      resumes: state.resumes.map((storedResume) =>
        storedResume.id === resume.id ? resume : storedResume
      ),
    }))
  },
}))
