const DEFAULT_LOGIN_REDIRECT = '/'

export function getLoginRedirectTarget(redirect?: string) {
  if (!redirect || isSignInRedirect(redirect)) {
    return DEFAULT_LOGIN_REDIRECT
  }

  return redirect
}

function isSignInRedirect(redirect: string) {
  try {
    const parsedUrl = new URL(redirect, 'http://lite-ats.local')
    return parsedUrl.pathname === '/sign-in'
  } catch {
    return false
  }
}
