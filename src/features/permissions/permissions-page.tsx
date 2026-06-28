import { type FormEvent, useMemo, useState } from 'react'
import { Plus, Save, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { type AppPermission } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  createRole,
  deleteRole,
  type PermissionResources,
  type RoleDto,
  type RoleSummary,
  updateRole,
  updateUserRoles,
} from './data/permissions-api'

type PermissionsPageProps = {
  initialData: PermissionResources
  onRefresh: () => void | Promise<void>
}

type RoleDraft = {
  description: string
  name: string
  permissions: AppPermission[]
}

function createEmptyRoleDraft(): RoleDraft {
  return {
    description: '',
    name: '',
    permissions: [],
  }
}

function createRoleDraft(role: RoleDto): RoleDraft {
  return {
    description: role.description,
    name: role.name,
    permissions: role.permissions,
  }
}

function toggleValue<T>(values: T[], value: T) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value]
}

function roleNames(roles: RoleSummary[]) {
  return roles.map((role) => role.name).join(', ')
}

export function PermissionsPage({
  initialData,
  onRefresh,
}: PermissionsPageProps) {
  const { t } = useTranslation()
  const [data, setData] = useState(initialData)
  const [selectedRoleId, setSelectedRoleId] = useState(
    initialData.roles[0]?.id ?? ''
  )
  const selectedRole =
    data.roles.find((role) => role.id === selectedRoleId) ?? data.roles[0]
  const [roleDraft, setRoleDraft] = useState<RoleDraft>(
    selectedRole ? createRoleDraft(selectedRole) : createEmptyRoleDraft()
  )
  const [newRoleDraft, setNewRoleDraft] = useState(createEmptyRoleDraft)
  const [userRoleDrafts, setUserRoleDrafts] = useState<
    Record<string, string[]>
  >(() =>
    Object.fromEntries(
      initialData.users.map((user) => [
        user.id,
        user.roles.map((role) => role.id),
      ])
    )
  )
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const roleLookup = useMemo(
    () => new Map(data.roles.map((role) => [role.id, role])),
    [data.roles]
  )

  function selectRole(role: RoleDto) {
    setSelectedRoleId(role.id)
    setRoleDraft(createRoleDraft(role))
  }

  async function runMutation(action: () => Promise<void>) {
    setIsSaving(true)
    setError('')

    try {
      await action()
      await onRefresh()
    } catch (mutationError) {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : t('permissionsPage.api.failed')
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handleCreateRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    await runMutation(async () => {
      const role = await createRole(newRoleDraft)
      setData((currentData) => ({
        ...currentData,
        roles: [...currentData.roles, role],
      }))
      setSelectedRoleId(role.id)
      setRoleDraft(createRoleDraft(role))
      setNewRoleDraft(createEmptyRoleDraft())
    })
  }

  async function handleSaveRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedRole) return

    await runMutation(async () => {
      const role = await updateRole(selectedRole.id, {
        description: roleDraft.description,
        name: selectedRole.isSystem ? undefined : roleDraft.name,
        permissions: roleDraft.permissions,
      })

      setData((currentData) => ({
        ...currentData,
        roles: currentData.roles.map((item) =>
          item.id === role.id ? role : item
        ),
      }))
      setSelectedRoleId(role.id)
      setRoleDraft(createRoleDraft(role))
    })
  }

  async function handleDeleteRole() {
    if (!selectedRole) return

    await runMutation(async () => {
      await deleteRole(selectedRole.id)
      setData((currentData) => ({
        ...currentData,
        roles: currentData.roles.filter((role) => role.id !== selectedRole.id),
      }))
      const nextRole = data.roles.find((role) => role.id !== selectedRole.id)
      setSelectedRoleId(nextRole?.id ?? '')
      setRoleDraft(
        nextRole ? createRoleDraft(nextRole) : createEmptyRoleDraft()
      )
    })
  }

  async function handleSaveUserRoles(userId: string) {
    const roleIds = userRoleDrafts[userId] ?? []

    await runMutation(async () => {
      await updateUserRoles(userId, roleIds)
      setData((currentData) => ({
        ...currentData,
        users: currentData.users.map((user) =>
          user.id === userId
            ? {
                ...user,
                permissions: Array.from(
                  new Set(
                    roleIds.flatMap(
                      (roleId) => roleLookup.get(roleId)?.permissions ?? []
                    )
                  )
                ).sort(),
                roles: roleIds
                  .map((roleId) => roleLookup.get(roleId))
                  .filter((role): role is RoleDto => Boolean(role)),
              }
            : user
        ),
      }))
    })
  }

  return (
    <div className='flex flex-col gap-4 sm:gap-6'>
      <div>
        <h2 className='text-2xl font-bold tracking-tight'>
          {t('permissionsPage.title')}
        </h2>
        <p className='text-muted-foreground'>
          {t('permissionsPage.description')}
        </p>
      </div>

      {error && (
        <Alert variant='destructive'>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue='roles' className='gap-4'>
        <TabsList>
          <TabsTrigger value='roles'>
            {t('permissionsPage.tabs.roles')}
          </TabsTrigger>
          <TabsTrigger value='users'>
            {t('permissionsPage.tabs.users')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value='roles' className='flex flex-col gap-4'>
          <Card>
            <CardHeader>
              <CardTitle>{t('permissionsPage.createRole.title')}</CardTitle>
              <CardDescription>
                {t('permissionsPage.createRole.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className='grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]'
                onSubmit={handleCreateRole}
              >
                <div className='flex flex-col gap-2'>
                  <Label htmlFor='new-role-name'>
                    {t('permissionsPage.fields.roleName')}
                  </Label>
                  <Input
                    id='new-role-name'
                    value={newRoleDraft.name}
                    onChange={(event) =>
                      setNewRoleDraft((draft) => ({
                        ...draft,
                        name: event.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor='new-role-description'>
                    {t('permissionsPage.fields.description')}
                  </Label>
                  <Input
                    id='new-role-description'
                    value={newRoleDraft.description}
                    onChange={(event) =>
                      setNewRoleDraft((draft) => ({
                        ...draft,
                        description: event.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className='flex items-end'>
                  <Button type='submit' disabled={isSaving}>
                    <Plus data-icon='inline-start' />
                    {t('permissionsPage.actions.create')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className='grid gap-4 lg:grid-cols-[minmax(16rem,20rem)_1fr]'>
            <div className='flex flex-col gap-3'>
              {data.roles.map((role) => (
                <button
                  key={role.id}
                  type='button'
                  onClick={() => selectRole(role)}
                  className={cn(
                    'rounded-lg border bg-card p-4 text-start transition-colors hover:bg-muted',
                    selectedRole?.id === role.id && 'border-primary'
                  )}
                >
                  <div className='flex items-center justify-between gap-2'>
                    <span className='font-medium'>{role.name}</span>
                    {role.isSystem && (
                      <Badge variant='secondary'>
                        {t('permissionsPage.systemRole')}
                      </Badge>
                    )}
                  </div>
                  <p className='mt-1 line-clamp-2 text-sm text-muted-foreground'>
                    {role.description}
                  </p>
                  <p className='mt-2 text-xs text-muted-foreground'>
                    {t('permissionsPage.userCount', {
                      count: role.userCount,
                    })}
                  </p>
                </button>
              ))}
            </div>

            {selectedRole && (
              <Card>
                <CardHeader>
                  <CardTitle>{selectedRole.name}</CardTitle>
                  <CardDescription>
                    {t('permissionsPage.roleEditor.description')}
                  </CardDescription>
                  <CardAction>
                    <Button
                      type='button'
                      variant='destructive'
                      size='sm'
                      disabled={
                        isSaving ||
                        selectedRole.isSystem ||
                        selectedRole.userCount > 0
                      }
                      onClick={handleDeleteRole}
                    >
                      <Trash2 data-icon='inline-start' />
                      {t('permissionsPage.actions.delete')}
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <form
                    className='flex flex-col gap-4'
                    onSubmit={handleSaveRole}
                  >
                    <div className='grid gap-4 md:grid-cols-2'>
                      <div className='flex flex-col gap-2'>
                        <Label htmlFor='role-name'>
                          {t('permissionsPage.fields.roleName')}
                        </Label>
                        <Input
                          id='role-name'
                          value={roleDraft.name}
                          disabled={selectedRole.isSystem}
                          onChange={(event) =>
                            setRoleDraft((draft) => ({
                              ...draft,
                              name: event.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                      <div className='flex flex-col gap-2'>
                        <Label htmlFor='role-description'>
                          {t('permissionsPage.fields.description')}
                        </Label>
                        <Textarea
                          id='role-description'
                          value={roleDraft.description}
                          onChange={(event) =>
                            setRoleDraft((draft) => ({
                              ...draft,
                              description: event.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                    </div>

                    <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
                      {data.permissionsByResource.map((group) => (
                        <section
                          key={group.resource}
                          className='rounded-lg border p-4'
                        >
                          <h3 className='font-medium'>{group.resource}</h3>
                          <div className='mt-3 flex flex-col gap-3'>
                            {group.permissions.map((permission) => (
                              <label
                                key={permission.id}
                                className='flex items-start gap-2 text-sm'
                              >
                                <Checkbox
                                  checked={roleDraft.permissions.includes(
                                    permission.name
                                  )}
                                  onCheckedChange={() =>
                                    setRoleDraft((draft) => ({
                                      ...draft,
                                      permissions: toggleValue(
                                        draft.permissions,
                                        permission.name
                                      ),
                                    }))
                                  }
                                />
                                <span>
                                  <span className='block font-medium'>
                                    {permission.name}
                                  </span>
                                  <span className='text-muted-foreground'>
                                    {permission.description}
                                  </span>
                                </span>
                              </label>
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>

                    <div>
                      <Button type='submit' disabled={isSaving}>
                        <Save data-icon='inline-start' />
                        {t('permissionsPage.actions.save')}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value='users' className='grid gap-4 xl:grid-cols-2'>
          {data.users.map((user) => {
            const draftRoleIds =
              userRoleDrafts[user.id] ?? user.roles.map((role) => role.id)

            return (
              <Card key={user.id}>
                <CardHeader>
                  <CardTitle>{user.name}</CardTitle>
                  <CardDescription>{user.email}</CardDescription>
                  <CardAction>
                    <Badge variant='outline'>{user.status}</Badge>
                  </CardAction>
                </CardHeader>
                <CardContent className='flex flex-col gap-4'>
                  <div>
                    <h3 className='text-sm font-medium'>
                      {t('permissionsPage.userRoles.assignedRoles')}
                    </h3>
                    <div className='mt-3 grid gap-2 sm:grid-cols-2'>
                      {data.roles.map((role) => (
                        <label
                          key={role.id}
                          className='flex items-center gap-2 rounded-md border p-3 text-sm'
                        >
                          <Checkbox
                            checked={draftRoleIds.includes(role.id)}
                            onCheckedChange={() =>
                              setUserRoleDrafts((drafts) => ({
                                ...drafts,
                                [user.id]: toggleValue(draftRoleIds, role.id),
                              }))
                            }
                          />
                          <span>{role.name}</span>
                        </label>
                      ))}
                    </div>
                    <p className='mt-2 text-sm text-muted-foreground'>
                      {roleNames(user.roles)}
                    </p>
                  </div>

                  <div>
                    <h3 className='text-sm font-medium'>
                      {t('permissionsPage.userRoles.effectivePermissions')}
                    </h3>
                    <div className='mt-2 flex flex-wrap gap-2'>
                      {user.permissions.map((permission) => (
                        <Badge key={permission} variant='secondary'>
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Button
                      type='button'
                      disabled={isSaving}
                      onClick={() => handleSaveUserRoles(user.id)}
                    >
                      <Save data-icon='inline-start' />
                      {t('permissionsPage.actions.save')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>
      </Tabs>
    </div>
  )
}
