import { randomUUID } from 'node:crypto'

export type JobPositionStatus = 'active' | 'inactive'

export type JobPosition = {
  createdAt: string
  department: string
  description: string
  id: string
  location: string
  status: JobPositionStatus
  title: string
  updatedAt: string
}

export type CreateJobPositionPayload = {
  department?: string
  description?: string
  location?: string
  status?: JobPositionStatus
  title: string
}

export type UpdateJobPositionPayload = Partial<CreateJobPositionPayload>

export type JobPositionRepository = {
  close: () => void
  deleteJobPosition: (jobPositionId: string) => void
  findJobPosition: (jobPositionId: string) => JobPosition | undefined
  listActiveJobPositions: () => JobPosition[]
  listJobPositions: () => JobPosition[]
  saveJobPosition: (jobPosition: JobPosition) => void
}

type CreateJobPositionServiceOptions = {
  createId?: () => string
  getNow?: () => Date
  repository: JobPositionRepository
}

function readOptionalString(value: string | undefined) {
  return value?.trim() ?? ''
}

function normalizeStatus(status: JobPositionStatus | undefined) {
  return status === 'inactive' ? 'inactive' : 'active'
}

function normalizeTitle(title: string) {
  const normalized = title.trim()

  if (!normalized) {
    throw new Error('Job position title is required.')
  }

  return normalized
}

export function createJobPositionService({
  createId = randomUUID,
  getNow = () => new Date(),
  repository,
}: CreateJobPositionServiceOptions) {
  function getJobPosition(jobPositionId: string) {
    const jobPosition = repository.findJobPosition(jobPositionId)

    if (!jobPosition) {
      throw new Error('Job position not found')
    }

    return jobPosition
  }

  return {
    createJobPosition: (payload: CreateJobPositionPayload) => {
      const now = getNow().toISOString()
      const jobPosition: JobPosition = {
        createdAt: now,
        department: readOptionalString(payload.department),
        description: readOptionalString(payload.description),
        id: createId(),
        location: readOptionalString(payload.location),
        status: normalizeStatus(payload.status),
        title: normalizeTitle(payload.title),
        updatedAt: now,
      }

      repository.saveJobPosition(jobPosition)

      return jobPosition
    },
    deleteJobPosition: (jobPositionId: string) => {
      getJobPosition(jobPositionId)
      repository.deleteJobPosition(jobPositionId)
    },
    findJobPosition: (jobPositionId: string) =>
      repository.findJobPosition(jobPositionId),
    getJobPosition,
    listActiveJobPositions: () => repository.listActiveJobPositions(),
    listJobPositions: () => repository.listJobPositions(),
    updateJobPosition: (
      jobPositionId: string,
      payload: UpdateJobPositionPayload
    ) => {
      const current = getJobPosition(jobPositionId)
      const jobPosition: JobPosition = {
        ...current,
        department:
          payload.department === undefined
            ? current.department
            : readOptionalString(payload.department),
        description:
          payload.description === undefined
            ? current.description
            : readOptionalString(payload.description),
        location:
          payload.location === undefined
            ? current.location
            : readOptionalString(payload.location),
        status:
          payload.status === undefined
            ? current.status
            : normalizeStatus(payload.status),
        title:
          payload.title === undefined
            ? current.title
            : normalizeTitle(payload.title),
        updatedAt: getNow().toISOString(),
      }

      repository.saveJobPosition(jobPosition)

      return jobPosition
    },
  }
}
