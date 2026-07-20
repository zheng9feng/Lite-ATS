import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { TurnstileWidget } from './turnstile-widget'

type CapturedOptions = {
  callback: (token: string) => void
  'error-callback': () => void
  'expired-callback': () => void
}

describe('TurnstileWidget', () => {
  let capturedOptions: CapturedOptions | undefined
  const onError = vi.fn()
  const onTokenChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    document.getElementById('cloudflare-turnstile-script')?.remove()
    capturedOptions = undefined
    window.turnstile = {
      remove: vi.fn(),
      render: vi.fn((_container, options) => {
        capturedOptions = options
        return 'widget-1'
      }),
    }
  })

  it('reports successful, expired, and failed verification states', async () => {
    const screen = await render(
      <TurnstileWidget
        onError={onError}
        onTokenChange={onTokenChange}
        resetKey={0}
        siteKey='test-site-key'
      />
    )

    await vi.waitFor(() => expect(capturedOptions).toBeDefined())
    capturedOptions?.callback('verified-token')

    await expect
      .element(screen.getByText('Human verification complete.'))
      .toBeInTheDocument()
    expect(onTokenChange).toHaveBeenLastCalledWith('verified-token')

    capturedOptions?.['expired-callback']()

    await expect
      .element(
        screen.getByText(
          'Human verification expired. Please complete it again.'
        )
      )
      .toBeInTheDocument()
    expect(onTokenChange).toHaveBeenLastCalledWith('')

    capturedOptions?.['error-callback']()

    await expect
      .element(screen.getByText('Human verification failed. Please try again.'))
      .toBeInTheDocument()
    expect(onError).toHaveBeenCalledOnce()
  })

  it('fails closed when no site key is configured', async () => {
    const screen = await render(
      <TurnstileWidget
        onError={onError}
        onTokenChange={onTokenChange}
        resetKey={0}
        siteKey=''
      />
    )

    await expect
      .element(screen.getByText('Human verification is unavailable.'))
      .toBeInTheDocument()
    expect(onError).toHaveBeenCalledOnce()
    expect(window.turnstile?.render).not.toHaveBeenCalled()
  })

  it('replaces a failed script when the widget is mounted again', async () => {
    window.turnstile = undefined
    const props = {
      onError,
      onTokenChange,
      resetKey: 0,
      siteKey: 'test-site-key',
    }
    const firstScreen = await render(<TurnstileWidget {...props} />)

    await vi.waitFor(() =>
      expect(
        document.getElementById('cloudflare-turnstile-script')
      ).toBeInstanceOf(HTMLScriptElement)
    )
    const failedScript = document.getElementById(
      'cloudflare-turnstile-script'
    ) as HTMLScriptElement
    failedScript.dispatchEvent(new Event('error'))

    await expect
      .element(firstScreen.getByText('Human verification is unavailable.'))
      .toBeInTheDocument()
    await vi.waitFor(() => expect(failedScript.isConnected).toBe(false))

    await render(<TurnstileWidget {...props} resetKey={1} />)
    await vi.waitFor(() => {
      const retryScript = document.getElementById('cloudflare-turnstile-script')
      expect(retryScript).toBeInstanceOf(HTMLScriptElement)
      expect(retryScript).not.toBe(failedScript)
    })

    document
      .getElementById('cloudflare-turnstile-script')
      ?.dispatchEvent(new Event('error'))
  })
})
