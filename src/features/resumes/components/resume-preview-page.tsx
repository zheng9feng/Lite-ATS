import { useState, type FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { FileText, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { type ResumeApplicant, useResumeStore } from '../data/resume-store'

type ResumeQuery = {
  email: string
  name: string
  positionApplied: string
}

const emptyQuery: ResumeQuery = {
  email: '',
  name: '',
  positionApplied: '',
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`

  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function normalize(value: string) {
  return value.trim().toLowerCase()
}

function hasApplicantQuery(query: ResumeQuery) {
  return Object.values(query).some((value) => normalize(value).length > 0)
}

function fieldMatches(queryValue: string, applicantValue: string) {
  const normalizedQuery = normalize(queryValue)

  return (
    normalizedQuery.length > 0 &&
    normalize(applicantValue).includes(normalizedQuery)
  )
}

function applicantMatchesQuery(applicant: ResumeApplicant, query: ResumeQuery) {
  return (
    fieldMatches(query.name, applicant.name) ||
    fieldMatches(query.email, applicant.email) ||
    fieldMatches(query.positionApplied, applicant.positionApplied)
  )
}

export function ResumePreviewPage() {
  const resume = useResumeStore((state) => state.resume)
  const [query, setQuery] = useState<ResumeQuery>(emptyQuery)
  const [submittedQuery, setSubmittedQuery] = useState<ResumeQuery | null>(null)

  const hasSubmittedQuery = submittedQuery
    ? hasApplicantQuery(submittedQuery)
    : false
  const matchingResume =
    resume &&
    submittedQuery &&
    hasSubmittedQuery &&
    applicantMatchesQuery(resume.applicant, submittedQuery)
      ? resume
      : null
  const showNoMatch =
    resume && submittedQuery && hasSubmittedQuery && !matchingResume
  const showSearchPrompt = resume && !matchingResume && !showNoMatch

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmittedQuery(query)
  }

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>
              Resume Preview
            </h2>
            <p className='text-muted-foreground'>
              Preview the latest PDF resume uploaded in this browser session.
            </p>
          </div>
          <Button asChild variant='outline'>
            <Link to='/resumes/upload'>
              <Upload />
              Upload another resume
            </Link>
          </Button>
        </div>

        {resume ? (
          <Card className='max-w-4xl'>
            <CardHeader>
              <CardTitle>Find Applicant Resume</CardTitle>
              <CardDescription>
                Enter any applicant detail to search by partial name, email, or
                position applied for.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className='grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto]'
                onSubmit={handleSearch}
              >
                <div className='space-y-2'>
                  <Label htmlFor='resume-query-name'>Name</Label>
                  <Input
                    id='resume-query-name'
                    placeholder='Applicant name'
                    value={query.name}
                    onChange={(event) =>
                      setQuery((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='resume-query-email'>Email</Label>
                  <Input
                    id='resume-query-email'
                    placeholder='applicant@example.com'
                    type='email'
                    value={query.email}
                    onChange={(event) =>
                      setQuery((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='resume-query-position'>
                    Position applied for
                  </Label>
                  <Input
                    id='resume-query-position'
                    placeholder='Frontend Engineer'
                    value={query.positionApplied}
                    onChange={(event) =>
                      setQuery((current) => ({
                        ...current,
                        positionApplied: event.target.value,
                      }))
                    }
                  />
                </div>
                <Button className='self-end' type='submit'>
                  Search
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : null}

        {matchingResume ? (
          <Card className='min-h-[calc(100vh-14rem)]'>
            <CardHeader>
              <div className='flex items-start gap-3'>
                <div className='flex size-10 items-center justify-center rounded-md bg-muted'>
                  <FileText className='size-5' />
                </div>
                <div>
                  <CardTitle>{matchingResume.fileName}</CardTitle>
                  <CardDescription>
                    {formatFileSize(matchingResume.fileSize)} ·{' '}
                    {matchingResume.fileType}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className='min-h-[calc(100vh-22rem)] space-y-4'>
              <div className='grid gap-3 rounded-md border bg-muted/40 p-4 text-sm sm:grid-cols-3'>
                <div>
                  <p className='font-medium'>Name</p>
                  <p className='text-muted-foreground'>
                    {matchingResume.applicant.name}
                  </p>
                </div>
                <div>
                  <p className='font-medium'>Email</p>
                  <p className='text-muted-foreground'>
                    {matchingResume.applicant.email}
                  </p>
                </div>
                <div>
                  <p className='font-medium'>Position applied for</p>
                  <p className='text-muted-foreground'>
                    {matchingResume.applicant.positionApplied}
                  </p>
                </div>
              </div>
              <iframe
                aria-label={`Resume preview for ${matchingResume.fileName}`}
                className='min-h-[32rem] w-full rounded-md border bg-muted'
                src={matchingResume.objectUrl}
                title={`Resume preview for ${matchingResume.fileName}`}
              />
            </CardContent>
          </Card>
        ) : showNoMatch ? (
          <Card className='max-w-2xl'>
            <CardHeader>
              <CardTitle>No matching resume found</CardTitle>
              <CardDescription>
                Try a different applicant name, email, or position applied for.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant='outline'>
                <Link to='/resumes/upload'>Upload another resume</Link>
              </Button>
            </CardContent>
          </Card>
        ) : showSearchPrompt ? (
          <Card className='max-w-2xl'>
            <CardHeader>
              <CardTitle>Search for a resume to preview</CardTitle>
              <CardDescription>
                Enter at least one applicant detail above to look up the latest
                uploaded resume.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Card className='max-w-2xl'>
            <CardHeader>
              <CardTitle>No resume ready to preview</CardTitle>
              <CardDescription>
                Upload a PDF resume first, then return here to preview it
                online.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to='/resumes/upload'>Upload a resume</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </Main>
    </>
  )
}
