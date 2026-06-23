import { createContext, useContext, useEffect, useState } from 'react'
import { I18nextProvider } from 'react-i18next'
import { getCookie, removeCookie, setCookie } from '@/lib/cookies'
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  i18n,
  type AppLocale,
} from '@/lib/i18n'

export { DEFAULT_LOCALE, SUPPORTED_LOCALES, type AppLocale }

const LOCALE_COOKIE_NAME = 'app_locale'
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

type LanguageContextType = {
  defaultLocale: AppLocale
  locale: AppLocale
  resetLocale: () => void
  setLocale: (locale: AppLocale) => void
}

const LanguageContext = createContext<LanguageContextType | null>(null)

function isAppLocale(value: string | undefined): value is AppLocale {
  return SUPPORTED_LOCALES.includes(value as AppLocale)
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, _setLocale] = useState<AppLocale>(() => {
    const storedLocale = getCookie(LOCALE_COOKIE_NAME)
    return isAppLocale(storedLocale) ? storedLocale : DEFAULT_LOCALE
  })

  useEffect(() => {
    document.documentElement.setAttribute('lang', locale)
    void i18n.changeLanguage(locale)
  }, [locale])

  const setLocale = (locale: AppLocale) => {
    _setLocale(locale)
    setCookie(LOCALE_COOKIE_NAME, locale, LOCALE_COOKIE_MAX_AGE)
  }

  const resetLocale = () => {
    _setLocale(DEFAULT_LOCALE)
    removeCookie(LOCALE_COOKIE_NAME)
  }

  return (
    <LanguageContext
      value={{
        defaultLocale: DEFAULT_LOCALE,
        locale,
        resetLocale,
        setLocale,
      }}
    >
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </LanguageContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
