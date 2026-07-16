import { createFileRoute } from '@tanstack/react-router'
import { Roles } from '@/features/roles'
import { listRoles } from '@/features/roles/data/roles-api'

export const Route = createFileRoute('/_authenticated/roles')({
  loader: () => listRoles(),
  component: Roles,
})
