import { clearCookies } from '@/test-utils/cookies'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { LanguageProvider } from '@/context/language-provider'
import { type PermissionResources } from './data/permissions-api'
import { PermissionsPage } from './permissions-page'

const permissionResources: PermissionResources = {
  permissionsByResource: [
    {
      resource: 'resumes',
      permissions: [
        {
          action: 'read',
          description: 'View resumes.',
          id: 'permission-resumes-read',
          name: 'resumes:read',
          resource: 'resumes',
        },
        {
          action: 'share',
          description: 'Share resumes.',
          id: 'permission-resumes-share',
          name: 'resumes:share',
          resource: 'resumes',
        },
      ],
    },
    {
      resource: 'rbac',
      permissions: [
        {
          action: 'manage',
          description: 'Manage RBAC.',
          id: 'permission-rbac-manage',
          name: 'rbac:manage',
          resource: 'rbac',
        },
      ],
    },
  ],
  roles: [
    {
      description: 'Full access.',
      id: 'role-admin',
      isSystem: true,
      name: 'admin',
      permissions: ['rbac:manage', 'resumes:read', 'resumes:share'],
      userCount: 1,
    },
    {
      description: 'Review resumes.',
      id: 'role-reviewer',
      isSystem: false,
      name: 'reviewer',
      permissions: ['resumes:read'],
      userCount: 1,
    },
  ],
  users: [
    {
      createdAt: '2026-06-24T01:00:00.000Z',
      email: 'reviewer@example.com',
      id: 'user-1',
      name: 'Resume Reviewer',
      permissions: ['resumes:read'],
      roles: [
        {
          description: 'Review resumes.',
          id: 'role-reviewer',
          isSystem: false,
          name: 'reviewer',
        },
      ],
      status: 'active',
      updatedAt: '2026-06-24T02:00:00.000Z',
    },
  ],
}

describe('PermissionsPage', () => {
  beforeEach(() => {
    clearCookies()
  })

  it('renders role configuration and user role management in Chinese by default', async () => {
    const { getByRole, getByText } = await render(
      <LanguageProvider>
        <PermissionsPage
          initialData={permissionResources}
          onRefresh={vi.fn()}
        />
      </LanguageProvider>
    )

    await expect.element(getByText('权限管理')).toBeInTheDocument()
    await expect
      .element(getByRole('tab', { name: '角色配置' }))
      .toBeInTheDocument()
    await expect
      .element(getByRole('tab', { name: '用户角色' }))
      .toBeInTheDocument()
    await expect.element(getByText('系统角色')).toBeInTheDocument()
    await expect.element(getByText('Review resumes.')).toBeInTheDocument()
    await expect
      .element(getByRole('heading', { name: 'resumes' }))
      .toBeInTheDocument()
    await expect.element(getByText('resumes:read')).toBeInTheDocument()

    await getByRole('tab', { name: '用户角色' }).click()

    await expect.element(getByText('Resume Reviewer')).toBeInTheDocument()
    await expect.element(getByText('reviewer@example.com')).toBeInTheDocument()
    await expect.element(getByText('有效权限')).toBeInTheDocument()
    await expect.element(getByText('resumes:read')).toBeInTheDocument()
  })
})
