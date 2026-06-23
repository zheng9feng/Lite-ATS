import { describe, expect, it } from 'vitest'
import { sidebarData } from './sidebar-data'

function collectNavEntries() {
  return sidebarData.navGroups.flatMap((group) =>
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
})
