import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth-store'
import { listUsers } from './users-api'

describe('users API client', () => {
  const fetch = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetch)
    useAuthStore.getState().auth.reset()
    useAuthStore.getState().auth.setSessionToken('session-token')
  })

  it('lists database users from the auth API as table rows', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          createdAt: '2026-06-23T01:00:00.000Z',
          email: 'admin@example.com',
          id: 'user-1',
          name: 'Admin User',
          roles: ['admin'],
          status: 'active',
          updatedAt: '2026-06-23T02:00:00.000Z',
        },
        {
          createdAt: '2026-06-23T03:00:00.000Z',
          email: 'normal@example.com',
          id: 'user-2',
          name: 'Normal User',
          roles: ['normal'],
          status: 'inactive',
          updatedAt: '2026-06-23T04:00:00.000Z',
        },
      ],
    })

    const users = await listUsers()

    expect(fetch).toHaveBeenCalledWith('/api/users', {
      headers: {
        Authorization: 'Bearer session-token',
      },
    })
    expect(users).toEqual([
      {
        createdAt: new Date('2026-06-23T01:00:00.000Z'),
        email: 'admin@example.com',
        firstName: 'Admin',
        id: 'user-1',
        lastName: 'User',
        phoneNumber: '',
        role: 'admin',
        status: 'active',
        updatedAt: new Date('2026-06-23T02:00:00.000Z'),
        username: 'admin',
      },
      {
        createdAt: new Date('2026-06-23T03:00:00.000Z'),
        email: 'normal@example.com',
        firstName: 'Normal',
        id: 'user-2',
        lastName: 'User',
        phoneNumber: '',
        role: 'normal',
        status: 'inactive',
        updatedAt: new Date('2026-06-23T04:00:00.000Z'),
        username: 'normal',
      },
    ])
  })
})
