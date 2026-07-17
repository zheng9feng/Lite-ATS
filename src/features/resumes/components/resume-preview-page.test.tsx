import { format, subDays } from 'date-fns'
import { zhCN } from 'react-day-picker/locale'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { useAuthStore } from '@/stores/auth-store'
import { DirectionProvider } from '@/context/direction-provider'
import { LanguageProvider } from '@/context/language-provider'
import { LayoutProvider } from '@/context/layout-provider'
import { ThemeProvider } from '@/context/theme-provider'
import { SidebarProvider } from '@/components/ui/sidebar'
import { useResumeStore } from '../data/resume-store'
import { ResumePreviewPage } from './resume-preview-page'

const createResumeShareLink = vi.fn()
const deleteResume = vi.fn()
const fetchResumeFile = vi.fn()
const listActiveJobPositions = vi.fn()
const listResumes = vi.fn()
const updateResume = vi.fn()

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

vi.mock('../data/resume-api', () => ({
  createResumeShareLink: (...args: unknown[]) => createResumeShareLink(...args),
  deleteResume: (...args: unknown[]) => deleteResume(...args),
  fetchResumeFile: (...args: unknown[]) => fetchResumeFile(...args),
  listResumes: (...args: unknown[]) => listResumes(...args),
  updateResume: (...args: unknown[]) => updateResume(...args),
}))

