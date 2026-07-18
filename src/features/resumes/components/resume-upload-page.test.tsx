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
const uploadResumeBatch = vi.fn()

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

vi.mock('../data/resume-api', () => ({
  uploadResumeBatch: (...args: unknown[]) => uploadResumeBatch(...args),
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

  it('shows validation when submitting an empty form', async () => {
    const { getByLabelText, getByRole, getByText } =
      await renderResumeUploadPage()

    await expect.element(getByLabelText('姓名')).not.toBeInTheDocument()
    await expect.element(getByLabelText('邮箱')).not.toBeInTheDocument()
    await expect.element(getByLabelText('申请职位')).not.toBeInTheDocument()
    await expect
      .element(getByText(/申请人姓名将从 PDF 文件名生成/))
      .toBeInTheDocument()

    await userEvent.click(getByRole('button', { name: /^上传并预览$/i }))

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
    uploadResumeBatch.mockResolvedValueOnce([
      {
        applicant: {
          email: 'candidate@bulk-upload.local',
          name: 'candidate',
          positionApplied: '',
        },
        fileName: 'candidate.pdf',
        fileSize: 6,
        fileType: 'application/pdf',
        id: 'resume-1',
        previewUrl: 'http://localhost:3001/api/resumes/resume-1/file',
        uploadedAt: '2026-06-21T08:00:00.000Z',
      },
    ])
    const file = new File(['resume'], 'candidate.pdf', {
      type: 'application/pdf',
    })
    const { getByLabelText, getByRole } = await renderResumeUploadPage()

    await userEvent.upload(getByLabelText('简历文件'), file)
    await userEvent.click(getByRole('button', { name: /^上传并预览$/i }))

    expect(useResumeStore.getState().resumes).toHaveLength(1)
    expect(uploadResumeBatch).toHaveBeenCalledWith({
      files: [file],
    })
    expect(useResumeStore.getState().resumes[0]).toEqual({
      applicant: {
        email: 'candidate@bulk-upload.local',
        name: 'candidate',
        positionApplied: '',
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

  it('accepts resume files dropped on the upload area', async () => {
    const ava = new File(['resume'], 'ava.pdf', {
      type: 'application/pdf',
    })
    const ben = new File(['resume'], 'ben.pdf', {
      type: 'application/pdf',
    })
    const { getByLabelText, getByText } = await renderResumeUploadPage()
    const dropzone = document.querySelector<HTMLElement>(
      '[data-slot="resume-file-dropzone"]'
    )
    const dataTransfer = new DataTransfer()

    dataTransfer.items.add(ava)
    dataTransfer.items.add(ben)
    Object.defineProperty(dataTransfer, 'types', { value: [] })
    dropzone?.dispatchEvent(
      new DragEvent('dragenter', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      })
    )

    await expect.element(getByText('松开以上传文件')).toBeInTheDocument()

    dropzone?.dispatchEvent(
      new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      })
    )

    await expect.element(getByText('已选择 2 个文件')).toBeInTheDocument()
    await expect.element(getByLabelText('姓名')).not.toBeInTheDocument()
    await expect.element(getByLabelText('邮箱')).not.toBeInTheDocument()
    await expect.element(getByLabelText('申请职位')).not.toBeInTheDocument()
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
    uploadResumeBatch.mockResolvedValueOnce([
      {
        applicant: {
          email: 'new-candidate@bulk-upload.local',
          name: 'new-candidate',
          positionApplied: '',
        },
        fileName: 'new-candidate.pdf',
        fileSize: 6,
        fileType: 'application/pdf',
        id: 'new-resume',
        previewUrl: 'http://localhost:3001/api/resumes/new-resume/file',
        uploadedAt: '2026-06-21T08:00:00.000Z',
      },
    ])
    const file = new File(['resume'], 'new-candidate.pdf', {
      type: 'application/pdf',
    })
    const { getByLabelText, getByRole } = await renderResumeUploadPage()

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

    expect(uploadResumeBatch).toHaveBeenCalledWith({
      files: [ava, ben],
    })
    expect(useResumeStore.getState().resumes).toHaveLength(2)
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

    await userEvent.upload(getByLabelText('简历文件'), [archive, pdf])
    await userEvent.click(getByRole('button', { name: /^上传并预览$/i }))

    await expect
      .element(getByText('请只选择 PDF 文件，或只选择一个 ZIP 压缩包。'))
      .toBeInTheDocument()
    expect(uploadResumeBatch).not.toHaveBeenCalled()
  })
})
