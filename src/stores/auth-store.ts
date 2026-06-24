import { create } from 'zustand'
import { getCookie, setCookie, removeCookie } from '@/lib/cookies'

const SESSION_TOKEN = 'lite-ats-session-token'

export type AuthUser = {
  createdAt: string
  email: string
  id: string
  name: string
  status: 'active' | 'inactive'
  updatedAt: string
}

export type AuthSnapshot = {
  permissions: string[]
  roles: string[]
  sessionToken: string
  user: AuthUser
}

type AuthState = {
  auth: {
    user: AuthUser | null
    roles: string[]
    permissions: string[]
    sessionToken: string
    setAuthSnapshot: (snapshot: AuthSnapshot) => void
    setSessionToken: (sessionToken: string) => void
    resetSessionToken: () => void
    reset: () => void
  }
}

export const useAuthStore = create<AuthState>()((set) => {
  const cookieState = getCookie(SESSION_TOKEN)
  const initToken = cookieState ? JSON.parse(cookieState) : ''
  return {
    auth: {
      user: null,
      roles: [],
      permissions: [],
      sessionToken: initToken,
      setAuthSnapshot: (snapshot) =>
        set((state) => {
          setCookie(SESSION_TOKEN, JSON.stringify(snapshot.sessionToken))
          return {
            ...state,
            auth: {
              ...state.auth,
              permissions: snapshot.permissions,
              roles: snapshot.roles,
              sessionToken: snapshot.sessionToken,
              user: snapshot.user,
            },
          }
        }),
      setSessionToken: (sessionToken) =>
        set((state) => {
          setCookie(SESSION_TOKEN, JSON.stringify(sessionToken))
          return { ...state, auth: { ...state.auth, sessionToken } }
        }),
      resetSessionToken: () =>
        set((state) => {
          removeCookie(SESSION_TOKEN)
          return { ...state, auth: { ...state.auth, sessionToken: '' } }
        }),
      reset: () =>
        set((state) => {
          removeCookie(SESSION_TOKEN)
          return {
            ...state,
            auth: {
              ...state.auth,
              permissions: [],
              roles: [],
              sessionToken: '',
              user: null,
            },
          }
        }),
    },
  }
})
