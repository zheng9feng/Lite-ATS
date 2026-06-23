import { clearCookies } from '@/test-utils/cookies'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { setCookie } from '@/lib/cookies'
import { LanguageProvider } from '@/context/language-provider'
import { SidebarProvider } from '@/components/ui/sidebar'
import { Dashboard } from './index'

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
vi.mock('./components/analytics-chart', () => ({
  AnalyticsChart: () => <div>Analytics chart</div>,
}))
vi.mock('./components/overview', () => ({
  Overview: () => <div>Overview chart</div>,
}))
vi.mock('./components/recent-sales', () => ({
  RecentSales: () => <div>Recent sales list</div>,
}))

async function renderDashboard() {
  return await render(
    <LanguageProvider>
      <SidebarProvider>
        <Dashboard />
      </SidebarProvider>
    </LanguageProvider>
  )
}

describe('Dashboard i18n', () => {
  beforeEach(() => {
    clearCookies()
  })

  it('renders dashboard overview text in Chinese by default', async () => {
    const { getByRole, getByText } = await renderDashboard()

    await expect
      .element(getByRole('heading', { name: '仪表盘' }))
      .toBeInTheDocument()
    await expect
      .element(getByRole('button', { name: '下载' }))
      .toBeInTheDocument()
    await expect.element(getByRole('tab', { name: '概览' })).toBeInTheDocument()
    await expect.element(getByRole('tab', { name: '分析' })).toBeInTheDocument()
    await expect.element(getByText('总收入')).toBeInTheDocument()
    await expect.element(getByText('+20.1% 较上月')).toBeInTheDocument()
    await expect.element(getByText('订阅数')).toBeInTheDocument()
    await expect.element(getByText('销售额')).toBeInTheDocument()
    await expect.element(getByText('当前在线')).toBeInTheDocument()
    await expect.element(getByText('最近销售')).toBeInTheDocument()
    await expect.element(getByText('本月完成 265 笔销售。')).toBeInTheDocument()
  })

  it('renders dashboard analytics text in Chinese by default', async () => {
    const { getByRole, getByText } = await renderDashboard()

    await userEvent.click(getByRole('tab', { name: '分析' }))

    await expect.element(getByText('流量概览')).toBeInTheDocument()
    await expect.element(getByText('每周点击量和独立访客')).toBeInTheDocument()
    await expect.element(getByText('总点击量')).toBeInTheDocument()
    await expect.element(getByText('+12.4% 较上周')).toBeInTheDocument()
    await expect.element(getByText('唯一访客')).toBeInTheDocument()
    await expect.element(getByText('跳出率')).toBeInTheDocument()
    await expect.element(getByText('平均会话')).toBeInTheDocument()
    await expect.element(getByText(/^来源$/)).toBeInTheDocument()
    await expect.element(getByText('带来流量的主要来源')).toBeInTheDocument()
    await expect.element(getByText('设备')).toBeInTheDocument()
    await expect.element(getByText('用户访问应用的方式')).toBeInTheDocument()
  })

  it('renders dashboard text in English when English is persisted', async () => {
    setCookie('app_locale', 'en')

    const { getByRole, getByText } = await renderDashboard()

    await expect
      .element(getByRole('heading', { name: 'Dashboard' }))
      .toBeInTheDocument()
    await expect
      .element(getByRole('button', { name: 'Download' }))
      .toBeInTheDocument()
    await expect.element(getByText('Total Revenue')).toBeInTheDocument()
    await expect
      .element(getByText('+20.1% from last month'))
      .toBeInTheDocument()
  })
})
