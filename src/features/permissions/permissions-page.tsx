import { useEffect, useMemo, useState } from 'react'
import {
  Link,
  useBlocker,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { type TFunction } from 'i18next'
import {
  BriefcaseBusiness,
  ChevronDown,
  ChevronRight,
  FileText,
  Info,
  KeyRound,
  LockKeyhole,
  PanelsTopLeft,
  Search,
  Users,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { type AppPermission } from '@/lib/permissions'
import { cn } from '@/lib/utils'
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
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
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
import { Separator } from '@/components/ui/separator'
import {
  type PermissionAssignmentData,
  type PermissionOption,
  type PermissionResourceGroup,
  updateRolePermissions,
} from './data/permissions-api'

type PermissionsPageProps = {
  data: PermissionAssignmentData
  requestedRoleId?: string
}

const resourceIcons = {
  'job-positions': BriefcaseBusiness,
  pages: PanelsTopLeft,
  rbac: KeyRound,
  resumes: FileText,
  users: Users,
} as const

function translatedResource(t: TFunction, resource: string) {
  return t(`permissionsPage.resources.${resource}`, {
    defaultValue: resource,
  })
}

function translatedPermissionLabel(t: TFunction, permission: PermissionOption) {
  return t(
    `permissionsPage.permissionLabels.${permission.resource}.${permission.action}`,
    { defaultValue: permission.action }
  )
}

function translatedPermissionDescription(
  t: TFunction,
  permission: PermissionOption
) {
  return t(
    `permissionsPage.permissionDescriptions.${permission.resource}.${permission.action}`,
    { defaultValue: permission.description }
  )
}

function samePermissions(left: AppPermission[], right: AppPermission[]) {
  if (left.length !== right.length) return false

  const rightSet = new Set(right)
  return left.every((permission) => rightSet.has(permission))
}

function checkboxState(selectedCount: number, totalCount: number) {
  if (selectedCount === 0) return false
  if (selectedCount === totalCount) return true
  return 'indeterminate' as const
}

function permissionMatches(
  permission: PermissionOption,
  query: string,
  t: TFunction
) {
  return [
    permission.name,
    permission.description,
    translatedPermissionLabel(t, permission),
    translatedPermissionDescription(t, permission),
  ].some((value) => value.toLocaleLowerCase().includes(query))
}

export function PermissionsPage({
  data,
  requestedRoleId,
}: PermissionsPageProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const router = useRouter()
  const selectedRole =
    data.roles.find((role) => role.id === requestedRoleId) ?? data.roles[0]
  const [savedPermissions, setSavedPermissions] = useState<AppPermission[]>(
    selectedRole?.permissions ?? []
  )
  const [draftPermissions, setDraftPermissions] = useState<AppPermission[]>(
    selectedRole?.permissions ?? []
  )
  const [query, setQuery] = useState('')
  const [rootOpen, setRootOpen] = useState(true)
  const [expandedResources, setExpandedResources] = useState<Set<string>>(
    () => new Set(data.permissionsByResource.map((group) => group.resource))
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const isDirty = !samePermissions(savedPermissions, draftPermissions)
  const blocker = useBlocker({
    shouldBlockFn: () => isDirty,
    enableBeforeUnload: isDirty,
    withResolver: true,
  })

  useEffect(() => {
    if (!selectedRole || requestedRoleId === selectedRole.id) return

    navigate({
      to: '/permissions',
      search: { roleId: selectedRole.id },
      replace: true,
    })
  }, [navigate, requestedRoleId, selectedRole])

  const normalizedQuery = query.trim().toLocaleLowerCase()
  const visibleGroups = useMemo(() => {
    if (!normalizedQuery) return data.permissionsByResource

    return data.permissionsByResource.flatMap((group) => {
      const resourceMatches = [
        group.resource,
        translatedResource(t, group.resource),
      ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery))
      const permissions = resourceMatches
        ? group.permissions
        : group.permissions.filter((permission) =>
            permissionMatches(permission, normalizedQuery, t)
          )

      return permissions.length ? [{ ...group, permissions }] : []
    })
  }, [data.permissionsByResource, normalizedQuery, t])

  const allPermissions = useMemo(
    () =>
      data.permissionsByResource.flatMap((group) =>
        group.permissions.map((permission) => permission.name)
      ),
    [data.permissionsByResource]
  )
  const selectedSet = useMemo(
    () => new Set(draftPermissions),
    [draftPermissions]
  )
  const lockedPermissions = useMemo(
    () =>
      new Set<AppPermission>(
        selectedRole?.name === 'admin' ? ['rbac:manage'] : []
      ),
    [selectedRole?.name]
  )

  function togglePermission(permission: AppPermission) {
    if (lockedPermissions.has(permission)) return

    setDraftPermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission]
    )
  }

  function togglePermissions(permissions: AppPermission[]) {
    const mutablePermissions = permissions.filter(
      (permission) => !lockedPermissions.has(permission)
    )
    const allMutableSelected = mutablePermissions.every((permission) =>
      selectedSet.has(permission)
    )

    setDraftPermissions((current) => {
      const next = new Set(current)

      for (const permission of mutablePermissions) {
        if (allMutableSelected) next.delete(permission)
        else next.add(permission)
      }

      for (const permission of lockedPermissions) next.add(permission)

      return Array.from(next)
    })
  }

  function setAllExpanded(expanded: boolean) {
    setRootOpen(true)
    setExpandedResources(
      expanded
        ? new Set(data.permissionsByResource.map((group) => group.resource))
        : new Set()
    )
  }

  function changeRole(roleId: string) {
    navigate({
      to: '/permissions',
      search: { roleId },
    })
  }

  async function savePermissions() {
    if (!selectedRole || !isDirty) return

    setIsSaving(true)
    setError('')

    try {
      await updateRolePermissions(selectedRole.id, draftPermissions)
      setSavedPermissions(draftPermissions)
      toast.success(t('permissionsPage.feedback.saved'))
      await router.invalidate()
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : t('permissionsPage.api.failed')
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (!selectedRole) {
    return (
      <div className='access-control-theme flex min-h-96 flex-col items-center justify-center gap-4 rounded-xl border text-center'>
        <div className='flex flex-col gap-1'>
          <h2 className='text-xl font-semibold'>
            {t('permissionsPage.empty.title')}
          </h2>
          <p className='text-sm text-muted-foreground'>
            {t('permissionsPage.empty.description')}
          </p>
        </div>
        <Button asChild>
          <Link to='/roles'>{t('permissionsPage.empty.action')}</Link>
        </Button>
      </div>
    )
  }

  const selectedCount = draftPermissions.length

  return (
    <div className='access-control-theme flex flex-col gap-6'>
      <div className='flex flex-col gap-1'>
        <h2 className='text-2xl font-bold tracking-tight'>
          {t('permissionsPage.title')}
        </h2>
        <p className='text-muted-foreground'>
          {t('permissionsPage.description')}
        </p>
      </div>

      {error ? (
        <Alert variant='destructive'>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className='flex max-w-sm flex-col gap-2'>
        <Label htmlFor='role-select'>{t('permissionsPage.role.label')}</Label>
        <Select value={selectedRole.id} onValueChange={changeRole}>
          <SelectTrigger id='role-select' className='w-full'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {data.roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <p className='text-xs text-muted-foreground'>
          {selectedRole.isSystem
            ? t('permissionsPage.role.systemMeta', {
                count: selectedRole.userCount,
              })
            : t('permissionsPage.role.customMeta', {
                count: selectedRole.userCount,
              })}
        </p>
      </div>

      <Separator />

      <div className='grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]'>
        <section className='min-w-0'>
          <div className='flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between'>
            <div className='relative w-full sm:max-w-xs'>
              <Search className='pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                aria-label={t('permissionsPage.search')}
                className='ps-9'
                placeholder={t('permissionsPage.search')}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div className='flex gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => setAllExpanded(true)}
              >
                {t('permissionsPage.actions.expandAll')}
              </Button>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => setAllExpanded(false)}
              >
                {t('permissionsPage.actions.collapseAll')}
              </Button>
            </div>
          </div>

          <div className='overflow-hidden rounded-lg border bg-card/30'>
            <Collapsible
              open={normalizedQuery ? true : rootOpen}
              onOpenChange={setRootOpen}
            >
              <div className='flex min-h-12 items-center gap-3 border-b px-4'>
                <CollapsibleTrigger asChild>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    aria-label={t('permissionsPage.actions.toggleAll')}
                  >
                    {rootOpen || normalizedQuery ? (
                      <ChevronDown />
                    ) : (
                      <ChevronRight />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <Checkbox
                  aria-label={t('permissionsPage.tree.all')}
                  checked={checkboxState(selectedCount, allPermissions.length)}
                  onCheckedChange={() => togglePermissions(allPermissions)}
                />
                <span className='font-medium'>
                  {t('permissionsPage.tree.all')}
                </span>
                <span className='ms-auto text-sm text-muted-foreground'>
                  {allPermissions.length}
                </span>
              </div>

              <CollapsibleContent>
                {visibleGroups.length ? (
                  visibleGroups.map((group) => (
                    <PermissionGroup
                      key={group.resource}
                      group={group}
                      open={
                        normalizedQuery
                          ? true
                          : expandedResources.has(group.resource)
                      }
                      selectedSet={selectedSet}
                      lockedPermissions={lockedPermissions}
                      onOpenChange={(open) =>
                        setExpandedResources((current) => {
                          const next = new Set(current)
                          if (open) next.add(group.resource)
                          else next.delete(group.resource)
                          return next
                        })
                      }
                      onToggleGroup={() =>
                        togglePermissions(
                          group.permissions.map((permission) => permission.name)
                        )
                      }
                      onTogglePermission={togglePermission}
                      t={t}
                    />
                  ))
                ) : (
                  <div className='px-4 py-12 text-center text-sm text-muted-foreground'>
                    {t('permissionsPage.emptySearch')}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </section>

        <aside className='hidden rounded-xl border bg-card/40 p-5 xl:block'>
          <h3 className='text-sm font-medium'>
            {t('permissionsPage.summary.title')}
          </h3>
          <p className='mt-2 text-3xl font-semibold tracking-tight'>
            {selectedCount} / {allPermissions.length}
          </p>
          <p className='mt-1 text-xs text-muted-foreground'>
            {t('permissionsPage.summary.byResource')}
          </p>
          <Separator className='my-5' />
          <div className='flex flex-col gap-4'>
            {data.permissionsByResource.map((group) => {
              const Icon =
                resourceIcons[group.resource as keyof typeof resourceIcons] ??
                KeyRound
              const groupSelected = group.permissions.filter((permission) =>
                selectedSet.has(permission.name)
              ).length

              return (
                <div
                  key={group.resource}
                  className='flex items-center gap-3 text-sm'
                >
                  <Icon className='size-4 text-muted-foreground' />
                  <span>{translatedResource(t, group.resource)}</span>
                  <span className='ms-auto text-muted-foreground'>
                    {groupSelected} / {group.permissions.length}
                  </span>
                </div>
              )
            })}
          </div>
          <Separator className='my-5' />
          <p className='flex items-start gap-2 text-xs text-muted-foreground'>
            <Info className='size-4 shrink-0' />
            {t('permissionsPage.summary.impact')}
          </p>
        </aside>
      </div>

      <div className='sticky bottom-4 flex flex-col gap-3 rounded-xl border bg-background/95 px-5 py-4 shadow-lg backdrop-blur sm:flex-row sm:items-center'>
        <div className='flex items-center gap-2 text-sm'>
          <span>{t('permissionsPage.summary.selected')}</span>
          <strong className='text-primary'>
            {selectedCount} / {allPermissions.length}
          </strong>
          <span className='text-muted-foreground'>
            {t('permissionsPage.summary.permissions')}
          </span>
          {isDirty ? (
            <span className='ms-2 flex items-center gap-2 text-xs text-muted-foreground'>
              <span className='size-1.5 rounded-full bg-primary' />
              {t('permissionsPage.summary.unsaved')}
            </span>
          ) : null}
        </div>
        <div className='flex gap-2 sm:ms-auto'>
          <Button
            type='button'
            variant='outline'
            disabled={!isDirty || isSaving}
            onClick={() => setDraftPermissions(savedPermissions)}
          >
            {t('permissionsPage.actions.discard')}
          </Button>
          <Button
            type='button'
            disabled={!isDirty || isSaving}
            onClick={savePermissions}
          >
            {isSaving
              ? t('permissionsPage.actions.saving')
              : t('permissionsPage.actions.save')}
          </Button>
        </div>
      </div>

      <AlertDialog
        open={blocker.status === 'blocked'}
        onOpenChange={(open) => {
          if (!open && blocker.status === 'blocked') blocker.reset()
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('permissionsPage.unsaved.title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('permissionsPage.unsaved.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('permissionsPage.unsaved.stay')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setDraftPermissions(savedPermissions)
                if (blocker.status === 'blocked') blocker.proceed()
              }}
            >
              {t('permissionsPage.unsaved.leave')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

type PermissionGroupProps = {
  group: PermissionResourceGroup
  lockedPermissions: Set<AppPermission>
  onOpenChange: (open: boolean) => void
  onToggleGroup: () => void
  onTogglePermission: (permission: AppPermission) => void
  open: boolean
  selectedSet: Set<AppPermission>
  t: TFunction
}

function PermissionGroup({
  group,
  lockedPermissions,
  onOpenChange,
  onToggleGroup,
  onTogglePermission,
  open,
  selectedSet,
  t,
}: PermissionGroupProps) {
  const selectedCount = group.permissions.filter((permission) =>
    selectedSet.has(permission.name)
  ).length
  const Icon =
    resourceIcons[group.resource as keyof typeof resourceIcons] ?? KeyRound
  const mutableCount = group.permissions.filter(
    (permission) => !lockedPermissions.has(permission.name)
  ).length

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <div className='flex min-h-12 items-center gap-3 border-b px-4 ps-8'>
        <CollapsibleTrigger asChild>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            aria-label={t('permissionsPage.actions.toggleResource', {
              resource: translatedResource(t, group.resource),
            })}
          >
            {open ? <ChevronDown /> : <ChevronRight />}
          </Button>
        </CollapsibleTrigger>
        <Checkbox
          aria-label={translatedResource(t, group.resource)}
          checked={checkboxState(selectedCount, group.permissions.length)}
          disabled={mutableCount === 0}
          onCheckedChange={onToggleGroup}
        />
        <Icon className='size-4 text-muted-foreground' />
        <span className='font-medium'>
          {translatedResource(t, group.resource)}
        </span>
        <span className='ms-auto text-sm text-muted-foreground'>
          {selectedCount} / {group.permissions.length}
        </span>
      </div>

      <CollapsibleContent>
        <div className='ms-14 border-s border-dashed'>
          {group.permissions.map((permission) => {
            const locked = lockedPermissions.has(permission.name)

            return (
              <label
                key={permission.id}
                className={cn(
                  'grid min-h-14 cursor-pointer grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 border-b px-4 py-3 last:border-b-0 sm:grid-cols-[auto_minmax(8rem,0.8fr)_minmax(12rem,1fr)_minmax(10rem,0.7fr)] sm:items-center',
                  locked && 'cursor-not-allowed'
                )}
              >
                <Checkbox
                  checked={selectedSet.has(permission.name)}
                  disabled={locked}
                  onCheckedChange={() => onTogglePermission(permission.name)}
                />
                <span className='font-medium'>
                  {translatedPermissionLabel(t, permission)}
                </span>
                <span className='col-start-2 text-sm text-muted-foreground sm:col-start-auto'>
                  {translatedPermissionDescription(t, permission)}
                </span>
                <span className='col-start-2 flex items-center gap-2 font-mono text-xs text-muted-foreground sm:col-start-auto'>
                  {permission.name}
                  {locked ? <LockKeyhole className='size-3.5' /> : null}
                </span>
                {locked ? (
                  <span className='col-start-2 text-xs text-muted-foreground sm:col-span-3'>
                    {t('permissionsPage.tree.adminLock')}
                  </span>
                ) : null}
              </label>
            )
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
