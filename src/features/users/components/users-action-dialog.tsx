'use client'

import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { type TFunction } from 'i18next'
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'
import { SelectDropdown } from '@/components/select-dropdown'
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
      roleId: z.string().min(1, t('usersPage.dialog.validation.role')),
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
          roleId: currentRow.roleId ?? currentRow.role,
          username: currentRow.username,
        }
      : {
          username: '',
          email: '',
          roleId: '',
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

  useEffect(() => {
    if (!currentRow || currentRow.roleId || roleOptions.length === 0) return

    const role = roleOptions.find((option) => option.name === currentRow.role)

    if (role) {
      form.setValue('roleId', role.id)
    }
  }, [currentRow, form, roleOptions])

  const selectRoleOptions = useMemo(() => {
    const options = [...roleOptions]
    const currentRoleId = currentRow?.roleId ?? currentRow?.role
    const currentRoleOption = currentRow?.roleId
      ? options.find((role) => role.id === currentRow.roleId)
      : options.find((role) => role.name === currentRow?.role)

    if (
      currentRow &&
      currentRoleId &&
      !currentRoleOption &&
      !options.some((role) => role.id === currentRoleId)
    ) {
      options.push({
        description: '',
        id: currentRoleId,
        name: currentRow.role,
      })
    }

    return options.map((role) => ({
      label: localizedRoleLabel(role.name, t),
      value: role.id,
    }))
  }, [currentRow, roleOptions, t])

  const onSubmit = async (values: UserForm) => {
    setError(null)
    setIsSaving(true)

    try {
      const roleId =
        roleOptions.find((role) => role.id === values.roleId)?.id ??
        roleOptions.find((role) => role.name === values.roleId)?.id ??
        values.roleId
      const payload = {
        email: values.email,
        name: values.username,
        password: values.password || undefined,
        roleId,
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

  const isPasswordTouched = !!form.formState.dirtyFields.password

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
                name='roleId'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      {t('usersPage.dialog.fields.role')}
                    </FormLabel>
                    <SelectDropdown
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                      placeholder={t('usersPage.dialog.placeholders.role')}
                      className='col-span-4'
                      items={selectRoleOptions}
                    />
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
                        disabled={!isPasswordTouched}
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
