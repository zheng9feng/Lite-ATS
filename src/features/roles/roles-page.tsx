import { type FormEvent, useMemo, useState } from 'react'
import { useNavigate, useRouter } from '@tanstack/react-router'
import {
  Ellipsis,
  Info,
  KeyRound,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  createRole,
  deleteRole,
  type RoleDto,
  updateRole,
} from './data/roles-api'

type RolesPageProps = {
  roles: RoleDto[]
}

type RoleFormState =
  | { mode: 'create'; role?: undefined }
  | { mode: 'edit'; role: RoleDto }
  | null

function roleDescription(
  role: RoleDto,
  t: ReturnType<typeof useTranslation>['t']
) {
  return t(`permissionsPage.roles.${role.name}.description`, {
    defaultValue: role.description,
  })
}

export function RolesPage({ roles }: RolesPageProps) {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [formState, setFormState] = useState<RoleFormState>(null)
  const [deleteTarget, setDeleteTarget] = useState<RoleDto | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const filteredRoles = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()

    if (!normalizedQuery) return roles

    return roles.filter((role) =>
      [role.name, role.description, roleDescription(role, t)].some((value) =>
        value.toLocaleLowerCase().includes(normalizedQuery)
      )
    )
  }, [query, roles, t])

  function openCreateDialog() {
    setName('')
    setDescription('')
    setError('')
    setFormState({ mode: 'create' })
  }

  function openEditDialog(role: RoleDto) {
    setName(role.name)
    setDescription(role.description)
    setError('')
    setFormState({ mode: 'edit', role })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!formState) return

    setIsSaving(true)
    setError('')

    try {
      if (formState.mode === 'create') {
        await createRole({ description, name })
        toast.success(t('rolesPage.feedback.created'))
      } else {
        await updateRole(formState.role.id, {
          description,
          name: formState.role.isSystem ? undefined : name,
        })
        toast.success(t('rolesPage.feedback.updated'))
      }

      setFormState(null)
      await router.invalidate()
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : t('rolesPage.api.failed')
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return

    setIsSaving(true)
    setError('')

    try {
      await deleteRole(deleteTarget.id)
      setDeleteTarget(null)
      toast.success(t('rolesPage.feedback.deleted'))
      await router.invalidate()
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : t('rolesPage.api.failed')
      )
    } finally {
      setIsSaving(false)
    }
  }

  function configurePermissions(role: RoleDto) {
    navigate({
      to: '/permissions',
      search: { roleId: role.id },
    })
  }

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(i18n.language),
    [i18n.language]
  )

  return (
    <div className='access-control-theme flex flex-col gap-6'>
      <div className='flex flex-col gap-1'>
        <h2 className='text-2xl font-bold tracking-tight'>
          {t('rolesPage.title')}
        </h2>
        <p className='text-muted-foreground'>{t('rolesPage.description')}</p>
      </div>

      {error ? (
        <Alert variant='destructive'>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <section className='overflow-hidden rounded-xl border bg-card/40'>
        <div className='flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between'>
          <div className='relative w-full sm:max-w-sm'>
            <Search className='pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              aria-label={t('rolesPage.search')}
              className='ps-9'
              placeholder={t('rolesPage.search')}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <Button type='button' onClick={openCreateDialog}>
            <Plus data-icon='inline-start' />
            {t('rolesPage.actions.create')}
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='ps-6'>
                {t('rolesPage.columns.role')}
              </TableHead>
              <TableHead className='hidden md:table-cell'>
                {t('rolesPage.columns.description')}
              </TableHead>
              <TableHead>{t('rolesPage.columns.type')}</TableHead>
              <TableHead>{t('rolesPage.columns.users')}</TableHead>
              <TableHead className='hidden lg:table-cell'>
                {t('rolesPage.columns.updatedAt')}
              </TableHead>
              <TableHead className='w-20 text-end'>
                {t('rolesPage.columns.actions')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRoles.length ? (
              filteredRoles.map((role) => {
                const cannotDelete = role.isSystem || role.userCount > 0
                const deleteReason = role.isSystem
                  ? t('rolesPage.constraints.system')
                  : t('rolesPage.constraints.assigned')

                return (
                  <TableRow key={role.id}>
                    <TableCell className='ps-6 font-medium'>
                      {role.name}
                    </TableCell>
                    <TableCell className='hidden max-w-md whitespace-normal text-muted-foreground md:table-cell'>
                      {roleDescription(role, t)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={role.isSystem ? 'secondary' : 'outline'}>
                        {role.isSystem
                          ? t('rolesPage.types.system')
                          : t('rolesPage.types.custom')}
                      </Badge>
                    </TableCell>
                    <TableCell>{role.userCount}</TableCell>
                    <TableCell className='hidden text-muted-foreground lg:table-cell'>
                      {dateFormatter.format(new Date(role.updatedAt))}
                    </TableCell>
                    <TableCell className='text-end'>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            aria-label={t('rolesPage.actions.openMenu', {
                              role: role.name,
                            })}
                          >
                            <Ellipsis />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end' className='w-44'>
                          <DropdownMenuGroup>
                            <DropdownMenuItem
                              onSelect={() => openEditDialog(role)}
                            >
                              <Pencil />
                              {t('rolesPage.actions.edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => configurePermissions(role)}
                            >
                              <KeyRound />
                              {t('rolesPage.actions.configure')}
                            </DropdownMenuItem>
                            {cannotDelete ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div>
                                    <DropdownMenuItem
                                      disabled
                                      variant='destructive'
                                    >
                                      <Trash2 />
                                      {t('rolesPage.actions.delete')}
                                    </DropdownMenuItem>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side='left'>
                                  {deleteReason}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <DropdownMenuItem
                                variant='destructive'
                                onSelect={() => setDeleteTarget(role)}
                              >
                                <Trash2 />
                                {t('rolesPage.actions.delete')}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className='h-32 text-center text-muted-foreground'
                >
                  {t('rolesPage.empty')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className='flex flex-col gap-3 border-t px-6 py-4 text-sm text-muted-foreground lg:flex-row lg:items-center lg:justify-between'>
          <span>{t('rolesPage.count', { count: filteredRoles.length })}</span>
          <span className='flex items-start gap-2 lg:items-center'>
            <Info className='mt-0.5 size-4 shrink-0 lg:mt-0' />
            {t('rolesPage.constraints.summary')}
          </span>
        </div>
      </section>

      <Dialog
        open={Boolean(formState)}
        onOpenChange={(open) => {
          if (!open && !isSaving) setFormState(null)
        }}
      >
        <DialogContent closeLabel={t('rolesPage.actions.close')}>
          <DialogHeader>
            <DialogTitle>
              {formState?.mode === 'edit'
                ? t('rolesPage.form.editTitle')
                : t('rolesPage.form.createTitle')}
            </DialogTitle>
            <DialogDescription>
              {formState?.mode === 'edit'
                ? t('rolesPage.form.editDescription')
                : t('rolesPage.form.createDescription')}
            </DialogDescription>
          </DialogHeader>
          <form className='flex flex-col gap-5' onSubmit={handleSubmit}>
            <div className='flex flex-col gap-2'>
              <Label htmlFor='role-name'>{t('rolesPage.form.name')}</Label>
              <Input
                id='role-name'
                value={name}
                disabled={formState?.mode === 'edit' && formState.role.isSystem}
                onChange={(event) => setName(event.target.value)}
                required
              />
              {formState?.mode === 'edit' && formState.role.isSystem ? (
                <p className='text-xs text-muted-foreground'>
                  {t('rolesPage.form.systemNameHelp')}
                </p>
              ) : null}
            </div>
            <div className='flex flex-col gap-2'>
              <Label htmlFor='role-description'>
                {t('rolesPage.form.description')}
              </Label>
              <Textarea
                id='role-description'
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                required
              />
            </div>
            {error ? (
              <Alert variant='destructive'>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                disabled={isSaving}
                onClick={() => setFormState(null)}
              >
                {t('rolesPage.actions.cancel')}
              </Button>
              <Button type='submit' disabled={isSaving}>
                {isSaving
                  ? t('rolesPage.actions.saving')
                  : t('rolesPage.actions.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !isSaving) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('rolesPage.delete.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('rolesPage.delete.description', {
                role: deleteTarget?.name ?? '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>
              {t('rolesPage.actions.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction disabled={isSaving} onClick={handleDelete}>
              {t('rolesPage.actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
