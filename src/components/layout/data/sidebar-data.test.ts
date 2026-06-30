import { describe, expect, it } from 'vitest'
import { type NavGroup } from '../types'
import { filterNavGroupsByPermissions, sidebarData } from './sidebar-data'

function collectNavEntries(navGroups: NavGroup[] = sidebarData.navGroups) {
  return navGroups.flatMap((group) =>
    group.items.flatMap((item) => [
      { title: item.title, url: 'url' in item ? item.url : undefined },
      ...('items' in item && item.items
        ? item.items.map((subItem) => ({
            title: subItem.title,
            url: subItem.url,
          }))
        : []),
    ])
  )
}

describe('sidebarData', () => {
  it('does not expose the Clerk module in navigation', () => {
    const entries = collectNavEntries()

    expect(entries.map((entry) => entry.title)).not.toContain(
      'Secured by Clerk'
    )
    expect(entries.map((entry) => entry.url)).not.toContain('/clerk/sign-in')
    expect(entries.map((entry) => entry.url)).not.toContain('/clerk/sign-up')
    expect(entries.map((entry) => entry.url)).not.toContain(
      '/clerk/user-management'
    )
  })

  it('filters admin-only entries for normal resume readers', () => {
    const entries = collectNavEntries(
      filterNavGroupsByPermissions(sidebarData.navGroups, ['resumes:read'])
    )

    expect(entries.map((entry) => entry.title)).toContain('Resume Preview')
    expect(entries.map((entry) => entry.title)).not.toContain('Resume Upload')
    expect(entries.map((entry) => entry.title)).not.toContain('Users')
    expect(entries.map((entry) => entry.title)).not.toContain('Permissions')
  })

  it('shows the permissions module to RBAC managers', () => {
    const entries = collectNavEntries(
      filterNavGroupsByPermissions(sidebarData.navGroups, ['rbac:manage'])
    )

    expect(entries).toContainEqual({
      title: 'Permissions',
      url: '/permissions',
    })
  })

  it('shows job positions to users with job position read access', () => {
    const entries = collectNavEntries(
      filterNavGroupsByPermissions(sidebarData.navGroups, [
        'job-positions:read',
      ])
    )

    expect(entries).toContainEqual({
      title: 'Job Positions',
      url: '/job-positions',
    })
  })
})
