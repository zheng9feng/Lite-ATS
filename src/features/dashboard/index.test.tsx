import { clearCookies } from '@/test-utils/cookies'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { useAuthStore } from '@/stores/auth-store'
import { setCookie } from '@/lib/cookies'
import { LanguageProvider } from '@/context/language-provider'
import { SidebarProvider } from '@/components/ui/sidebar'
import { Dashboard } from './index'

const getResumeDashboardSummary = vi.fn()

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

vi.mock('./data/dashboard-api', () => ({
  getResumeDashboardSummary: (...args: unknown[]) =>
    getResumeDashboardSummary(...args),
}))

vi.mock('./components/analytics-chart', () => ({
  AnalyticsChart: () => <div>Monthly upload chart</div>,
}))
vi.mock('./components/overview', () => ({
  Overview: () => <div>Upload trend chart</div>,
}))
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

function renderDashboard() {
  return render(
    <LanguageProvider>
      <SidebarProvider>
        <Dashboard />
      </SidebarProvider>
    </LanguageProvider>
  )
}

function setResumeReadAccess(permissions = ['resumes:create', 'resumes:read']) {
  useAuthStore.getState().auth.setAuthSnapshot({
    permissions,
    roles: ['normal'],
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
}

function createSummary() {
  return {
    latestUploadAt: '2026-06-03T08:00:00.000Z',
    recentResumes: [
      {
        applicant: {
          email: 'ava@example.com',
          name: 'Ava Chen',
          positionApplied: 'Frontend Engineer',
        },
        fileName: 'ava.pdf',
        fileSize: 1536,
        fileType: 'application/pdf',
        id: 'resume-1',
        previewUrl: 'http://localhost:3001/api/resumes/resume-1/file',
        uploadedAt: '2026-06-03T08:00:00.000Z',
      },
      {
        applicant: {
          email: 'ben@example.com',
          name: 'Ben Lee',
          positionApplied: 'Designer',
        },
        fileName: 'ben.pdf',
        fileSize: 2048,
        fileType: 'application/pdf',
        id: 'resume-2',
        previewUrl: 'http://localhost:3001/api/resumes/resume-2/file',
        uploadedAt: '2026-05-12T08:00:00.000Z',
      },
    ],
    topPositions: [
      { count: 2, position: 'Frontend Engineer' },
      { count: 1, position: 'Designer' },
    ],
    totalFileSize: 3584,
    totalResumes: 4,
    uniquePositionCount: 2,
    uploadsByMonth: [
      { count: 1, month: '2026-05' },
      { count: 3, month: '2026-06' },
    ],
  }
}

describe('Dashboard resume summary', () => {
  beforeEach(() => {
    clearCookies()
    vi.clearAllMocks()
    useAuthStore.getState().auth.reset()
    setResumeReadAccess()
    getResumeDashboardSummary.mockResolvedValue(createSummary())
  })

  it('renders resume overview text in Chinese by default', async () => {
    const { getByRole, getByText } = await renderDashboard()

    await expect
      .element(getByRole('heading', { name: '仪表盘' }))
      .toBeInTheDocument()
    await expect
      .element(getByRole('link', { name: '上传简历' }))
      .toHaveAttribute('href', '/resumes/upload')
    await expect.element(getByText('简历总数')).toBeInTheDocument()
    await expect.element(getByText('4')).toBeInTheDocument()
    await expect.element(getByText('存储用量')).toBeInTheDocument()
    await expect.element(getByText('3.5 KB')).toBeInTheDocument()
    await expect
      .element(getByText('申请职位', { exact: true }))
      .toBeInTheDocument()
    await expect.element(getByText('Ava Chen')).toBeInTheDocument()
    await expect.element(getByText('ava@example.com')).toBeInTheDocument()
    expect(getResumeDashboardSummary).toHaveBeenCalled()
  })

  it('hides every upload action when the user has read-only access', async () => {
    setResumeReadAccess(['resumes:read'])

    const { getByRole } = await renderDashboard()

    await expect
      .element(getByRole('link', { name: '上传简历' }))
      .not.toBeInTheDocument()
    await expect
      .element(getByRole('link', { name: '简历上传' }))
      .not.toBeInTheDocument()
    expect(getResumeDashboardSummary).toHaveBeenCalled()
  })

  it('renders resume analytics text in Chinese by default', async () => {
    const { getByRole, getByText } = await renderDashboard()

    await userEvent.click(getByRole('tab', { name: '分析' }))

    await expect.element(getByText('热门职位')).toBeInTheDocument()
    await expect.element(getByText('Frontend Engineer')).toBeInTheDocument()
    await expect.element(getByText('2 份')).toBeInTheDocument()
    await expect.element(getByText('2026-06')).toBeInTheDocument()
    await expect.element(getByText('文件存储')).toBeInTheDocument()
  })

  it('renders resume dashboard text in English when English is persisted', async () => {
    setCookie('app_locale', 'en')

    const { getByRole, getByText } = await renderDashboard()

    await expect
      .element(getByRole('heading', { name: 'Dashboard' }))
      .toBeInTheDocument()
    await expect.element(getByText('Total resumes')).toBeInTheDocument()
    await expect.element(getByText('Storage used')).toBeInTheDocument()
    await expect.element(getByText('Recent uploads')).toBeInTheDocument()
  })

  it('shows a loading state while the summary is loading', async () => {
    getResumeDashboardSummary.mockReturnValue(new Promise(() => undefined))

    const { getByText } = await renderDashboard()

    await expect.element(getByText('正在加载简历仪表盘')).toBeInTheDocument()
  })

  it('shows an empty state when no resumes are stored', async () => {
    getResumeDashboardSummary.mockResolvedValue({
      ...createSummary(),
      latestUploadAt: null,
      recentResumes: [],
      topPositions: [],
      totalFileSize: 0,
      totalResumes: 0,
      uniquePositionCount: 0,
      uploadsByMonth: [],
    })

    const { getByRole, getByText } = await renderDashboard()

    await expect.element(getByText('暂无简历数据')).toBeInTheDocument()
    await expect
      .element(getByRole('link', { name: '上传第一份简历' }))
      .toHaveAttribute('href', '/resumes/upload')
  })

  it('hides the empty-state upload action without create access', async () => {
    setResumeReadAccess(['resumes:read'])
    getResumeDashboardSummary.mockResolvedValue({
      ...createSummary(),
      latestUploadAt: null,
      recentResumes: [],
      topPositions: [],
      totalFileSize: 0,
      totalResumes: 0,
      uniquePositionCount: 0,
      uploadsByMonth: [],
    })

    const { getByRole, getByText } = await renderDashboard()

    await expect.element(getByText('暂无简历数据')).toBeInTheDocument()
    await expect
      .element(getByRole('link', { name: '上传第一份简历' }))
      .not.toBeInTheDocument()
  })

  it('shows an error state when the summary cannot load', async () => {
    getResumeDashboardSummary.mockRejectedValue(
      new Error('Unable to load dashboard summary.')
    )

    const { getByText } = await renderDashboard()

    await expect
      .element(getByText('Unable to load dashboard summary.'))
      .toBeInTheDocument()
  })

  it('does not call the API when the user cannot read resumes', async () => {
    useAuthStore.getState().auth.reset()
    setResumeReadAccess([])

    const { getByText } = await renderDashboard()

    await expect.element(getByText('没有简历访问权限')).toBeInTheDocument()
    expect(getResumeDashboardSummary).not.toHaveBeenCalled()
  })
})
