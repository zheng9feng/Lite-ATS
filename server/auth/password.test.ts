import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from './password'

describe('password hashing', () => {
  it('verifies a password hash created by hashPassword', async () => {
    const hash = await hashPassword('correct horse battery staple')

    await expect(
      verifyPassword('correct horse battery staple', hash)
    ).resolves.toBe(true)
    await expect(verifyPassword('wrong password', hash)).resolves.toBe(false)
  })

  it('creates unique hashes for the same password', async () => {
    const firstHash = await hashPassword('password123')
    const secondHash = await hashPassword('password123')

    expect(firstHash).not.toBe(secondHash)
    await expect(verifyPassword('password123', firstHash)).resolves.toBe(true)
    await expect(verifyPassword('password123', secondHash)).resolves.toBe(true)
  })
})
