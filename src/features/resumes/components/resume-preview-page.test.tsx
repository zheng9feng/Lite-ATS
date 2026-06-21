import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { DirectionProvider } from '@/context/direction-provider'
import { LayoutProvider } from '@/context/layout-provider'
import { ThemeProvider } from '@/context/theme-provider'
import { SidebarProvider } from '@/components/ui/sidebar'
import { useResumeStore } from '../data/resume-store'
import { ResumePreviewPage } from './resume-preview-page'

const createResumeShareLink = vi.fn()
const deleteResume = vi.fn()
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
  listResumes: (...args: unknown[]) => listResumes(...args),
  updateResume: (...args: unknown[]) => updateResume(...args),
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
      <ThemeProvider>
        <LayoutProvider>
          <SidebarProvider>
            <ResumePreviewPage />
          </SidebarProvider>
        </LayoutProvider>
      </ThemeProvider>
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
  const open = vi.fn()
  const writeText = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
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
    deleteResume.mockResolvedValue(undefined)
    updateResume.mockImplementation(async (payload) => ({
      ...createStoredResume(1),
      applicant: payload.applicant,
      fileName: payload.file?.name ?? 'candidate-1.pdf',
      fileSize: payload.file?.size ?? 1024,
    }))
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

    await expect
      .element(getByText('No resume ready to preview'))
      .toBeInTheDocument()
    await expect
      .element(getByRole('link', { name: /Upload a resume/i }))
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

    await expect.element(getByText(/^Applicant$/)).toBeInTheDocument()
    await expect.element(getByText(/^Resume file$/)).toBeInTheDocument()
    await expect.element(getByText(/^Candidate 1$/)).toBeInTheDocument()
    await expect
      .element(getByText('candidate1@example.com'))
      .toBeInTheDocument()
    await expect.element(getByText('Frontend Engineer')).toBeInTheDocument()
    await expect.element(getByText('candidate-1.pdf')).toBeInTheDocument()
    await expect.element(getByText(/^Candidate 2$/)).toBeInTheDocument()
    await expect
      .element(getByText('candidate2@example.com'))
      .toBeInTheDocument()
    await expect.element(getByText('Designer')).toBeInTheDocument()
    await expect.element(getByText('candidate-2.pdf')).toBeInTheDocument()
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

  it('opens the selected resume in a new browser tab', async () => {
    useResumeStore.setState({
      resumes: [createStoredResume(1)],
    })

    const { getByRole } = await renderResumePreviewPage()

    await userEvent.click(
      getByRole('button', { name: /Preview resume for Candidate 1/i })
    )

    expect(open).toHaveBeenCalledWith(
      'http://localhost:3001/api/resumes/resume-1/file',
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
      getByRole('button', { name: /Share resume for Candidate 1/i })
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

    const { getByLabelText, getByRole, getByText } =
      await renderResumePreviewPage()

    await userEvent.click(
      getByRole('button', { name: /Edit resume for Candidate 1/i })
    )
    await userEvent.fill(getByLabelText('Name'), 'Updated Candidate')
    await userEvent.fill(getByLabelText('Email'), 'updated@example.com')
    await userEvent.fill(
      getByLabelText('Position applied for'),
      'Product Engineer'
    )
    await userEvent.upload(getByLabelText('Replacement PDF'), file)
    await userEvent.click(getByRole('button', { name: /Save changes/i }))

    await vi.waitFor(() =>
      expect(updateResume).toHaveBeenCalledWith({
        applicant: {
          email: 'updated@example.com',
          name: 'Updated Candidate',
          positionApplied: 'Product Engineer',
        },
        file,
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
      getByRole('button', { name: /Delete resume for Candidate 1/i })
    )
    await expect
      .element(getByText(/This will permanently delete candidate-1.pdf/i))
      .toBeInTheDocument()

    await userEvent.fill(
      getByLabelText('Applicant email:'),
      'candidate1@example.com'
    )
    await userEvent.click(getByRole('button', { name: /^Delete$/i }))

    await vi.waitFor(() =>
      expect(deleteResume).toHaveBeenCalledWith('resume-1')
    )
    await expect
      .element(getByText('No resume ready to preview'))
      .toBeInTheDocument()
    expect(useResumeStore.getState().resumes).toEqual([])
  })
})
