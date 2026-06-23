import { clearCookies } from '@/test-utils/cookies'
import { beforeEach, describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { getCookie } from '@/lib/cookies'
import {
  DEFAULT_LOCALE,
  LanguageProvider,
  useLanguage,
} from './language-provider'

function LanguageProbe() {
  const { locale, resetLocale, setLocale } = useLanguage()

  return (
    <div>
      <p data-testid='locale'>{locale}</p>
      <button type='button' onClick={() => setLocale('en')}>
        English
      </button>
      <button type='button' onClick={resetLocale}>
        Reset
      </button>
    </div>
  )
}

describe('LanguageProvider', () => {
  beforeEach(() => {
    clearCookies()
    document.documentElement.removeAttribute('lang')
  })

  it('defaults to Simplified Chinese and updates the html lang attribute', async () => {
    const screen = await render(
      <LanguageProvider>
        <LanguageProbe />
      </LanguageProvider>
    )

    await expect
      .element(screen.getByTestId('locale'))
      .toHaveTextContent(DEFAULT_LOCALE)
    expect(document.documentElement.getAttribute('lang')).toBe('zh-CN')
  })

  it('persists English selection in a locale cookie', async () => {
    const screen = await render(
      <LanguageProvider>
        <LanguageProbe />
      </LanguageProvider>
    )

    await userEvent.click(screen.getByRole('button', { name: 'English' }))

    await expect.element(screen.getByTestId('locale')).toHaveTextContent('en')
    expect(getCookie('app_locale')).toBe('en')
    expect(document.documentElement.getAttribute('lang')).toBe('en')
  })

  it('resets back to Chinese and removes the persisted preference', async () => {
    const screen = await render(
      <LanguageProvider>
        <LanguageProbe />
      </LanguageProvider>
    )

    await userEvent.click(screen.getByRole('button', { name: 'English' }))
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }))

    await expect
      .element(screen.getByTestId('locale'))
      .toHaveTextContent('zh-CN')
    expect(getCookie('app_locale')).toBeUndefined()
    expect(document.documentElement.getAttribute('lang')).toBe('zh-CN')
  })
})
