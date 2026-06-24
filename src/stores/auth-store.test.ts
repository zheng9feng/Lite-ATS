import { clearCookies } from '@/test-utils/cookies'
import { beforeEach, describe, expect, it, vi } from 'vitest'

async function importAuthStore() {
  const { useAuthStore } = await import('./auth-store')
  return useAuthStore
}

const sampleUser = {
  createdAt: '2026-06-23T00:00:00.000Z',
  email: 'user@example.com',
  id: 'user-1',
  name: 'User One',
  status: 'active' as const,
  updatedAt: '2026-06-23T00:00:00.000Z',
}

describe('useAuthStore', () => {
  beforeEach(() => {
    clearCookies()
    vi.resetModules()
  })

  it('starts with an empty auth snapshot when nothing is persisted', async () => {
    const useAuthStore = await importAuthStore()

    expect(useAuthStore.getState().auth.sessionToken).toBe('')
    expect(useAuthStore.getState().auth.user).toBeNull()
    expect(useAuthStore.getState().auth.roles).toEqual([])
    expect(useAuthStore.getState().auth.permissions).toEqual([])
  })

  it('persists session token so a new store instance reads it back', async () => {
    const useAuthStore = await importAuthStore()
    useAuthStore.getState().auth.setSessionToken('session-token')

    vi.resetModules()
    const useAuthStoreAfterReload = await importAuthStore()

    expect(useAuthStoreAfterReload.getState().auth.sessionToken).toBe(
      'session-token'
    )
  })

  it('clears persisted session token when resetSessionToken is used', async () => {
    const useAuthStore = await importAuthStore()
    useAuthStore.getState().auth.setSessionToken('to-clear')
    useAuthStore.getState().auth.resetSessionToken()

    vi.resetModules()
    const useAuthStoreAfterReload = await importAuthStore()

    expect(useAuthStoreAfterReload.getState().auth.sessionToken).toBe('')
  })

  it('updates the signed-in auth snapshot', async () => {
    const useAuthStore = await importAuthStore()

    useAuthStore.getState().auth.setAuthSnapshot({
      permissions: ['resumes:read'],
      roles: ['normal'],
      sessionToken: 'session-token',
      user: { ...sampleUser },
    })

    expect(useAuthStore.getState().auth.user).toEqual(sampleUser)
    expect(useAuthStore.getState().auth.roles).toEqual(['normal'])
    expect(useAuthStore.getState().auth.permissions).toEqual(['resumes:read'])
    expect(useAuthStore.getState().auth.sessionToken).toBe('session-token')
  })

  it('reset clears user, roles, permissions, and session token', async () => {
    const useAuthStore = await importAuthStore()
    useAuthStore.getState().auth.setAuthSnapshot({
      permissions: ['rbac:manage'],
      roles: ['admin'],
      sessionToken: 'will-be-cleared',
      user: { ...sampleUser },
    })

    useAuthStore.getState().auth.reset()

    expect(useAuthStore.getState().auth.user).toBeNull()
    expect(useAuthStore.getState().auth.roles).toEqual([])
    expect(useAuthStore.getState().auth.permissions).toEqual([])
    expect(useAuthStore.getState().auth.sessionToken).toBe('')

    vi.resetModules()
    const useAuthStoreAfterReload = await importAuthStore()

    expect(useAuthStoreAfterReload.getState().auth.user).toBeNull()
    expect(useAuthStoreAfterReload.getState().auth.sessionToken).toBe('')
  })
})
