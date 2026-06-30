import { useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from '@tanstack/react-router'
import {
  BriefcaseBusiness,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useCan } from '@/hooks/use-permission'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
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
import { Textarea } from '@/components/ui/textarea'
import { ConfigDrawer } from '@/components/config-drawer'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  createJobPosition,
  deleteJobPosition,
  type JobPosition,
  type JobPositionStatus,
  updateJobPosition,
} from './data/job-positions-api'

type JobPositionsProps = {
  data: JobPosition[]
}

const formSchema = z.object({
  department: z.string(),
  description: z.string(),
  location: z.string(),
  status: z.union([z.literal('active'), z.literal('inactive')]),
  title: z.string().trim().min(1, 'Job title is required.'),
})

type JobPositionForm = z.infer<typeof formSchema>

function statusLabel(status: JobPositionStatus) {
  return status === 'active' ? 'Active' : 'Inactive'
}

type JobPositionDialogProps = {
  jobPosition?: JobPosition
  onOpenChange: (open: boolean) => void
  onSaved: () => Promise<void>
  open: boolean
}

function JobPositionDialog({
  jobPosition,
  onOpenChange,
  onSaved,
  open,
}: JobPositionDialogProps) {
  const { t } = useTranslation()
  const [error, setError] = useState<string | null>(null)
  const isEdit = Boolean(jobPosition)
  const form = useForm<JobPositionForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      department: jobPosition?.department ?? '',
      description: jobPosition?.description ?? '',
      location: jobPosition?.location ?? '',
      status: jobPosition?.status ?? 'active',
      title: jobPosition?.title ?? '',
    },
  })

  const onSubmit = async (values: JobPositionForm) => {
    setError(null)

    try {
      const payload = {
        department: values.department.trim(),
        description: values.description.trim(),
        location: values.location.trim(),
        status: values.status,
        title: values.title.trim(),
      }

      if (jobPosition) {
        await updateJobPosition(jobPosition.id, payload)
      } else {
        await createJobPosition(payload)
      }

      await onSaved()
      onOpenChange(false)
      form.reset()
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : t('jobPositionsPage.errors.save')
      )
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        setError(null)
        form.reset()
        onOpenChange(state)
      }}
    >
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t('jobPositionsPage.dialog.editTitle')
              : t('jobPositionsPage.dialog.createTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('jobPositionsPage.dialog.description')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id='job-position-form'
            className='flex flex-col gap-4'
            onSubmit={form.handleSubmit(onSubmit)}
          >
            {error ? (
              <Alert variant='destructive'>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <FormField
              control={form.control}
              name='title'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('jobPositionsPage.fields.title')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className='grid gap-4 sm:grid-cols-2'>
              <FormField
                control={form.control}
                name='department'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('jobPositionsPage.fields.department')}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='location'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('jobPositionsPage.fields.location')}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name='status'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('jobPositionsPage.fields.status')}</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) =>
                      field.onChange(value as JobPositionStatus)
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value='active'>
                          {t('jobPositionsPage.status.active')}
                        </SelectItem>
                        <SelectItem value='inactive'>
                          {t('jobPositionsPage.status.inactive')}
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('jobPositionsPage.fields.description')}
                  </FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button
            disabled={form.formState.isSubmitting}
            form='job-position-form'
          >
            {form.formState.isSubmitting
              ? t('jobPositionsPage.actions.saving')
              : t('jobPositionsPage.actions.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type DeleteDialogProps = {
  jobPosition: JobPosition
  onDeleted: () => Promise<void>
  onOpenChange: (open: boolean) => void
  open: boolean
}

function DeleteDialog({
  jobPosition,
  onDeleted,
  onOpenChange,
  open,
}: DeleteDialogProps) {
  const { t } = useTranslation()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)

    try {
      await deleteJobPosition(jobPosition.id)
      await onDeleted()
      onOpenChange(false)
    } catch (reason) {
      toast.error(
        reason instanceof Error
          ? reason.message
          : t('jobPositionsPage.errors.delete')
      )
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      handleConfirm={handleDelete}
      isLoading={isDeleting}
      destructive
      title={t('jobPositionsPage.delete.title')}
      desc={t('jobPositionsPage.delete.description', {
        title: jobPosition.title,
      })}
      confirmText={t('jobPositionsPage.actions.delete')}
    />
  )
}

