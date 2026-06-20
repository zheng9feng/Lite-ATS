import { createFileRoute } from '@tanstack/react-router'
import { ResumePreviewPage } from '@/features/resumes'

export const Route = createFileRoute('/_authenticated/resumes/preview')({
  component: ResumePreviewPage,
})
