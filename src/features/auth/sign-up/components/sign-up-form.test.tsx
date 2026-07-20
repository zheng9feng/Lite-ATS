import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, type RenderResult } from 'vitest-browser-react'
import { type Locator, userEvent } from 'vitest/browser'
import { SignUpForm } from './sign-up-form'

const FORM_MESSAGES = {
  confirmPasswordEmpty: 'Please confirm your password.',
  emailInvalid: 'Please enter a valid email address.',
  nameEmpty: 'Please enter your full name.',
  passwordEmpty: 'Please enter your password.',
  passwordLowercase: 'Password must contain at least one lowercase letter.',
  passwordMismatch: "Passwords don't match.",
  passwordNumber: 'Password must contain at least one number.',
} as const

const navigate = vi.fn()
const registerWithPassword = vi.fn()
const setAuthSnapshot = vi.fn()
const toastPromise = vi.fn()

const authSnapshot = {
  permissions: ['resumes:read'],
  roles: ['normal'],
  sessionToken: 'new-session-token',
  user: {
    createdAt: '2026-07-20T00:00:00.000Z',
    email: 'jane@example.com',
    id: 'user-jane',
    name: 'Jane Doe',
    status: 'active',
    updatedAt: '2026-07-20T00:00:00.000Z',
  },
}

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({
    auth: { setAuthSnapshot },
  }),
}))

vi.mock('../../data/auth-api', () => ({
  registerWithPassword: (...args: unknown[]) => registerWithPassword(...args),
}))

vi.mock('sonner', () => ({
  toast: { promise: (...args: unknown[]) => toastPromise(...args) },
}))

vi.mock('./turnstile-widget', () => ({
  TurnstileWidget: ({
    onError,
    onTokenChange,
    resetKey,
  }: {
    onError: () => void
    onTokenChange: (token: string) => void
    resetKey: number
  }) => (
    <div>
      <button type='button' onClick={() => onTokenChange('captcha-token')}>
        Complete human verification
      </button>
      <button type='button' onClick={onError}>
        Fail human verification
      </button>
      <span>Captcha reset {resetKey}</span>
    </div>
  ),
}))

describe('SignUpForm', () => {
  let screen: RenderResult
  let nameInput: Locator
  let emailInput: Locator
  let passwordInput: Locator
  let confirmPasswordInput: Locator
  let captchaButton: Locator
  let submitButton: Locator

  beforeEach(async () => {
    vi.clearAllMocks()
    registerWithPassword.mockResolvedValue(authSnapshot)
    navigate.mockResolvedValue(undefined)

    screen = await render(<SignUpForm turnstileSiteKey='test-site-key' />)
    nameInput = screen.getByRole('textbox', { name: /^Full name$/i })
    emailInput = screen.getByRole('textbox', { name: /^Email$/i })
    passwordInput = screen.getByLabelText(/^Password$/i)
    confirmPasswordInput = screen.getByLabelText(/^Confirm Password$/i)
    captchaButton = screen.getByRole('button', {
      name: /^Complete human verification$/i,
    })
    submitButton = screen.getByRole('button', { name: /^Create Account$/i })
  })

  async function completeValidForm() {
    await userEvent.fill(nameInput, ' Jane Doe ')
    await userEvent.fill(emailInput, 'jane@example.com')
    await userEvent.fill(passwordInput, 'password1')
    await userEvent.fill(confirmPasswordInput, 'password1')
    await userEvent.click(captchaButton)
  }

  it('renders all fields and gates submission on CAPTCHA', async () => {
    await expect.element(nameInput).toBeInTheDocument()
    await expect.element(emailInput).toBeInTheDocument()
    await expect.element(passwordInput).toBeInTheDocument()
    await expect.element(confirmPasswordInput).toBeInTheDocument()
    await expect.element(submitButton).toBeDisabled()

    await userEvent.click(captchaButton)

    await expect.element(submitButton).toBeEnabled()
  })

  it('shows validation messages when submitting an empty form', async () => {
    await userEvent.click(captchaButton)
    await userEvent.click(submitButton)

    await expect
      .element(screen.getByText(FORM_MESSAGES.nameEmpty))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText(FORM_MESSAGES.emailInvalid))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText(FORM_MESSAGES.passwordEmpty))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText(FORM_MESSAGES.confirmPasswordEmpty))
      .toBeInTheDocument()
  })

  it('enforces password policy and matching confirmation', async () => {
    await userEvent.fill(nameInput, 'Jane Doe')
    await userEvent.fill(emailInput, 'jane@example.com')
    await userEvent.fill(passwordInput, 'PASSWORD')
    await userEvent.fill(confirmPasswordInput, 'DIFFERENT')
    await userEvent.click(captchaButton)
    await userEvent.click(submitButton)

    await expect
      .element(screen.getByText(FORM_MESSAGES.passwordLowercase))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText(FORM_MESSAGES.passwordMismatch))
      .toBeInTheDocument()

    await userEvent.fill(passwordInput, 'password')
    await userEvent.click(submitButton)

    await expect
      .element(screen.getByText(FORM_MESSAGES.passwordNumber))
      .toBeInTheDocument()
  })

  it('registers, stores the session, and navigates to the dashboard', async () => {
    await completeValidForm()
    await userEvent.click(submitButton)

    await vi.waitFor(() =>
      expect(registerWithPassword).toHaveBeenCalledWith({
        captchaToken: 'captcha-token',
        email: 'jane@example.com',
        name: 'Jane Doe',
        password: 'password1',
      })
    )
    expect(setAuthSnapshot).toHaveBeenCalledWith(authSnapshot)
    expect(navigate).toHaveBeenCalledWith({ to: '/', replace: true })
    expect(toastPromise).toHaveBeenCalledOnce()
  })

  it('resets CAPTCHA and restores the form after an API error', async () => {
    registerWithPassword.mockRejectedValueOnce(new Error('Email exists.'))
    await completeValidForm()
    await userEvent.click(submitButton)

    await vi.waitFor(() => expect(registerWithPassword).toHaveBeenCalledOnce())
    await expect
      .element(screen.getByText('Captcha reset 1'))
      .toBeInTheDocument()
    await expect.element(submitButton).toBeDisabled()
    expect(setAuthSnapshot).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })
})