export function JobPositions({ data }: JobPositionsProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const canManage = useCan(['job-positions:manage'])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | JobPositionStatus>('all')
  const [dialog, setDialog] = useState<'create' | 'edit' | 'delete' | null>(
    null
  )
  const [current, setCurrent] = useState<JobPosition | null>(null)

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return data.filter((jobPosition) => {
      const matchesStatus = status === 'all' || jobPosition.status === status
      const haystack = [
        jobPosition.department,
        jobPosition.location,
        jobPosition.title,
      ]
        .join(' ')
        .toLowerCase()

      return (
        matchesStatus &&
        (!normalizedQuery || haystack.includes(normalizedQuery))
      )
    })
  }, [data, query, status])

  const refresh = () => router.invalidate()

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
              {t('jobPositionsPage.title')}
            </h2>
            <p className='text-muted-foreground'>
              {t('jobPositionsPage.description')}
            </p>
          </div>
          {canManage ? (
            <Button onClick={() => setDialog('create')}>
              <Plus data-icon='inline-start' />
              {t('jobPositionsPage.actions.add')}
            </Button>
          ) : null}
        </div>

        <div className='flex flex-wrap gap-2'>
          <Input
            className='w-full sm:w-72'
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('jobPositionsPage.filters.searchPlaceholder')}
          />
          <Select
            value={status}
            onValueChange={(value) =>
              setStatus(value as 'all' | JobPositionStatus)
            }
          >
            <SelectTrigger className='w-full sm:w-40'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value='all'>
                  {t('jobPositionsPage.filters.allStatuses')}
                </SelectItem>
                <SelectItem value='active'>
                  {t('jobPositionsPage.status.active')}
                </SelectItem>
                <SelectItem value='inactive'>
                  {t('jobPositionsPage.status.inactive')}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className='overflow-hidden rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('jobPositionsPage.columns.title')}</TableHead>
                <TableHead>
                  {t('jobPositionsPage.columns.department')}
                </TableHead>
                <TableHead>{t('jobPositionsPage.columns.location')}</TableHead>
                <TableHead>{t('jobPositionsPage.columns.status')}</TableHead>
                <TableHead className='w-12' />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length ? (
                filtered.map((jobPosition) => (
                  <TableRow key={jobPosition.id}>
                    <TableCell>
                      <div className='flex items-center gap-2'>
                        <BriefcaseBusiness className='text-muted-foreground' />
                        <div>
                          <div className='font-medium'>{jobPosition.title}</div>
                          {jobPosition.description ? (
                            <div className='max-w-96 truncate text-sm text-muted-foreground'>
                              {jobPosition.description}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{jobPosition.department || '-'}</TableCell>
                    <TableCell>{jobPosition.location || '-'}</TableCell>
                    <TableCell>
                      <Badge variant='outline'>
                        {statusLabel(jobPosition.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {canManage ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant='ghost'
                              size='icon'
                              aria-label={t(
                                'jobPositionsPage.actions.openMenu'
                              )}
                            >
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end'>
                            <DropdownMenuGroup>
                              <DropdownMenuItem
                                onClick={() => {
                                  setCurrent(jobPosition)
                                  setDialog('edit')
                                }}
                              >
                                <Pencil />
                                {t('jobPositionsPage.actions.edit')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setCurrent(jobPosition)
                                  setDialog('delete')
                                }}
                              >
                                <Trash2 />
                                {t('jobPositionsPage.actions.delete')}
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className='h-24 text-center'>
                    {t('common.emptyResults')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Main>

      <JobPositionDialog
        key={current?.id ?? 'create-job-position'}
        open={dialog === 'create' || dialog === 'edit'}
        jobPosition={dialog === 'edit' ? (current ?? undefined) : undefined}
        onOpenChange={(open) => {
          setDialog(open ? dialog : null)
          if (!open) setCurrent(null)
        }}
        onSaved={refresh}
      />
      {current ? (
        <DeleteDialog
          open={dialog === 'delete'}
          jobPosition={current}
          onOpenChange={(open) => {
            setDialog(open ? 'delete' : null)
            if (!open) setCurrent(null)
          }}
          onDeleted={refresh}
        />
      ) : null}
    </>
  )
}
