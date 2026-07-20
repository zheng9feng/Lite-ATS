import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTurnstileVerifier } from './turnstile'

describe('createTurnstileVerifier', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('validates a token through Cloudflare Siteverify', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ success: true })))
    const verifier = createTurnstileVerifier({
      fetchImpl,
      secretKey: 'secret-key',
    })

    await expect(verifier.verify('captcha-token')).resolves.toBe('valid')
    expect(fetchImpl).toHaveBeenCalledOnce()

    const [url, init] = fetchImpl.mock.calls[0] ?? []
    expect(url).toBe(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify'
    )
    expect(init).toMatchObject({
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      method: 'POST',
    })
    expect(String(init?.body)).toContain('response=captcha-token')
    expect(String(init?.body)).toContain('secret=secret-key')
  })

  it('rejects invalid and replayed tokens', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          'error-codes': ['timeout-or-duplicate'],
          success: false,
        })
      )
    )
    const verifier = createTurnstileVerifier({
      fetchImpl,
      secretKey: 'secret-key',
    })

    await expect(verifier.verify('spent-token')).resolves.toBe('invalid')
    await expect(verifier.verify('')).resolves.toBe('invalid')
    expect(fetchImpl).toHaveBeenCalledOnce()
  })

  it('fails closed when configuration or Siteverify is unavailable', async () => {
    const missingSecretVerifier = createTurnstileVerifier({ secretKey: '' })
    await expect(missingSecretVerifier.verify('token')).resolves.toBe(
      'unavailable'
    )

    const networkVerifier = createTurnstileVerifier({
      fetchImpl: vi.fn<typeof fetch>().mockRejectedValue(new Error('offline')),
      secretKey: 'secret-key',
    })
    await expect(networkVerifier.verify('token')).resolves.toBe('unavailable')

    const invalidSecretVerifier = createTurnstileVerifier({
      fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            'error-codes': ['invalid-input-secret'],
            success: false,
          })
        )
      ),
      secretKey: 'wrong-secret',
    })
    await expect(invalidSecretVerifier.verify('token')).resolves.toBe(
      'unavailable'
    )
  })

  it('aborts stalled Siteverify requests and reports them as unavailable', async () => {
    vi.useFakeTimers()
    const fetchImpl = vi.fn<typeof fetch>((_url, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'))
        })
      })
    )
    const verifier = createTurnstileVerifier({
      fetchImpl,
      secretKey: 'secret-key',
      timeoutMs: 100,
    })

    const verification = verifier.verify('captcha-token')
    await vi.advanceTimersByTimeAsync(100)

    await expect(verification).resolves.toBe('unavailable')
    expect(fetchImpl.mock.calls[0]?.[1]?.signal?.aborted).toBe(true)
  })
})