vi.mock('@/features/job-positions/data/job-positions-api', () => ({
  listActiveJobPositions: (...args: unknown[]) =>
    listActiveJobPositions(...args),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

vi.mock('@/components/config-drawer', () => ({
  ConfigDrawer: () => <div />,
}))
vi.mock('@/components/profile-dropdown', () => ({
  ProfileDropdown: () => <div />,
}))
vi.mock('@/components/search', () => ({
  Search: () => <button type='button'>Global search</button>,
}))
vi.mock('@/components/theme-switch', () => ({
  ThemeSwitch: () => <button type='button'>Toggle theme</button>,
}))

function renderResumePreviewPage() {
  return render(
    <DirectionProvider>
      <LanguageProvider>
        <ThemeProvider>
          <LayoutProvider>
            <SidebarProvider>
              <ResumePreviewPage />
            </SidebarProvider>
          </LayoutProvider>
        </ThemeProvider>
      </LanguageProvider>
    </DirectionProvider>
  )
}

function createStoredResume(index: number) {
  return {
    applicant: {
      email: `candidate${index}@example.com`,
      name: `Candidate ${index}`,
      positionApplied: index % 2 === 0 ? 'Designer' : 'Frontend Engineer',
    },
    fileName: `candidate-${index}.pdf`,
    fileSize: 1024 * index,
    fileType: 'application/pdf',
    id: `resume-${index}`,
    previewUrl: `http://localhost:3001/api/resumes/resume-${index}/file`,
    uploadedAt: `2026-06-${String(index).padStart(2, '0')}T08:00:00.000Z`,
  }
}

describe('ResumePreviewPage', () => {
  const createObjectURL = vi.fn()
  const open = vi.fn()
  const revokeObjectURL = vi.fn()
  const writeText = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    })
    Object.defineProperty(window, 'open', {
      configurable: true,
      value: open,
    })
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText,
      },
    })
    createResumeShareLink.mockResolvedValue({
      expiresAt: '2026-06-21T09:00:00.000Z',
      shareUrl: 'http://localhost:3001/api/resume-shares/share-token',
      token: 'share-token',
    })
    createObjectURL.mockReturnValue('blob:http://localhost/resume-1')
    fetchResumeFile.mockResolvedValue(
      new Blob(['pdf'], { type: 'application/pdf' })
    )
    listActiveJobPositions.mockResolvedValue([
      {
        createdAt: '2026-06-25T08:00:00.000Z',
        department: 'Engineering',
        description: '',
        id: 'job-frontend',
        location: 'Remote',
        status: 'active',
        title: 'Frontend Engineer',
        updatedAt: '2026-06-25T08:00:00.000Z',
      },
      {
        createdAt: '2026-06-25T08:00:00.000Z',
        department: 'Product',
        description: '',
        id: 'job-product',
        location: 'Shanghai',
        status: 'active',
        title: 'Product Engineer',
        updatedAt: '2026-06-25T08:00:00.000Z',
      },
    ])
    deleteResume.mockResolvedValue(undefined)
    updateResume.mockImplementation(async (payload) => ({
      ...createStoredResume(1),
      applicant: payload.applicant,
      fileName: payload.file?.name ?? 'candidate-1.pdf',
      fileSize: payload.file?.size ?? 1024,
      jobPositionId: payload.jobPositionId,
    }))
    useAuthStore.getState().auth.setAuthSnapshot({
      permissions: [
        'resumes:read',
        'resumes:create',
        'resumes:update',
        'resumes:delete',
        'resumes:share',
        'users:manage',
        'rbac:manage',
      ],
      roles: ['admin'],
      sessionToken: 'session-token',
      user: {
        createdAt: '2026-06-23T00:00:00.000Z',
        email: 'admin@example.com',
        id: 'user-admin',
        name: 'Admin User',
        status: 'active',
        updatedAt: '2026-06-23T00:00:00.000Z',
      },
    })
    useResumeStore.setState({ resumes: [] })
    listResumes.mockImplementation(
      async () => useResumeStore.getState().resumes
    )
  })

  it('loads stored resumes from the API', async () => {
    listResumes.mockResolvedValue([createStoredResume(1)])

    const { getByText } = await renderResumePreviewPage()

    await expect.element(getByText(/^Candidate 1$/)).toBeInTheDocument()
    expect(listResumes).toHaveBeenCalledOnce()
    expect(useResumeStore.getState().resumes).toHaveLength(1)
  })

  it('shows an empty state when no resumes have been uploaded', async () => {
    const { getByRole, getByText } = await renderResumePreviewPage()

    await expect.element(getByText('暂无可预览的简历')).toBeInTheDocument()
    await expect
      .element(getByRole('link', { name: '上传简历', exact: true }))
      .toHaveAttribute('href', '/resumes/upload')
  })

  it('shows an error toast when stored resumes cannot load', async () => {
    const { toast } = await import('sonner')
    listResumes.mockRejectedValue(new Error('Unable to list resumes.'))

    await renderResumePreviewPage()

    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Unable to list resumes.')
    )
  })

  it('renders uploaded applicants in a paginated table', async () => {
    useResumeStore.setState({
      resumes: [createStoredResume(1), createStoredResume(2)],
    })

    const { getByText } = await renderResumePreviewPage()

    await expect.element(getByText(/^申请人$/)).toBeInTheDocument()
    await expect.element(getByText(/^操作$/)).toBeInTheDocument()
    await expect.element(getByText(/^简历文件$/)).not.toBeInTheDocument()
    await expect.element(getByText(/^Candidate 1$/)).toBeInTheDocument()
    await expect
      .element(getByText('candidate1@example.com'))
      .toBeInTheDocument()
    await expect.element(getByText('Frontend Engineer')).toBeInTheDocument()
    await expect.element(getByText('2026-06-01')).toBeInTheDocument()
    await expect.element(getByText('candidate-1.pdf')).not.toBeInTheDocument()
    await expect.element(getByText(/^Candidate 2$/)).toBeInTheDocument()
    await expect
      .element(getByText('candidate2@example.com'))
      .toBeInTheDocument()
    await expect.element(getByText('Designer')).toBeInTheDocument()
    await expect.element(getByText('2026-06-02')).toBeInTheDocument()
    await expect.element(getByText('candidate-2.pdf')).not.toBeInTheDocument()
  })

  it('filters resumes by applicant name, position, and upload date', async () => {
    const uploadFilterDate = subDays(new Date(), 1)
    const uploadFilterResume = createStoredResume(3)
    uploadFilterResume.uploadedAt = `${format(uploadFilterDate, 'yyyy-MM-dd')}T08:00:00.000Z`
    useResumeStore.setState({
      resumes: [
        createStoredResume(1),
        createStoredResume(2),
        uploadFilterResume,
      ],
    })

    const { getByLabelText, getByPlaceholder, getByRole, getByText } =
      await renderResumePreviewPage()
    const clearButton = getByRole('button', { name: '清除筛选' })

    await userEvent.fill(
      getByPlaceholder('搜索申请人姓名', { exact: true }),
      'Candidate 2'
    )
    await expect.element(getByText(/^Candidate 2$/)).toBeInTheDocument()
    await expect.element(getByText(/^Candidate 1$/)).not.toBeInTheDocument()

    await userEvent.click(clearButton)
    await userEvent.click(getByRole('combobox', { name: '职位' }))
    await userEvent.click(getByRole('option', { name: 'Designer' }))
    await expect.element(getByText(/^Candidate 2$/)).toBeInTheDocument()
    await expect.element(getByText(/^Candidate 3$/)).not.toBeInTheDocument()

    await userEvent.click(clearButton)
    await expect.element(getByText('年/月/日')).toBeInTheDocument()
    await userEvent.click(getByLabelText('上传日期'))
    await userEvent.click(
      getByRole('button', {
        name: format(uploadFilterDate, 'PPPP', { locale: zhCN }),
      })
    )
    await expect.element(getByText(/^Candidate 3$/)).toBeInTheDocument()
    await expect.element(getByText(/^Candidate 2$/)).not.toBeInTheDocument()

    await userEvent.click(clearButton)
    await expect.element(getByText(/^Candidate 1$/)).toBeInTheDocument()
    await expect.element(getByText(/^Candidate 2$/)).toBeInTheDocument()
    await expect.element(getByText(/^Candidate 3$/)).toBeInTheDocument()
  })

  it('filters empty and reserved position values without crashing', async () => {
    const unassignedResume = createStoredResume(1)
    const allResume = createStoredResume(2)

    unassignedResume.applicant.positionApplied = ''
    allResume.applicant.positionApplied = 'all'
    useResumeStore.setState({ resumes: [unassignedResume, allResume] })

    const { getByRole, getByText } = await renderResumePreviewPage()
    const positionFilter = getByRole('combobox', { name: '职位' })

    await userEvent.click(positionFilter)
    await userEvent.click(getByRole('option', { name: '未分配职位' }))
    await expect.element(getByText(/^Candidate 1$/)).toBeInTheDocument()
    await expect.element(getByText(/^Candidate 2$/)).not.toBeInTheDocument()

    await userEvent.click(positionFilter)
    await userEvent.click(getByRole('option', { name: 'all' }))
    await expect.element(getByText(/^Candidate 2$/)).toBeInTheDocument()
    await expect.element(getByText(/^Candidate 1$/)).not.toBeInTheDocument()
  })

  it('shows a dedicated empty state when filters have no matches', async () => {
    useResumeStore.setState({
      resumes: [createStoredResume(1)],
    })

    const { getByPlaceholder, getByText } = await renderResumePreviewPage()

    await userEvent.fill(
      getByPlaceholder('搜索申请人姓名', { exact: true }),
      'No matching applicant'
    )

    await expect
      .element(getByText('没有符合筛选条件的简历。'))
      .toBeInTheDocument()
    await expect.element(getByText('暂无可预览的简历')).not.toBeInTheDocument()
  })

  it('paginates uploaded applicants', async () => {
    useResumeStore.setState({
      resumes: Array.from({ length: 11 }, (_, index) =>
        createStoredResume(index + 1)
      ),
    })

    const { getByRole, getByText } = await renderResumePreviewPage()

    await expect.element(getByText(/^Candidate 1$/)).toBeInTheDocument()
    await expect.element(getByText(/^Candidate 11$/)).not.toBeInTheDocument()
    await expect
      .element(getByRole('button', { name: /Go to page 2/i }))
      .toBeInTheDocument()

    await userEvent.click(getByRole('button', { name: /Go to next page/i }))

    await expect.element(getByText(/^Candidate 11$/)).toBeInTheDocument()
    await expect
      .element(getByText('candidate11@example.com'))
      .toBeInTheDocument()
    await expect
      .element(getByRole('button', { name: /Go to previous page/i }))
      .toBeEnabled()
  })

  it('opens the selected resume PDF from an authenticated blob URL', async () => {
    useResumeStore.setState({
      resumes: [createStoredResume(1)],
    })

    const { getByRole } = await renderResumePreviewPage()

    await userEvent.click(
      getByRole('button', { name: /预览 Candidate 1 的简历/i })
    )

    await vi.waitFor(() =>
      expect(fetchResumeFile).toHaveBeenCalledWith('resume-1')
    )
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    expect(open).toHaveBeenCalledWith(
      'blob:http://localhost/resume-1',
      '_blank',
      'noopener,noreferrer'
    )
  })

  it('copies a limited-time share link for the selected resume', async () => {
    useResumeStore.setState({
      resumes: [createStoredResume(1)],
    })

    const { getByRole } = await renderResumePreviewPage()

    await userEvent.click(
      getByRole('button', { name: /分享 Candidate 1 的简历/i })
    )

    expect(createResumeShareLink).toHaveBeenCalledWith('resume-1')
    expect(writeText).toHaveBeenCalledWith(
      'http://localhost:3001/api/resume-shares/share-token'
    )
  })

  it('edits applicant metadata and replaces the PDF from the preview table', async () => {
    useResumeStore.setState({
      resumes: [createStoredResume(1)],
    })
    const file = new File(['updated'], 'updated.pdf', {
      type: 'application/pdf',
    })

    const { getByLabelText, getByPlaceholder, getByRole, getByText } =
      await renderResumePreviewPage()

    await userEvent.click(
      getByRole('button', { name: /编辑 Candidate 1 的简历/i })
    )
    await userEvent.fill(
      getByPlaceholder('申请人姓名', { exact: true }),
      'Updated Candidate'
    )
    await userEvent.fill(getByLabelText('邮箱'), 'updated@example.com')
    await userEvent.click(getByRole('combobox', { name: '申请职位' }))
    await userEvent.click(getByRole('option', { name: 'Product Engineer' }))
    await expect
      .element(getByRole('button', { name: /^选择文件$/i }))
      .toBeInTheDocument()
    await expect.element(getByText('未选择文件')).toBeInTheDocument()
    await userEvent.upload(getByLabelText('替换 PDF'), file)
    await expect.element(getByText('updated.pdf')).toBeInTheDocument()
    await userEvent.click(getByRole('button', { name: /保存更改/i }))

    await vi.waitFor(() =>
      expect(updateResume).toHaveBeenCalledWith({
        applicant: {
          email: 'updated@example.com',
          name: 'Updated Candidate',
          positionApplied: 'Product Engineer',
        },
        file,
        jobPositionId: 'job-product',
        resumeId: 'resume-1',
      })
    )
    await expect.element(getByText(/^Updated Candidate$/)).toBeInTheDocument()
    await expect.element(getByText('updated@example.com')).toBeInTheDocument()
    expect(useResumeStore.getState().resumes[0]?.fileName).toBe('updated.pdf')
  })

  it('deletes a resume after confirming the applicant email', async () => {
    useResumeStore.setState({
      resumes: [createStoredResume(1)],
    })

    const { getByLabelText, getByRole, getByText } =
      await renderResumePreviewPage()

    await userEvent.click(
      getByRole('button', { name: /删除 Candidate 1 的简历/i })
    )
    await expect
      .element(getByText(/这将永久删除 candidate-1.pdf/i))
      .toBeInTheDocument()

    await userEvent.fill(
      getByLabelText('申请人邮箱：'),
      'candidate1@example.com'
    )
    await userEvent.click(getByRole('button', { name: /^删除$/i }))

    await vi.waitFor(() =>
      expect(deleteResume).toHaveBeenCalledWith('resume-1')
    )
    await expect.element(getByText('暂无可预览的简历')).toBeInTheDocument()
    expect(useResumeStore.getState().resumes).toEqual([])
  })
})
