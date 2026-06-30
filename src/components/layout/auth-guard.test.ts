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

  it('does not preserve sign-in as the post-login redirect target', () => {
    const decision = getAuthGuardDecision({
      currentHref: '/sign-in?redirect=%2Fsign-in%3Fredirect%3D%252F',
      hasSession: false,
      permissions: [],
      requiredPermissions: [],
    })

    expect(decision).toEqual({
      type: 'redirect-to-login',
      redirect: '/',
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

  it('requires RBAC management access for the permissions module', () => {
    expect(getRoutePermissions('/permissions')).toEqual(['rbac:manage'])
    expect(
      getAuthGuardDecision({
        currentHref: '/permissions',
        hasSession: true,
        permissions: ['users:manage'],
        requiredPermissions: getRoutePermissions('/permissions'),
      })
    ).toEqual({ type: 'forbidden' })
  })

  it('requires job position read access for the job positions module', () => {
    expect(getRoutePermissions('/job-positions')).toEqual([
      'job-positions:read',
    ])
    expect(
      getAuthGuardDecision({
        currentHref: '/job-positions',
        hasSession: true,
        permissions: ['resumes:read'],
        requiredPermissions: getRoutePermissions('/job-positions'),
      })
    ).toEqual({ type: 'forbidden' })
  })
})
