import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth-store'
import { getResumeDashboardSummary } from './dashboard-api'

describe('dashboard API client', () => {
  const fetch = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetch)
    useAuthStore.getState().auth.reset()
    useAuthStore.getState().auth.setSessionToken('session-token')
  })

  it('loads the resume dashboard summary with auth headers', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        latestUploadAt: '2026-06-03T08:00:00.000Z',
        recentResumes: [],
        topPositions: [{ count: 2, position: 'Frontend Engineer' }],
        totalFileSize: 2048,
        totalResumes: 2,
        uniquePositionCount: 1,
        uploadsByMonth: [{ count: 2, month: '2026-06' }],
      }),
    })

    const summary = await getResumeDashboardSummary()

    expect(fetch).toHaveBeenCalledWith('/api/resumes/summary', {
      headers: {
        Authorization: 'Bearer session-token',
      },
    })
    expect(summary.totalResumes).toBe(2)
    expect(summary.topPositions).toEqual([
      { count: 2, position: 'Frontend Engineer' },
    ])
  })

  it('throws the API error message when the summary request fails', async () => {
    fetch.mockResolvedValue({
      json: async () => ({ error: 'Permission denied.' }),
      ok: false,
      statusText: 'Forbidden',
    })

    await expect(getResumeDashboardSummary()).rejects.toThrow(
      'Permission denied.'
    )
  })
})
