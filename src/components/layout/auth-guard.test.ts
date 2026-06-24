import { describe, expect, it } from 'vitest'
import { getAuthGuardDecision, getRoutePermissions } from './auth-guard'

describe('auth guard', () => {
  it('redirects anonymous users from the authenticated home route to sign-in', () => {
    const decision = getAuthGuardDecision({
      currentHref: '/',
      hasSession: false,
      permissions: [],
      requiredPermissions: getRoutePermissions('/'),
    })

    expect(decision).toEqual({
      type: 'redirect-to-login',
      redirect: '/',
    })
  })

  it('redirects anonymous users from protected routes to sign-in', () => {
    const decision = getAuthGuardDecision({
      currentHref: '/resumes/preview?id=123',
      hasSession: false,
      permissions: [],
      requiredPermissions: getRoutePermissions('/resumes/preview'),
    })

    expect(decision).toEqual({
      type: 'redirect-to-login',
      redirect: '/resumes/preview?id=123',
    })
  })

  it('forbids signed-in users missing required permissions', () => {
    const decision = getAuthGuardDecision({
      currentHref: '/users',
      hasSession: true,
      permissions: ['resumes:read'],
      requiredPermissions: getRoutePermissions('/users'),
    })

    expect(decision).toEqual({ type: 'forbidden' })
  })
})
