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
