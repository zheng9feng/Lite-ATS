import { createFileRoute } from '@tanstack/react-router'
import { listJobPositions } from '@/features/job-positions/data/job-positions-api'
import { JobPositionsRoute } from '@/features/job-positions/job-positions-route'

export const Route = createFileRoute('/_authenticated/job-positions')({
  loader: () => listJobPositions(),
  component: JobPositionsRoute,
})
