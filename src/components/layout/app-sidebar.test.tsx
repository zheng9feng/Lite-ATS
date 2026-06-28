import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { useAuthStore } from '@/stores/auth-store'
import { LanguageProvider } from '@/context/language-provider'
import { LayoutProvider } from '@/context/layout-provider'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from './app-sidebar'

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    Link: ({
      children,
      to,
      ...props
    }: React.ComponentProps<'a'> & { to: string }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
    useLocation: ({
      select,
    }: { select?: (location: { href: string }) => string } = {}) =>
      select ? select({ href: '/' }) : { href: '/' },
    useNavigate: () => vi.fn(),
  }
})

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}))

function renderAppSidebar() {
  return render(
    <LanguageProvider>
      <LayoutProvider>
        <SidebarProvider>
          <AppSidebar />
        </SidebarProvider>
      </LayoutProvider>
    </LanguageProvider>
  )
}

describe('AppSidebar', () => {
  beforeEach(() => {
    useAuthStore.getState().auth.reset()
  })

  it('renders the logged-in user in the sidebar footer', async () => {
    useAuthStore.getState().auth.setAuthSnapshot({
      permissions: ['resumes:read'],
      roles: ['reviewer'],
      sessionToken: 'session-token',
      user: {
        createdAt: '2026-06-23T00:00:00.000Z',
        email: 'reviewer@example.com',
        id: 'user-reviewer',
        name: 'Resume Reviewer',
        status: 'active',
        updatedAt: '2026-06-23T00:00:00.000Z',
      },
    })

    const { getByText } = await renderAppSidebar()

    await expect.element(getByText('Resume Reviewer')).toBeInTheDocument()
    await expect.element(getByText('reviewer@example.com')).toBeInTheDocument()
    await expect.element(getByText('RR').first()).toBeInTheDocument()
    await expect.element(getByText('satnaing')).not.toBeInTheDocument()
    await expect
      .element(getByText('satnaingdev@gmail.com'))
      .not.toBeInTheDocument()
    await expect.element(getByText('SN')).not.toBeInTheDocument()
  })
})
