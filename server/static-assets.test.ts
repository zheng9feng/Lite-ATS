import { createServer } from 'node:http'
import { type AddressInfo } from 'node:net'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createServerApp } from './app'

type AppOptions = Parameters<typeof createServerApp>[0]

describe('production static assets', () => {
  let baseUrl = ''
  let server: ReturnType<typeof createServer>
  let staticDirectory = ''

  beforeEach(async () => {
    staticDirectory = await mkdtemp(join(tmpdir(), 'lite-ats-static-'))
    await mkdir(join(staticDirectory, 'assets'))
    await Promise.all([
      writeFile(
        join(staticDirectory, 'index.html'),
        '<!doctype html><html><body>Lite ATS</body></html>'
      ),
      writeFile(join(staticDirectory, 'assets', 'app-abc123.js'), 'export {}'),
    ])

    const app = createServerApp({
      authService: {
        resolveSession: async () => undefined,
      } as AppOptions['authService'],
      jobPositionService: {} as AppOptions['jobPositionService'],
      resumeService: {} as AppOptions['resumeService'],
      staticDirectory,
    })

    server = createServer(app)
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve)
    })
    const address = server.address() as AddressInfo
    baseUrl = `http://127.0.0.1:${address.port}`
  })

  afterEach(async () => {
    server.closeAllConnections()
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error)
        else resolve()
      })
    })
    await rm(staticDirectory, { force: true, recursive: true })
  })

  it.each(['/', '/resumes/preview'])(
    'prevents caching the SPA document at %s',
    async (pathname) => {
      const response = await fetch(`${baseUrl}${pathname}`, {
        headers: { Accept: 'text/html' },
      })

      expect(response.status).toBe(200)
      expect(response.headers.get('cache-control')).toBe(
        'no-store, no-cache, must-revalidate, proxy-revalidate'
      )
      expect(response.headers.get('expires')).toBe('0')
      expect(response.headers.get('pragma')).toBe('no-cache')
      await expect(response.text()).resolves.toContain('Lite ATS')
    }
  )

  it('caches content-hashed Vite assets permanently', async () => {
    const response = await fetch(`${baseUrl}/assets/app-abc123.js`)

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe(
      'public, max-age=31536000, immutable'
    )
    await expect(response.text()).resolves.toBe('export {}')
  })
})
