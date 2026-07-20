import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registerWithPassword } from './auth-api'

const authSnapshot = {
  permissions: ['resumes:read'],
  roles: ['normal'],
  sessionToken: 'new-session-token',
  user: {
    createdAt: '2026-07-20T00:00:00.000Z',
    email: 'jane@example.com',
    id: 'user-jane',
    name: 'Jane Doe',
    status: 'active',
    updatedAt: '2026-07-20T00:00:00.000Z',
  },
}

describe('registerWithPassword', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('posts registration details and returns the auth snapshot', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(authSnapshot)))
    const payload = {
      captchaToken: 'captcha-token',
      email: 'jane@example.com',
      name: 'Jane Doe',
      password: 'password1',
    }

    await expect(registerWithPassword(payload)).resolves.toEqual(authSnapshot)
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/register', {
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })
  })

  it('surfaces registration API errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ error: 'An account with this email already exists.' }),
        { status: 409 }
      )
    )

    await expect(
      registerWithPassword({
        captchaToken: 'captcha-token',
        email: 'jane@example.com',
        name: 'Jane Doe',
        password: 'password1',
      })
    ).rejects.toThrow('An account with this email already exists.')
  })
})
