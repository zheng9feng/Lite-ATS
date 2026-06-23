import { describe, expect, it } from 'vitest'
import { getPermissionDecision, parseBearerToken } from './auth-middleware'

describe('auth middleware helpers', () => {
  it('parses bearer tokens from authorization headers', () => {
    expect(parseBearerToken('Bearer session-token')).toBe('session-token')
    expect(parseBearerToken('Basic session-token')).toBeUndefined()
    expect(parseBearerToken(undefined)).toBeUndefined()
  })

  it('rejects missing sessions with 401 and missing permissions with 403', () => {
    expect(getPermissionDecision('resumes:delete', undefined)).toEqual({
      status: 401,
    })
    expect(
      getPermissionDecision('resumes:delete', {
        permissions: ['resumes:read'],
        roles: ['normal'],
        user: {
          createdAt: '2026-06-23T00:00:00.000Z',
          email: 'normal@example.com',
          id: 'user-1',
          name: 'Normal User',
          status: 'active',
          updatedAt: '2026-06-23T00:00:00.000Z',
        },
      })
    ).toEqual({ status: 403 })
  })

  it('allows sessions with the required permission', () => {
    expect(
      getPermissionDecision('resumes:delete', {
        permissions: ['resumes:delete'],
        roles: ['admin'],
        user: {
          createdAt: '2026-06-23T00:00:00.000Z',
          email: 'admin@example.com',
          id: 'user-1',
          name: 'Admin User',
          status: 'active',
          updatedAt: '2026-06-23T00:00:00.000Z',
        },
      })
    ).toEqual({ status: 200 })
  })
})
