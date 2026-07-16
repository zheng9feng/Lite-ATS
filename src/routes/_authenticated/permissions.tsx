import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Permissions } from '@/features/permissions'
import { listPermissionAssignmentData } from '@/features/permissions/data/permissions-api'

const permissionsSearchSchema = z.object({
  roleId: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/_authenticated/permissions')({
  validateSearch: permissionsSearchSchema,
  loader: () => listPermissionAssignmentData(),
  component: Permissions,
})
