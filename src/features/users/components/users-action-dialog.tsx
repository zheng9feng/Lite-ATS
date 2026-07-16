'use client'

import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { type TFunction } from 'i18next'
import { ChevronsUpDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
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
import { PasswordInput } from '@/components/password-input'
import { type User } from '../data/schema'
import {
  createUser,
  listUserRoleOptions,
  updateUser,
  type UserRoleOption,
} from '../data/users-api'

function createFormSchema(t: TFunction) {
  return z
    .object({
      username: z.string().min(1, t('usersPage.dialog.validation.username')),
      email: z.email({
        error: (issue) =>
          issue.input === ''
            ? t('usersPage.dialog.validation.emailRequired')
            : t('usersPage.dialog.validation.emailInvalid'),
      }),
      password: z.string().transform((password) => password.trim()),
      roleIds: z
        .array(z.string())
        .min(1, t('usersPage.dialog.validation.role')),
      confirmPassword: z.string().transform((password) => password.trim()),
      isEdit: z.boolean(),
    })
    .refine(
      (data) => {
        if (data.isEdit && !data.password) return true
        return data.password.length > 0
      },
      {
        message: t('usersPage.dialog.validation.passwordRequired'),
        path: ['password'],
      }
    )
    .refine(
      ({ isEdit, password }) => {
        if (isEdit && !password) return true
        return password.length >= 8
      },
      {
        message: t('usersPage.dialog.validation.passwordLength'),
        path: ['password'],
      }
    )
    .refine(
      ({ isEdit, password }) => {
        if (isEdit && !password) return true
        return /[a-z]/.test(password)
      },
      {
        message: t('usersPage.dialog.validation.passwordLowercase'),
        path: ['password'],
      }
    )
    .refine(
      ({ isEdit, password }) => {
        if (isEdit && !password) return true
        return /\d/.test(password)
      },
      {
        message: t('usersPage.dialog.validation.passwordNumber'),
        path: ['password'],
      }
    )
    .refine(
      ({ isEdit, password, confirmPassword }) => {
        if (isEdit && !password) return true
        return password === confirmPassword
      },
      {
        message: t('usersPage.dialog.validation.passwordMismatch'),
        path: ['confirmPassword'],
      }
    )
}

type UserForm = z.infer<ReturnType<typeof createFormSchema>>

type UserActionDialogProps = {
  currentRow?: User
  onSaved?: () => Promise<void> | void
  open: boolean
  onOpenChange: (open: boolean) => void
}

function roleLabel(roleName: string) {
  return roleName
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function localizedRoleLabel(roleName: string, t: TFunction) {
  switch (roleName.toLowerCase()) {
    case 'admin':
      return t('usersPage.roles.admin')
    case 'cashier':
      return t('usersPage.roles.cashier')
    case 'manager':
      return t('usersPage.roles.manager')
    case 'normal':
      return t('usersPage.roles.normal')
    case 'reviewer':
      return t('usersPage.roles.reviewer')
    case 'superadmin':
      return t('usersPage.roles.superadmin')
    default:
      return roleLabel(roleName)
  }
}

function toWritableStatus(
  status: User['status'] | undefined
): 'active' | 'inactive' {
  return status === 'inactive' ? 'inactive' : 'active'
}

export function UsersActionDialog({
  currentRow,
  onSaved,
  open,
  onOpenChange,
}: UserActionDialogProps) {
  const { t } = useTranslation()
  const isEdit = !!currentRow
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [roleOptions, setRoleOptions] = useState<UserRoleOption[]>([])
  const formSchema = useMemo(() => createFormSchema(t), [t])
  const form = useForm<UserForm>({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit
      ? {
          confirmPassword: '',
          email: currentRow.email,
          isEdit,
          password: '',
          roleIds: currentRow.roles.map((role) => role.id),
          username: currentRow.username,
        }
      : {
          username: '',
          email: '',
          roleIds: [],
          password: '',
          confirmPassword: '',
          isEdit,
        },
  })

  useEffect(() => {
    if (!open) return

    let isCurrent = true

    listUserRoleOptions()
      .then((roles) => {
        if (isCurrent) {
          setRoleOptions(roles)
        }
      })
      .catch((reason: unknown) => {
        if (isCurrent) {
          setError(
            reason instanceof Error
              ? reason.message
              : t('usersPage.dialog.errors.loadRoles')
          )
        }
      })

    return () => {
      isCurrent = false
    }
  }, [open, t])

  const onSubmit = async (values: UserForm) => {
    setError(null)
    setIsSaving(true)

    try {
      const payload = {
        email: values.email,
        name: values.username,
        password: values.password || undefined,
        roleIds: values.roleIds,
        status: toWritableStatus(currentRow?.status),
      }

      if (currentRow) {
        await updateUser(currentRow.id, payload)
      } else {
        await createUser(payload)
      }

      form.reset()
      await onSaved?.()
      onOpenChange(false)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : t('usersPage.dialog.errors.save')
      )
    } finally {
      setIsSaving(false)
    }
  }

  const password = useWatch({ control: form.control, name: 'password' })

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        form.reset()
        setError(null)
        onOpenChange(state)
      }}
    >
      <DialogContent
        className='sm:max-w-lg'
        closeLabel={t('usersPage.dialog.close')}
      >
        <DialogHeader className='text-start'>
          <DialogTitle>
            {isEdit
              ? t('usersPage.dialog.editTitle')
              : t('usersPage.dialog.addTitle')}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t('usersPage.dialog.editDescription')
              : t('usersPage.dialog.addDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className='h-105 w-[calc(100%+0.75rem)] overflow-y-auto py-1 pe-3'>
          <Form {...form}>
            <form
              id='user-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-4 px-0.5'
            >
              <FormField
                control={form.control}
                name='username'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      {t('usersPage.dialog.fields.username')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t(
                          'usersPage.dialog.placeholders.username'
                        )}
                        className='col-span-4'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='email'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      {t('usersPage.dialog.fields.email')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('usersPage.dialog.placeholders.email')}
                        className='col-span-4'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='roleIds'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      {t('usersPage.dialog.fields.role')}
                    </FormLabel>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type='button'
                          variant='outline'
                          aria-label={t('usersPage.dialog.fields.role')}
                          className='col-span-4 justify-between font-normal'
                          role='combobox'
                        >
                          <span className='truncate'>
                            {field.value.length
                              ? roleOptions
                                  .filter((role) =>
                                    field.value.includes(role.id)
                                  )
                                  .map((role) =>
                                    localizedRoleLabel(role.name, t)
                                  )
                                  .join(', ')
                              : t('usersPage.dialog.placeholders.role')}
                          </span>
                          <ChevronsUpDown data-icon='inline-end' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align='start'
                        className='w-(--radix-dropdown-menu-trigger-width)'
                      >
                        <DropdownMenuGroup>
                          {roleOptions.map((role) => (
                            <DropdownMenuCheckboxItem
                              key={role.id}
                              checked={field.value.includes(role.id)}
                              onCheckedChange={(checked) => {
                                field.onChange(
                                  checked
                                    ? [...field.value, role.id]
                                    : field.value.filter(
                                        (roleId) => roleId !== role.id
                                      )
                                )
                              }}
                            >
                              <span className='flex flex-col'>
                                <span>{localizedRoleLabel(role.name, t)}</span>
                                {role.description ? (
                                  <span className='text-xs text-muted-foreground'>
                                    {role.description}
                                  </span>
                                ) : null}
                              </span>
                            </DropdownMenuCheckboxItem>
                          ))}
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='password'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      {t('usersPage.dialog.fields.password')}
                    </FormLabel>
                    <FormControl>
                      <PasswordInput
                        hidePasswordLabel={t('usersPage.dialog.hidePassword')}
                        placeholder={t(
                          'usersPage.dialog.placeholders.password'
                        )}
                        showPasswordLabel={t('usersPage.dialog.showPassword')}
                        className='col-span-4'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='confirmPassword'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      {t('usersPage.dialog.fields.confirmPassword')}
                    </FormLabel>
                    <FormControl>
                      <PasswordInput
                        disabled={!password}
                        hidePasswordLabel={t('usersPage.dialog.hidePassword')}
                        placeholder={t(
                          'usersPage.dialog.placeholders.password'
                        )}
                        showPasswordLabel={t('usersPage.dialog.showPassword')}
                        className='col-span-4'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              {error && (
                <p className='col-span-4 col-start-3 text-sm text-destructive'>
                  {error}
                </p>
              )}
            </form>
          </Form>
        </div>
        <DialogFooter>
          <Button type='submit' form='user-form' disabled={isSaving}>
            {isSaving
              ? t('usersPage.dialog.saving')
              : t('usersPage.dialog.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
