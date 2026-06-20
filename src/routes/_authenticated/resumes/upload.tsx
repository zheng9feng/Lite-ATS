import { createFileRoute } from '@tanstack/react-router'
import { ResumeUploadPage } from '@/features/resumes'

export const Route = createFileRoute('/_authenticated/resumes/upload')({
  component: ResumeUploadPage,
})
