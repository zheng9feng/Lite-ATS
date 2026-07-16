import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { i18n } from '@/lib/i18n'
import { type RoleDto } from './data/roles-api'
import { RolesPage } from './roles-page'

const createRole = vi.hoisted(() => vi.fn())
const deleteRole = vi.hoisted(() => vi.fn())
const updateRole = vi.hoisted(() => vi.fn())

vi.mock('./data/roles-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./data/roles-api')>()),
  createRole: (...args: unknown[]) => createRole(...args),
  deleteRole: (...args: unknown[]) => deleteRole(...args),
  updateRole: (...args: unknown[]) => updateRole(...args),
}))

const roles: RoleDto[] = [
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
]

async function renderRolesPage() {
  const rootRoute = createRootRoute()
  const rolesRoute = createRoute({
    component: () => <RolesPage roles={roles} />,
    getParentRoute: () => rootRoute,
    path: '/roles',
  })
  const permissionsRoute = createRoute({
    component: () => <div>Permissions</div>,
    getParentRoute: () => rootRoute,
    path: '/permissions',
  })
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ['/roles'] }),
    routeTree: rootRoute.addChildren([rolesRoute, permissionsRoute]),
  })

  return { router, screen: await render(<RouterProvider router={router} />) }
}

describe('RolesPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await i18n.changeLanguage('en')
    createRole.mockResolvedValue({})
    deleteRole.mockResolvedValue(undefined)
    updateRole.mockResolvedValue({})
  })

  it('searches roles and links to the selected permission configuration', async () => {
    const { router, screen } = await renderRolesPage()

    await userEvent.fill(
      screen.getByRole('textbox', { name: 'Search roles' }),
      'review'
    )
    await expect.element(screen.getByText('reviewer')).toBeInTheDocument()
    await expect.element(screen.getByText('admin')).not.toBeInTheDocument()

    await userEvent.click(
      screen.getByRole('button', { name: 'Open actions for reviewer' })
    )
    await userEvent.click(
      screen.getByRole('menuitem', { name: 'Configure permissions' })
    )

    expect(router.state.location.href).toContain(
      '/permissions?roleId=role-reviewer'
    )
  })

  it('creates a role with a name and description', async () => {
    const { screen } = await renderRolesPage()

    await userEvent.click(screen.getByRole('button', { name: 'New role' }))
    await userEvent.fill(screen.getByLabelText('Role name'), 'interviewer')
    await userEvent.fill(
      screen.getByLabelText('Description'),
      'Interviews candidates.'
    )
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(createRole).toHaveBeenCalledWith({
      description: 'Interviews candidates.',
      name: 'interviewer',
    })
  })
})
