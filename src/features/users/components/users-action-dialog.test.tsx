import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, type RenderResult } from 'vitest-browser-react'
import { type UserEvent, userEvent } from 'vitest/browser'
import { type User } from '../data/schema'
import { UsersActionDialog } from './users-action-dialog'

const createUser = vi.hoisted(() => vi.fn())
const listUserRoleOptions = vi.hoisted(() => vi.fn())
const updateUser = vi.hoisted(() => vi.fn())

const VALIDATION_MESSAGES = {
  firstName: 'First Name is required.',
  lastName: 'Last Name is required.',
  username: 'Username is required.',
  phoneNumber: 'Phone number is required.',
  email: 'Email is required.',
  role: 'Role is required.',
  password: 'Password is required.',
  passwordMismatch: "Passwords don't match.",
  passwordLength: 'Password must be at least 8 characters long.',
  passwordNumber: 'Password must contain at least one number.',
  passwordLowercase: 'Password must contain at least one lowercase letter.',
} as const

const MOCK_USER: User = {
  id: 'alex_uuid',
  firstName: 'Alex',
  lastName: 'Smith',
  username: 'alex_smith',
  email: 'alex@smith.com',
  phoneNumber: '+19999999999',
  status: 'active',
  role: 'admin',
  roleId: 'role-admin',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-02-02'),
}

vi.mock('../data/users-api', () => ({
  createUser: (...args: unknown[]) => createUser(...args),
  listUserRoleOptions: (...args: unknown[]) => listUserRoleOptions(...args),
  updateUser: (...args: unknown[]) => updateUser(...args),
}))

