import { useCallback, useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import {
  type ColumnDef,
  type PaginationState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  AlertTriangle,
  ExternalLink,
  FileText,
  Pencil,
  Share2,
  Trash2,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfigDrawer } from '@/components/config-drawer'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { DataTablePagination } from '@/components/data-table'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  createResumeShareLink,
  deleteResume as deleteResumeRequest,
  listResumes,
  updateResume as updateResumeRequest,
} from '../data/resume-api'
import { type ResumeFile, useResumeStore } from '../data/resume-store'

const editResumeFormSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: 'Please enter a valid email address.' }),
  file: z
    .instanceof(FileList)
    .optional()
    .refine((files) => !files || files.length === 0 || isPdf(files[0]), {
      message: 'Please upload a PDF file.',
    }),
  name: z.string().trim().min(1, {
    message: 'Please enter the applicant name.',
  }),
  positionApplied: z.string().trim().min(1, {
    message: 'Please enter the position applied for.',
  }),
})

type EditResumeForm = z.infer<typeof editResumeFormSchema>

type EditResumePayload = {
  applicant: ResumeFile['applicant']
  file?: File
  resumeId: string
}

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

function isPdf(file?: File) {
  if (!file) return false

  return (
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  )
}

type ResumeEditDialogProps = {
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: EditResumePayload) => Promise<void>
  open: boolean
  resume: ResumeFile
}

