import { useCallback, useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { format } from 'date-fns'
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
import { useCan } from '@/hooks/use-permission'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ConfigDrawer } from '@/components/config-drawer'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { DataTablePagination } from '@/components/data-table'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { SelectDropdown } from '@/components/select-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  listActiveJobPositions,
  type JobPosition,
} from '@/features/job-positions/data/job-positions-api'
import {
  createResumeShareLink,
  deleteResume as deleteResumeRequest,
  fetchResumeFile,
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
    jobPositionId: z
      .string()
      .trim()
      .min(1, {
        message: t('resumes.form.validation.positionApplied'),
      }),
  })
}

type EditResumeForm = z.infer<ReturnType<typeof createEditResumeFormSchema>>

const ALL_POSITIONS_VALUE = 'all'

type EditResumePayload = {
  applicant: ResumeFile['applicant']
  file?: File
  jobPositionId: string
  resumeId: string
}

function formatUploadedAt(value: string) {
  return format(new Date(value), 'yyyy-MM-dd')
}

function getApplicantInitials(name: string) {
  const parts = name.trim().split(/\s+/)

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()
}

async function openResumePreview(resume: ResumeFile) {
  const file = await fetchResumeFile(resume.id)
  const previewUrl = URL.createObjectURL(file)

  window.open(previewUrl, '_blank', 'noopener,noreferrer')
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
      jobPositionId: resume.jobPositionId ?? '',
      name: resume.applicant.name,
    },
  })
  const [jobPositions, setJobPositions] = useState<JobPosition[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoadingJobPositions, setIsLoadingJobPositions] = useState(true)
  const fileRef = form.register('file')
  const selectedFiles = useWatch({ control: form.control, name: 'file' })
  const selectedFileLabel = selectedFiles?.[0]?.name
  const isSubmitting = form.formState.isSubmitting

  useEffect(() => {
    if (!open) return

    let isCurrent = true

    listActiveJobPositions()
      .then((positions) => {
        if (!isCurrent) return

        setJobPositions(positions)

        if (!form.getValues('jobPositionId')) {
          const currentPosition = positions.find(
            (position) => position.title === resume.applicant.positionApplied
          )

          if (currentPosition) {
            form.setValue('jobPositionId', currentPosition.id)
          }
        }
      })
      .catch((reason: unknown) => {
        if (isCurrent) {
          setIsLoadingJobPositions(false)
          setLoadError(
            reason instanceof Error
              ? reason.message
              : t('jobPositionsPage.api.failed')
          )
        }
      })
      .then(() => {
        if (isCurrent) setIsLoadingJobPositions(false)
      })

    return () => {
      isCurrent = false
    }
  }, [form, open, resume.applicant.positionApplied, t])

  const handleSubmit = async (values: EditResumeForm) => {
    const jobPosition = jobPositions.find(
      (position) => position.id === values.jobPositionId
    )

    if (!jobPosition) {
      throw new Error(t('resumes.form.validation.positionApplied'))
    }

    await onSubmit({
      applicant: {
        email: values.email.trim(),
        name: values.name.trim(),
        positionApplied: jobPosition.title,
      },
      file: values.file?.[0],
      jobPositionId: jobPosition.id,
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
            className='flex flex-col gap-4'
            onSubmit={form.handleSubmit(handleSubmit)}
          >
            {loadError ? (
              <Alert variant='destructive'>
                <AlertDescription>{loadError}</AlertDescription>
              </Alert>
            ) : null}
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
              name='jobPositionId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('resumes.form.positionApplied')}</FormLabel>
                  <SelectDropdown
                    className='w-full'
                    defaultValue={field.value}
                    disabled={isLoadingJobPositions}
                    isControlled
                    isPending={isLoadingJobPositions}
                    items={jobPositions.map((position) => ({
                      label: position.title,
                      value: position.id,
                    }))}
                    onValueChange={field.onChange}
                    placeholder={t('resumes.form.positionPlaceholder')}
                  />
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
                    selectedFileLabel={selectedFileLabel}
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
  const [nameFilter, setNameFilter] = useState('')
  const [positionFilter, setPositionFilter] = useState(ALL_POSITIONS_VALUE)
  const [sharingResumeId, setSharingResumeId] = useState<string | null>(null)
  const [uploadedDateFilter, setUploadedDateFilter] = useState('')
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
    async ({ applicant, file, jobPositionId, resumeId }: EditResumePayload) => {
      try {
        const updatedResume = await updateResumeRequest({
          applicant,
          file,
          jobPositionId,
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

  const positionOptions = useMemo(
    () =>
      Array.from(
        new Set(resumes.map((resume) => resume.applicant.positionApplied))
      ).sort((first, second) => first.localeCompare(second)),
    [resumes]
  )

  const filteredResumes = useMemo(() => {
    const normalizedName = nameFilter.trim().toLocaleLowerCase()

    return resumes.filter((resume) => {
      if (
        normalizedName &&
        !resume.applicant.name.toLocaleLowerCase().includes(normalizedName)
      ) {
        return false
      }

      if (
        positionFilter !== ALL_POSITIONS_VALUE &&
        resume.applicant.positionApplied !== positionFilter
      ) {
        return false
      }

      if (
        uploadedDateFilter &&
        formatUploadedAt(resume.uploadedAt) !== uploadedDateFilter
      ) {
        return false
      }

      return true
    })
  }, [nameFilter, positionFilter, resumes, uploadedDateFilter])

  const hasActiveFilters =
    nameFilter !== '' ||
    positionFilter !== ALL_POSITIONS_VALUE ||
    uploadedDateFilter !== ''

  const resetPagination = () => {
    setPagination((current) => ({ ...current, pageIndex: 0 }))
  }

  const clearFilters = () => {
    setNameFilter('')
    setPositionFilter(ALL_POSITIONS_VALUE)
    setUploadedDateFilter('')
    resetPagination()
  }

  const columns = useMemo<ColumnDef<ResumeFile>[]>(
    () => [
      {
        accessorKey: 'applicant.name',
        header: t('resumes.preview.table.applicant'),
        cell: ({ row }) => (
          <div className='flex min-w-52 items-center gap-3'>
            <Avatar className='size-9'>
              <AvatarFallback>
                <span className='text-xs font-semibold'>
                  {getApplicantInitials(row.original.applicant.name)}
                </span>
              </AvatarFallback>
            </Avatar>
            <div className='min-w-0'>
              <p className='truncate font-medium'>
                {row.original.applicant.name}
              </p>
              <p className='truncate text-sm text-muted-foreground'>
                {row.original.applicant.email}
              </p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'applicant.positionApplied',
        header: t('resumes.preview.table.position'),
        cell: ({ row }) => (
          <Badge variant='secondary'>
            {row.original.applicant.positionApplied}
          </Badge>
        ),
      },
      {
        accessorKey: 'uploadedAt',
        header: t('resumes.preview.table.uploaded'),
        cell: ({ row }) => (
          <time
            className='text-muted-foreground tabular-nums'
            dateTime={row.original.uploadedAt}
          >
            {formatUploadedAt(row.original.uploadedAt)}
          </time>
        ),
      },
      {
        id: 'actions',
        header: () => (
          <span className='block text-end'>
            {t('resumes.preview.table.actions')}
          </span>
        ),
        cell: ({ row }) => (
          <div className='flex justify-end gap-1'>
            {canUpdateResumes ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    aria-label={t('resumes.preview.actions.editForApplicant', {
                      applicantName: row.original.applicant.name,
                    })}
                    size='icon'
                    type='button'
                    variant='ghost'
                    onClick={() => setEditingResume(row.original)}
                  >
                    <Pencil data-icon='inline-start' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {t('resumes.preview.actions.edit')}
                </TooltipContent>
              </Tooltip>
            ) : null}
            {canShareResumes ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    aria-label={t('resumes.preview.actions.shareForApplicant', {
                      applicantName: row.original.applicant.name,
                    })}
                    disabled={sharingResumeId === row.original.id}
                    size='icon'
                    type='button'
                    variant='ghost'
                    onClick={() => void copyShareLink(row.original)}
                  >
                    <Share2 data-icon='inline-start' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {t('resumes.preview.actions.share')}
                </TooltipContent>
              </Tooltip>
            ) : null}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label={t('resumes.preview.actions.previewForApplicant', {
                    applicantName: row.original.applicant.name,
                  })}
                  size='icon'
                  type='button'
                  variant='outline'
                  onClick={() => {
                    void openResumePreview(row.original).catch((error) => {
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : t('resumes.preview.errors.load')
                      )
                    })
                  }}
                >
                  <ExternalLink data-icon='inline-start' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {t('resumes.preview.actions.preview')}
              </TooltipContent>
            </Tooltip>
            {canDeleteResumes ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    aria-label={t(
                      'resumes.preview.actions.deleteForApplicant',
                      {
                        applicantName: row.original.applicant.name,
                      }
                    )}
                    size='icon'
                    type='button'
                    variant='destructive'
                    onClick={() => setDeletingResume(row.original)}
                  >
                    <Trash2 data-icon='inline-start' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {t('resumes.preview.actions.delete')}
                </TooltipContent>
              </Tooltip>
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
      sharingResumeId,
      t,
    ]
  )

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filteredResumes,
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
            <div
              aria-label={t('resumes.preview.filters.label')}
              className='grid gap-3 rounded-xl border bg-card p-4 shadow-xs sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,12rem)_auto]'
              role='search'
            >
              <div className='flex flex-col gap-1.5'>
                <Label htmlFor='resume-name-filter'>
                  {t('resumes.preview.filters.name')}
                </Label>
                <Input
                  id='resume-name-filter'
                  placeholder={t('resumes.preview.filters.namePlaceholder')}
                  value={nameFilter}
                  onChange={(event) => {
                    setNameFilter(event.target.value)
                    resetPagination()
                  }}
                />
              </div>
              <div className='flex flex-col gap-1.5'>
                <Label id='resume-position-filter-label'>
                  {t('resumes.preview.filters.position')}
                </Label>
                <Select
                  value={positionFilter}
                  onValueChange={(value) => {
                    setPositionFilter(value)
                    resetPagination()
                  }}
                >
                  <SelectTrigger
                    aria-labelledby='resume-position-filter-label'
                    className='w-full'
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value={ALL_POSITIONS_VALUE}>
                        {t('resumes.preview.filters.allPositions')}
                      </SelectItem>
                      {positionOptions.map((position) => (
                        <SelectItem key={position} value={position}>
                          {position}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className='flex flex-col gap-1.5'>
                <Label htmlFor='resume-uploaded-date-filter'>
                  {t('resumes.preview.filters.uploadedDate')}
                </Label>
                <Input
                  id='resume-uploaded-date-filter'
                  type='date'
                  value={uploadedDateFilter}
                  onChange={(event) => {
                    setUploadedDateFilter(event.target.value)
                    resetPagination()
                  }}
                />
              </div>
              <Button
                className='self-end'
                disabled={!hasActiveFilters}
                type='button'
                variant='outline'
                onClick={clearFilters}
              >
                {t('resumes.preview.filters.clear')}
              </Button>
            </div>
            <div className='overflow-hidden rounded-xl border bg-card shadow-xs'>
              <Table className='min-w-190'>
                <TableHeader className='bg-muted/40'>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className={
                            header.column.id === 'actions'
                              ? 'h-11 px-4'
                              : 'h-11 px-5'
                          }
                        >
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
                  {table.getRowModel().rows.length > 0 ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id} className='h-18'>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className={
                              cell.column.id === 'actions'
                                ? 'px-4 py-3'
                                : 'px-5 py-3'
                            }
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        className='h-24 text-center text-muted-foreground'
                        colSpan={columns.length}
                      >
                        {t('resumes.preview.filters.noResults')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {filteredResumes.length > 0 ? (
              <DataTablePagination table={table} className='mt-auto' />
            ) : null}
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
