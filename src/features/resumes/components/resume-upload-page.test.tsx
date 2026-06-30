import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { DirectionProvider } from '@/context/direction-provider'
import { LanguageProvider } from '@/context/language-provider'
import { LayoutProvider } from '@/context/layout-provider'
import { ThemeProvider } from '@/context/theme-provider'
import { SidebarProvider } from '@/components/ui/sidebar'
import { useResumeStore } from '../data/resume-store'
import { ResumeUploadPage } from './resume-upload-page'

const navigate = vi.fn()
const listActiveJobPositions = vi.fn()
const uploadResume = vi.fn()

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

vi.mock('../data/resume-api', () => ({
  uploadResume: (...args: unknown[]) => uploadResume(...args),
}))

vi.mock('@/features/job-positions/data/job-positions-api', () => ({
  listActiveJobPositions: (...args: unknown[]) =>
    listActiveJobPositions(...args),
}))

vi.mock('@/components/config-drawer', () => ({
  ConfigDrawer: () => <div />,
}))
vi.mock('@/components/profile-dropdown', () => ({
  ProfileDropdown: () => <div />,
}))
vi.mock('@/components/search', () => ({
  Search: () => <button type='button'>Search</button>,
}))
vi.mock('@/components/theme-switch', () => ({
  ThemeSwitch: () => <button type='button'>Toggle theme</button>,
}))

function renderResumeUploadPage() {
  return render(
    <DirectionProvider>
      <LanguageProvider>
        <ThemeProvider>
          <LayoutProvider>
            <SidebarProvider>
              <ResumeUploadPage />
            </SidebarProvider>
          </LayoutProvider>
        </ThemeProvider>
      </LanguageProvider>
    </DirectionProvider>
  )
}

describe('ResumeUploadPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useResumeStore.setState({ resumes: [] })
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
    uploadResume.mockResolvedValue({
      applicant: {
        email: 'ava@example.com',
        name: 'Ava Chen',
        positionApplied: 'Frontend Engineer',
      },
      fileName: 'candidate.pdf',
      fileSize: 6,
      fileType: 'application/pdf',
      id: 'resume-1',
      previewUrl: 'http://localhost:3001/api/resumes/resume-1/file',
      uploadedAt: '2026-06-21T08:00:00.000Z',
    })
  })

  async function selectJobPosition(
    screen: Pick<
      Awaited<ReturnType<typeof renderResumeUploadPage>>,
      'getByRole'
    >,
    name = 'Frontend Engineer'
  ) {
    await userEvent.click(screen.getByRole('combobox', { name: '申请职位' }))
    await userEvent.click(screen.getByRole('option', { name }))
  }

  it('shows validation when submitting an empty form', async () => {
    const { getByRole, getByText } = await renderResumeUploadPage()

    await userEvent.click(getByRole('button', { name: /^上传并预览$/i }))

    await expect.element(getByText('请输入申请人姓名。')).toBeInTheDocument()
    await expect
      .element(getByText('请输入有效的邮箱地址。'))
      .toBeInTheDocument()
    await expect.element(getByText('请输入申请职位。')).toBeInTheDocument()
    await expect.element(getByText('请上传 PDF 简历。')).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
    expect(useResumeStore.getState().resumes).toEqual([])
  })

  it('rejects files that are not PDFs', async () => {
    const { getByLabelText, getByRole, getByText } =
      await renderResumeUploadPage()

    await expect
      .element(getByRole('button', { name: /^选择文件$/i }))
      .toBeInTheDocument()
    await expect.element(getByText('未选择文件')).toBeInTheDocument()
    await userEvent.type(getByLabelText('姓名'), 'Ava Chen')
    await userEvent.type(getByLabelText('邮箱'), 'ava@example.com')
    await selectJobPosition({ getByRole })
    await userEvent.upload(
      getByLabelText('简历 PDF'),
      new File(['not pdf'], 'resume.txt', { type: 'text/plain' })
    )
    await expect.element(getByText('resume.txt')).toBeInTheDocument()
    await userEvent.click(getByRole('button', { name: /^上传并预览$/i }))

    await expect.element(getByText('请上传 PDF 文件。')).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
    expect(useResumeStore.getState().resumes).toEqual([])
  })

  it('adds a PDF resume and navigates to preview', async () => {
    const file = new File(['resume'], 'candidate.pdf', {
      type: 'application/pdf',
    })
    const { getByLabelText, getByRole } = await renderResumeUploadPage()

    await userEvent.type(getByLabelText('姓名'), 'Ava Chen')
    await userEvent.type(getByLabelText('邮箱'), 'ava@example.com')
    await selectJobPosition({ getByRole })
    await userEvent.upload(getByLabelText('简历 PDF'), file)
    await userEvent.click(getByRole('button', { name: /^上传并预览$/i }))

    expect(useResumeStore.getState().resumes).toHaveLength(1)
    expect(uploadResume).toHaveBeenCalledWith({
      applicant: {
        email: 'ava@example.com',
        name: 'Ava Chen',
        positionApplied: 'Frontend Engineer',
      },
      file,
      jobPositionId: 'job-frontend',
    })
    expect(useResumeStore.getState().resumes[0]).toEqual({
      applicant: {
        email: 'ava@example.com',
        name: 'Ava Chen',
        positionApplied: 'Frontend Engineer',
      },
      fileName: 'candidate.pdf',
      fileSize: 6,
      fileType: 'application/pdf',
      id: 'resume-1',
      previewUrl: 'http://localhost:3001/api/resumes/resume-1/file',
      uploadedAt: '2026-06-21T08:00:00.000Z',
    })
    expect(navigate).toHaveBeenCalledWith({ to: '/resumes/preview' })
  })

  it('preserves existing uploaded resumes when adding another one', async () => {
    useResumeStore.getState().addResume({
      applicant: {
        email: 'existing@example.com',
        name: 'Existing Candidate',
        positionApplied: 'Designer',
      },
      fileName: 'existing.pdf',
      fileSize: 8,
      fileType: 'application/pdf',
      id: 'existing-resume',
      previewUrl: 'http://localhost:3001/api/resumes/existing-resume/file',
      uploadedAt: '2026-06-21T07:00:00.000Z',
    })
    uploadResume.mockResolvedValueOnce({
      applicant: {
        email: 'new@example.com',
        name: 'New Candidate',
        positionApplied: 'Frontend Engineer',
      },
      fileName: 'new-candidate.pdf',
      fileSize: 6,
      fileType: 'application/pdf',
      id: 'new-resume',
      previewUrl: 'http://localhost:3001/api/resumes/new-resume/file',
      uploadedAt: '2026-06-21T08:00:00.000Z',
    })
    const file = new File(['resume'], 'new-candidate.pdf', {
      type: 'application/pdf',
    })
    const { getByLabelText, getByRole } = await renderResumeUploadPage()

    await userEvent.type(getByLabelText('姓名'), 'New Candidate')
    await userEvent.type(getByLabelText('邮箱'), 'new@example.com')
    await selectJobPosition({ getByRole })
    await userEvent.upload(getByLabelText('简历 PDF'), file)
    await userEvent.click(getByRole('button', { name: /^上传并预览$/i }))

    expect(useResumeStore.getState().resumes).toHaveLength(2)
    expect(
      useResumeStore.getState().resumes.map((resume) => resume.fileName)
    ).toEqual(['existing.pdf', 'new-candidate.pdf'])
    expect(navigate).toHaveBeenCalledWith({ to: '/resumes/preview' })
  })
})
