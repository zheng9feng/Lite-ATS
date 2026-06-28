import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth-store'
import {
  createRole,
  deleteRole,
  listPermissionResources,
  updateRole,
  updateUserRoles,
} from './permissions-api'

describe('permissions API client', () => {
  const fetch = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetch)
    useAuthStore.getState().auth.reset()
    useAuthStore.getState().auth.setSessionToken('session-token')
  })

  it('loads roles, permissions, and users with auth headers', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            description: 'Full access.',
            id: 'role-admin',
            isSystem: true,
            name: 'admin',
            permissions: ['rbac:manage'],
            userCount: 1,
          },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            description: 'Manage role assignments.',
            id: 'permission-rbac-manage',
            name: 'rbac:manage',
          },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            createdAt: '2026-06-24T01:00:00.000Z',
            email: 'admin@example.com',
            id: 'user-1',
            name: 'Admin User',
            permissions: ['rbac:manage'],
            roles: [
              {
                description: 'Full access.',
                id: 'role-admin',
                isSystem: true,
                name: 'admin',
              },
            ],
            status: 'active',
            updatedAt: '2026-06-24T02:00:00.000Z',
          },
        ],
      })

    const data = await listPermissionResources()

    expect(fetch).toHaveBeenNthCalledWith(1, '/api/roles', {
      headers: {
        Authorization: 'Bearer session-token',
      },
    })
    expect(fetch).toHaveBeenNthCalledWith(2, '/api/permissions', {
      headers: {
        Authorization: 'Bearer session-token',
      },
    })
    expect(fetch).toHaveBeenNthCalledWith(3, '/api/users', {
      headers: {
        Authorization: 'Bearer session-token',
      },
    })
    expect(data.roles).toHaveLength(1)
    expect(data.permissionsByResource).toEqual([
      {
        permissions: [
          {
            action: 'manage',
            description: 'Manage role assignments.',
            id: 'permission-rbac-manage',
            name: 'rbac:manage',
            resource: 'rbac',
          },
        ],
        resource: 'rbac',
      },
    ])
    expect(data.users[0]).toMatchObject({
      email: 'admin@example.com',
      permissions: ['rbac:manage'],
      roles: [expect.objectContaining({ id: 'role-admin' })],
    })
  })

  it('sends role and user role mutation payloads', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          description: 'Can review resumes.',
          id: 'role-reviewer',
          isSystem: false,
          name: 'reviewer',
          permissions: ['resumes:read'],
          userCount: 0,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          description: 'Can share resumes.',
          id: 'role-reviewer',
          isSystem: false,
          name: 'reviewer',
          permissions: ['resumes:read', 'resumes:share'],
          userCount: 0,
        }),
      })
      .mockResolvedValueOnce({ ok: true, status: 204 })
      .mockResolvedValueOnce({ ok: true, status: 204 })

    await createRole({
      description: 'Can review resumes.',
      name: 'reviewer',
      permissions: ['resumes:read'],
    })
    await updateRole('role-reviewer', {
      description: 'Can share resumes.',
      permissions: ['resumes:read', 'resumes:share'],
    })
    await updateUserRoles('user-1', ['role-admin', 'role-reviewer'])
    await deleteRole('role-reviewer')

    expect(fetch).toHaveBeenNthCalledWith(1, '/api/roles', {
      body: JSON.stringify({
        description: 'Can review resumes.',
        name: 'reviewer',
        permissions: ['resumes:read'],
      }),
      headers: {
        Authorization: 'Bearer session-token',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })
    expect(fetch).toHaveBeenNthCalledWith(2, '/api/roles/role-reviewer', {
      body: JSON.stringify({
        description: 'Can share resumes.',
        permissions: ['resumes:read', 'resumes:share'],
      }),
      headers: {
        Authorization: 'Bearer session-token',
        'Content-Type': 'application/json',
      },
      method: 'PATCH',
    })
    expect(fetch).toHaveBeenNthCalledWith(3, '/api/users/user-1/roles', {
      body: JSON.stringify({
        roleIds: ['role-admin', 'role-reviewer'],
      }),
      headers: {
        Authorization: 'Bearer session-token',
        'Content-Type': 'application/json',
      },
      method: 'PUT',
    })
    expect(fetch).toHaveBeenNthCalledWith(4, '/api/roles/role-reviewer', {
      headers: {
        Authorization: 'Bearer session-token',
      },
      method: 'DELETE',
    })
  })
})
