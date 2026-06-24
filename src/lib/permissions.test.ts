import { describe, expect, it } from 'vitest'
import { hasPermission, hasAnyPermission } from './permissions'

describe('permission helpers', () => {
  it('allows permissions the user has and denies permissions they do not have', () => {
    expect(hasPermission(['resumes:delete'], 'resumes:delete')).toBe(true)
    expect(hasPermission(['resumes:read'], 'resumes:delete')).toBe(false)
  })

  it('checks whether any required permission is present', () => {
    expect(
      hasAnyPermission(['resumes:read'], ['users:manage', 'resumes:read'])
    ).toBe(true)
    expect(
      hasAnyPermission(['resumes:read'], ['users:manage', 'rbac:manage'])
    ).toBe(false)
  })
})
