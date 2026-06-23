import { clearCookies } from '@/test-utils/cookies'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { setCookie } from '@/lib/cookies'
import { FontProvider } from '@/context/font-provider'
import { LanguageProvider } from '@/context/language-provider'
import { ThemeProvider } from '@/context/theme-provider'
import { SidebarProvider } from '@/components/ui/sidebar'
import { SettingsAccount } from './account'
import { SettingsAppearance } from './appearance'
import { SettingsDisplay } from './display'
import { Settings } from './index'
import { SettingsNotifications } from './notifications'
import { SettingsProfile } from './profile'

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
    Outlet: () => <div>Settings content</div>,
    useLocation: () => ({ pathname: '/settings' }),
    useNavigate: () => vi.fn(),
  }
})

vi.mock('@/components/config-drawer', () => ({
  ConfigDrawer: () => <div />,
}))
vi.mock('@/components/profile-dropdown', () => ({
  ProfileDropdown: () => <div />,
}))
vi.mock('@/components/search', () => ({
  Search: () => <button type='button'>搜索</button>,
}))
vi.mock('@/components/theme-switch', () => ({
  ThemeSwitch: () => <button type='button'>切换主题</button>,
}))

async function renderWithProviders(ui: React.ReactNode) {
  return await render(
    <LanguageProvider>
      <ThemeProvider>
        <FontProvider>{ui}</FontProvider>
      </ThemeProvider>
    </LanguageProvider>
  )
}

async function renderSettingsShell() {
  return await renderWithProviders(
    <SidebarProvider>
      <Settings />
    </SidebarProvider>
  )
}

