import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { DirectionProvider } from '@/context/direction-provider'
import { LayoutProvider } from '@/context/layout-provider'
import { ThemeProvider } from '@/context/theme-provider'
import { SidebarProvider } from '@/components/ui/sidebar'
import { useResumeStore } from '../data/resume-store'
import { ResumePreviewPage } from './resume-preview-page'

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

describe('ResumePreviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useResumeStore.setState({ resume: null })
  })

  it('shows an empty state when no resume has been uploaded', async () => {
    const { getByRole, getByText } = await renderResumePreviewPage()

    await expect
      .element(getByText('No resume ready to preview'))
      .toBeInTheDocument()
    await expect
      .element(getByRole('link', { name: /Upload a resume/i }))
      .toHaveAttribute('href', '/resumes/upload')
  })

  it('asks for applicant information before showing an active resume', async () => {
    useResumeStore.setState({
      resume: {
        applicant: {
          email: 'ava@example.com',
          name: 'Ava Chen',
          positionApplied: 'Frontend Engineer',
        },
        fileName: 'candidate.pdf',
        fileSize: 1024,
        fileType: 'application/pdf',
        objectUrl: 'blob:active-resume',
      },
    })

    const { getByLabelText, getByText } = await renderResumePreviewPage()

    await expect
      .element(getByText('Search for a resume to preview'))
      .toBeInTheDocument()
    await expect
      .element(getByLabelText('Resume preview for candidate.pdf'))
      .not.toBeInTheDocument()
  })

  it('renders the matching resume metadata and PDF viewer after a partial query', async () => {
    useResumeStore.setState({
      resume: {
        applicant: {
          email: 'ava@example.com',
          name: 'Ava Chen',
          positionApplied: 'Frontend Engineer',
        },
        fileName: 'candidate.pdf',
        fileSize: 1024,
        fileType: 'application/pdf',
        objectUrl: 'blob:active-resume',
      },
    })

    const { getByLabelText, getByRole, getByText } =
      await renderResumePreviewPage()

    await userEvent.type(getByLabelText('Name'), 'ava')
    await userEvent.click(getByRole('button', { name: /^Search$/i }))

    await expect.element(getByText('candidate.pdf')).toBeInTheDocument()
    await expect.element(getByText('Ava Chen')).toBeInTheDocument()
    await expect.element(getByText('ava@example.com')).toBeInTheDocument()
    await expect.element(getByText('Frontend Engineer')).toBeInTheDocument()
    await expect.element(getByText('1 KB')).toBeInTheDocument()
    await expect
      .element(getByLabelText('Resume preview for candidate.pdf'))
      .toHaveAttribute('src', 'blob:active-resume')
  })

  it('shows no match when applicant query fields do not partially match', async () => {
    useResumeStore.setState({
      resume: {
        applicant: {
          email: 'ava@example.com',
          name: 'Ava Chen',
          positionApplied: 'Frontend Engineer',
        },
        fileName: 'candidate.pdf',
        fileSize: 1024,
        fileType: 'application/pdf',
        objectUrl: 'blob:active-resume',
      },
    })

    const { getByLabelText, getByRole, getByText } =
      await renderResumePreviewPage()

    await userEvent.type(getByLabelText('Position applied for'), 'accounting')
    await userEvent.click(getByRole('button', { name: /^Search$/i }))

    await expect
      .element(getByText('No matching resume found'))
      .toBeInTheDocument()
    await expect
      .element(getByLabelText('Resume preview for candidate.pdf'))
      .not.toBeInTheDocument()
  })
})
