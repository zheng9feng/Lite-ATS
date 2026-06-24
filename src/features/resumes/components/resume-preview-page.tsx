import { useCallback, useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm, useWatch } from 'react-hook-form'
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
import { type TFunction } from 'i18next'
import {
  AlertTriangle,
  ExternalLink,
  FileText,
  Pencil,
  Share2,
  Trash2,
  Upload,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { i18n } from '@/lib/i18n'
import { useLanguage } from '@/context/language-provider'
import { useCan } from '@/hooks/use-permission'
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
import { ResumeFileInput } from './resume-file-input'

function createEditResumeFormSchema(t: TFunction) {
  return z.object({
    email: z
      .string()
      .trim()
      .email({ message: t('resumes.form.validation.email') }),
    file: z
      .instanceof(FileList)
      .optional()
      .refine((files) => !files || files.length === 0 || isPdf(files[0]), {
        message: t('resumes.form.validation.pdfFile'),
      }),
    name: z
      .string()
      .trim()
      .min(1, {
        message: t('resumes.form.validation.applicantName'),
      }),
    positionApplied: z
      .string()
      .trim()
      .min(1, {
        message: t('resumes.form.validation.positionApplied'),
      }),
  })
}

type EditResumeForm = z.infer<ReturnType<typeof createEditResumeFormSchema>>

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

function formatUploadedAt(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
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
  const { t } = useTranslation()
  const editResumeFormSchema = useMemo(() => createEditResumeFormSchema(t), [t])
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
  const selectedFiles = useWatch({ control: form.control, name: 'file' })
  const selectedFileName = selectedFiles?.[0]?.name
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
          <DialogTitle>{t('resumes.preview.edit.title')}</DialogTitle>
          <DialogDescription>
            {t('resumes.preview.edit.description')}
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
                    <FormLabel>{t('resumes.form.applicantName')}</FormLabel>
                    <FormControl>
                      <Input
                        autoComplete='name'
                        placeholder={t('resumes.form.applicantNamePlaceholder')}
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
                    <FormLabel>{t('resumes.form.email')}</FormLabel>
                    <FormControl>
                      <Input
                        autoComplete='email'
                        placeholder={t('resumes.form.emailPlaceholder')}
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
                  <FormLabel>{t('resumes.form.positionApplied')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('resumes.form.positionPlaceholder')}
                      {...field}
                    />
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
                  <FormLabel>{t('resumes.form.replacementPdf')}</FormLabel>
                  <ResumeFileInput
                    accept='application/pdf,.pdf'
                    chooseLabel={t('resumes.form.chooseFile')}
                    noFileLabel={t('resumes.form.noFileChosen')}
                    selectedFileName={selectedFileName}
                    {...fileRef}
                  />
                  <FormDescription>
                    {t('resumes.preview.edit.keepFile', {
                      fileName: resume.fileName,
                    })}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button disabled={isSubmitting} type='submit' form='resume-edit-form'>
            {isSubmitting
              ? t('resumes.preview.edit.saving')
              : t('resumes.preview.edit.submit')}
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
  const { t } = useTranslation()
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
          {t('resumes.delete.title')}
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
            {t('resumes.delete.description', {
              applicantName: resume.applicant.name,
              fileName: resume.fileName,
            })}
          </p>

          <Label className='my-2' htmlFor='resume-delete-email'>
            {t('resumes.delete.confirmEmail')}
            <Input
              id='resume-delete-email'
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={t('resumes.delete.confirmPlaceholder')}
              autoFocus
            />
          </Label>

          <Alert variant='destructive'>
            <AlertTitle>{t('resumes.delete.warningTitle')}</AlertTitle>
            <AlertDescription>
              {t('resumes.delete.warningDescription')}
            </AlertDescription>
          </Alert>
        </form>
      }
      confirmText={
        isDeleting
          ? t('resumes.delete.deleting')
          : t('resumes.preview.actions.delete')
      }
      destructive
    />
  )
}

