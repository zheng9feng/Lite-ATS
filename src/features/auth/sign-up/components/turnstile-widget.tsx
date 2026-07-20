import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

const TURNSTILE_SCRIPT_ID = 'cloudflare-turnstile-script'
const TURNSTILE_SCRIPT_URL =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

type TurnstileOptions = {
  appearance: 'always'
  callback: (token: string) => void
  'error-callback': () => void
  'expired-callback': () => void
  sitekey: string
  size: 'flexible'
  theme: 'auto'
}

type TurnstileApi = {
  remove: (widgetId: string) => void
  render: (container: HTMLElement, options: TurnstileOptions) => string
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

let turnstileScriptPromise: Promise<void> | undefined

function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve()
  if (turnstileScriptPromise) return turnstileScriptPromise

  turnstileScriptPromise = new Promise<void>((resolve, reject) => {
    document.getElementById(TURNSTILE_SCRIPT_ID)?.remove()

    const script = document.createElement('script')

    const handleLoad = () => {
      if (window.turnstile) {
        resolve()
        return
      }

      reject(new Error('Turnstile failed to initialize.'))
    }
    const handleError = () => reject(new Error('Turnstile failed to load.'))

    script.addEventListener('load', handleLoad, { once: true })
    script.addEventListener('error', handleError, { once: true })

    script.id = TURNSTILE_SCRIPT_ID
    script.async = true
    script.defer = true
    script.src = TURNSTILE_SCRIPT_URL
    document.head.append(script)
  }).catch((error: unknown) => {
    document.getElementById(TURNSTILE_SCRIPT_ID)?.remove()
    turnstileScriptPromise = undefined
    throw error
  })

  return turnstileScriptPromise
}

type TurnstileWidgetProps = {
  onError: () => void
  onTokenChange: (token: string) => void
  resetKey: number
  siteKey: string
}

export function TurnstileWidget({
  onError,
  onTokenChange,
  resetKey,
  siteKey,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [message, setMessage] = useState(() =>
    siteKey
      ? 'Loading human verification...'
      : 'Human verification is unavailable.'
  )
  const [hasError, setHasError] = useState(() => !siteKey)

  useEffect(() => {
    let isCurrent = true
    let widgetId: string | undefined

    if (!siteKey) {
      onError()
      return
    }

    loadTurnstileScript()
      .then(() => {
        if (!isCurrent || !containerRef.current || !window.turnstile) return

        widgetId = window.turnstile.render(containerRef.current, {
          appearance: 'always',
          callback: (token) => {
            if (!isCurrent) return
            setHasError(false)
            setMessage('Human verification complete.')
            onTokenChange(token)
          },
          'error-callback': () => {
            if (!isCurrent) return
            setHasError(true)
            setMessage('Human verification failed. Please try again.')
            onTokenChange('')
            onError()
          },
          'expired-callback': () => {
            if (!isCurrent) return
            setHasError(true)
            setMessage('Human verification expired. Please complete it again.')
            onTokenChange('')
          },
          sitekey: siteKey,
          size: 'flexible',
          theme: 'auto',
        })
      })
      .catch(() => {
        if (!isCurrent) return
        setHasError(true)
        setMessage('Human verification is unavailable.')
        onTokenChange('')
        onError()
      })

    return () => {
      isCurrent = false

      if (widgetId && window.turnstile) {
        window.turnstile.remove(widgetId)
      }
    }
  }, [onError, onTokenChange, siteKey])

  return (
    <div className='grid gap-2'>
      <div
        ref={containerRef}
        className='min-h-16 w-full'
        data-reset-key={resetKey}
        data-testid='turnstile-container'
      />
      <p
        role='status'
        aria-live='polite'
        className={cn(
          'text-xs text-muted-foreground',
          hasError && 'text-destructive'
        )}
      >
        {message}
      </p>
    </div>
  )
}