describe('Settings i18n', () => {
  beforeEach(() => {
    clearCookies()
  })

  it('renders settings shell and sidebar navigation in Chinese by default', async () => {
    const { getByRole, getByText } = await renderSettingsShell()

    await expect
      .element(getByRole('heading', { name: '设置' }))
      .toBeInTheDocument()
    await expect
      .element(getByText('管理账号设置并配置电子邮件偏好。'))
      .toBeInTheDocument()
    await expect
      .element(getByRole('link', { name: /个人资料/i }))
      .toHaveAttribute('href', '/settings')
    await expect
      .element(getByRole('link', { name: /账号/i }))
      .toHaveAttribute('href', '/settings/account')
    await expect
      .element(getByRole('link', { name: /外观/i }))
      .toHaveAttribute('href', '/settings/appearance')
    await expect
      .element(getByRole('link', { name: /通知/i }))
      .toHaveAttribute('href', '/settings/notifications')
    await expect
      .element(getByRole('link', { name: /显示/i }))
      .toHaveAttribute('href', '/settings/display')
  })

  it('renders profile settings text in Chinese by default', async () => {
    const { getByLabelText, getByRole, getByText, getByPlaceholder } =
      await renderWithProviders(<SettingsProfile />)

    await expect
      .element(getByRole('heading', { name: '个人资料' }))
      .toBeInTheDocument()
    await expect
      .element(getByText('其他人在站点上看到你的方式。'))
      .toBeInTheDocument()
    await expect.element(getByLabelText('用户名')).toBeInTheDocument()
    await expect
      .element(getByPlaceholder('简单介绍一下你自己'))
      .toBeInTheDocument()
    await expect
      .element(getByRole('button', { name: '添加网址' }))
      .toBeInTheDocument()
    await expect
      .element(getByRole('button', { name: '更新个人资料' }))
      .toBeInTheDocument()
  })

  it('renders account settings text in Chinese by default', async () => {
    const { getByLabelText, getByRole, getByText, getByPlaceholder } =
      await renderWithProviders(<SettingsAccount />)

    await expect
      .element(getByRole('heading', { name: '账号' }))
      .toBeInTheDocument()
    await expect
      .element(getByText('更新账号设置。设置偏好的语言和时区。'))
      .toBeInTheDocument()
    await expect.element(getByLabelText('姓名')).toBeInTheDocument()
    await expect.element(getByPlaceholder('你的姓名')).toBeInTheDocument()
    await expect.element(getByText(/^出生日期$/)).toBeInTheDocument()
    await expect
      .element(getByRole('button', { name: /选择日期/i }))
      .toBeInTheDocument()
    await expect.element(getByText(/^语言$/)).toBeInTheDocument()
    await expect.element(getByText(/^选择语言$/)).toBeInTheDocument()
    await expect
      .element(getByRole('button', { name: '更新账号' }))
      .toBeInTheDocument()
  })

  it('renders appearance settings text in Chinese by default', async () => {
    const { getByRole, getByText } = await renderWithProviders(
      <SettingsAppearance />
    )

    await expect
      .element(getByRole('heading', { name: '外观' }))
      .toBeInTheDocument()
    await expect
      .element(getByText('自定义应用外观。自动在日间和夜间主题之间切换。'))
      .toBeInTheDocument()
    await expect.element(getByText(/^字体$/)).toBeInTheDocument()
    await expect
      .element(getByText('设置仪表盘使用的字体。'))
      .toBeInTheDocument()
    await expect.element(getByText(/^主题$/)).toBeInTheDocument()
    await expect.element(getByText('选择仪表盘主题。')).toBeInTheDocument()
    await expect.element(getByText('浅色')).toBeInTheDocument()
    await expect.element(getByText('深色')).toBeInTheDocument()
    await expect
      .element(getByRole('button', { name: '更新偏好' }))
      .toBeInTheDocument()
  })

  it('renders notifications settings text in Chinese by default', async () => {
    const { getByRole, getByText } = await renderWithProviders(
      <SettingsNotifications />
    )

    await expect
      .element(getByRole('heading', { name: /^通知$/ }))
      .toBeInTheDocument()
    await expect.element(getByText('配置接收通知的方式。')).toBeInTheDocument()
    await expect.element(getByText('通知我关于...')).toBeInTheDocument()
    await expect.element(getByText('所有新消息')).toBeInTheDocument()
    await expect.element(getByText('直接消息和提及')).toBeInTheDocument()
    await expect.element(getByText('不通知')).toBeInTheDocument()
    await expect.element(getByText('电子邮件通知')).toBeInTheDocument()
    await expect.element(getByText('通信邮件')).toBeInTheDocument()
    await expect.element(getByText('社交邮件')).toBeInTheDocument()
    await expect
      .element(getByText('为移动设备使用不同设置'))
      .toBeInTheDocument()
    await expect
      .element(getByRole('button', { name: '更新通知' }))
      .toBeInTheDocument()
  })

  it('renders display settings text in Chinese by default', async () => {
    const { getByRole, getByText } = await renderWithProviders(
      <SettingsDisplay />
    )

    await expect
      .element(getByRole('heading', { name: '显示' }))
      .toBeInTheDocument()
    await expect
      .element(getByText('打开或关闭项目来控制应用中显示的内容。'))
      .toBeInTheDocument()
    await expect.element(getByText(/^侧边栏$/)).toBeInTheDocument()
    await expect
      .element(getByText('选择要显示在侧边栏中的项目。'))
      .toBeInTheDocument()
    await expect.element(getByText(/^最近$/)).toBeInTheDocument()
    await expect.element(getByText(/^主页$/)).toBeInTheDocument()
    await expect.element(getByText(/^应用$/)).toBeInTheDocument()
    await expect
      .element(getByRole('button', { name: '更新显示' }))
      .toBeInTheDocument()
  })

  it('renders settings shell in English when English is persisted', async () => {
    setCookie('app_locale', 'en')

    const { getByRole, getByText } = await renderSettingsShell()

    await expect
      .element(getByRole('heading', { name: 'Settings' }))
      .toBeInTheDocument()
    await expect
      .element(
        getByText('Manage your account settings and set e-mail preferences.')
      )
      .toBeInTheDocument()
  })
})
