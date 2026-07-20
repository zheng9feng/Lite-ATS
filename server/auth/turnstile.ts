const TURNSTILE_SITEVERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const TURNSTILE_VERIFICATION_TIMEOUT_MS = 10_000

const unavailableErrorCodes = new Set([
  'internal-error',
  'invalid-input-secret',
  'missing-input-secret',
])

export type CaptchaVerificationResult = 'invalid' | 'unavailable' | 'valid'

export type CaptchaVerifier = {
  verify: (token: string) => Promise<CaptchaVerificationResult>
}

type CreateTurnstileVerifierOptions = {
  fetchImpl?: typeof fetch
  secretKey: string
  timeoutMs?: number
}

type TurnstileVerificationResponse = {
  'error-codes'?: string[]
  success?: boolean
}

export function createTurnstileVerifier({
  fetchImpl = fetch,
  secretKey,
  timeoutMs = TURNSTILE_VERIFICATION_TIMEOUT_MS,
}: CreateTurnstileVerifierOptions): CaptchaVerifier {
  return {
    verify: async (token) => {
      if (!secretKey) return 'unavailable'
      if (!token || token.length > 2048) return 'invalid'

      const abortController = new AbortController()
      const timeoutId = setTimeout(() => abortController.abort(), timeoutMs)

      try {
        const response = await fetchImpl(TURNSTILE_SITEVERIFY_URL, {
          body: new URLSearchParams({
            response: token,
            secret: secretKey,
          }),
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          method: 'POST',
          signal: abortController.signal,
        })

        if (!response.ok) return 'unavailable'

        const result = (await response.json()) as TurnstileVerificationResponse

        if (result.success === true) return 'valid'

        return result['error-codes']?.some((code) =>
          unavailableErrorCodes.has(code)
        )
          ? 'unavailable'
          : 'invalid'
      } catch {
        return 'unavailable'
      } finally {
        clearTimeout(timeoutId)
      }
    },
  }
}
