import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { getCookie } from '@/lib/cookies'
import { cn } from '@/lib/utils'
import { LayoutProvider } from '@/context/layout-provider'
import { SearchProvider } from '@/context/search-provider'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { SkipToMain } from '@/components/skip-to-main'
import { getCurrentAuth } from '@/features/auth/data/auth-api'
import { ForbiddenError } from '@/features/errors/forbidden'
import { getAuthGuardDecision, getRoutePermissions } from './auth-guard'

type AuthenticatedLayoutProps = {
  children?: React.ReactNode
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const defaultOpen = getCookie('sidebar_state') !== 'false'
  const location = useLocation()
  const navigate = useNavigate()
  const { auth } = useAuthStore()
  const [isHydratingAuth, setIsHydratingAuth] = useState(
    Boolean(auth.sessionToken && !auth.user)
  )
  const requiredPermissions = useMemo(
    () => getRoutePermissions(location.pathname),
    [location.pathname]
  )
  const guardDecision = useMemo(
    () =>
      getAuthGuardDecision({
        currentHref: location.href,
        hasSession: Boolean(auth.sessionToken),
        permissions: auth.permissions,
        requiredPermissions,
      }),
    [auth.permissions, auth.sessionToken, location.href, requiredPermissions]
  )

  useEffect(() => {
    let isActive = true

    async function hydrateAuth() {
      if (!auth.sessionToken || auth.user) {
        setIsHydratingAuth(false)
        return
      }

      setIsHydratingAuth(true)

      try {
        const authSnapshot = await getCurrentAuth()

        if (isActive) {
          auth.setAuthSnapshot({
            ...authSnapshot,
            sessionToken: auth.sessionToken,
          })
        }
      } catch {
        if (isActive) {
          auth.reset()
        }
      } finally {
        if (isActive) {
          setIsHydratingAuth(false)
        }
      }
    }

    void hydrateAuth()

    return () => {
      isActive = false
    }
  }, [auth])

  useEffect(() => {
    if (guardDecision.type !== 'redirect-to-login') {
      return
    }

    navigate({
      to: '/sign-in',
      search: { redirect: guardDecision.redirect },
      replace: true,
    })
  }, [guardDecision, navigate])

  if (guardDecision.type === 'redirect-to-login') {
    return null
  }

  if (isHydratingAuth) {
    return null
  }

  if (guardDecision.type === 'forbidden') {
    return <ForbiddenError />
  }

  return (
    <SearchProvider>
      <LayoutProvider>
        <SidebarProvider defaultOpen={defaultOpen}>
          <SkipToMain />
          <AppSidebar />
          <SidebarInset
            className={cn(
              // Set content container, so we can use container queries
              '@container/content',

              // If layout is fixed, set the height
              // to 100svh to prevent overflow
              'has-data-[layout=fixed]:h-svh',

              // If layout is fixed and sidebar is inset,
              // set the height to 100svh - spacing (total margins) to prevent overflow
              'peer-data-[variant=inset]:has-data-[layout=fixed]:h-[calc(100svh-(var(--spacing)*4))]'
            )}
          >
            {children ?? <Outlet />}
          </SidebarInset>
        </SidebarProvider>
      </LayoutProvider>
    </SearchProvider>
  )
}