function ResumeEditDialog({
  onOpenChange,
  onSubmit,
  open,
  resume,
}: ResumeEditDialogProps) {
  const form = useForm<EditResumeForm>({
    resolver: zodResolver(editResumeFormSchema),
    defaultValues: {
      email: resume.applicant.email,
      file: undefined,
      name: resume.applicant.name,
      positionApplied: resume.applicant.positionApplied,
    },
  })
  const fileRef = form.register('file')
  const isSubmitting = form.formState.isSubmitting

  const handleSubmit = async (values: EditResumeForm) => {
    await onSubmit({
      applicant: {
        email: values.email.trim(),
        name: values.name.trim(),
        positionApplied: values.positionApplied.trim(),
      },
      file: values.file?.[0],
      resumeId: resume.id,
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        form.reset()
        onOpenChange(state)
      }}
    >
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader className='text-start'>
          <DialogTitle>Edit Resume</DialogTitle>
          <DialogDescription>
            Update applicant details or choose a replacement PDF for this
            resume.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id='resume-edit-form'
            className='space-y-4'
            onSubmit={form.handleSubmit(handleSubmit)}
          >
            <div className='grid gap-4 sm:grid-cols-2'>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        autoComplete='name'
                        placeholder='Applicant name'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='email'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        autoComplete='email'
                        placeholder='applicant@example.com'
                        type='email'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name='positionApplied'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Position applied for</FormLabel>
                  <FormControl>
                    <Input placeholder='Frontend Engineer' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='file'
              render={() => (
                <FormItem>
                  <FormLabel>Replacement PDF</FormLabel>
                  <FormControl>
                    <Input
                      type='file'
                      accept='application/pdf,.pdf'
                      {...fileRef}
                      className='cursor-pointer'
                    />
                  </FormControl>
                  <FormDescription>
                    Leave this empty to keep {resume.fileName}.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button disabled={isSubmitting} type='submit' form='resume-edit-form'>
            {isSubmitting ? 'Saving...' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type ResumeDeleteDialogProps = {
  isDeleting: boolean
  onDelete: () => void
  onOpenChange: (open: boolean) => void
  open: boolean
  resume: ResumeFile
}

function ResumeDeleteDialog({
  isDeleting,
  onDelete,
  onOpenChange,
  open,
  resume,
}: ResumeDeleteDialogProps) {
  const [value, setValue] = useState('')
  const expectedEmail = resume.applicant.email

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      form='resume-delete-form'
      disabled={value.trim() !== expectedEmail}
      isLoading={isDeleting}
      title={
        <span className='text-destructive'>
          <AlertTriangle
            className='me-1 inline-block stroke-destructive'
            size={18}
          />{' '}
          Delete Resume
        </span>
      }
      desc={
        <form
          id='resume-delete-form'
          className='space-y-4'
          onSubmit={(event) => {
            event.preventDefault()
            onDelete()
          }}
        >
          <p>
            This will permanently delete {resume.fileName} for{' '}
            <span className='font-bold'>{resume.applicant.name}</span>,
            including the stored PDF and existing share links. This cannot be
            undone.
          </p>

          <Label className='my-2' htmlFor='resume-delete-email'>
            Applicant email:
            <Input
              id='resume-delete-email'
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder='Enter applicant email to confirm deletion.'
              autoFocus
            />
          </Label>

          <Alert variant='destructive'>
            <AlertTitle>Warning!</AlertTitle>
            <AlertDescription>
              Please be careful, this operation can not be rolled back.
            </AlertDescription>
          </Alert>
        </form>
      }
      confirmText={isDeleting ? 'Deleting...' : 'Delete'}
      destructive
    />
  )
}

export function ResumePreviewPage() {
  const resumes = useResumeStore((state) => state.resumes)
  const removeResume = useResumeStore((state) => state.removeResume)
  const setResumes = useResumeStore((state) => state.setResumes)
  const updateStoredResume = useResumeStore((state) => state.updateResume)
  const [deletingResume, setDeletingResume] = useState<ResumeFile | null>(null)
  const [deletingResumeId, setDeletingResumeId] = useState<string | null>(null)
  const [editingResume, setEditingResume] = useState<ResumeFile | null>(null)
  const [isLoadingResumes, setIsLoadingResumes] = useState(true)
  const [sharingResumeId, setSharingResumeId] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  useEffect(() => {
    let isActive = true

    async function loadResumes() {
      try {
        const storedResumes = await listResumes()

        if (isActive) {
          setResumes(storedResumes)
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'Unable to load stored resumes.'
        )
      } finally {
        if (isActive) {
          setIsLoadingResumes(false)
        }
      }
    }

    void loadResumes()

    return () => {
      isActive = false
    }
  }, [setResumes])

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

  const saveResumeChanges = useCallback(
    async ({ applicant, file, resumeId }: EditResumePayload) => {
      try {
        const updatedResume = await updateResumeRequest({
          applicant,
          file,
          resumeId,
        })

        updateStoredResume(updatedResume)
        setEditingResume(null)
        toast.success('Resume updated.')
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Unable to update resume.'
        )
        throw error
      }
    },
    [updateStoredResume]
  )

  const deleteSelectedResume = useCallback(async () => {
    if (!deletingResume) return

    setDeletingResumeId(deletingResume.id)

    try {
      await deleteResumeRequest(deletingResume.id)
      removeResume(deletingResume.id)
      setDeletingResume(null)
      toast.success('Resume deleted.')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Unable to delete resume.'
      )
    } finally {
      setDeletingResumeId(null)
    }
  }, [deletingResume, removeResume])

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
          <div className='flex flex-wrap justify-end gap-2'>
            <Button
              aria-label={`Edit resume for ${row.original.applicant.name}`}
              size='sm'
              type='button'
              variant='outline'
              onClick={() => setEditingResume(row.original)}
            >
              <Pencil />
              Edit
            </Button>
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
            <Button
              aria-label={`Delete resume for ${row.original.applicant.name}`}
              size='sm'
              type='button'
              variant='destructive'
              onClick={() => setDeletingResume(row.original)}
            >
              <Trash2 />
              Delete
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

        {isLoadingResumes && resumes.length === 0 ? (
          <Card className='max-w-2xl'>
            <CardHeader>
              <CardTitle>Loading resumes</CardTitle>
              <CardDescription>
                Checking stored resume metadata.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : resumes.length > 0 ? (
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

      {editingResume ? (
        <ResumeEditDialog
          key={`resume-edit-${editingResume.id}`}
          open={!!editingResume}
          onOpenChange={(open) => {
            if (!open) {
              setEditingResume(null)
            }
          }}
          onSubmit={saveResumeChanges}
          resume={editingResume}
        />
      ) : null}

      {deletingResume ? (
        <ResumeDeleteDialog
          key={`resume-delete-${deletingResume.id}`}
          open={!!deletingResume}
          onOpenChange={(open) => {
            if (!open) {
              setDeletingResume(null)
            }
          }}
          onDelete={() => void deleteSelectedResume()}
          isDeleting={deletingResumeId === deletingResume.id}
          resume={deletingResume}
        />
      ) : null}
    </>
  )
}
