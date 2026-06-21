import { useCallback, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  type ColumnDef,
  type PaginationState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ExternalLink, FileText, Share2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfigDrawer } from '@/components/config-drawer'
import { DataTablePagination } from '@/components/data-table'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { createResumeShareLink } from '../data/resume-api'
import { type ResumeFile, useResumeStore } from '../data/resume-store'

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`

  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function formatUploadedAt(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function openResumePreview(resume: ResumeFile) {
  window.open(resume.previewUrl, '_blank', 'noopener,noreferrer')
}

export function ResumePreviewPage() {
  const resumes = useResumeStore((state) => state.resumes)
  const [sharingResumeId, setSharingResumeId] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const copyShareLink = useCallback(async (resume: ResumeFile) => {
    setSharingResumeId(resume.id)

    try {
      const share = await createResumeShareLink(resume.id)
      await navigator.clipboard.writeText(share.shareUrl)
      toast.success('Share link copied to clipboard.')
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Unable to create a share link.'
      )
    } finally {
      setSharingResumeId(null)
    }
  }, [])

  const columns = useMemo<ColumnDef<ResumeFile>[]>(
    () => [
      {
        accessorKey: 'applicant.name',
        header: 'Applicant',
        cell: ({ row }) => (
          <div className='min-w-40'>
            <p className='font-medium'>{row.original.applicant.name}</p>
            <p className='text-sm text-muted-foreground'>
              {row.original.applicant.email}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'applicant.positionApplied',
        header: 'Position applied',
        cell: ({ row }) => row.original.applicant.positionApplied,
      },
      {
        accessorKey: 'fileName',
        header: 'Resume file',
        cell: ({ row }) => (
          <div className='min-w-48'>
            <p className='font-medium'>{row.original.fileName}</p>
            <p className='text-sm text-muted-foreground'>
              {formatFileSize(row.original.fileSize)}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'uploadedAt',
        header: 'Uploaded',
        cell: ({ row }) => formatUploadedAt(row.original.uploadedAt),
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <div className='flex justify-end gap-2'>
            <Button
              aria-label={`Share resume for ${row.original.applicant.name}`}
              disabled={sharingResumeId === row.original.id}
              size='sm'
              type='button'
              variant='outline'
              onClick={() => void copyShareLink(row.original)}
            >
              <Share2 />
              Share
            </Button>
            <Button
              aria-label={`Preview resume for ${row.original.applicant.name}`}
              size='sm'
              type='button'
              variant='outline'
              onClick={() => openResumePreview(row.original)}
            >
              <ExternalLink />
              Preview
            </Button>
          </div>
        ),
        enableHiding: false,
      },
    ],
    [copyShareLink, sharingResumeId]
  )

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: resumes,
    columns,
    state: {
      pagination,
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

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
              Review applicants with uploaded PDF resumes and open each resume
              in a new tab or copy a limited-time share link.
            </p>
          </div>
          <Button asChild variant='outline'>
            <Link to='/resumes/upload'>
              <Upload />
              Upload another resume
            </Link>
          </Button>
        </div>

        {resumes.length > 0 ? (
          <div className='flex flex-1 flex-col gap-4'>
            <div className='overflow-hidden rounded-md border'>
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DataTablePagination table={table} className='mt-auto' />
          </div>
        ) : (
          <Card className='max-w-2xl'>
            <CardHeader>
              <div className='flex items-center gap-3'>
                <div className='flex size-10 items-center justify-center rounded-md bg-muted'>
                  <FileText className='size-5' />
                </div>
                <div>
                  <CardTitle>No resume ready to preview</CardTitle>
                  <CardDescription>
                    Upload a PDF resume first, then return here to preview it
                    online.
                  </CardDescription>
                </div>
              </div>
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
