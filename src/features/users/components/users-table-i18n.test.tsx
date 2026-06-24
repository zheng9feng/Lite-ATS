import { clearCookies } from '@/test-utils/cookies'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { LanguageProvider } from '@/context/language-provider'
import { type User } from '../data/schema'
import { UsersPrimaryButtons } from './users-primary-buttons'
import { UsersProvider } from './users-provider'
import { UsersTable } from './users-table'

const users: User[] = [
  {
    id: 'user-1',
    firstName: 'Citlalli',
    lastName: 'Spinka',
    username: 'citlalli.spinka45',
    email: 'citlalli@example.com',
    phoneNumber: '+17593407614',
    status: 'suspended',
    role: 'manager',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
  },
  {
    id: 'user-2',
    firstName: 'Efrain',
    lastName: 'Schuster',
    username: 'efrain_schuster57',
    email: 'efrain@example.com',
    phoneNumber: '+16095813030',
    status: 'active',
    role: 'cashier',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
  },
  {
    id: 'user-3',
    firstName: 'Jill',
    lastName: 'Mosciski',
    username: 'jill.mosciski',
    email: 'jill@example.com',
    phoneNumber: '+12026770350',
    status: 'invited',
    role: 'admin',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
  },
]

function renderUsersTable() {
  return render(
    <LanguageProvider>
      <UsersTable data={users} navigate={vi.fn()} search={{}} />
    </LanguageProvider>
  )
}

function renderUsersPrimaryButtons() {
  return render(
    <LanguageProvider>
      <UsersProvider>
        <UsersPrimaryButtons />
      </UsersProvider>
    </LanguageProvider>
  )
}

describe('Users table i18n', () => {
  beforeEach(() => {
    clearCookies()
  })

  it('renders toolbar controls, column headers, statuses, and roles in Chinese by default', async () => {
    const { getByPlaceholder, getByRole, getByText } = await renderUsersTable()

    await expect.element(getByPlaceholder('筛选用户...')).toBeInTheDocument()
    await expect
      .element(getByRole('button', { name: '状态' }))
      .toBeInTheDocument()
    await expect
      .element(getByRole('button', { name: '角色' }))
      .toBeInTheDocument()
    await expect
      .element(getByRole('button', { name: '视图' }))
      .toBeInTheDocument()

    await expect.element(getByText('用户名')).toBeInTheDocument()
    await expect.element(getByText('姓名')).toBeInTheDocument()
    await expect.element(getByText('邮箱')).toBeInTheDocument()
    await expect.element(getByText('电话号码')).toBeInTheDocument()

    await expect.element(getByText('已暂停')).toBeInTheDocument()
    await expect.element(getByText('已启用')).toBeInTheDocument()
    await expect.element(getByText('已邀请')).toBeInTheDocument()
    await expect.element(getByText('经理')).toBeInTheDocument()
    await expect.element(getByText('收银员')).toBeInTheDocument()
    await expect.element(getByText('管理员')).toBeInTheDocument()
  })

  it('renders primary buttons in Chinese by default', async () => {
    const { getByRole } = await renderUsersPrimaryButtons()

    await expect
      .element(getByRole('button', { name: '邀请用户' }))
      .toBeInTheDocument()
    await expect
      .element(getByRole('button', { name: '添加用户' }))
      .toBeInTheDocument()
  })
})
