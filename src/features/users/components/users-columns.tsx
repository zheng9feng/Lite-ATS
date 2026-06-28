import { type ColumnDef } from '@tanstack/react-table'
import { type TFunction } from 'i18next'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { LongText } from '@/components/long-text'
import { callTypes, roles } from '../data/data'
import { type User } from '../data/schema'
import { DataTableRowActions } from './data-table-row-actions'

export function getUserStatusLabel(t: TFunction, status: User['status']) {
  return t(`usersPage.status.${status}`)
}

export function getUserRoleLabel(t: TFunction, role: User['role']) {
  return t(`usersPage.roles.${role}`, {
    defaultValue: role
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' '),
  })
}

export function getUsersColumns(t: TFunction): ColumnDef<User>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label={t('usersPage.table.selectAll')}
          className='translate-y-0.5'
        />
      ),
      meta: {
        className: cn('inset-s-0 z-10 rounded-tl-[inherit] max-md:sticky'),
      },
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={t('usersPage.table.selectRow')}
          className='translate-y-0.5'
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'username',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t('usersPage.columns.username')}
        />
      ),
      cell: ({ row }) => (
        <LongText className='max-w-36 ps-3'>
          {row.getValue('username')}
        </LongText>
      ),
      meta: {
        className: cn(
          'drop-shadow-[0_1px_2px_rgb(0_0_0_/_0.1)] dark:drop-shadow-[0_1px_2px_rgb(255_255_255_/_0.1)]',
          'inset-s-6 ps-0.5 max-md:sticky @4xl/content:table-cell @4xl/content:drop-shadow-none'
        ),
        columnLabel: t('usersPage.columns.username'),
      },
      enableHiding: false,
    },
    {
      id: 'fullName',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t('usersPage.columns.name')}
        />
      ),
      cell: ({ row }) => {
        const { firstName, lastName } = row.original
        const fullName = `${firstName} ${lastName}`
        return <LongText className='max-w-36'>{fullName}</LongText>
      },
      meta: {
        className: 'w-36',
        columnLabel: t('usersPage.columns.name'),
      },
    },
    {
      accessorKey: 'email',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t('usersPage.columns.email')}
        />
      ),
      cell: ({ row }) => (
        <div className='w-fit ps-2 text-nowrap'>{row.getValue('email')}</div>
      ),
      meta: {
        columnLabel: t('usersPage.columns.email'),
      },
    },
    {
      accessorKey: 'phoneNumber',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t('usersPage.columns.phoneNumber')}
        />
      ),
      cell: ({ row }) => <div>{row.getValue('phoneNumber')}</div>,
      meta: {
        columnLabel: t('usersPage.columns.phoneNumber'),
      },
      enableSorting: false,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t('usersPage.columns.status')}
        />
      ),
      cell: ({ row }) => {
        const { status } = row.original
        const badgeColor = callTypes.get(status)
        return (
          <div className='flex space-x-2'>
            <Badge variant='outline' className={cn('capitalize', badgeColor)}>
              {getUserStatusLabel(t, status)}
            </Badge>
          </div>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
      enableHiding: false,
      enableSorting: false,
    },
    {
      accessorKey: 'role',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t('usersPage.columns.role')}
        />
      ),
      cell: ({ row }) => {
        const { role } = row.original
        const userType = roles.find(({ value }) => value === role)

        return (
          <div className='flex items-center gap-x-2'>
            {userType?.icon && (
              <userType.icon size={16} className='text-muted-foreground' />
            )}
            <span className='text-sm capitalize'>
              {getUserRoleLabel(t, role)}
            </span>
          </div>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: 'actions',
      cell: DataTableRowActions,
    },
  ]
}
