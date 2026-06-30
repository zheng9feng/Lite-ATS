import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth-store'
import {
  createJobPosition,
  deleteJobPosition,
  listActiveJobPositions,
  listJobPositions,
  updateJobPosition,
} from './job-positions-api'

describe('job positions API client', () => {
  const fetch = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetch)
    useAuthStore.getState().auth.reset()
    useAuthStore.getState().auth.setSessionToken('session-token')
  })

  it('lists job positions with auth headers', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          createdAt: '2026-06-25T08:00:00.000Z',
          department: 'Engineering',
          description: 'Builds product interfaces.',
          id: 'job-frontend',
          location: 'Remote',
          status: 'active',
          title: 'Frontend Engineer',
          updatedAt: '2026-06-25T08:00:00.000Z',
        },
      ],
    })

    await expect(listJobPositions()).resolves.toEqual([
      expect.objectContaining({
        id: 'job-frontend',
        status: 'active',
        title: 'Frontend Engineer',
      }),
    ])
    expect(fetch).toHaveBeenCalledWith('/api/job-positions', {
      headers: {
        Authorization: 'Bearer session-token',
      },
    })
  })

  it('lists active job positions for resume selectors', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          createdAt: '2026-06-25T08:00:00.000Z',
          department: '',
          description: '',
          id: 'job-frontend',
          location: '',
          status: 'active',
          title: 'Frontend Engineer',
          updatedAt: '2026-06-25T08:00:00.000Z',
        },
      ],
    })

    const positions = await listActiveJobPositions()

    expect(fetch).toHaveBeenCalledWith('/api/job-positions/active', {
      headers: {
        Authorization: 'Bearer session-token',
      },
    })
    expect(positions[0]?.id).toBe('job-frontend')
  })

  it('creates, updates, and deletes job positions', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          createdAt: '2026-06-25T08:00:00.000Z',
          department: 'Engineering',
          description: '',
          id: 'job-frontend',
          location: 'Remote',
          status: 'active',
          title: 'Frontend Engineer',
          updatedAt: '2026-06-25T08:00:00.000Z',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          createdAt: '2026-06-25T08:00:00.000Z',
          department: 'Engineering',
          description: '',
          id: 'job-frontend',
          location: 'Shanghai',
          status: 'inactive',
          title: 'Senior Frontend Engineer',
          updatedAt: '2026-06-25T09:00:00.000Z',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 204,
      })

    await createJobPosition({
      department: 'Engineering',
      description: '',
      location: 'Remote',
      status: 'active',
      title: 'Frontend Engineer',
    })
    await updateJobPosition('job-frontend', {
      location: 'Shanghai',
      status: 'inactive',
      title: 'Senior Frontend Engineer',
    })
    await deleteJobPosition('job-frontend')

    expect(fetch).toHaveBeenNthCalledWith(1, '/api/job-positions', {
      body: JSON.stringify({
        department: 'Engineering',
        description: '',
        location: 'Remote',
        status: 'active',
        title: 'Frontend Engineer',
      }),
      headers: {
        Authorization: 'Bearer session-token',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      '/api/job-positions/job-frontend',
      {
        body: JSON.stringify({
          location: 'Shanghai',
          status: 'inactive',
          title: 'Senior Frontend Engineer',
        }),
        headers: {
          Authorization: 'Bearer session-token',
          'Content-Type': 'application/json',
        },
        method: 'PATCH',
      }
    )
    expect(fetch).toHaveBeenNthCalledWith(
      3,
      '/api/job-positions/job-frontend',
      {
        headers: {
          Authorization: 'Bearer session-token',
        },
        method: 'DELETE',
      }
    )
  })
})
