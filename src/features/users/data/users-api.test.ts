import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth-store'
import {
  createUser,
  deleteUser,
  listUserRoleOptions,
  listUsers,
  updateUser,
} from './users-api'

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
          roles: [{ id: 'role-admin', name: 'admin' }],
          status: 'active',
          updatedAt: '2026-06-23T02:00:00.000Z',
        },
        {
          createdAt: '2026-06-23T03:00:00.000Z',
          email: 'normal@example.com',
          id: 'user-2',
          name: 'Normal User',
          roles: [{ id: 'role-normal', name: 'normal' }],
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
        roleId: 'role-admin',
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
        roleId: 'role-normal',
        status: 'inactive',
        updatedAt: new Date('2026-06-23T04:00:00.000Z'),
        username: 'normal',
      },
    ])
  })

  it('lists database roles for user assignment', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          description: 'Can manage everything.',
          id: 'role-admin',
          isSystem: true,
          name: 'admin',
          permissions: ['rbac:manage'],
          userCount: 1,
        },
        {
          description: 'Reviews resumes.',
          id: 'role-reviewer',
          isSystem: false,
          name: 'reviewer',
          permissions: ['resumes:read'],
          userCount: 0,
        },
      ],
    })

    await expect(listUserRoleOptions()).resolves.toEqual([
      {
        description: 'Can manage everything.',
        id: 'role-admin',
        name: 'admin',
      },
      {
        description: 'Reviews resumes.',
        id: 'role-reviewer',
        name: 'reviewer',
      },
    ])
    expect(fetch).toHaveBeenCalledWith('/api/roles', {
      headers: {
        Authorization: 'Bearer session-token',
      },
    })
  })

  it('creates users with the selected database role name', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        createdAt: '2026-06-23T03:00:00.000Z',
        email: 'reviewer@example.com',
        id: 'user-reviewer',
        name: 'Resume Reviewer',
        roles: [{ id: 'role-reviewer', name: 'reviewer' }],
        status: 'active',
        updatedAt: '2026-06-23T04:00:00.000Z',
      }),
    })

    await expect(
      createUser({
        email: 'reviewer@example.com',
        name: 'Resume Reviewer',
        password: 'S3cur3P@ssw0rd',
        roleId: 'role-reviewer',
        status: 'active',
      })
    ).resolves.toMatchObject({
      email: 'reviewer@example.com',
      role: 'reviewer',
      username: 'reviewer',
    })

    expect(fetch).toHaveBeenCalledWith('/api/users', {
      body: JSON.stringify({
        email: 'reviewer@example.com',
        name: 'Resume Reviewer',
        password: 'S3cur3P@ssw0rd',
        roleIds: ['role-reviewer'],
        status: 'active',
      }),
      headers: {
        Authorization: 'Bearer session-token',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })
  })

  it('updates users and their selected role', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        createdAt: '2026-06-23T03:00:00.000Z',
        email: 'admin@example.com',
        id: 'user-admin',
        name: 'Admin User',
        roles: [{ id: 'role-normal', name: 'normal' }],
        status: 'inactive',
        updatedAt: '2026-06-23T04:00:00.000Z',
      }),
    })
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })

    await expect(
      updateUser('user-admin', {
        email: 'admin@example.com',
        name: 'Admin User',
        roleId: 'role-normal',
        status: 'inactive',
      })
    ).resolves.toMatchObject({
      email: 'admin@example.com',
      role: 'normal',
      status: 'inactive',
    })

    expect(fetch).toHaveBeenNthCalledWith(1, '/api/users/user-admin', {
      body: JSON.stringify({
        email: 'admin@example.com',
        name: 'Admin User',
        password: undefined,
        status: 'inactive',
      }),
      headers: {
        Authorization: 'Bearer session-token',
        'Content-Type': 'application/json',
      },
      method: 'PATCH',
    })
    expect(fetch).toHaveBeenNthCalledWith(2, '/api/users/user-admin/roles', {
      body: JSON.stringify({
        roleIds: ['role-normal'],
      }),
      headers: {
        Authorization: 'Bearer session-token',
        'Content-Type': 'application/json',
      },
      method: 'PUT',
    })
  })

  it('deletes a user with the active session', async () => {
    fetch.mockResolvedValue({ ok: true })

    await expect(deleteUser('user-viewer')).resolves.toBeUndefined()

    expect(fetch).toHaveBeenCalledWith('/api/users/user-viewer', {
      headers: {
        Authorization: 'Bearer session-token',
      },
      method: 'DELETE',
    })
  })

  it('surfaces delete API failures', async () => {
    fetch.mockResolvedValue({
      json: async () => ({ error: 'User could not be deleted.' }),
      ok: false,
      statusText: 'Bad Request',
    })

    await expect(deleteUser('user-viewer')).rejects.toThrow(
      'User could not be deleted.'
    )
  })
})