describe('UsersActionDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createUser.mockResolvedValue({})
    updateUser.mockResolvedValue({})
    listUserRoleOptions.mockResolvedValue([
      { id: 'role-admin', name: 'admin' },
      { id: 'role-reviewer', name: 'reviewer' },
    ])
  })

  describe('add user', () => {
    it('renders title and description', async () => {
      const { getByRole, getByText } = await render(
        <UsersActionDialog open onOpenChange={vi.fn()} />
      )

      const title = getByRole('heading', {
        level: 2,
        name: /Add New User/i,
      })
      const description = getByText(
        /Create new user here. Click save when you're done./i
      )

      await expect.element(title).toBeInTheDocument()
      await expect.element(description).toBeInTheDocument()
    })

    it('shows validation messages when the form is submitted with empty fields', async () => {
      const { getByRole, getByText } = await render(
        <UsersActionDialog open onOpenChange={vi.fn()} />
      )

      const submitButton = getByRole('button', { name: /Save Changes/i })
      await userEvent.click(submitButton)

      await expect
        .element(getByText(VALIDATION_MESSAGES.firstName))
        .toBeInTheDocument()
      await expect
        .element(getByText(VALIDATION_MESSAGES.lastName))
        .toBeInTheDocument()
      await expect
        .element(getByText(VALIDATION_MESSAGES.username))
        .toBeInTheDocument()
      await expect
        .element(getByText(VALIDATION_MESSAGES.phoneNumber))
        .toBeInTheDocument()
      await expect
        .element(getByText(VALIDATION_MESSAGES.email))
        .toBeInTheDocument()
      await expect
        .element(getByText(VALIDATION_MESSAGES.role))
        .toBeInTheDocument()
      await expect
        .element(getByText(VALIDATION_MESSAGES.password))
        .toBeInTheDocument()
    })

    it('keeps confirm password disabled until password field is touched', async () => {
      const { getByRole } = await render(
        <UsersActionDialog open onOpenChange={vi.fn()} />
      )

      const password = getByRole('textbox', { name: /^Password$/i })
      const confirmPassword = getByRole('textbox', {
        name: /Confirm Password/i,
      })
      await expect.element(confirmPassword).toBeDisabled()

      await userEvent.type(password, 'a')
      await expect.element(confirmPassword).toBeEnabled()
    })

    it('loads role options from the database role catalog', async () => {
      const screen = await render(
        <UsersActionDialog open onOpenChange={vi.fn()} />
      )

      await userEvent.click(screen.getByRole('combobox', { name: /Role/i }))

      await expect
        .element(screen.getByRole('option', { name: 'Reviewer' }))
        .toBeInTheDocument()
    })

    it('shows password validation messages when password is invalid', async () => {
      const { getByRole, getByText } = await render(
        <UsersActionDialog open onOpenChange={vi.fn()} />
      )

      const password = getByRole('textbox', { name: /^Password$/i })
      const confirmPassword = getByRole('textbox', {
        name: /Confirm Password/i,
      })
      await userEvent.type(password, 'a')
      await userEvent.type(confirmPassword, 'b')
      const submitButton = getByRole('button', { name: /Save Changes/i })

      await userEvent.click(submitButton)

      await expect
        .element(getByText(VALIDATION_MESSAGES.passwordMismatch))
        .toBeInTheDocument()

      await userEvent.fill(password, 'short')

      await expect
        .element(getByText(VALIDATION_MESSAGES.passwordLength))
        .toBeInTheDocument()

      await userEvent.fill(password, 'ONLYUPPERCASE')

      await expect
        .element(getByText(VALIDATION_MESSAGES.passwordLowercase))
        .toBeInTheDocument()

      await userEvent.fill(password, 'onlylowercase')

      await expect
        .element(getByText(VALIDATION_MESSAGES.passwordNumber))
        .toBeInTheDocument()

      await userEvent.fill(password, 'S3cur3P@ssw0rd')
      await userEvent.fill(confirmPassword, 'S3cur3P@ssw0rd')

      await expect
        .element(getByText(VALIDATION_MESSAGES.passwordMismatch))
        .not.toBeInTheDocument()
      await expect
        .element(getByText(VALIDATION_MESSAGES.passwordLength))
        .not.toBeInTheDocument()
      await expect
        .element(getByText(VALIDATION_MESSAGES.passwordNumber))
        .not.toBeInTheDocument()
    })

    it('creates the user when the form is submitted successfully', async () => {
      const onOpenChange = vi.fn()

      const screen = await render(
        <UsersActionDialog open onOpenChange={onOpenChange} />
      )

      await fillRequiredProfileFields(userEvent, screen, MOCK_USER)

      await fillPasswords(userEvent, screen, 'S3cur3P@ssw0rd', 'S3cur3P@ssw0rd')

      const submitButton = screen.getByRole('button', { name: /Save Changes/i })
      await userEvent.click(submitButton)

      expect(onOpenChange).toHaveBeenCalledOnce()
      expect(onOpenChange).toHaveBeenCalledWith(false)

      expect(createUser).toHaveBeenCalledOnce()
      expect(createUser).toHaveBeenCalledWith({
        email: MOCK_USER.email,
        name: `${MOCK_USER.firstName} ${MOCK_USER.lastName}`,
        password: 'S3cur3P@ssw0rd',
        roleId: 'role-admin',
        status: 'active',
      })
    })

    it('keeps the dialog open when create user fails', async () => {
      createUser.mockRejectedValue(new Error('Email already exists.'))
      const onOpenChange = vi.fn()
      const screen = await render(
        <UsersActionDialog open onOpenChange={onOpenChange} />
      )

      await fillRequiredProfileFields(userEvent, screen, MOCK_USER)
      await fillPasswords(userEvent, screen, 'S3cur3P@ssw0rd', 'S3cur3P@ssw0rd')

      await userEvent.click(
        screen.getByRole('button', { name: /Save Changes/i })
      )

      await expect
        .element(screen.getByText('Email already exists.'))
        .toBeInTheDocument()
      expect(onOpenChange).not.toHaveBeenCalled()
    })
  })

  describe('edit user', () => {
    it('renders title and description', async () => {
      const { getByRole, getByText } = await render(
        <UsersActionDialog open onOpenChange={vi.fn()} currentRow={MOCK_USER} />
      )

      const title = getByRole('heading', {
        level: 2,
        name: /Edit User/i,
      })
      const description = getByText(
        /Update the user here\. Click save when you're done\./i
      )

      await expect.element(title).toBeInTheDocument()
      await expect.element(description).toBeInTheDocument()
    })

    it('submits without password changes', async () => {
      const onOpenChange = vi.fn()
      const screen = await render(
        <UsersActionDialog
          open
          onOpenChange={onOpenChange}
          currentRow={MOCK_USER}
        />
      )

      const submitButton = screen.getByRole('button', { name: /Save Changes/i })
      await userEvent.click(submitButton)

      expect(onOpenChange).toHaveBeenCalledOnce()
      expect(onOpenChange).toHaveBeenCalledWith(false)

      expect(updateUser).toHaveBeenCalledOnce()
      expect(updateUser).toHaveBeenCalledWith(MOCK_USER.id, {
        email: MOCK_USER.email,
        name: `${MOCK_USER.firstName} ${MOCK_USER.lastName}`,
        roleId: MOCK_USER.roleId,
        status: MOCK_USER.status,
      })
    })

    it('requires confirm password when password is changed', async () => {
      const { getByRole, getByText } = await render(
        <UsersActionDialog open onOpenChange={vi.fn()} currentRow={MOCK_USER} />
      )

      const password = getByRole('textbox', { name: /^Password$/i })
      const confirmPassword = getByRole('textbox', {
        name: /Confirm Password/i,
      })

      await userEvent.fill(password, 'S3cur3P@ssw0rd')
      await expect.element(confirmPassword).toBeEnabled()

      const submitButton = getByRole('button', { name: /Save Changes/i })
      await userEvent.click(submitButton)

      await expect
        .element(getByText(VALIDATION_MESSAGES.passwordMismatch))
        .toBeInTheDocument()
    })

    it('updates the user when the form is submitted successfully', async () => {
      const onOpenChange = vi.fn()
      const screen = await render(
        <UsersActionDialog
          open
          onOpenChange={onOpenChange}
          currentRow={MOCK_USER}
        />
      )

      const EDIT_SUCCESS_FIRST_NAME = 'John'
      const EDIT_SUCCESS_PASSWORD = 'S3cur3P@ssw0rd'

      await userEvent.fill(
        screen.getByLabelText(/first name/i),
        EDIT_SUCCESS_FIRST_NAME
      )
      await fillPasswords(
        userEvent,
        screen,
        EDIT_SUCCESS_PASSWORD,
        EDIT_SUCCESS_PASSWORD
      )

      const submitButton = screen.getByRole('button', { name: /Save Changes/i })
      await userEvent.click(submitButton)

      expect(onOpenChange).toHaveBeenCalledOnce()
      expect(onOpenChange).toHaveBeenCalledWith(false)

      expect(updateUser).toHaveBeenCalledOnce()
      expect(updateUser).toHaveBeenCalledWith(MOCK_USER.id, {
        email: MOCK_USER.email,
        name: `${EDIT_SUCCESS_FIRST_NAME} ${MOCK_USER.lastName}`,
        password: 'S3cur3P@ssw0rd',
        roleId: MOCK_USER.roleId,
        status: MOCK_USER.status,
      })
    })
  })
})

