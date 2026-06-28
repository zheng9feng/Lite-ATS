import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, type RenderResult } from 'vitest-browser-react'
import { type Locator, userEvent } from 'vitest/browser'
import { UserAuthForm } from './user-auth-form'

const FORM_MESSAGES = {
  emailEmpty: 'Please enter your email.',
  passwordEmpty: 'Please enter your password.',
  passwordShort: 'Password must be at least 7 characters long.',
} as const

const navigate = vi.fn()
const loginWithPassword = vi.fn()
const setAuthSnapshotMock = vi.fn()
const authSnapshot = {
  permissions: ['resumes:read'],
  roles: ['normal'],
  sessionToken: 'mock-session-token',
  user: {
    createdAt: '2026-06-23T00:00:00.000Z',
    email: 'a@b.com',
    id: 'user-1',
    name: 'User One',
    status: 'active',
    updatedAt: '2026-06-23T00:00:00.000Z',
  },
}

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({
    auth: {
      setAuthSnapshot: setAuthSnapshotMock,
    },
  }),
}))

vi.mock('../../data/auth-api', () => ({
  loginWithPassword: (...args: unknown[]) => loginWithPassword(...args),
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: () => navigate,
    Link: ({
      children,
      to,
      className,
      ...rest
    }: {
      children?: React.ReactNode
      to: string
      className?: string
    }) => (
      <a href={to} className={className} {...rest}>
        {children}
      </a>
    ),
  }
})

vi.mock('@/lib/utils', async (orig) => ({
  ...(await orig()),
  sleep: vi.fn(() => Promise.resolve()),
}))

describe('UserAuthForm', () => {
  describe('Rendering without redirectTo', () => {
    let screen: RenderResult
    let emailInput: Locator
    let passwordInput: Locator
    let signInButton: Locator
    let forgotPasswordLink: Locator

    beforeEach(async () => {
      vi.clearAllMocks()
      loginWithPassword.mockResolvedValue(authSnapshot)
      screen = await render(<UserAuthForm />)
      emailInput = screen.getByRole('textbox', { name: /^Email$/i })
      passwordInput = screen.getByLabelText(/^Password$/i)
      signInButton = screen.getByRole('button', { name: /^Sign in$/i })
      forgotPasswordLink = screen.getByText(/^Forgot password\?$/i)
    })

    it('renders fields, submit button, and forgot password link', async () => {
      await expect.element(emailInput).toBeInTheDocument()
      await expect.element(passwordInput).toBeInTheDocument()
      await expect.element(signInButton).toBeInTheDocument()
      await expect.element(forgotPasswordLink).toBeInTheDocument()
    })

    it('shows validation messages when submitting empty form', async () => {
      await userEvent.click(signInButton)

      await expect
        .element(screen.getByText(FORM_MESSAGES.emailEmpty))
        .toBeInTheDocument()
      await expect
        .element(screen.getByText(FORM_MESSAGES.passwordEmpty))
        .toBeInTheDocument()
    })

    it('authenticates and navigates to default route on success', async () => {
      await userEvent.fill(emailInput, 'a@b.com')
      await userEvent.fill(passwordInput, '1234567')

      await userEvent.click(signInButton)

      await vi.waitFor(() =>
        expect(loginWithPassword).toHaveBeenCalledWith({
          email: 'a@b.com',
          password: '1234567',
        })
      )
      expect(setAuthSnapshotMock).toHaveBeenCalledOnce()
      expect(setAuthSnapshotMock).toHaveBeenCalledWith(authSnapshot)

      await vi.waitFor(() =>
        expect(navigate).toHaveBeenCalledWith({ to: '/', replace: true })
      )
    })
  })

  it('navigates to redirectTo when provided', async () => {
    vi.clearAllMocks()
    loginWithPassword.mockResolvedValue(authSnapshot)

    const { getByRole, getByLabelText } = await render(
      <UserAuthForm redirectTo='/settings' />
    )

    await userEvent.fill(getByRole('textbox', { name: /Email/i }), 'a@b.com')
    await userEvent.fill(getByLabelText('Password'), '1234567')

    await userEvent.click(getByRole('button', { name: /Sign in/i }))

    await vi.waitFor(() => expect(setAuthSnapshotMock).toHaveBeenCalledOnce())
    expect(setAuthSnapshotMock).toHaveBeenCalledWith(authSnapshot)

    await vi.waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({
        to: '/settings',
        replace: true,
      })
    )
  })

  it('falls back to the default route when redirectTo points at sign-in', async () => {
    vi.clearAllMocks()
    loginWithPassword.mockResolvedValue(authSnapshot)

    const { getByRole, getByLabelText } = await render(
      <UserAuthForm redirectTo='/sign-in?redirect=%2Fsign-in%3Fredirect%3D%252F' />
    )

    await userEvent.fill(getByRole('textbox', { name: /Email/i }), 'a@b.com')
    await userEvent.fill(getByLabelText('Password'), '1234567')

    await userEvent.click(getByRole('button', { name: /Sign in/i }))

    await vi.waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({
        to: '/',
        replace: true,
      })
    )
  })
})
