import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth-store'
import {
  listPermissionAssignmentData,
  updateRolePermissions,
} from './permissions-api'

describe('permissions API client', () => {
  const fetch = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetch)
    useAuthStore.getState().auth.reset()
    useAuthStore.getState().auth.setSessionToken('session-token')
  })

  it('loads only roles and the permission catalog', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            createdAt: '2026-07-17T01:00:00.000Z',
            description: 'Full access.',
            id: 'role-admin',
            isSystem: true,
            name: 'admin',
            permissions: ['rbac:manage'],
            updatedAt: '2026-07-17T01:00:00.000Z',
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

    const data = await listPermissionAssignmentData()

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch).toHaveBeenNthCalledWith(1, '/api/roles', {
      headers: { Authorization: 'Bearer session-token' },
    })
    expect(fetch).toHaveBeenNthCalledWith(2, '/api/permissions', {
      headers: { Authorization: 'Bearer session-token' },
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
  })

  it('updates the selected role permission keys', async () => {
    fetch.mockResolvedValue({ ok: true, status: 204 })

    await updateRolePermissions('role-reviewer', [
      'resumes:read',
      'resumes:share',
    ])

    expect(fetch).toHaveBeenCalledWith('/api/roles/role-reviewer/permissions', {
      body: JSON.stringify({
        permissions: ['resumes:read', 'resumes:share'],
      }),
      headers: {
        Authorization: 'Bearer session-token',
        'Content-Type': 'application/json',
      },
      method: 'PUT',
    })
  })
})