async function fillRequiredProfileFields(
  user: UserEvent,
  screen: RenderResult,
  overrides?: {
    firstName?: string
    lastName?: string
    username?: string
    email?: string
    roleOption?: string | RegExp
    phoneNumber?: string
  }
) {
  const entries = [
    [/first name/i, overrides?.firstName ?? 'John'],
    [/last name/i, overrides?.lastName ?? 'Doe'],
    [/username/i, overrides?.username ?? 'john_doe'],
    [/^email$/i, overrides?.email ?? 'a@b.co'],
    [/phone number/i, overrides?.phoneNumber ?? '+19999999999'],
  ] as const

  for (const [label, value] of entries) {
    const el = screen.getByLabelText(label)
    await expect.element(el).toBeInTheDocument()
    await user.fill(el, value)
  }

  const roleSelect = screen.getByRole('combobox', { name: /Role/i })
  await user.click(roleSelect)
  await user.click(
    screen.getByRole('option', {
      exact: true,
      name: overrides?.roleOption ?? 'Admin',
    })
  )
}

async function fillPasswords(
  user: UserEvent,
  screen: RenderResult,
  a: string,
  b: string
) {
  const password = screen.getByLabelText(/^Password$/i)
  const confirmPassword = screen.getByLabelText(/^Confirm Password$/i)
  await user.fill(password, a)
  await user.fill(confirmPassword, b)
}
