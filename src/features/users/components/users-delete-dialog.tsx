'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { type User } from '../data/schema'
import { deleteUser } from '../data/users-api'

type UserDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: User
  onDeleted?: () => Promise<void> | void
}

export function UsersDeleteDialog({
  open,
  onOpenChange,
  currentRow,
  onDeleted,
}: UserDeleteDialogProps) {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (value.trim() !== currentRow.username) return

    setError(null)
    setIsDeleting(true)

    try {
      await deleteUser(currentRow.id)
      await onDeleted?.()
      onOpenChange(false)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : t('usersPage.deleteDialog.errors.delete')
      )
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      form='users-delete-form'
      disabled={value.trim() !== currentRow.username}
      isLoading={isDeleting}
      title={
        <span className='text-destructive'>
          <AlertTriangle
            className='me-1 inline-block stroke-destructive'
            size={18}
          />{' '}
          {t('usersPage.deleteDialog.title')}
        </span>
      }
      desc={
        <form
          id='users-delete-form'
          onSubmit={(e) => {
            e.preventDefault()
            handleDelete()
          }}
          className='space-y-4'
        >
          <p className='mb-2'>
            {t('usersPage.deleteDialog.description', {
              roles: currentRow.roles
                .map((role) => role.name.toUpperCase())
                .join(', '),
              username: currentRow.username,
            })}
          </p>

          <Label className='my-2'>
            {t('usersPage.deleteDialog.username')}:
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={t('usersPage.deleteDialog.placeholder')}
              autoFocus
            />
          </Label>

          <Alert variant='destructive'>
            <AlertTitle>{t('usersPage.deleteDialog.warningTitle')}</AlertTitle>
            <AlertDescription>
              {t('usersPage.deleteDialog.warningDescription')}
            </AlertDescription>
          </Alert>
          {error && (
            <p role='alert' className='text-sm text-destructive'>
              {error}
            </p>
          )}
        </form>
      }
      confirmText={
        isDeleting
          ? t('usersPage.deleteDialog.deleting')
          : t('usersPage.deleteDialog.confirm')
      }
      destructive
    />
  )
}
