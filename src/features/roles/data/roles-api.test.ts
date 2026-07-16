import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth-store'
import { createRole, deleteRole, listRoles, updateRole } from './roles-api'

describe('roles API client', () => {
  const fetch = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetch)
    useAuthStore.getState().auth.reset()
    useAuthStore.getState().auth.setSessionToken('session-token')
  })

  it('lists timestamped roles with the active session', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          createdAt: '2026-07-17T01:00:00.000Z',
          description: 'Reviews applications.',
          id: 'role-reviewer',
          isSystem: false,
          name: 'reviewer',
          permissions: ['resumes:read'],
          updatedAt: '2026-07-17T02:00:00.000Z',
          userCount: 0,
        },
      ],
    })

    await expect(listRoles()).resolves.toEqual([
      expect.objectContaining({
        createdAt: '2026-07-17T01:00:00.000Z',
        name: 'reviewer',
        updatedAt: '2026-07-17T02:00:00.000Z',
      }),
    ])
    expect(fetch).toHaveBeenCalledWith('/api/roles', {
      headers: { Authorization: 'Bearer session-token' },
    })
  })

  it('sends create, update, and delete role requests', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, status: 204 })

    await createRole({
      description: 'Reviews applications.',
      name: 'reviewer',
    })
    await updateRole('role-reviewer', {
      description: 'Reviews and shares applications.',
    })
    await deleteRole('role-reviewer')

    expect(fetch).toHaveBeenNthCalledWith(1, '/api/roles', {
      body: JSON.stringify({
        description: 'Reviews applications.',
        name: 'reviewer',
        permissions: [],
      }),
      headers: {
        Authorization: 'Bearer session-token',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })
    expect(fetch).toHaveBeenNthCalledWith(2, '/api/roles/role-reviewer', {
      body: JSON.stringify({
        description: 'Reviews and shares applications.',
      }),
      headers: {
        Authorization: 'Bearer session-token',
        'Content-Type': 'application/json',
      },
      method: 'PATCH',
    })
    expect(fetch).toHaveBeenNthCalledWith(3, '/api/roles/role-reviewer', {
      headers: { Authorization: 'Bearer session-token' },
      method: 'DELETE',
    })
  })
})
