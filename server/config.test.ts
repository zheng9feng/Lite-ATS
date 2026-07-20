import { describe, expect, it } from 'vitest'
import { resolveMinioConfig, resolveServerConfig } from './config'

describe('resolveServerConfig', () => {
  it('binds to the IPv4 loopback interface by default', () => {
    expect(resolveServerConfig({}).resumeApiHost).toBe('127.0.0.1')
  })

  it('uses the configured API host', () => {
    expect(
      resolveServerConfig({ RESUME_API_HOST: '0.0.0.0' }).resumeApiHost
    ).toBe('0.0.0.0')
  })

  it('uses same-origin API resource URLs by default', () => {
    expect(resolveServerConfig({}).publicApiUrl).toBe('')
  })

  it('uses the configured public API URL', () => {
    expect(
      resolveServerConfig({
        RESUME_API_PUBLIC_URL: 'https://ats.example.com',
      }).publicApiUrl
    ).toBe('https://ats.example.com')
  })

  it('falls back to same-origin paths for a loopback public URL', () => {
    expect(
      resolveServerConfig({
        RESUME_API_PUBLIC_URL: 'http://localhost:3001',
      }).publicApiUrl
    ).toBe('')
  })

  it('uses the default SQLite database path when none is configured', () => {
    expect(resolveServerConfig({}).databasePath).toBe(
      'server/.data/resumes.sqlite'
    )
  })

  it('uses the configured SQLite database path', () => {
    expect(
      resolveServerConfig({
        RESUME_DATABASE_PATH: '/tmp/lite-ats-resumes.sqlite',
      }).databasePath
    ).toBe('/tmp/lite-ats-resumes.sqlite')
  })

  it('reads the Turnstile secret without providing an insecure default', () => {
    expect(resolveServerConfig({}).turnstileSecretKey).toBe('')
    expect(
      resolveServerConfig({ TURNSTILE_SECRET_KEY: 'turnstile-secret' })
        .turnstileSecretKey
    ).toBe('turnstile-secret')
  })
})

describe('resolveMinioConfig', () => {
  it('uses MinIO root credential variables when API-specific variables are absent', () => {
    expect(
      resolveMinioConfig({
        MINIO_ROOT_PASSWORD: 'root-password',
        MINIO_ROOT_USER: 'root-user',
      })
    ).toMatchObject({
      accessKey: 'root-user',
      secretKey: 'root-password',
    })
  })

  it('prefers API-specific credential variables over MinIO root variables', () => {
    expect(
      resolveMinioConfig({
        MINIO_ACCESS_KEY: 'api-access-key',
        MINIO_ROOT_PASSWORD: 'root-password',
        MINIO_ROOT_USER: 'root-user',
        MINIO_SECRET_KEY: 'api-secret-key',
      })
    ).toMatchObject({
      accessKey: 'api-access-key',
      secretKey: 'api-secret-key',
    })
  })
})
