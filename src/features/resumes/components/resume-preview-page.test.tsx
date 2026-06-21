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
const listResumes = vi.fn()

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
  listResumes: (...args: unknown[]) => listResumes(...args),
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
})
