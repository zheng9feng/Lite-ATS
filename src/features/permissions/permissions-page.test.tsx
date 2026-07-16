import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { clearCookies } from '@/test-utils/cookies'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { LanguageProvider } from '@/context/language-provider'
import { type PermissionAssignmentData } from './data/permissions-api'
import { PermissionsPage } from './permissions-page'

const permissionData: PermissionAssignmentData = {
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
      createdAt: '2026-07-17T01:00:00.000Z',
      description: 'Full access.',
      id: 'role-admin',
      isSystem: true,
      name: 'admin',
      permissions: ['rbac:manage', 'resumes:read', 'resumes:share'],
      updatedAt: '2026-07-17T01:00:00.000Z',
      userCount: 1,
    },
    {
      createdAt: '2026-07-17T01:00:00.000Z',
      description: 'Review resumes.',
      id: 'role-reviewer',
      isSystem: false,
      name: 'reviewer',
      permissions: ['resumes:read'],
      updatedAt: '2026-07-17T01:00:00.000Z',
      userCount: 1,
    },
  ],
}

function renderPermissionsPage(roleId = 'role-admin') {
  const rootRoute = createRootRoute()
  const permissionsRoute = createRoute({
    component: () => (
      <LanguageProvider>
        <PermissionsPage data={permissionData} requestedRoleId={roleId} />
      </LanguageProvider>
    ),
    getParentRoute: () => rootRoute,
    path: '/permissions',
  })
  const rolesRoute = createRoute({
    component: () => <div>Roles</div>,
    getParentRoute: () => rootRoute,
    path: '/roles',
  })
  const router = createRouter({
    history: createMemoryHistory({
      initialEntries: [`/permissions?roleId=${roleId}`],
    }),
    routeTree: rootRoute.addChildren([permissionsRoute, rolesRoute]),
  })

  return render(<RouterProvider router={router} />)
}

describe('PermissionsPage', () => {
  beforeEach(() => {
    clearCookies()
    vi.clearAllMocks()
  })

  it('renders the hierarchical assignment tree in Chinese by default', async () => {
    const screen = await renderPermissionsPage()

    await expect.element(screen.getByText('权限管理')).toBeInTheDocument()
    await expect
      .element(screen.getByRole('checkbox', { name: '全部权限' }))
      .toBeChecked()
    await expect
      .element(screen.getByRole('checkbox', { exact: true, name: '权限' }))
      .toBeDisabled()
    await expect.element(screen.getByText('resumes:read')).toBeInTheDocument()
    await expect.element(screen.getByText('rbac:manage')).toBeInTheDocument()
  })

  it('filters permission leaves while retaining their resource ancestor', async () => {
    const screen = await renderPermissionsPage('role-reviewer')

    await userEvent.fill(
      screen.getByRole('textbox', { name: '搜索权限' }),
      'share'
    )

    await expect
      .element(screen.getByText('简历', { exact: true }).first())
      .toBeInTheDocument()
    await expect.element(screen.getByText('resumes:share')).toBeInTheDocument()
    await expect
      .element(screen.getByText('resumes:read'))
      .not.toBeInTheDocument()
  })
})
