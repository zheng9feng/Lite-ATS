import { createFileRoute } from '@tanstack/react-router'
import { listPermissionResources } from '@/features/permissions/data/permissions-api'
import { PermissionsRoute } from '@/features/permissions/permissions-route'

export const Route = createFileRoute('/_authenticated/permissions')({
  loader: () => listPermissionResources(),
  component: PermissionsRoute,
})
