import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { migrateResumeDatabase } from '../resumes/sqlite-resume-migrations'
import { createJobPositionService } from './job-position-service'
import { createSqliteJobPositionRepository } from './sqlite-job-position-repository'

describe('createSqliteJobPositionRepository', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'lite-ats-job-positions-'))
  })

  afterEach(async () => {
    await rm(tempDir, { force: true, recursive: true })
  })

  it('creates, updates, lists, and deletes database job positions', async () => {
    const databasePath = join(tempDir, 'job-positions.sqlite')
    await migrateResumeDatabase({ databasePath })
    const repository = createSqliteJobPositionRepository({ databasePath })
    const service = createJobPositionService({
      createId: vi.fn().mockReturnValueOnce('job-frontend'),
      getNow: vi
        .fn()
        .mockReturnValueOnce(new Date('2026-06-25T08:00:00.000Z'))
        .mockReturnValueOnce(new Date('2026-06-25T09:00:00.000Z')),
      repository,
    })

    const created = service.createJobPosition({
      department: 'Engineering',
      description: 'Builds product interfaces.',
      location: 'Remote',
      status: 'active',
      title: 'Frontend Engineer',
    })
    const updated = service.updateJobPosition(created.id, {
      location: 'Shanghai',
      status: 'inactive',
      title: 'Senior Frontend Engineer',
    })

    expect(created).toMatchObject({
      createdAt: '2026-06-25T08:00:00.000Z',
      department: 'Engineering',
      description: 'Builds product interfaces.',
      id: 'job-frontend',
      location: 'Remote',
      status: 'active',
      title: 'Frontend Engineer',
      updatedAt: '2026-06-25T08:00:00.000Z',
    })
    expect(updated).toMatchObject({
      department: 'Engineering',
      location: 'Shanghai',
      status: 'inactive',
      title: 'Senior Frontend Engineer',
      updatedAt: '2026-06-25T09:00:00.000Z',
    })
    expect(service.listJobPositions()).toEqual([updated])
    expect(service.listActiveJobPositions()).toEqual([])

    service.deleteJobPosition(created.id)

    expect(service.listJobPositions()).toEqual([])
    repository.close()
  })

  it('rejects blank titles and missing job positions', async () => {
    const databasePath = join(tempDir, 'job-positions.sqlite')
    await migrateResumeDatabase({ databasePath })
    const repository = createSqliteJobPositionRepository({ databasePath })
    const service = createJobPositionService({
      createId: () => 'job-empty',
      getNow: () => new Date('2026-06-25T08:00:00.000Z'),
      repository,
    })

    expect(() =>
      service.createJobPosition({
        title: ' ',
      })
    ).toThrow('Job position title is required.')
    expect(() =>
      service.updateJobPosition('missing-job', {
        title: 'Product Manager',
      })
    ).toThrow('Job position not found')

    repository.close()
  })
})
