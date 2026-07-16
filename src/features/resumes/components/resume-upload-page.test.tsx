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
const uploadResumeBatch = vi.fn()
const uploadResume = vi.fn()

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

vi.mock('../data/resume-api', () => ({
  uploadResumeBatch: (...args: unknown[]) => uploadResumeBatch(...args),
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
    uploadResumeBatch.mockResolvedValue([
      {
        applicant: {
          email: 'ava@bulk-upload.local',
          name: 'Ava',
          positionApplied: 'Frontend Engineer',
        },
        fileName: 'ava.pdf',
        fileSize: 6,
        fileType: 'application/pdf',
        id: 'resume-1',
        previewUrl: 'http://localhost:3001/api/resumes/resume-1/file',
        uploadedAt: '2026-06-21T08:00:00.000Z',
      },
      {
        applicant: {
          email: 'ben@bulk-upload.local',
          name: 'Ben',
          positionApplied: 'Frontend Engineer',
        },
        fileName: 'ben.pdf',
        fileSize: 6,
        fileType: 'application/pdf',
        id: 'resume-2',
        previewUrl: 'http://localhost:3001/api/resumes/resume-2/file',
        uploadedAt: '2026-06-21T08:01:00.000Z',
      },
    ])
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
    await expect
      .element(getByText('请上传 PDF 简历或 ZIP 压缩包。'))
      .toBeInTheDocument()
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
      getByLabelText('简历文件'),
      new File(['not pdf'], 'resume.txt', { type: 'text/plain' })
    )
    await expect.element(getByText('resume.txt')).toBeInTheDocument()
    await userEvent.click(getByRole('button', { name: /^上传并预览$/i }))

    await expect
      .element(getByText('请只选择 PDF 文件，或只选择一个 ZIP 压缩包。'))
      .toBeInTheDocument()
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
    await userEvent.upload(getByLabelText('简历文件'), file)
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
    await userEvent.upload(getByLabelText('简历文件'), file)
    await userEvent.click(getByRole('button', { name: /^上传并预览$/i }))

    expect(useResumeStore.getState().resumes).toHaveLength(2)
    expect(
      useResumeStore.getState().resumes.map((resume) => resume.fileName)
    ).toEqual(['existing.pdf', 'new-candidate.pdf'])
    expect(navigate).toHaveBeenCalledWith({ to: '/resumes/preview' })
  })

  it('uploads multiple selected PDFs as a batch without applicant fields', async () => {
    const ava = new File(['resume'], 'ava.pdf', {
      type: 'application/pdf',
    })
    const ben = new File(['resume'], 'ben.pdf', {
      type: 'application/pdf',
    })
    const { getByLabelText, getByRole } = await renderResumeUploadPage()

    await userEvent.upload(getByLabelText('简历文件'), [ava, ben])
    await expect.element(getByLabelText('姓名')).not.toBeInTheDocument()
    await expect.element(getByLabelText('邮箱')).not.toBeInTheDocument()
    await userEvent.click(getByRole('button', { name: /^上传并预览$/i }))

    expect(uploadResume).not.toHaveBeenCalled()
    expect(uploadResumeBatch).toHaveBeenCalledWith({
      files: [ava, ben],
    })
    expect(useResumeStore.getState().resumes).toHaveLength(2)
    expect(navigate).toHaveBeenCalledWith({ to: '/resumes/preview' })
  })

  it('uploads multiple selected PDFs with optional position applied text', async () => {
    const ava = new File(['resume'], 'ava.pdf', {
      type: 'application/pdf',
    })
    const ben = new File(['resume'], 'ben.pdf', {
      type: 'application/pdf',
    })
    const { getByLabelText, getByRole } = await renderResumeUploadPage()

    await userEvent.upload(getByLabelText('简历文件'), [ava, ben])
    await userEvent.type(getByLabelText('申请职位'), 'Talent Pool')
    await userEvent.click(getByRole('button', { name: /^上传并预览$/i }))

    expect(uploadResume).not.toHaveBeenCalled()
    expect(uploadResumeBatch).toHaveBeenCalledWith({
      files: [ava, ben],
      positionApplied: 'Talent Pool',
    })
    expect(navigate).toHaveBeenCalledWith({ to: '/resumes/preview' })
  })

  it('uploads one ZIP archive as a batch', async () => {
    uploadResumeBatch.mockResolvedValueOnce([
      {
        applicant: {
          email: 'ava@bulk-upload.local',
          name: 'Ava',
          positionApplied: 'Frontend Engineer',
        },
        fileName: 'ava.pdf',
        fileSize: 6,
        fileType: 'application/pdf',
        id: 'resume-1',
        previewUrl: 'http://localhost:3001/api/resumes/resume-1/file',
        uploadedAt: '2026-06-21T08:00:00.000Z',
      },
    ])
    const archive = new File(['zip'], 'resumes.zip', {
      type: 'application/zip',
    })
    const { getByLabelText, getByRole } = await renderResumeUploadPage()

    await userEvent.upload(getByLabelText('简历文件'), archive)
    await userEvent.click(getByRole('button', { name: /^上传并预览$/i }))

    expect(uploadResumeBatch).toHaveBeenCalledWith({
      files: [archive],
    })
    expect(useResumeStore.getState().resumes).toHaveLength(1)
    expect(navigate).toHaveBeenCalledWith({ to: '/resumes/preview' })
  })

  it('rejects more than twenty selected PDFs', async () => {
    const files = Array.from(
      { length: 21 },
      (_, index) =>
        new File(['resume'], `candidate-${index + 1}.pdf`, {
          type: 'application/pdf',
        })
    )
    const { getByLabelText, getByRole, getByText } =
      await renderResumeUploadPage()

    await selectJobPosition({ getByRole })
    await userEvent.upload(getByLabelText('简历文件'), files)
    await userEvent.click(getByRole('button', { name: /^上传并预览$/i }))

    await expect
      .element(getByText('一次最多上传 20 个简历文件。'))
      .toBeInTheDocument()
    expect(uploadResumeBatch).not.toHaveBeenCalled()
  })

  it('rejects selecting ZIP archives together with PDF files', async () => {
    const pdf = new File(['resume'], 'ava.pdf', {
      type: 'application/pdf',
    })
    const archive = new File(['zip'], 'resumes.zip', {
      type: 'application/zip',
    })
    const { getByLabelText, getByRole, getByText } =
      await renderResumeUploadPage()

    await selectJobPosition({ getByRole })
    await userEvent.upload(getByLabelText('简历文件'), [archive, pdf])
    await userEvent.click(getByRole('button', { name: /^上传并预览$/i }))

    await expect
      .element(getByText('请只选择 PDF 文件，或只选择一个 ZIP 压缩包。'))
      .toBeInTheDocument()
    expect(uploadResumeBatch).not.toHaveBeenCalled()
  })
})
