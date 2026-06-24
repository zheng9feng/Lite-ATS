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
      })
    ).toEqual({ status: 403 })
  })

  it('allows sessions with the required permission', () => {
    expect(
      getPermissionDecision('resumes:delete', {
        permissions: ['resumes:delete'],
      })
    ).toEqual({ status: 200 })
  })
})
