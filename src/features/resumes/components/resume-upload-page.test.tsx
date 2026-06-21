import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { DirectionProvider } from '@/context/direction-provider'
import { LayoutProvider } from '@/context/layout-provider'
import { ThemeProvider } from '@/context/theme-provider'
import { SidebarProvider } from '@/components/ui/sidebar'
import { useResumeStore } from '../data/resume-store'
import { ResumeUploadPage } from './resume-upload-page'

const navigate = vi.fn()
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
      <ThemeProvider>
        <LayoutProvider>
          <SidebarProvider>
            <ResumeUploadPage />
          </SidebarProvider>
        </LayoutProvider>
      </ThemeProvider>
    </DirectionProvider>
  )
}

describe('ResumeUploadPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useResumeStore.setState({ resumes: [] })
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

  it('shows validation when submitting an empty form', async () => {
    const { getByRole, getByText } = await renderResumeUploadPage()

    await userEvent.click(
      getByRole('button', { name: /^Upload and preview$/i })
    )

    await expect
      .element(getByText('Please enter the applicant name.'))
      .toBeInTheDocument()
    await expect
      .element(getByText('Please enter a valid email address.'))
      .toBeInTheDocument()
    await expect
      .element(getByText('Please enter the position applied for.'))
      .toBeInTheDocument()
    await expect
      .element(getByText('Please upload a PDF resume.'))
      .toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
    expect(useResumeStore.getState().resumes).toEqual([])
  })

  it('rejects files that are not PDFs', async () => {
    const { getByLabelText, getByRole, getByText } =
      await renderResumeUploadPage()

    await userEvent.type(getByLabelText('Name'), 'Ava Chen')
    await userEvent.type(getByLabelText('Email'), 'ava@example.com')
    await userEvent.type(
      getByLabelText('Position applied for'),
      'Frontend Engineer'
    )
    await userEvent.upload(
      getByLabelText('Resume PDF'),
      new File(['not pdf'], 'resume.txt', { type: 'text/plain' })
    )
    await userEvent.click(
      getByRole('button', { name: /^Upload and preview$/i })
    )

    await expect
      .element(getByText('Please upload a PDF file.'))
      .toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
    expect(useResumeStore.getState().resumes).toEqual([])
  })

  it('adds a PDF resume and navigates to preview', async () => {
    const file = new File(['resume'], 'candidate.pdf', {
      type: 'application/pdf',
    })
    const { getByLabelText, getByRole } = await renderResumeUploadPage()

    await userEvent.type(getByLabelText('Name'), 'Ava Chen')
    await userEvent.type(getByLabelText('Email'), 'ava@example.com')
    await userEvent.type(
      getByLabelText('Position applied for'),
      'Frontend Engineer'
    )
    await userEvent.upload(getByLabelText('Resume PDF'), file)
    await userEvent.click(
      getByRole('button', { name: /^Upload and preview$/i })
    )

    expect(useResumeStore.getState().resumes).toHaveLength(1)
    expect(uploadResume).toHaveBeenCalledWith({
      applicant: {
        email: 'ava@example.com',
        name: 'Ava Chen',
        positionApplied: 'Frontend Engineer',
      },
      file,
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

    await userEvent.type(getByLabelText('Name'), 'New Candidate')
    await userEvent.type(getByLabelText('Email'), 'new@example.com')
    await userEvent.type(
      getByLabelText('Position applied for'),
      'Frontend Engineer'
    )
    await userEvent.upload(getByLabelText('Resume PDF'), file)
    await userEvent.click(
      getByRole('button', { name: /^Upload and preview$/i })
    )

    expect(useResumeStore.getState().resumes).toHaveLength(2)
    expect(
      useResumeStore.getState().resumes.map((resume) => resume.fileName)
    ).toEqual(['existing.pdf', 'new-candidate.pdf'])
    expect(navigate).toHaveBeenCalledWith({ to: '/resumes/preview' })
  })
})