export function ResumePreviewPage() {
  const { t } = useTranslation()
  const { locale } = useLanguage()
  const resumes = useResumeStore((state) => state.resumes)
  const removeResume = useResumeStore((state) => state.removeResume)
  const setResumes = useResumeStore((state) => state.setResumes)
  const updateStoredResume = useResumeStore((state) => state.updateResume)
  const canCreateResumes = useCan(['resumes:create'])
  const canDeleteResumes = useCan(['resumes:delete'])
  const canShareResumes = useCan(['resumes:share'])
  const canUpdateResumes = useCan(['resumes:update'])
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
            : i18n.t('resumes.preview.errors.load')
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

  const copyShareLink = useCallback(
    async (resume: ResumeFile) => {
      setSharingResumeId(resume.id)

      try {
        const share = await createResumeShareLink(resume.id)
        await navigator.clipboard.writeText(share.shareUrl)
        toast.success(t('resumes.preview.successes.shareCopied'))
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : t('resumes.preview.errors.createShareLink')
        )
      } finally {
        setSharingResumeId(null)
      }
    },
    [t]
  )

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
        toast.success(t('resumes.preview.successes.updated'))
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : t('resumes.preview.errors.update')
        )
        throw error
      }
    },
    [t, updateStoredResume]
  )

  const deleteSelectedResume = useCallback(async () => {
    if (!deletingResume) return

    setDeletingResumeId(deletingResume.id)

    try {
      await deleteResumeRequest(deletingResume.id)
      removeResume(deletingResume.id)
      setDeletingResume(null)
      toast.success(t('resumes.preview.successes.deleted'))
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t('resumes.preview.errors.delete')
      )
    } finally {
      setDeletingResumeId(null)
    }
  }, [deletingResume, removeResume, t])

  const columns = useMemo<ColumnDef<ResumeFile>[]>(
    () => [
      {
        accessorKey: 'applicant.name',
        header: t('resumes.preview.table.applicant'),
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
        header: t('resumes.preview.table.position'),
        cell: ({ row }) => row.original.applicant.positionApplied,
      },
      {
        accessorKey: 'fileName',
        header: t('resumes.preview.table.file'),
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
        header: t('resumes.preview.table.uploaded'),
        cell: ({ row }) => formatUploadedAt(row.original.uploadedAt, locale),
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <div className='flex flex-wrap justify-end gap-2'>
            {canUpdateResumes ? (
              <Button
                aria-label={t('resumes.preview.actions.editForApplicant', {
                  applicantName: row.original.applicant.name,
                })}
                size='sm'
                type='button'
                variant='outline'
                onClick={() => setEditingResume(row.original)}
              >
                <Pencil />
                {t('resumes.preview.actions.edit')}
              </Button>
            ) : null}
            {canShareResumes ? (
              <Button
                aria-label={t('resumes.preview.actions.shareForApplicant', {
                  applicantName: row.original.applicant.name,
                })}
                disabled={sharingResumeId === row.original.id}
                size='sm'
                type='button'
                variant='outline'
                onClick={() => void copyShareLink(row.original)}
              >
                <Share2 />
                {t('resumes.preview.actions.share')}
              </Button>
            ) : null}
            <Button
              aria-label={t('resumes.preview.actions.previewForApplicant', {
                applicantName: row.original.applicant.name,
              })}
              size='sm'
              type='button'
              variant='outline'
              onClick={() => openResumePreview(row.original)}
            >
              <ExternalLink />
              {t('resumes.preview.actions.preview')}
            </Button>
            {canDeleteResumes ? (
              <Button
                aria-label={t('resumes.preview.actions.deleteForApplicant', {
                  applicantName: row.original.applicant.name,
                })}
                size='sm'
                type='button'
                variant='destructive'
                onClick={() => setDeletingResume(row.original)}
              >
                <Trash2 />
                {t('resumes.preview.actions.delete')}
              </Button>
            ) : null}
          </div>
        ),
        enableHiding: false,
      },
    ],
    [
      canDeleteResumes,
      canShareResumes,
      canUpdateResumes,
      copyShareLink,
      locale,
      sharingResumeId,
      t,
    ]
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
              {t('resumes.preview.title')}
            </h2>
            <p className='text-muted-foreground'>
              {t('resumes.preview.subtitle')}
            </p>
          </div>
          {canCreateResumes ? (
            <Button asChild variant='outline'>
              <Link to='/resumes/upload'>
                <Upload />
                {t('resumes.preview.uploadAnother')}
              </Link>
            </Button>
          ) : null}
        </div>

        {isLoadingResumes && resumes.length === 0 ? (
          <Card className='max-w-2xl'>
            <CardHeader>
              <CardTitle>{t('resumes.preview.loading.title')}</CardTitle>
              <CardDescription>
                {t('resumes.preview.loading.description')}
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
                  <CardTitle>{t('resumes.preview.empty.title')}</CardTitle>
                  <CardDescription>
                    {t('resumes.preview.empty.description')}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to='/resumes/upload'>
                  {t('resumes.preview.empty.action')}
                </Link>
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
